import { appendFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonIfPresent, replaceDerivedFile, saveSummary, writeJson } from './artifacts.mjs';
import { verifyModelEndpoints } from './catalog.mjs';
import { collectExecution, generateExecutionId } from './collector.mjs';
import { freezeExecution } from './pipeline.mjs';

async function readTextIfPresent(path) {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function assertFailedWithoutText(batchDirectory, execution) {
  const evidence = join(batchDirectory, 'comprovantes', execution.execution_id);
  const record = await readJsonIfPresent(join(evidence, 'metricas.json'));
  const content = await readTextIfPresent(join(evidence, 'resposta.md'));
  if (record?.operational_status === 'conclusão normal' || content?.trim()) {
    throw new Error(`${execution.execution_id}: a geração terminou com resposta; só é possível refazer gerações que falharam sem texto.`);
  }
}

async function replaceFrozenExecutions(batchDirectory, models, replacements) {
  const statePath = join(batchDirectory, 'privado/julgamento.json');
  const state = await readJsonIfPresent(statePath);
  if (!state) return;
  const executions = [];
  for (const frozen of state.executions) {
    const replacement = replacements.find((candidate) => candidate.replaced_execution_id === frozen.execution_id);
    executions.push(replacement ? await freezeExecution(batchDirectory, replacement.execution, models, frozen.answer_key) : frozen);
  }
  await replaceDerivedFile(statePath, `${JSON.stringify({ ...state, models, executions }, null, 2)}\n`);
}

async function currentRecords(batchDirectory, executions) {
  const records = [];
  for (const execution of executions) {
    const record = await readJsonIfPresent(join(batchDirectory, 'comprovantes', execution.execution_id, 'metricas.json'));
    if (record) records.push(record);
  }
  return records;
}

export async function replaceFailedSystem(directory, systemId, requestedModel, options) {
  const batchDirectory = resolve(directory);
  const batch = await readJsonIfPresent(join(batchDirectory, 'batch.json'));
  if (batch?.condition !== 'openrouter-v1' || batch.schema_version !== 1 || !Array.isArray(batch.executions)) throw new Error('Diretório não contém um lote OpenRouter compatível.');
  const previousModel = batch.config.models.find((model) => model.id === systemId);
  if (!previousModel) throw new Error(`${systemId} não existe neste lote.`);
  const failedExecutions = batch.executions.filter((execution) => execution.system_id === systemId);
  for (const execution of failedExecutions) await assertFailedWithoutText(batchDirectory, execution);

  const model = { ...previousModel, model: requestedModel.model, provider: requestedModel.provider };
  const models = batch.config.models.map((candidate) => candidate.id === systemId ? model : candidate);
  const config = { ...batch.config, models };
  const [catalogCheck] = await verifyModelEndpoints({ ...config, models: [model] }, options.fetchImpl);
  const usedIds = new Set(batch.executions.map((execution) => execution.execution_id));
  const replacements = failedExecutions.map((execution) => {
    let executionId = generateExecutionId();
    while (usedIds.has(executionId)) executionId = generateExecutionId();
    usedIds.add(executionId);
    return {
      replaced_execution_id: execution.execution_id,
      execution: { ...execution, execution_id: executionId, model: model.model, provider: model.provider, expected_provider_name: catalogCheck.provider_name },
    };
  });

  const replacedAt = new Date().toISOString();
  const replacementRecord = {
    system_id: systemId, previous_model: previousModel, model, replaced_at: replacedAt,
    reason: 'Gerações anteriores terminaram sem texto; nenhuma resposta desse sistema foi julgada.',
    replaced_executions: failedExecutions,
    new_execution_ids: replacements.map((replacement) => replacement.execution.execution_id),
  };
  const executions = batch.executions.map((execution) => replacements.find((replacement) => replacement.replaced_execution_id === execution.execution_id)?.execution ?? execution);
  const updatedBatch = { ...batch, config, executions, replacements: [...(batch.replacements ?? []), replacementRecord] };
  await replaceDerivedFile(join(batchDirectory, 'batch.json'), `${JSON.stringify(updatedBatch, null, 2)}\n`);
  await writeJson(join(batchDirectory, 'privado', `catalogo-${systemId}-${replacedAt.replaceAll(':', '-')}.json`), catalogCheck);
  await appendFile(join(batchDirectory, 'lote.md'), [
    '', '## Substituição de sistema', '',
    `- ${systemId}: ${previousModel.model} substituído por ${model.model} (${model.provider}) em ${replacedAt}.`,
    ...replacements.map((replacement) => `- ${replacement.replaced_execution_id} (sem texto) substituída por ${replacement.execution.execution_id}; comprovantes antigos preservados.`),
    '- Detalhes em batch.json, campo replacements.', '',
  ].join('\n'));

  const study = { config, materials: [] };
  for (const topic of new Set(failedExecutions.map((execution) => execution.topic))) {
    study.materials.push(await readJsonIfPresent(join(batchDirectory, 'privado/pedidos', `${topic}.json`)));
  }
  const records = [];
  for (const { execution } of replacements) {
    options.onProgress?.(`${execution.system_id}, ${execution.topic}, rodada ${execution.round}: ${model.model}`);
    const record = await collectExecution(study, batchDirectory, execution, options);
    records.push(record);
    options.onProgress?.(`${execution.execution_id}: ${record.operational_status}; telemetria ${record.telemetry_status}`);
  }
  await replaceFrozenExecutions(batchDirectory, models, replacements);
  await saveSummary(batchDirectory, await currentRecords(batchDirectory, executions), executions.length);
  return { batchDirectory, records };
}
