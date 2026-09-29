import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { writeJson, replaceDerivedFile } from './artifacts.mjs';
import { sha256 } from './config.mjs';
import { readJsonIfPresent, runHerdrJob } from './herdr.mjs';
import { fixedItems, judgmentSchema, pedagogicalCertificate, renderJudgePrompt, roleFamily, validateJudgment } from './judgments.mjs';
import { consolidateResults } from './consolidation.mjs';

const templates = { JC: 'avaliar-ciencia.md', JP: 'avaliar-pedagogia.md', JT: 'apurar-tecnologia.md', JE: 'apurar-tempo-custo.md' };
const passes = ['JC1', 'JC2', 'JP1', 'JP2', 'JT', 'JE'];

export function validateJudgeConfig(config) {
  if (!config || typeof config.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(config.model)) throw new Error('Informe --modelo-juiz com o ID do modelo Codex.');
  if (!['low', 'medium', 'high', 'xhigh'].includes(config.reasoning_effort)) throw new Error('Esforço do juiz inválido.');
  if (!Number.isSafeInteger(config.timeout_seconds) || config.timeout_seconds < 1 || config.timeout_seconds > 3600) throw new Error('Timeout do juiz deve estar entre 1 e 3600 segundos.');
}

async function readTextIfPresent(path) {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function topicSection(document, topic) {
  const section = document.split(/(?=^## )/m).find((part) => part.startsWith(`## ${topic} -`));
  if (!section) throw new Error(`Gabarito de ${topic} não encontrado.`);
  return section;
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
  if (result.role !== 'JE') return;
  const operational = minimumTechnicalResult(completed.JT.result);
  const normal = operational.STATUS_OPERACIONAL === 'conclusão normal';
  const unknown = operational.STATUS_OPERACIONAL === 'desconhecido';
  const record = execution.record;
  const expected = {
    LATENCIA_TOTAL_S: normal ? record.duration_seconds : null,
    PRIMEIRO_TEXTO_S: record.first_text_seconds,
    TEMPO_ATE_FALHA_S: !normal && !unknown ? record.duration_seconds : null,
    TOKENS_ENTRADA: record.prompt_tokens, TOKENS_SAIDA: record.completion_tokens,
    CUSTO_GERACAO_BRL: record.cost_brl,
  };
  for (const [id, value] of Object.entries(expected)) {
    const received = result.items.find((item) => item.id === id).value;
    const expectedValue = value ?? null;
    if (expectedValue === null ? received !== null : typeof received !== 'number' || Math.abs(received - expectedValue) > 0.000001) throw new Error(`${id}: medida incompatível com o comprovante.`);
  }
}

async function freezeInputs(batchDirectory, repositoryRoot, config, runtime) {
  const statePath = join(batchDirectory, 'privado/julgamento.json');
  const previous = await readJsonIfPresent(statePath);
  if (previous) {
    if (config && JSON.stringify(previous.config) !== JSON.stringify(config)) throw new Error('Configuração dos juízes mudou; retome sem alterar modelo ou esforço.');
    if (runtime && previous.runtime && runtime.codex_version !== previous.runtime.codex_version) throw new Error('A versão do Codex mudou desde o início do julgamento; não misture configurações silenciosamente.');
    return previous;
  }
  validateJudgeConfig(config);
  const batch = await readJsonIfPresent(join(batchDirectory, 'batch.json'));
  if (batch?.condition !== 'openrouter-v1' || batch.schema_version !== 1 || !Array.isArray(batch.executions)) throw new Error('Lote OpenRouter inválido.');
  const protocol = await readFile(join(batchDirectory, 'privado/protocolo.md'), 'utf8');
  if (!protocol.includes('3.2')) throw new Error('O julgamento automático exige protocolo 3.2 arquivado.');
  const documents = {};
  for (const [role, filename] of Object.entries(templates)) documents[role] = await readFile(join(repositoryRoot, 'prompts', filename), 'utf8');
  documents.consolidation = await readFile(join(repositoryRoot, 'prompts/consolidar-resultados.md'), 'utf8');
  documents.schema = await readFile(join(repositoryRoot, 'referencias/resultados-e-registros.md'), 'utf8');
  const answerKeys = await readFile(join(repositoryRoot, 'referencias/gabaritos-conceituais.md'), 'utf8');
  const executions = [];
  for (const execution of batch.executions) {
    if (!/^E\d{20}$/.test(execution.execution_id)) throw new Error('ID de execução inválido no lote.');
    if (!batch.config.models.some((model) => model.id === execution.system_id)) throw new Error('Execução sem modelo correspondente no manifesto.');
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
    executions.push({
      execution_id: execution.execution_id, system_id: execution.system_id, topic: execution.topic, round: execution.round,
      codes, record, content, messages, answer_key: topicSection(answerKeys, execution.topic),
      content_sha256: content === null ? null : sha256(content),
      identity_concern: content === null ? null : identityConcern(content, batch.config.models),
    });
  }
  const state = {
    schema_version: 1, config, runtime, frozen_at: new Date().toISOString(), phase: batch.config.phase,
    protocol, documents, executions, models: batch.config.models,
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
  if (family === 'JC') return { ...base, pedido_e_fontes: execution.messages, gabarito: execution.answer_key, resposta: execution.content };
  if (family === 'JP') return {
    ...base, pedido_e_fontes: execution.messages, resposta: execution.content,
    certificado: pedagogicalCertificate(identity, role === 'JP1' ? 'JC1' : 'JC2'),
  };
  if (family === 'JT') return {
    ...base, execucao: execution.execution_id, pedido_e_fontes: execution.messages, original: execution.content,
    registro_operacional: operationalInput(execution.record), testes: 'Não foram executados verificadores formais; registre modalidade LLM. F5 exige revisão humana ainda não realizada: F5 e T2 do ramo explicação permanecem N/A.',
  };
  return {
    ...base, execucao: execution.execution_id, situacao_conferida_por_JT: minimumTechnicalResult(completed.JT.result),
    medidas: resourceInput(execution.record), metas: 'N/A - não foram definidas metas E1-E3 neste lote.',
    origem: 'Registros do coletor instrumentado; duração é envio HTTP até fim/falha do stream; custo USD vem de /generation, convertido pelo câmbio registrado.',
    tentativas: 'Uma chamada de geração, sem reenvio automático. Cache/raciocínio detalham tokens e não devem ser somados ao total.',
  };
}

function blockReason(execution, role, completed) {
  if (!execution.record) return 'Registro final ausente; não prova falha nem ausência de início.';
  if (execution.identity_concern && role !== 'JE') return execution.identity_concern;
  if (role.startsWith('JC') || role.startsWith('JP')) {
    if (execution.content === null || execution.record.output_branch === 'sem saída') return 'AUSENTE - não há resposta disponível para julgamento de conteúdo.';
  }
  if (role.startsWith('JP')) {
    const scientificRole = role === 'JP1' ? 'JC1' : 'JC2';
    if (completed[scientificRole]?.result?.status !== 'APTO') return `${scientificRole} sem APTO validado.`;
  }
  if (role === 'JE' && !completed.JT?.result) return 'JT sem parecer válido; situação operacional não conferida.';
  return null;
}

async function judgeExecution(batchDirectory, state, execution, role, completed, options) {
  const identity = { code: execution.codes[role], topic: execution.topic, round: execution.round, role };
  const reason = blockReason(execution, role, completed);
  if (reason) return administrativeResult(identity, role.startsWith('JP') ? 'BLOQUEADO' : reason.startsWith('AUSENTE') ? 'AUSENTE' : 'PENDENTE', reason);
  const taskDirectory = join(batchDirectory, 'juizes/pareceres', role, identity.code);
  const existing = await readJsonIfPresent(join(taskDirectory, 'aceito.json'));
  if (existing) return { ...identity, status: existing.status, executed: true, result: validateJudgment(existing, identity) };
  const rejected = await readJsonIfPresent(join(taskDirectory, 'pendente.json'));
  if (rejected) return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: rejected.reason };
  const input = buildInput(execution, role, completed);
  const prompt = renderJudgePrompt(state.documents[roleFamily(role)], state.protocol, input);
  const result = await options.runJob(taskDirectory, { prompt, schema: judgmentSchema, config: state.config }, options);
  await mkdir(taskDirectory, { recursive: true, mode: 0o700 });
  try {
    validateJudgment(result, identity);
    validateResourceValues(result, execution, completed);
  }
  catch (error) {
    await writeJson(join(taskDirectory, 'pendente.json'), { reason: error.message, raw_result: result });
    return { ...identity, status: 'PENDENTE', executed: true, result: null, reason: error.message };
  }
  await writeJson(join(taskDirectory, 'aceito.json'), result);
  await writeFile(join(taskDirectory, 'parecer.md'), result.report, { flag: 'wx', mode: 0o600 });
  if (role.startsWith('JP')) await writeJson(join(taskDirectory, 'certificado.json'), input.certificado);
  return { ...identity, status: result.status, executed: true, result };
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
    const state = await freezeInputs(batchDirectory, options.repositoryRoot, options.config, options.runtime);
    const runnerOptions = { ...options, runJob: options.runJob ?? runHerdrJob };
    const completed = Object.fromEntries(state.executions.map((execution) => [execution.execution_id, {}]));
    for (const role of passes) {
      const ordered = role.endsWith('2') ? state.executions.toReversed() : state.executions;
      for (const execution of ordered) {
        if (options.signal?.aborted) throw new Error('Julgamento interrompido; retome pelo diretório deste lote.');
        options.onProgress?.(`${role}: ${execution.codes[role]}`);
        completed[execution.execution_id][role] = await judgeExecution(batchDirectory, state, execution, role, completed[execution.execution_id], runnerOptions);
        await replaceDerivedFile(join(batchDirectory, 'privado/fila-julgamento.json'), `${JSON.stringify(completed, null, 2)}\n`);
      }
    }
    const consolidation = await consolidateResults(batchDirectory, state, completed, runnerOptions);
    return { batchDirectory, completed, consolidation };
  } finally {
    await rm(lock);
  }
}
