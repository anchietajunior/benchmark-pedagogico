import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonIfPresent, writeJson, replaceDerivedFile } from './artifacts.mjs';
import { sha256 } from './config.mjs';
import { readArchivedClaudeResult, runClaudeJob } from './claude-judge.mjs';
import { fixedItems, optionalItems, judgmentSchemaFor, pedagogicalCertificate, renderJudgePrompt, roleFamily, validateJudgment } from './judgments.mjs';
import { consolidateResults } from './consolidation.mjs';
import { recoverValidItems } from './judgment-recovery.mjs';
import { operationalValues, resourceValues, recordedItems } from './record-results.mjs';
import { sourceCoverage, answerKeySection } from './source-coverage.mjs';
import { executionDiscardReason, discardUnfinishedJudgment } from './pipeline-completion.mjs';
import { scientificScore } from './scientific-score.mjs';
import { academicDomains, effectiveScientificStatus, externalCandidates, externalRoles, externalSchemaFor, materialAdherence, renderExternalPrompt, validateExternalJudgment } from './external-verification.mjs';

const templates = { JC: 'avaliar-ciencia.md', JP: 'avaliar-pedagogia.md', JT: 'apurar-tecnologia.md', JE: 'apurar-tempo-custo.md' };
const passes = ['JC1', 'JC2', 'JX1', 'JX2', 'JP1', 'JP2', 'JT', 'JE'];
const externalTemplate = 'verificar-externo.md';

export function validateJudgeConfig(config) {
  if (!config || typeof config.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(config.model)) throw new Error('Informe --modelo-juiz com o ID do modelo Claude.');
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(config.reasoning_effort)) throw new Error('Esforço do juiz inválido.');
  if (!Number.isSafeInteger(config.timeout_seconds) || config.timeout_seconds < 1 || config.timeout_seconds > 3600) throw new Error('Timeout do juiz deve estar entre 1 e 3600 segundos.');
}

async function readTextIfPresent(path) {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export function identityConcern(content, models) {
  const identities = models.flatMap((model) => [model.model, model.model.split('/')[1], model.provider]).filter((value) => value.length >= 6);
  const normalized = content.toLocaleLowerCase();
  if (identities.some((identity) => normalized.includes(identity.toLocaleLowerCase()))) return 'Identidade possível no conteúdo; exige anonimização humana antes de JC/JP.';
  if (/\b(?:OpenAI|Anthropic|ChatGPT|Claude|Gemini|DeepSeek|GPT[- ]\d|OpenRouter)\b/i.test(content)) return 'Autoria possível no conteúdo; original preservado para revisão humana.';
  return null;
}

export function operationalInput(record) {
  return {
    iniciada: true,
    status_operacional: record.operational_status,
    ramo_saida: record.output_branch,
    ocorrencias: record.issues.filter((issue) => /STREAM|SSE|HTTP|TIMEOUT|ABORT|TRUNC|CONTENT|FINISH|ERROR/.test(issue)),
  };
}

export function resourceInput(record) {
  const fields = ['duration_seconds', 'first_text_seconds', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'cached_tokens', 'reasoning_tokens', 'cost_usd', 'cost_brl', 'cost_source', 'exchange_rate', 'token_source', 'telemetry_status'];
  return Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));
}

function validateResourceValues(result, execution, completed) {
  if (!['JE', 'JT'].includes(result.role)) return;
  const expected = result.role === 'JE' ? resourceValues(execution) : operationalValues(execution);
  for (const [id, value] of Object.entries(expected)) {
    if (result.role === 'JE' && ['ORIGEM_CUSTO', 'METAS_VERSAO'].includes(id)) continue;
    const item = result.items.find((item) => item.id === id);
    if (!item && optionalItems.JE.includes(id)) continue;
    const received = item.value;
    if (id === 'RAMO_SAIDA' && compatibleOutputBranch(received, execution)) continue;
    const expectedValue = value ?? null;
    const matches = typeof expectedValue === 'number' ? typeof received === 'number' && Math.abs(received - expectedValue) <= 0.000001 : received === expectedValue;
    if (!matches) throw new Error(`${id}: medida incompatível com o comprovante.`);
  }
}

function compatibleOutputBranch(branch, execution) {
  const expected = execution.record?.output_branch ?? 'desconhecido';
  if (branch === expected) return true;
  const emptyBranches = ['sem saída', 'texto vazio'];
  return !execution.content?.trim() && emptyBranches.includes(branch) && emptyBranches.includes(expected);
}

export async function freezeExecution(batchDirectory, execution, models, answerKey) {
  if (!/^E\d{20}$/.test(execution.execution_id)) throw new Error('ID de execução inválido no lote.');
  if (!models.some((model) => model.id === execution.system_id)) throw new Error('Execução sem modelo correspondente no manifesto.');
  const evidence = join(batchDirectory, 'comprovantes', execution.execution_id);
  const request = await readJsonIfPresent(join(evidence, 'pedido.json'));
  const record = await readJsonIfPresent(join(evidence, 'metricas.json'));
  const content = await readTextIfPresent(join(evidence, 'resposta.md'));
  if (request && sha256(JSON.stringify(request.messages)) !== execution.prompt_sha256) throw new Error('Pedido diverge do hash arquivado.');
  if (record && record.execution_id !== execution.execution_id) throw new Error('Métricas de outra execução.');
  const material = await readJsonIfPresent(join(batchDirectory, 'privado/pedidos', `${execution.topic}.json`));
  const messages = request?.messages ?? material?.messages;
  if (!messages?.length) throw new Error('Pedido efetivo indisponível para o julgamento.');
  const codes = Object.fromEntries(passes.map((role) => [role, `Q${randomUUID().replaceAll('-', '')}`]));
  return {
    execution_id: execution.execution_id, system_id: execution.system_id, topic: execution.topic, round: execution.round,
    codes, record, content, messages, answer_key: answerKey,
    content_sha256: content === null ? null : sha256(content),
    identity_concern: content === null ? null : identityConcern(content, models),
  };
}

async function freezeInputs(batchDirectory, repositoryRoot, config, runtime) {
  const statePath = join(batchDirectory, 'privado/julgamento.json');
  const previous = await readJsonIfPresent(statePath);
  if (previous) {
    if (config && JSON.stringify(previous.config) !== JSON.stringify(config)) throw new Error('Configuração dos juízes mudou; retome sem alterar modelo ou esforço.');
    if (runtime && previous.runtime && runtime.claude_version !== previous.runtime.claude_version) throw new Error('A versão do Claude Code mudou desde o início do julgamento; não misture configurações silenciosamente.');
    return previous;
  }
  validateJudgeConfig(config);
  const batch = await readJsonIfPresent(join(batchDirectory, 'batch.json'));
  if (batch?.condition !== 'openrouter-v1' || batch.schema_version !== 1 || !Array.isArray(batch.executions)) throw new Error('Lote OpenRouter inválido.');
  const protocol = await readFile(join(batchDirectory, 'privado/protocolo.md'), 'utf8');
  if (!protocol.includes('3.2')) throw new Error('O julgamento automático exige protocolo 3.2 arquivado.');
  const documents = {};
  for (const [role, filename] of Object.entries(templates)) documents[role] = await readFile(join(repositoryRoot, 'prompts', filename), 'utf8');
  documents.JX = await readFile(join(repositoryRoot, 'prompts', externalTemplate), 'utf8');
  documents.consolidation = await readFile(join(repositoryRoot, 'prompts/consolidar-resultados.md'), 'utf8');
  documents.schema = await readFile(join(repositoryRoot, 'referencias/resultados-e-registros.md'), 'utf8');
  const answerKeys = await readFile(join(repositoryRoot, 'referencias/gabaritos-conceituais.md'), 'utf8');
  const executions = [];
  for (const execution of batch.executions) {
    executions.push(await freezeExecution(batchDirectory, execution, batch.config.models, answerKeySection(answerKeys, execution.topic)));
  }
  const state = {
    schema_version: 1, config, runtime, frozen_at: new Date().toISOString(), phase: batch.config.phase,
    protocol, documents, executions, models: batch.config.models, pedagogy: 'cega',
    limitation: 'Kit de julgamento congelado neste instante; não comprova uso anterior. Sem ferramentas ou navegação. Revisão humana pendente.',
  };
  await writeJson(statePath, state);
  return state;
}

function administrativeResult(identity, status, reason) {
  return { ...identity, status, executed: false, reason, result: null };
}

function minimumTechnicalResult(result) {
  return Object.fromEntries(['INICIADA', 'STATUS_OPERACIONAL', 'RAMO_SAIDA'].map((id) => [id, result.items.find((item) => item.id === id).value]));
}

function buildInput(execution, role, completed) {
  const identity = { code: execution.codes[role], topic: execution.topic, round: execution.round, role };
  const family = roleFamily(role);
  const base = { ...identity, required_items: fixedItems[family] };
  if (family === 'JC') return { ...base, pedido_e_fontes: execution.messages, gabarito: execution.answer_key, resposta: execution.content, cobertura_fontes: sourceCoverage(execution.messages, execution.answer_key, execution.topic) };
  if (family === 'JP') return {
    ...base, pedido_e_fontes: execution.messages, resposta: execution.content,
    certificado: pedagogicalCertificate(identity),
  };
  if (family === 'JT') return {
    ...base, execucao: execution.execution_id, pedido_e_fontes: execution.messages, original: execution.content,
    registro_operacional: operationalInput(execution.record), testes: 'Não foram executados verificadores formais; registre modalidade LLM. F5 exige revisão humana ainda não realizada: F5 e T2 do ramo explicação permanecem N/A.',
  };
  return {
    ...base, execucao: execution.execution_id, situacao_conferida_por_JT: completed.JT?.result ? minimumTechnicalResult(completed.JT.result) : operationalValues(execution),
    origem_situacao_operacional: completed.JT?.result ? 'JT validado' : 'Registro do coletor; parecer JT incompleto, sem inferência pelo JE.',
    medidas: resourceInput(execution.record), metas: 'N/A - não foram definidas metas E1-E3 neste lote.',
    origem: 'Registros do coletor instrumentado; duração é envio HTTP até fim/falha do stream; custo USD vem de /generation, convertido pelo câmbio registrado.',
    tentativas: 'Uma chamada de geração, sem reenvio automático. Cache/raciocínio detalham tokens e não devem ser somados ao total.',
  };
}

function blockReason(role, completed) {
  if (role === 'JE' && !completed.JT?.result) return 'JT sem parecer válido; medidas brutas preservadas pelos registros do coletor.';
  return null;
}

async function validateSavedResult(taskDirectory, result, identity, execution, completed) {
  const sourceHash = sha256(JSON.stringify(result));
  let outcome;
  try {
    validateJudgment(result, identity);
    validateResourceValues(result, execution, completed);
    outcome = { ...identity, status: result.status, executed: true, result, revalidated: true };
  } catch (error) {
    let partialItems = recoverValidItems(result, identity);
    if (['JE', 'JT'].includes(identity.role)) {
      const recorded = identity.role === 'JE' ? resourceValues(execution) : operationalValues(execution);
      const branch = partialItems.find((item) => item.id === 'RAMO_SAIDA')?.value;
      const branchCompatible = identity.role !== 'JT' || compatibleOutputBranch(branch, execution);
      partialItems = partialItems.filter((item) => item.id === 'RAMO_SAIDA' ? branchCompatible : !Object.hasOwn(recorded, item.id) || item.value === recorded[item.id]);
      if (identity.role === 'JT') {
        const technicalScore = recordedItems(execution, 'JT').find((item) => item.id === 'T1')?.score ?? null;
        partialItems = partialItems.filter((item) => (item.id !== 'T1' || item.score === technicalScore) && (branchCompatible || !/^(T2|FP?\d)$/.test(item.id)));
      }
    }
    outcome = { ...identity, status: 'PENDENTE', executed: true, result: null, partial_items: partialItems, reason: error.message, revalidated: true };
  }
  const validation = { validator_version: 'judgment-recovery-v1', source_sha256: sourceHash, outcome };
  const revision = `${sha256(JSON.stringify(validation))}.json`;
  await mkdir(join(taskDirectory, 'revalidacoes'), { recursive: true, mode: 0o700 });
  try { await writeJson(join(taskDirectory, 'revalidacoes', revision), validation); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const current = { ...outcome, validation_file: `juizes/pareceres/${identity.role}/${identity.code}/revalidacoes/${revision}` };
  await replaceDerivedFile(join(taskDirectory, 'revalidado.json'), `${JSON.stringify({ ...validation, outcome: current }, null, 2)}\n`);
  return current;
}

async function judgeExecution(batchDirectory, state, execution, role, completed, options) {
  const identity = { code: execution.codes[role], topic: execution.topic, round: execution.round, role };
  const taskDirectory = join(batchDirectory, 'juizes/pareceres', role, identity.code);
  const discardReason = executionDiscardReason(execution);
  const reason = discardReason ?? blockReason(role, completed);
  if (reason) {
    const previousLaunch = await readJsonIfPresent(join(taskDirectory, 'envio.json'));
    const previousAccepted = await readJsonIfPresent(join(taskDirectory, 'aceito.json'));
    const previousRejected = await readJsonIfPresent(join(taskDirectory, 'pendente.json'));
    const historicalExecution = Boolean(previousLaunch || previousAccepted || previousRejected?.executed || previousRejected?.raw_result);
    const status = discardReason ? 'DESCARTADO' : role.startsWith('JP') ? 'BLOQUEADO' : 'PENDENTE';
    return { ...administrativeResult(identity, status, reason), historical_execution: historicalExecution };
  }
  const existing = await readJsonIfPresent(join(taskDirectory, 'aceito.json'));
  if (existing) return validateSavedResult(taskDirectory, existing, identity, execution, completed);
  const rejected = await readJsonIfPresent(join(taskDirectory, 'pendente.json'));
  if (rejected?.raw_result) return validateSavedResult(taskDirectory, rejected.raw_result, identity, execution, completed);
  if (rejected && !options.localOnly) await rm(join(taskDirectory, 'pendente.json'));
  else if (rejected || options.localOnly) {
    if (await readJsonIfPresent(join(taskDirectory, 'concluido.json'))) {
      try {
        const archived = await readArchivedClaudeResult(taskDirectory);
        return await validateSavedResult(taskDirectory, archived, identity, execution, completed);
      } catch (error) { return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: error.message }; }
    }
    if (rejected) return { ...identity, status: 'PENDENTE', executed: rejected.executed ?? true, result: null, reason: rejected.reason };
    return administrativeResult(identity, 'PENDENTE', 'Sem parecer arquivado; a revalidação local não inicia chamadas.');
  }
  const input = buildInput(execution, role, completed);
  const launch = await readJsonIfPresent(join(taskDirectory, 'envio.json'));
  const prompt = launch ? await readFile(join(taskDirectory, 'pedido.md'), 'utf8') : renderJudgePrompt(state.documents[roleFamily(role)], state.protocol, input);
  const schema = launch ? await readJsonIfPresent(join(taskDirectory, 'schema.json')) : judgmentSchemaFor(identity);
  if (!schema) throw new Error('Schema do julgamento enviado está ausente; preserve o lote para recuperação.');
  let result;
  try { result = await options.runJob(taskDirectory, { prompt, schema, config: state.config }, { ...options, label: `${role}: ${identity.code}` }); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    await mkdir(taskDirectory, { recursive: true, mode: 0o700 });
    const completion = await readJsonIfPresent(join(taskDirectory, 'concluido.json'));
    const launch = await readJsonIfPresent(join(taskDirectory, 'envio.json'));
    if (completion || !launch) await writeJson(join(taskDirectory, 'pendente.json'), { reason: error.message, raw_result: null, executed: Boolean(launch) });
    return { ...identity, status: 'PENDENTE', executed: Boolean(launch), result: null, reason: error.message };
  }
  await mkdir(taskDirectory, { recursive: true, mode: 0o700 });
  try {
    validateJudgment(result, identity);
    validateResourceValues(result, execution, completed);
  }
  catch (error) {
    await writeJson(join(taskDirectory, 'pendente.json'), { reason: error.message, raw_result: result });
    return validateSavedResult(taskDirectory, result, identity, execution, completed);
  }
  await writeJson(join(taskDirectory, 'aceito.json'), result);
  await writeFile(join(taskDirectory, 'parecer.md'), result.report, { flag: 'wx', mode: 0o600 });
  if (role.startsWith('JP')) await writeJson(join(taskDirectory, 'certificado.json'), input.certificado);
  return validateSavedResult(taskDirectory, result, identity, execution, completed);
}

// Lotes congelados antes do JX recebem o metaprompt e códigos anônimos das novas passagens,
// sem alterar pedidos, respostas ou pareceres já arquivados.
async function ensureExternalStage(batchDirectory, repositoryRoot, state) {
  const missingCodes = state.executions.some((execution) => !execution.codes.JX1 || !execution.codes.JX2);
  if (state.documents.JX && !missingCodes) return ensureBlindPedagogy(batchDirectory, state);
  if (!repositoryRoot) throw new Error('Lote sem etapa JX; informe o repositório para acrescentá-la.');
  const documents = { ...state.documents, JX: state.documents.JX ?? await readFile(join(repositoryRoot, 'prompts', externalTemplate), 'utf8') };
  const executions = state.executions.map((execution) => ({
    ...execution,
    codes: { ...execution.codes, JX1: execution.codes.JX1 ?? `Q${randomUUID().replaceAll('-', '')}`, JX2: execution.codes.JX2 ?? `Q${randomUUID().replaceAll('-', '')}` },
  }));
  const extensions = [...(state.extensions ?? []), { stage: 'JX', added_at: new Date().toISOString(), protocol: '3.3', note: 'Verificação externa acrescentada após o congelamento; pareceres anteriores preservados.' }];
  const migrated = { ...state, documents, executions, extensions };
  await replaceDerivedFile(join(batchDirectory, 'privado/julgamento.json'), `${JSON.stringify(migrated, null, 2)}\n`);
  return ensureBlindPedagogy(batchDirectory, migrated);
}

// Lotes julgados com JP condicionado ao APTO recebem novos códigos JP para a avaliação cega (protocolo 3.4);
// os pareceres anteriores continuam nos diretórios dos códigos antigos, listados na extensão.
async function ensureBlindPedagogy(batchDirectory, state) {
  if (state.pedagogy === 'cega') return state;
  const previousCodes = Object.fromEntries(state.executions.map((execution) => [execution.execution_id, { JP1: execution.codes.JP1, JP2: execution.codes.JP2 }]));
  const executions = state.executions.map((execution) => ({
    ...execution, codes: { ...execution.codes, JP1: `Q${randomUUID().replaceAll('-', '')}`, JP2: `Q${randomUUID().replaceAll('-', '')}` },
  }));
  const extensions = [...(state.extensions ?? []), { stage: 'JP-cego', added_at: new Date().toISOString(), protocol: '3.4', note: 'JP passa a avaliar toda resposta completa sem conhecer a decisão científica; pareceres JP anteriores preservados sob os códigos antigos.', previous_codes: previousCodes }];
  const migrated = { ...state, executions, extensions, pedagogy: 'cega' };
  await replaceDerivedFile(join(batchDirectory, 'privado/julgamento.json'), `${JSON.stringify(migrated, null, 2)}\n`);
  return migrated;
}

async function readExternalResult(taskDirectory, identity, candidates) {
  const accepted = await readJsonIfPresent(join(taskDirectory, 'aceito.json'));
  if (accepted) return validateExternalJudgment(accepted, identity, candidates);
  const archived = await readArchivedClaudeResult(taskDirectory);
  return validateExternalJudgment(archived, identity, candidates);
}

// --reverificar: verificações com SEM_EVIDÊNCIA ou sem parecer válido são movidas para juizes/pareceres/JXn/arquivo
// e refeitas; decisões CONFIRMADA/CONTRADITA ficam como estão.
async function archiveUnresolvedExternal(batchDirectory, role, code, taskDirectory) {
  const accepted = await readJsonIfPresent(join(taskDirectory, 'aceito.json'));
  const launched = await readJsonIfPresent(join(taskDirectory, 'envio.json'));
  if (!accepted && !launched) return;
  if (accepted && accepted.status === 'CONCLUÍDO' && accepted.items.every((item) => item.value !== 'SEM_EVIDÊNCIA')) return;
  const archive = join(batchDirectory, 'juizes/pareceres', role, 'arquivo');
  await mkdir(archive, { recursive: true, mode: 0o700 });
  await rename(taskDirectory, join(archive, `${code}-${new Date().toISOString().replaceAll(':', '-')}`));
}

async function judgeExternal(batchDirectory, state, execution, role, completed, options) {
  const identity = { code: execution.codes[role], topic: execution.topic, round: execution.round, role };
  const scientific = completed[externalRoles[role]];
  const candidates = externalCandidates(scientific?.result);
  if (!candidates.length) return { ...administrativeResult(identity, 'NÃO APLICÁVEL', `${externalRoles[role]} sem afirmações pendentes elegíveis para verificação externa.`) };
  const taskDirectory = join(batchDirectory, 'juizes/pareceres', role, identity.code);
  if (options.reverify && !options.localOnly) await archiveUnresolvedExternal(batchDirectory, role, identity.code, taskDirectory);
  const hasArchive = await readJsonIfPresent(join(taskDirectory, 'aceito.json')) || await readJsonIfPresent(join(taskDirectory, 'concluido.json'));
  if (hasArchive || options.localOnly) {
    if (!hasArchive) return administrativeResult(identity, 'PENDENTE', 'Sem verificação externa arquivada; a revalidação local não inicia chamadas.');
    try { const result = await readExternalResult(taskDirectory, identity, candidates); return { ...identity, status: result.status, executed: true, result }; }
    catch (error) { if (options.localOnly) return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: error.message }; }
  }
  const input = { ...identity, resposta: execution.content, afirmacoes_pendentes: candidates };
  const job = { prompt: renderExternalPrompt(state.documents.JX, input), schema: externalSchemaFor(identity, candidates), config: state.config, web_domains: academicDomains };
  let result;
  try { result = await options.runJob(taskDirectory, job, { ...options, label: `${role}: ${identity.code}` }); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: error.message };
  }
  await mkdir(taskDirectory, { recursive: true, mode: 0o700 });
  try { validateExternalJudgment(result, identity, candidates); }
  catch (error) {
    await replaceDerivedFile(join(taskDirectory, 'pendente.json'), `${JSON.stringify({ reason: error.message, raw_result: result }, null, 2)}\n`);
    return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: error.message };
  }
  await writeJson(join(taskDirectory, 'aceito.json'), result);
  await replaceDerivedFile(join(taskDirectory, 'parecer.md'), result.report);
  return { ...identity, status: result.status, executed: true, result };
}

// Aplica a decisão do JX ao parecer científico em memória; o parecer arquivado do JC não é alterado.
export function finalizeScientific(scientific, external) {
  const adherence = materialAdherence(scientific.result);
  let judgment = { ...scientific, material_adherence: adherence, scientific_score: scientificScore(scientific.result, external?.result) };
  if (scientific.result && external?.result) {
    const status = effectiveScientificStatus(scientific.result, external.result);
    if (status !== scientific.result.status) {
      const items = scientific.result.items.map((item) => item.id === 'SITUACAO_CIENTIFICA' ? { ...item, value: status, evidence: `${item.evidence} Decisão após verificação externa ${external.role} (${external.code}).` } : item);
      judgment = { ...judgment, status, original_status: scientific.status, external_verification: external.code, result: { ...scientific.result, status, items } };
    }
  }
  return discardUnfinishedJudgment(judgment);
}

async function acquireLock(path) {
  try { await writeJson(path, { pid: process.pid, created_at: new Date().toISOString() }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Lote já tem uma trava de julgamento. Se o coordenador morreu, confira seu PID e remova apenas privado/julgamento.lock antes de retomar.');
    throw error;
  }
}

export async function judgeBatch(directory, options = {}) {
  const batchDirectory = resolve(directory);
  const lock = join(batchDirectory, 'privado/julgamento.lock');
  await acquireLock(lock);
  try {
    const state = await ensureExternalStage(batchDirectory, options.repositoryRoot, await freezeInputs(batchDirectory, options.repositoryRoot, options.config, options.runtime));
    const coverage = state.executions.map((execution) => sourceCoverage(execution.messages, execution.answer_key, execution.topic));
    await replaceDerivedFile(join(batchDirectory, 'privado/cobertura-fontes.json'), `${JSON.stringify(coverage, null, 2)}\n`);
    const runnerOptions = { ...options, runJob: options.runJob ?? runClaudeJob };
    const completed = Object.fromEntries(state.executions.map((execution) => [execution.execution_id, {}]));
    const judgeInQueue = async (execution, role) => {
      if (options.signal?.aborted) throw new Error('Julgamento interrompido; retome pelo diretório deste lote.');
      options.onProgress?.(`${role}: ${execution.codes[role]}`);
      const judgments = completed[execution.execution_id];
      const external = role.startsWith('JX');
      try { judgments[role] = await (external ? judgeExternal : judgeExecution)(batchDirectory, state, execution, role, judgments, runnerOptions); }
      catch (error) {
        if (options.signal?.aborted) throw error;
        judgments[role] = administrativeResult({ code: execution.codes[role], topic: execution.topic, round: execution.round, role }, 'PENDENTE', `Arquivo ou contrato indisponível: ${error.message}`);
      }
      // O JC só é descartado depois do JX correspondente, que pode resolver as pendências.
      if (external) judgments[externalRoles[role]] = finalizeScientific(judgments[externalRoles[role]], judgments[role]);
      if (!role.startsWith('JC')) judgments[role] = discardUnfinishedJudgment(judgments[role]);
      const judgment = judgments[role];
      options.onProgress?.(`${role}: ${execution.codes[role]} - ${judgment.status}${judgment.reason ? `: ${judgment.reason}` : ''}`);
      await replaceDerivedFile(join(batchDirectory, 'privado/fila-julgamento.json'), `${JSON.stringify(completed, null, 2)}\n`);
    };
    for (const role of passes) {
      const ordered = role.endsWith('2') ? state.executions.toReversed() : state.executions;
      const outcomes = await Promise.allSettled(ordered.map((execution) => judgeInQueue(execution, role)));
      const failure = outcomes.find((outcome) => outcome.status === 'rejected');
      if (failure) throw failure.reason;
    }
    const consolidation = await consolidateResults(batchDirectory, state, completed, runnerOptions);
    return { batchDirectory, completed, consolidation };
  } finally {
    await rm(lock);
  }
}
