import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { loadStudy } from '../coletor/config.mjs';
import { collectBatch, recoverBatch } from '../coletor/collector.mjs';
import { verifyModelEndpoints } from '../coletor/catalog.mjs';
import { initializeConfig } from '../coletor/config.mjs';
import { receiveGeneration } from '../coletor/openrouter.mjs';
import { setTimeout as delay } from 'node:timers/promises';

const repositoryRoot = resolve(import.meta.dirname, '..');

async function prepareStudy(overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'bench-openrouter-test-'));
  const sourceFile = join(directory, 'B01.md');
  await writeFile(sourceFile, '# B01-F1 - Fonte sintética exclusiva do teste\nTrecho usado somente para testar o transporte, sem conteúdo científico.\n');
  const config = {
    batch_name: 'piloto',
    output_dir: join(directory, 'coletas'),
    phase: 'PILOTO',
    rounds: 1,
    request_timeout_seconds: 5,
    parameters: { temperature: 0.2, max_tokens: 6000 },
    usd_brl: { rate: 5, date: '2026-09-28', source: 'Cotação fictícia exclusiva do teste' },
    models: [{ id: 'S01', model: 'vendor/model-test', provider: 'vendor' }],
    topics: [{ id: 'B01', source_file: sourceFile, sources_reviewed: true }],
    ...overrides,
  };
  const configPath = join(directory, 'openrouter.config.json');
  await writeFile(configPath, JSON.stringify(config));
  return { directory, configPath, config, study: await loadStudy(configPath, repositoryRoot) };
}

function generationStream({ usage = true, finish = 'stop', error = false, done = true, cacheHit = false } = {}) {
  const identity = { id: 'gen-test', model: 'vendor/model-test', provider: 'Vendor' };
  const chunks = [
    ': OPENROUTER PROCESSING\r\n\r\n',
    `data: ${JSON.stringify({ ...identity, choices: [{ delta: { reasoning: 'Não é a explicação.' } }] })}\r\n\r\n`,
    `data: ${JSON.stringify({ ...identity, choices: [{ delta: { content: '# Explicação\n\nA coagulação é' } }] })}\r\n\r\n`,
    `data: ${JSON.stringify({ ...identity, choices: [{ delta: { content: ' um processo.' }, finish_reason: finish }], ...(error ? { error: { code: 500, message: 'Falha do provedor' } } : {}) })}\r\n\r\n`,
  ];
  if (usage) {
    chunks.push(`data: ${JSON.stringify({ ...identity, choices: [{ delta: {}, finish_reason: finish }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, cost: 0.002, prompt_tokens_details: { cached_tokens: 40 }, completion_tokens_details: { reasoning_tokens: 5 } } })}\r\n\r\n`);
  }
  if (done) chunks.push('data: [DONE]\r\n\r\n');
  const bytes = new TextEncoder().encode(chunks.join(''));
  const body = new ReadableStream({
    start(controller) {
      for (let index = 0; index < bytes.length; index += 7) controller.enqueue(bytes.slice(index, index + 7));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'x-generation-id': 'gen-test', 'x-openrouter-cache-status': cacheHit ? 'HIT' : 'MISS' } });
}

function metadataResponse(overrides = {}) {
  return Response.json({ data: {
    id: 'gen-test', model: 'vendor/model-test', provider_name: 'Vendor',
    native_tokens_prompt: 100, native_tokens_completion: 20, native_tokens_cached: 40,
    native_tokens_reasoning: 5, total_cost: 0.002,
    generation_time: 200, latency: 50, ...overrides,
  } });
}

async function runFixture(study, responseOptions, metadata = () => metadataResponse()) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith('/endpoints')) return Response.json({ data: { endpoints: [{ tag: 'vendor', provider_name: 'Vendor', model_id: 'vendor/model-test', status: 0, supported_parameters: ['temperature', 'max_tokens', 'reasoning'] }] } });
    if (options.method === 'POST') return typeof responseOptions === 'function' ? responseOptions(options) : generationStream(responseOptions);
    return metadata();
  };
  const result = await collectBatch(study, { apiKey: 'secret-test-key', fetchImpl, metadataAttempts: 1 });
  return { ...result, requests };
}

test('coleta isolada salva primeira resposta, evidências e métricas sem duplicar cache/raciocínio', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study);
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.telemetry_status, 'COMPLETA');
  assert.equal(record.operational_status, 'conclusão normal');
  assert.equal(record.prompt_tokens, 100);
  assert.equal(record.completion_tokens, 20);
  assert.equal(record.total_tokens, 120);
  assert.equal(record.cached_tokens, 40);
  assert.equal(record.reasoning_tokens, 5);
  assert.equal(record.cost_usd, 0.002);
  assert.equal(record.cost_brl, 0.01);
  assert.ok(record.duration_seconds >= record.first_text_seconds);
  assert.ok(record.first_text_seconds >= 0);
  const generationRequest = result.requests.find(({ options }) => options.method === 'POST');
  const request = JSON.parse(generationRequest.options.body);
  assert.equal(request.messages.length, 2);
  assert.equal(request.model, 'vendor/model-test');
  assert.deepEqual(request.provider.only, ['vendor']);
  assert.equal(request.provider.allow_fallbacks, false);
  assert.equal(request.provider.require_parameters, true);
  assert.equal(generationRequest.options.headers['X-OpenRouter-Cache'], 'false');
  assert.deepEqual(request.plugins, []);
  assert.doesNotMatch(JSON.stringify(request.messages), /AGENTS\.md|gabarito|secret-test-key|Documents\/coletas|E\d{20}/);
  const response = await readFile(join(result.batchDirectory, 'comprovantes', record.execution_id, 'resposta.md'), 'utf8');
  assert.equal(response, '# Explicação\n\nA coagulação é um processo.');
  const entry = await readFile(join(result.batchDirectory, 'entrada', `${record.execution_id}.md`), 'utf8');
  assert.ok(entry.endsWith(response));
  assert.match(entry, /## RESPOSTA ORIGINAL - TUDO ABAIXO É A SAÍDA DO GERADOR\n/);
  const csv = await readFile(join(result.batchDirectory, 'metricas.csv'), 'utf8');
  assert.match(csv, /cost_brl/);
  const requestArchive = await readFile(join(result.batchDirectory, 'comprovantes', record.execution_id, 'pedido.json'), 'utf8');
  assert.doesNotMatch(requestArchive, /secret-test-key|Authorization/);
  assert.match(requestArchive, /B01-F1/);
});

test('telemetria ausente permanece pendente e pode ser conciliada sem outra geração', async () => {
  const { study } = await prepareStudy();
  const initial = await runFixture(study, { usage: false }, () => Response.json({ error: 'Not found' }, { status: 404 }));
  assert.equal(initial.records[0].telemetry_status, 'PENDENTE');
  assert.equal(initial.records[0].cost_usd, null);
  const entryPath = join(initial.batchDirectory, 'entrada', `${initial.records[0].execution_id}.md`);
  const original = await readFile(entryPath, 'utf8');
  const calls = [];
  const recovered = await recoverBatch(initial.batchDirectory, {
    apiKey: 'secret-test-key', metadataAttempts: 1,
    fetchImpl: async (url, options) => { calls.push(options.method); return metadataResponse(); },
  });
  assert.deepEqual(calls, ['GET']);
  assert.equal(recovered.records[0].telemetry_status, 'COMPLETA');
  assert.equal(recovered.records[0].total_tokens, 120);
  assert.equal(await readFile(entryPath, 'utf8'), original);
  const revisionFiles = await readdir(join(initial.batchDirectory, 'comprovantes', initial.records[0].execution_id));
  assert.ok(revisionFiles.some((filename) => filename.startsWith('conciliacao-')));
});

test('erro SSE informa o motivo do provedor no registro e no terminal', async () => {
  const { study } = await prepareStudy();
  const progress = [];
  const result = await collectBatch(study, {
    apiKey: 'secret-test-key', metadataAttempts: 1, onProgress: (message) => progress.push(message),
    fetchImpl: async (url, options) => {
      if (String(url).endsWith('/endpoints')) return Response.json({ data: { endpoints: [{ tag: 'vendor', provider_name: 'Vendor', model_id: 'vendor/model-test', status: 0, supported_parameters: ['temperature', 'max_tokens'] }] } });
      return options.method === 'POST' ? generationStream({ error: true, finish: 'error' }) : metadataResponse();
    },
  });
  assert.deepEqual(result.records[0].provider_error, { code: 500, message: 'Falha do provedor', type: null });
  assert.match(progress.join('\n'), /500: Falha do provedor/);
});

test('truncamento sem contagem de tokens não presume consumo pelo raciocínio', async () => {
  const { study } = await prepareStudy();
  const progress = [];
  const result = await collectBatch(study, {
    apiKey: 'secret-test-key', metadataAttempts: 1, onProgress: (message) => progress.push(message),
    fetchImpl: async (url, options) => {
      if (String(url).endsWith('/endpoints')) return Response.json({ data: { endpoints: [{ tag: 'vendor', provider_name: 'Vendor', model_id: 'vendor/model-test', status: 0, supported_parameters: ['temperature', 'max_tokens'] }] } });
      if (options.method === 'GET') return Response.json({ error: 'Not found' }, { status: 404 });
      return new Response('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
    },
  });
  assert.equal(result.records[0].completion_tokens, null);
  assert.equal(result.records[0].reasoning_tokens, null);
  assert.doesNotMatch(progress.join('\n'), /consumido pelo raciocínio/);
});

for (const [name, options, status] of [
  ['erro SSE com HTTP 200', { error: true, finish: 'error' }, 'erro'],
  ['limite de saída', { finish: 'length' }, 'truncamento'],
  ['stream interrompido', { done: false }, 'erro'],
]) {
  test(`preserva ${name} sem repetir a geração`, async () => {
    const { study } = await prepareStudy();
    const result = await runFixture(study, options);
    assert.equal(result.records[0].operational_status, status);
    assert.equal(result.records[0].ready_for_comparison, false);
    assert.equal(result.requests.filter(({ options: request }) => request.method === 'POST').length, 1);
    assert.equal(result.records[0].cost_usd, 0.002);
  });
}

test('cache de resposta nunca vira repetição válida', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study, { cacheHit: true });
  assert.equal(result.records[0].ready_for_comparison, false);
  assert.ok(result.records[0].issues.includes('CACHE_DE_RESPOSTA'));
});

test('lotes nunca sobrescrevem resultados anteriores', async () => {
  const { study } = await prepareStudy();
  const first = await runFixture(study);
  const second = await runFixture(study);
  assert.notEqual(first.batchDirectory, second.batchDirectory);
  assert.notEqual(first.records[0].execution_id, second.records[0].execution_id);
});

test('configuração incompleta bloqueia antes da rede e antes de criar lote', async () => {
  for (const change of [
    { usd_brl: { rate: null, date: '', source: '' } },
    { models: [{ id: 'S01', model: 'openrouter/auto', provider: 'vendor' }] },
    { topics: [{ id: 'B01', source_file: 'missing.md', sources_reviewed: false }] },
    { parameters: { temperature: 0.2, max_tokens: 6000, tools: [] } },
  ]) {
    await assert.rejects(() => prepareStudy(change));
  }
});

test('fonte-modelo não é aceita como bibliografia verificada', async () => {
  const { configPath, config } = await prepareStudy();
  await writeFile(config.topics[0].source_file, '# B01\nPREENCHER_TRECHOS_AUTORIZADOS\n');
  await assert.rejects(() => loadStudy(configPath, repositoryRoot), /fonte|trecho/i);
});

test('piloto aceita fontes preparadas por IA sem declarar revisão humana', async () => {
  const { config, configPath } = await prepareStudy();
  config.topics[0].sources_reviewed = false;
  config.topics[0].pilot_sources_prepared = true;
  await writeFile(configPath, JSON.stringify(config));
  const study = await loadStudy(configPath, repositoryRoot);
  const result = await runFixture(study);
  const manifest = await readFile(join(result.batchDirectory, 'lote.md'), 'utf8');
  assert.match(manifest, /B01: preparação por IA; revisão humana PENDENTE/);
  const archived = JSON.parse(await readFile(join(result.batchDirectory, 'privado/configuracao.json'), 'utf8'));
  assert.equal(archived.topics[0].sources_reviewed, false);
  config.phase = 'DEFINITIVA';
  await writeFile(configPath, JSON.stringify(config));
  await assert.rejects(() => loadStudy(configPath, repositoryRoot), /revisão humana/);
  config.topics[0].sources_reviewed = true;
  await writeFile(configPath, JSON.stringify(config));
  assert.equal((await loadStudy(configPath, repositoryRoot)).config.phase, 'DEFINITIVA');
});

test('preparação de piloto não aceita texto no lugar de booleano nem fontes vazias', async () => {
  const { config, configPath } = await prepareStudy();
  config.topics[0].sources_reviewed = false;
  config.topics[0].pilot_sources_prepared = 'true';
  await writeFile(configPath, JSON.stringify(config));
  await assert.rejects(() => loadStudy(configPath, repositoryRoot), /pilot_sources_prepared/);
  config.topics[0].pilot_sources_prepared = true;
  await writeFile(configPath, JSON.stringify(config));
  await writeFile(config.topics[0].source_file, '# B01\nPREENCHER_TRECHOS_AUTORIZADOS\n');
  await assert.rejects(() => loadStudy(configPath, repositoryRoot), /trechos-modelo/);
});

test('confere suporte de parâmetros antes de autorizar geração', async () => {
  const { config } = await prepareStudy();
  await assert.rejects(() => verifyModelEndpoints(config, async () => Response.json({ data: { endpoints: [{ tag: 'vendor', model_id: 'vendor/model-test', status: 0, supported_parameters: ['max_tokens'] }] } })), /temperature/);
});

test('parâmetros comuns não precisam impor temperature a modelos que não aceitam esse campo', async () => {
  const { study } = await prepareStudy({ parameters: { max_tokens: 8192, reasoning: { effort: 'medium' } } });
  const result = await runFixture(study);
  const request = JSON.parse(result.requests.find(({ options }) => options.method === 'POST').options.body);
  assert.equal(Object.hasOwn(request, 'temperature'), false);
  assert.deepEqual(request.reasoning, { effort: 'medium' });
});

test('HTTP 401 preserva erro e não tenta os demais pedidos com chave inválida', async () => {
  const { study } = await prepareStudy({ rounds: 2 });
  const result = await runFixture(study, () => Response.json({ error: { message: 'Unauthorized' } }, { status: 401 }));
  assert.equal(result.plannedCount, 2);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].operational_status, 'erro');
  assert.equal(result.records[0].cost_usd, null);
  assert.equal(result.records[0].first_text_seconds, null);
  assert.equal(result.records[0].output_branch, 'sem saída');
  assert.equal(result.requests.filter(({ options }) => options.method === 'POST').length, 1);
});

test('timeout mede tempo até falha e não inventa tokens nem primeiro texto', async () => {
  const state = await receiveGeneration({}, {
    apiKey: 'test', timeoutSeconds: 0.02,
    fetchImpl: async (url, options) => { await delay(200, null, { signal: options.signal }); },
    onHeaders: async () => {}, onChunk: async () => {},
  });
  assert.equal(state.operational_status, 'timeout');
  assert.ok(state.duration_seconds >= 0.01);
  assert.equal(state.usage, null);
  assert.equal(state.first_text_seconds, null);
});

test('interrupção do operador preserva a tentativa e não reenvia o POST', async () => {
  const { study } = await prepareStudy();
  const controller = new AbortController();
  let posts = 0;
  const result = await collectBatch(study, {
    apiKey: 'secret-test-key', signal: controller.signal, metadataAttempts: 1,
    fetchImpl: async (url, options) => {
      if (String(url).endsWith('/endpoints')) return Response.json({ data: { endpoints: [{ tag: 'vendor', provider_name: 'Vendor', model_id: 'vendor/model-test', status: 0, supported_parameters: ['temperature', 'max_tokens'] }] } });
      posts += 1;
      controller.abort();
      throw new DOMException('Abortada', 'AbortError');
    },
  });
  assert.equal(posts, 1);
  assert.ok(result.records[0].issues.includes('INTERROMPIDA_PELO_OPERADOR'));
  assert.equal(result.records[0].telemetry_status, 'PENDENTE');
});

test('custo reportado zero é preservado como zero, não como campo ausente', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study, undefined, () => metadataResponse({ total_cost: 0 }));
  assert.equal(result.records[0].cost_usd, 0);
  assert.equal(result.records[0].cost_brl, 0);
  assert.equal(result.records[0].telemetry_status, 'COMPLETA');
});

test('somente usage.cost em créditos não substitui confirmação do custo em USD', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study, undefined, () => metadataResponse({ total_cost: null }));
  assert.equal(result.records[0].cost_credits_reported, 0.002);
  assert.equal(result.records[0].cost_usd, null);
  assert.equal(result.records[0].telemetry_status, 'PENDENTE');
});

for (const [name, metadata, issue] of [
  ['contagem divergente', { native_tokens_prompt: 999 }, 'USAGE_DIVERGE_DA_GERACAO'],
  ['modelo divergente', { model: 'vendor/another-model' }, 'MODELO_DIVERGE_DA_GERACAO'],
  ['provedor divergente', { provider_name: 'Another provider' }, 'PROVEDOR_RETORNADO_DIFERENTE'],
  ['cobrança externa BYOK', { is_byok: true }, 'BYOK_CUSTO_EXTERNO_NAO_INCLUIDO'],
]) {
  test(`sinaliza ${name} sem aprovar a medição para comparação`, async () => {
    const { study } = await prepareStudy();
    const result = await runFixture(study, undefined, () => metadataResponse(metadata));
    assert.ok(result.records[0].issues.includes(issue));
    assert.equal(result.records[0].ready_for_comparison, false);
  });
}

test('recuperação não aceita metadados de outra geração', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study, undefined, () => metadataResponse({ id: 'gen-another' }));
  assert.equal(result.records[0].telemetry_status, 'PENDENTE');
  assert.equal(result.records[0].cost_usd, null);
});

test('alterar arquivo de fonte após conferir não muda mensagens já carregadas', async () => {
  const { config, study } = await prepareStudy();
  await writeFile(config.topics[0].source_file, 'CONTEUDO_MODIFICADO_APOS_CARREGAMENTO');
  const result = await runFixture(study);
  const request = result.requests.find(({ options }) => options.method === 'POST').options.body;
  assert.match(request, /Fonte sintética exclusiva do teste/);
  assert.doesNotMatch(request, /CONTEUDO_MODIFICADO_APOS_CARREGAMENTO/);
});

test('pré-verificação de catálogo falha antes de criar lote ou fazer POST', async () => {
  const { study } = await prepareStudy();
  const methods = [];
  await assert.rejects(() => collectBatch(study, {
    apiKey: 'test', fetchImpl: async (url, options) => { methods.push(options.method); return Response.json({ error: 'Not found' }, { status: 404 }); },
  }), /consulta pública/);
  assert.deepEqual(methods, ['GET']);
  await assert.rejects(() => readdir(study.outputDirectory), { code: 'ENOENT' });
});

test('configurar preserva configurações e credenciais locais existentes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-config-test-'));
  const configExample = await readFile(join(repositoryRoot, 'openrouter.config.example.json'), 'utf8');
  await writeFile(join(directory, 'openrouter.config.example.json'), configExample);
  await writeFile(join(directory, '.env.example'), 'OPENROUTER_API_KEY=PREENCHER');
  await initializeConfig(directory);
  await writeFile(join(directory, '.env'), 'OPENROUTER_API_KEY=segredo-teste');
  const results = await initializeConfig(directory);
  assert.ok(results.includes('Preservado: .env'));
  assert.equal(await readFile(join(directory, '.env'), 'utf8'), 'OPENROUTER_API_KEY=segredo-teste');
});

test('falha numa conciliação não apaga valores já confirmados', async () => {
  const { study } = await prepareStudy();
  const initial = await runFixture(study, { usage: false }, () => metadataResponse({ native_tokens_prompt: null, native_tokens_completion: null }));
  assert.equal(initial.records[0].cost_usd, 0.002);
  assert.equal(initial.records[0].telemetry_status, 'PENDENTE');
  const recovered = await recoverBatch(initial.batchDirectory, {
    apiKey: 'secret-test-key', metadataAttempts: 1,
    fetchImpl: async () => Response.json({ error: 'Unavailable' }, { status: 503 }),
  });
  assert.equal(recovered.records[0].cost_usd, 0.002);
  assert.equal(recovered.records[0].telemetry_status, 'PENDENTE');
});

test('todos os temas reutilizam os seis pontos canônicos e fontes específicas', async () => {
  const { directory, config, configPath } = await prepareStudy();
  const topics = [];
  for (const id of ['B01', 'B02', 'N01', 'N02']) {
    const sourceFile = join(directory, `${id}.md`);
    await writeFile(sourceFile, `# ${id}-F1 - Fonte sintética do teste ${id}\nTrecho exclusivo do tema ${id}.`);
    topics.push({ id, source_file: sourceFile, sources_reviewed: true });
  }
  await writeFile(configPath, JSON.stringify({ ...config, topics }));
  const study = await loadStudy(configPath, repositoryRoot);
  assert.equal(study.materials.length, 4);
  for (const material of study.materials) {
    const userMessage = material.messages[1].content;
    assert.equal((userMessage.match(/^\d\. /gm) ?? []).length, 6);
    assert.match(userMessage, new RegExp(`Trecho exclusivo do tema ${material.topic}`));
    assert.match(material.messages[0].content, /800 e 1\.200 palavras/);
    assert.equal(material.source_sha256.length, 64);
    assert.equal(material.prompt_sha256.length, 64);
  }
});

test('stream malformado preserva o bruto e a tentativa, sem sucesso falso', async () => {
  const { study } = await prepareStudy();
  const result = await runFixture(study, () => new Response('data: JSON QUEBRADO\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream', 'x-generation-id': 'gen-test' } }));
  assert.equal(result.records[0].operational_status, 'erro');
  assert.equal(result.records[0].ready_for_comparison, false);
  const raw = await readFile(join(result.batchDirectory, 'comprovantes', result.records[0].execution_id, 'resposta.sse'), 'utf8');
  assert.match(raw, /JSON QUEBRADO/);
});

test('recuperar não inventa tempo perdido após encerramento abrupto', async () => {
  const { study } = await prepareStudy();
  const initial = await runFixture(study);
  const evidenceDirectory = join(initial.batchDirectory, 'comprovantes', initial.records[0].execution_id);
  const transport = JSON.parse(await readFile(join(evidenceDirectory, 'transporte.json'), 'utf8'));
  await writeFile(join(evidenceDirectory, 'transporte.json'), JSON.stringify({ ...transport, duration_seconds: null, ended_at: null, first_text_seconds: null, operational_status: 'desconhecido' }));
  await writeFile(join(evidenceDirectory, 'metricas.json'), JSON.stringify({ ...initial.records[0], telemetry_status: 'PENDENTE' }));
  const recovered = await recoverBatch(initial.batchDirectory, { apiKey: 'secret-test-key', metadataAttempts: 1, fetchImpl: async () => metadataResponse() });
  assert.equal(recovered.records[0].duration_seconds, null);
  assert.equal(recovered.records[0].first_text_seconds, null);
  assert.equal(recovered.records[0].telemetry_status, 'PENDENTE');
  assert.equal(recovered.records[0].cost_usd, 0.002);
});
