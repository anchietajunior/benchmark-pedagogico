import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildRequest, sha256 } from './config.mjs';
import { receiveGeneration, fetchGenerationMetadata } from './openrouter.mjs';
import { measureRecord } from './metrics.mjs';
import { archiveBatch, writeJson, renderEntry, replaceDerivedFile, saveSummary } from './artifacts.mjs';
import { verifyModelEndpoints } from './catalog.mjs';

export function generateExecutionId() {
  let digits = '';
  for (let index = 0; index < 4; index += 1) digits += String(randomInt(100000)).padStart(5, '0');
  return `E${digits}`;
}

function planExecutions(study, catalogChecks) {
  const executions = [];
  const ids = new Set();
  for (let round = 1; round <= study.config.rounds; round += 1) {
    const roundExecutions = [];
    for (const model of study.config.models) {
      for (const material of study.materials) {
        let id = generateExecutionId();
        while (ids.has(id)) id = generateExecutionId();
        ids.add(id);
        roundExecutions.push({
          execution_id: id, system_id: model.id, topic: material.topic, round,
          model: model.model, provider: model.provider,
          expected_provider_name: catalogChecks.find((check) => check.system_id === model.id).provider_name,
          prompt_sha256: material.prompt_sha256, source_sha256: material.source_sha256,
        });
      }
    }
    for (let index = roundExecutions.length - 1; index > 0; index -= 1) {
      const destination = randomInt(index + 1);
      [roundExecutions[index], roundExecutions[destination]] = [roundExecutions[destination], roundExecutions[index]];
    }
    executions.push(...roundExecutions);
  }
  return executions.map((execution, index) => ({ ...execution, order: index + 1 }));
}

async function lookupMetadata(evidenceDirectory, generationId, options) {
  const previous = await readJsonIfPresent(join(evidenceDirectory, 'accounting.json'));
  const received = await fetchGenerationMetadata(generationId, {
    apiKey: options.apiKey, fetchImpl: options.fetchImpl, attempts: options.metadataAttempts ?? 3,
    onAttempt: (evidence) => writeJson(join(evidenceDirectory, `geracao-${randomUUID()}.json`), evidence),
  });
  if (!received) return previous;
  const knownFields = Object.entries(received).filter(([, value]) => value !== null && value !== undefined);
  const combined = { ...previous, ...Object.fromEntries(knownFields) };
  await replaceDerivedFile(join(evidenceDirectory, 'accounting.json'), `${JSON.stringify(combined, null, 2)}\n`);
  return combined;
}

export async function collectExecution(study, batchDirectory, execution, options) {
  const evidenceDirectory = join(batchDirectory, 'comprovantes', execution.execution_id);
  await mkdir(evidenceDirectory, { mode: 0o700 });
  const model = study.config.models.find((candidate) => candidate.id === execution.system_id);
  const material = study.materials.find((candidate) => candidate.topic === execution.topic);
  const request = buildRequest(study.config, model, material);
  if (JSON.stringify(request).includes(options.apiKey)) throw new Error('A chave apareceu no material enviado. Remova-a antes de coletar.');
  await writeJson(join(evidenceDirectory, 'pedido.json'), request);
  await writeJson(join(evidenceDirectory, 'inicio.json'), { execution, prepared_at: new Date().toISOString(), status: 'ENVIO_PREPARADO', request_sha256: sha256(JSON.stringify(request)) });
  const rawResponse = await open(join(evidenceDirectory, 'resposta.sse'), 'wx', 0o600);
  let transport;
  try {
    transport = await receiveGeneration(request, {
      apiKey: options.apiKey,
      timeoutSeconds: study.config.request_timeout_seconds,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      onHeaders: (headers) => writeJson(join(evidenceDirectory, 'http.json'), headers),
      onChunk: (bytes) => rawResponse.writeFile(bytes),
    });
  } finally {
    await rawResponse.close();
  }
  await writeJson(join(evidenceDirectory, 'transporte.json'), transport);
  await writeFile(join(evidenceDirectory, 'resposta.md'), transport.content, { flag: 'wx', mode: 0o600 });
  const metadata = await lookupMetadata(evidenceDirectory, transport.generation_id, options);
  const record = measureRecord(execution, transport, metadata, study.config.usd_brl);
  await writeJson(join(evidenceDirectory, 'metricas-iniciais.json'), record);
  await writeJson(join(evidenceDirectory, 'metricas.json'), record);
  await writeFile(join(batchDirectory, 'entrada', `${execution.execution_id}.md`), renderEntry(record, transport.content, study.config.phase), { flag: 'wx', mode: 0o600 });
  return record;
}

export async function collectBatch(study, options) {
  if (!options.apiKey || options.apiKey.includes('PREENCHER')) throw new Error('Configure OPENROUTER_API_KEY no arquivo .env.');
  const catalogChecks = await verifyModelEndpoints(study.config, options.fetchImpl);
  await mkdir(study.outputDirectory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const batchDirectory = join(study.outputDirectory, `${study.config.batch_name}-${timestamp}-${randomUUID()}`);
  await mkdir(batchDirectory, { mode: 0o700 });
  const batch = {
    schema_version: 1, collector_version: '0.1.0', condition: 'openrouter-v1',
    created_at: new Date().toISOString(), runtime: process.version, platform: process.platform,
    config: study.config, executions: planExecutions(study, catalogChecks),
  };
  await archiveBatch(batchDirectory, batch, study);
  await writeJson(join(batchDirectory, 'privado/catalogo.json'), catalogChecks);
  const records = [];
  await saveSummary(batchDirectory, records, batch.executions.length);
  options.onProgress?.(`Lote: ${batchDirectory}`);
  for (const execution of batch.executions) {
    if (options.signal?.aborted) break;
    options.onProgress?.(`${execution.order}/${batch.executions.length}: ${execution.system_id}, ${execution.topic}, rodada ${execution.round}`);
    const record = await collectExecution(study, batchDirectory, execution, options);
    records.push(record);
    await saveSummary(batchDirectory, records, batch.executions.length);
    options.onProgress?.(`${execution.execution_id}: ${record.operational_status}; telemetria ${record.telemetry_status}`);
    if (record.provider_error) options.onProgress?.(`Erro do provedor ${record.provider_error.code ?? 'sem código'}: ${record.provider_error.message}`);
    if (record.operational_status === 'truncamento' && record.first_text_seconds === null && record.completion_tokens > 0 && record.reasoning_tokens === record.completion_tokens) {
      options.onProgress?.('Limite de saída consumido pelo raciocínio, sem texto de resposta. Confira max_tokens antes de planejar outra coleta.');
    }
    if (record.telemetry_status === 'PENDENTE') options.onProgress?.('Dados pendentes preservados; consulte recuperar após a coleta.');
    if (record.http_status === 401 || record.http_status === 402) {
      options.onProgress?.('Lote interrompido por autenticação ou saldo. As execuções restantes não foram iniciadas.');
      break;
    }
  }
  return { batchDirectory, records, plannedCount: batch.executions.length };
}

async function readJsonIfPresent(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function interruptedTransport(evidenceDirectory) {
  const headers = await readJsonIfPresent(join(evidenceDirectory, 'http.json'));
  return {
    started_at: null, ended_at: null, duration_seconds: null, first_text_seconds: null,
    generation_id: headers?.headers?.['x-generation-id'] ?? null,
    model: null, provider: null, usage: null, content: '', done: false,
    finish_reason: null, native_finish_reason: null, refusal: false,
    response_headers: headers?.headers ?? {}, operational_status: 'desconhecido',
    issues: ['EXECUCAO_INTERROMPIDA_SEM_REGISTRO_FINAL'],
  };
}

export async function recoverBatch(directory, options) {
  if (!options.apiKey || options.apiKey.includes('PREENCHER')) throw new Error('Configure OPENROUTER_API_KEY no arquivo .env.');
  const batchDirectory = resolve(directory);
  const batch = JSON.parse(await readFile(join(batchDirectory, 'batch.json'), 'utf8'));
  if (batch.schema_version !== 1 || batch.condition !== 'openrouter-v1' || !Array.isArray(batch.executions)) throw new Error('Diretório não contém um lote OpenRouter compatível.');
  const existingDirectories = new Set(await readdir(join(batchDirectory, 'comprovantes')));
  const records = [];
  for (const execution of batch.executions) {
    if (!/^E\d{20}$/.test(execution.execution_id)) throw new Error('ID inválido no manifesto.');
    if (!existingDirectories.has(execution.execution_id)) continue;
    const evidenceDirectory = join(batchDirectory, 'comprovantes', execution.execution_id);
    const previous = await readJsonIfPresent(join(evidenceDirectory, 'metricas.json'));
    if (previous?.telemetry_status === 'COMPLETA') {
      records.push(previous);
      continue;
    }
    const transport = await readJsonIfPresent(join(evidenceDirectory, 'transporte.json')) ?? await interruptedTransport(evidenceDirectory);
    const metadata = await lookupMetadata(evidenceDirectory, transport.generation_id, options);
    const record = measureRecord(execution, transport, metadata, batch.config.usd_brl);
    await writeJson(join(evidenceDirectory, `conciliacao-${randomUUID()}.json`), { recorded_at: new Date().toISOString(), record });
    await replaceDerivedFile(join(evidenceDirectory, 'metricas.json'), `${JSON.stringify(record, null, 2)}\n`);
    records.push(record);
  }
  await saveSummary(batchDirectory, records, batch.executions.length);
  return { batchDirectory, records, plannedCount: batch.executions.length };
}
