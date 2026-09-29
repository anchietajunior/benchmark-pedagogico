import { setTimeout as delay } from 'node:timers/promises';

const API_BASE = 'https://openrouter.ai/api/v1';

function requestHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-OpenRouter-Cache': 'false',
  };
}

function recordIdentity(state, key, value) {
  if (typeof value !== 'string' || value.length === 0) return;
  if (state[key] && state[key] !== value) state.issues.push(`IDENTIDADE_VARIAVEL_${key.toUpperCase()}`);
  if (!state[key]) state[key] = value;
}

function readEvent(state, data, startedAt) {
  if (state.done) return;
  if (data === '[DONE]') {
    state.done = true;
    return;
  }
  const event = JSON.parse(data);
  recordIdentity(state, 'generation_id', event.id);
  recordIdentity(state, 'model', event.model);
  recordIdentity(state, 'provider', event.provider);
  const choice = event.choices?.[0];
  if (event.error || choice?.error) state.issues.push('ERRO_SSE');
  if (event.usage) state.usage = event.usage;
  if (choice?.finish_reason) state.finish_reason = choice.finish_reason;
  if (choice?.native_finish_reason) state.native_finish_reason = choice.native_finish_reason;
  if (choice?.delta?.tool_calls) state.issues.push('FERRAMENTA_INESPERADA');
  if (choice?.delta?.refusal) state.refusal = true;
  const content = choice?.delta?.content;
  if (content !== undefined && content !== null && typeof content !== 'string') throw new Error('Conteúdo SSE não textual.');
  if (content) {
    if (state.first_text_seconds === null) state.first_text_seconds = (performance.now() - startedAt) / 1000;
    state.content += content;
  }
}

export async function receiveGeneration(request, options) {
  const { apiKey, timeoutSeconds, fetchImpl = fetch, signal, onHeaders, onChunk } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutSeconds * 1000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const state = {
    started_at: new Date().toISOString(), ended_at: null, duration_seconds: null,
    first_text_seconds: null, generation_id: null, model: null, provider: null,
    finish_reason: null, native_finish_reason: null, usage: null, refusal: false,
    content: '', done: false, http_status: null, response_headers: {}, issues: [],
    operational_status: 'desconhecido',
  };
  const startedAt = performance.now();
  let reader;
  try {
    const response = await fetchImpl(`${API_BASE}/chat/completions`, {
      method: 'POST', headers: requestHeaders(apiKey), body: JSON.stringify(request),
      signal: combinedSignal, redirect: 'error',
    });
    state.http_status = response.status;
    for (const name of ['content-type', 'date', 'x-generation-id', 'x-openrouter-cache-status', 'x-openrouter-cache-source-id']) {
      const value = response.headers.get(name);
      if (value !== null) state.response_headers[name] = value;
    }
    recordIdentity(state, 'generation_id', response.headers.get('x-generation-id'));
    if (response.headers.get('x-openrouter-cache-status')?.toUpperCase() === 'HIT') state.issues.push('CACHE_DE_RESPOSTA');
    await onHeaders({ status: response.status, headers: state.response_headers, received_at: new Date().toISOString() });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
      await onChunk(new TextEncoder().encode(await response.text()));
      throw new Error(`Resposta HTTP ${response.status} sem stream SSE válido.`);
    }
    if (!response.body) throw new Error('Resposta sem corpo.');
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pendingText = '';
    let dataLines = [];
    while (!state.done) {
      const chunk = await reader.read();
      if (chunk.done) break;
      await onChunk(chunk.value);
      pendingText += decoder.decode(chunk.value, { stream: true });
      let newlineIndex = pendingText.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = pendingText.slice(0, newlineIndex).replace(/\r$/, '');
        pendingText = pendingText.slice(newlineIndex + 1);
        if (line === '') {
          if (dataLines.length > 0) readEvent(state, dataLines.join('\n'), startedAt);
          dataLines = [];
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        newlineIndex = pendingText.indexOf('\n');
      }
    }
    if (!state.done) state.issues.push('STREAM_SEM_DONE');
    if (state.finish_reason === 'length') state.operational_status = 'truncamento';
    else if (!state.done || state.issues.includes('ERRO_SSE') || ['error', 'tool_calls'].includes(state.finish_reason)) state.operational_status = 'erro';
    else if (['stop', 'content_filter'].includes(state.finish_reason)) state.operational_status = 'conclusão normal';
    else state.issues.push('TERMINO_NAO_RECONHECIDO');
  } catch (error) {
    state.operational_status = timeoutSignal.aborted ? 'timeout' : 'erro';
    state.issues.push(signal?.aborted ? 'INTERROMPIDA_PELO_OPERADOR' : 'FALHA_DE_TRANSPORTE_OU_STREAM');
    state.error = { name: error.name, message: String(error.message).replaceAll(apiKey, '[CREDENCIAL_REMOVIDA]') };
  } finally {
    state.ended_at = new Date().toISOString();
    state.duration_seconds = (performance.now() - startedAt) / 1000;
    if (reader) {
      try { await reader.cancel(); }
      catch { state.issues.push('FALHA_AO_FECHAR_STREAM'); }
    }
  }
  return state;
}

export async function fetchGenerationMetadata(generationId, options) {
  const { apiKey, fetchImpl = fetch, attempts = 3, onAttempt } = options;
  if (!generationId) return null;
  let latest = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const evidence = { requested_at: new Date().toISOString(), generation_id: generationId };
    try {
      const response = await fetchImpl(`${API_BASE}/generation?id=${encodeURIComponent(generationId)}`, {
        method: 'GET', headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      evidence.http_status = response.status;
      evidence.body = await response.text();
      if (response.ok) {
        const data = JSON.parse(evidence.body).data;
        if (data?.id === generationId) latest = data;
      }
    } catch (error) {
      evidence.error = { name: error.name, message: String(error.message).replaceAll(apiKey, '[CREDENCIAL_REMOVIDA]') };
    }
    await onAttempt(evidence);
    if (latest && Number.isFinite(latest.total_cost) && latest.total_cost >= 0 && Number.isSafeInteger(latest.native_tokens_prompt) && latest.native_tokens_prompt >= 0 && Number.isSafeInteger(latest.native_tokens_completion) && latest.native_tokens_completion >= 0) return latest;
    if (attempt < attempts) await delay(500 * attempt);
  }
  return latest;
}
