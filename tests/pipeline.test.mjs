import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sha256 } from '../coletor/config.mjs';
import { judgeBatch, identityConcern } from '../coletor/pipeline.mjs';
import { fixedItems, roleFamily, validateJudgment, renderJudgePrompt, judgmentSchemaFor, assertSchema } from '../coletor/judgments.mjs';
import { claudeArguments, claudeEnvironment, runClaudeJob } from '../coletor/claude-judge.mjs';
import { buildModelRanking, escapeHtml, renderResultsHtml } from '../coletor/html-report.mjs';
import { recoverValidItems } from '../coletor/judgment-recovery.mjs';
import { openReport } from '../coletor/report-output.mjs';
import { sourceCoverage } from '../coletor/source-coverage.mjs';
import { assessPipelineCompletion, shouldOpenReport, discardUnfinishedJudgment } from '../coletor/pipeline-completion.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const config = { model: 'modelo-teste', reasoning_effort: 'medium', timeout_seconds: 1 };
const executionId = 'E00000000000000000001';
const executeFile = promisify(execFile);

test('decisão científica pendente é descartada e o processamento encerra com exclusões explícitas', () => {
  const state = { executions: [{ execution_id: executionId, system_id: 'S01', topic: 'B01', content: 'Texto.', record: { operational_status: 'conclusão normal', telemetry_status: 'COMPLETA' } }] };
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JC1' };
  const completed = { [executionId]: {
    JC1: discardUnfinishedJudgment({ role: 'JC1', result: judgment(input, 'PENDENTE'), status: 'PENDENTE' }), JC2: { result: judgment({ ...input, role: 'JC2' }, 'CORRIGIR') },
    JP1: { status: 'BLOQUEADO' }, JP2: { status: 'BLOQUEADO' }, JT: { result: { status: 'CONCLUÍDO' } }, JE: { result: { status: 'CONCLUÍDO' } },
  } };
  const completion = assessPipelineCompletion(state, completed);
  assert.equal(completion.status, 'CONCLUÍDO_COM_DESCARTES');
  assert.deepEqual(completion.discards.map((discard) => discard.stage), ['JC1']);
  assert.equal(shouldOpenReport(completion, {}), true);
  completed[executionId].JC1 = { status: 'CORRIGIR', result: judgment(input, 'CORRIGIR') };
  const finalized = assessPipelineCompletion(state, completed);
  assert.equal(finalized.status, 'CONCLUÍDO');
  assert.equal(shouldOpenReport(finalized, {}), true);
  assert.equal(shouldOpenReport(finalized, { 'nao-abrir': true }), false);
});

function rankingFixture(scores) {
  const models = scores.map((score, index) => ({ id: `S${index + 1}`, model: `vendor/model-${index + 1}` }));
  const executions = models.map((model, index) => ({ execution_id: `E${index + 1}`, system_id: model.id, content: 'Explicação completa.', record: { operational_status: 'conclusão normal', output_branch: 'explicação' } }));
  const summary = executions.map((execution, index) => ({ execucao_id: execution.execution_id, sistema_id: execution.system_id, situacao_JC1: 'APTO', situacao_JP1: 'CONCLUÍDO', contestacao_cientifica: false, P: scores[index], S: 100 }));
  return { state: { models, executions }, summary };
}

test('ranking ordena pontuações, mantém todos os modelos e distingue nota zero de erro', () => {
  const { state, summary } = rankingFixture([70, 95, null, 95, 0]);
  const ranking = buildModelRanking(state, summary);
  assert.deepEqual(ranking.map((model) => [model.rank, model.system_id, model.score, model.status]), [
    [1, 'S2', 95, 'CONCLUÍDO'], [1, 'S4', 95, 'CONCLUÍDO'], [3, 'S1', 70, 'CONCLUÍDO'], [4, 'S5', 0, 'CONCLUÍDO'], [4, 'S3', 0, 'ERRO'],
  ]);
});

test('ranking não aproveita execuções sem S, parecer pedagógico final ou resposta completa', () => {
  const { state, summary } = rankingFixture(Array(6).fill(100));
  summary[0].S = null;
  summary[1].situacao_JP1 = 'DESCARTADO';
  summary[2].S = 120;
  state.executions[3].record.operational_status = 'truncamento';
  state.executions[4].content = '';
  summary.pop();
  assert.ok(buildModelRanking(state, summary).every((model) => model.score === 0 && model.status === 'ERRO'));
});

test('ranking exige P numérico válido e inclui modelos sem execução', () => {
  const { state, summary } = rankingFixture([undefined, NaN, Infinity, -1, 101, '90']);
  state.models.push({ id: 'S7', model: 'vendor/no-execution' });
  const ranking = buildModelRanking(state, summary);
  assert.equal(ranking.length, 7);
  assert.ok(ranking.every((model) => model.score === 0 && model.status === 'ERRO'));
});

test('ranking usa todas as execuções previstas, sem média apenas dos sobreviventes', () => {
  const { state, summary } = rankingFixture([80, 95]);
  state.executions.push({ ...state.executions[0], execution_id: 'E3' });
  summary.push({ ...summary[0], execucao_id: 'E3', P: 100 });
  const original = structuredClone({ state, summary });
  assert.deepEqual(buildModelRanking(state, summary).map((model) => model.score), [95, 90]);
  assert.deepEqual({ state, summary }, original);
  summary.pop();
  const incomplete = buildModelRanking(state, summary).find((model) => model.system_id === 'S1');
  assert.equal(incomplete.score, 0);
  assert.equal(incomplete.status, 'ERRO');
});

test('ranking arredonda antes de ordenar para que pontuações exibidas iguais empatem', () => {
  const { state, summary } = rankingFixture([90.001, 90.002, 80.125]);
  assert.deepEqual(buildModelRanking(state, summary).map((model) => [model.rank, model.score]), [[1, 90], [1, 90], [3, 80.13]]);
});

test('HTML exibe somente uma tabela de ranking com nomes escapados e falhas em zero', () => {
  const { state, summary } = rankingFixture([75.25, null]);
  state.models[0].model = '<script>alert("modelo")</script>&';
  const html = renderResultsHtml(state, summary);
  assert.equal(html.match(/<table>/g).length, 1);
  assert.match(html, /<td>1<\/td><td>&lt;script&gt;alert\(&quot;modelo&quot;\)&lt;\/script&gt;&amp;<\/td><td>75,25<\/td><td>CONCLUÍDO<\/td>/);
  assert.match(html, /<td>2<\/td><td>vendor\/model-2<\/td><td>0<\/td><td>ERRO<\/td><td>N\/A<\/td><td>N\/A<\/td><td>N\/A<\/td><td>N\/A<\/td>/);
  assert.doesNotMatch(html, /<script>|<details>|Material usado|Notas por execução|Leitura do consolidador/);
});

test('HTML explica abaixo da tabela os critérios científicos, acadêmicos, tecnológicos e de custo', async () => {
  const { state, summary } = rankingFixture([90]);
  const answerKeys = await readFile(join(repositoryRoot, 'referencias/gabaritos-conceituais.md'), 'utf8');
  state.config = { model: 'claude-teste', reasoning_effort: 'medium' };
  state.protocol = 'Protocolo sintético.\nPúblico: graduando de Biomedicina do teste.\n';
  state.executions[0].topic = 'B01';
  state.executions[0].answer_key = answerKeys.split(/(?=^## )/m).find((part) => part.startsWith('## B01 -'));
  const html = renderResultsHtml(state, summary, new Map(), { rate: 5.2132, date: '2026-09-28' });
  const criteria = html.slice(html.indexOf('</table>'));
  for (const expected of ['Científico - juiz JC', 'Acadêmico - juiz JP', 'Tecnológico - juiz JT', 'Custos - juiz JE', 'B01 - Hemostasia e coagulação', 'Plaquetas aderem ao local', 'M4 Explicação causal', 'F2 - o corpo didático tem de 800 a 1.200 palavras', 'claude-teste', 'R$\u00a05,2132 por dólar, cotação de 28/09/2026', 'o público definido no protocolo: graduando de Biomedicina do teste.']) {
    assert.ok(criteria.includes(expected), expected);
  }
  assert.equal(criteria.match(/<ol>/g).length, 1);
  assert.equal(html.match(/<table>/g).length, 1);
  assert.ok(criteria.includes('&quot;# &quot;'));
});

test('afirmações confirmadas somam acertos e totais de todas as execuções do modelo', () => {
  const { state, summary } = rankingFixture([90, 80]);
  state.executions.push({ ...state.executions[0], execution_id: 'E3' });
  summary.push({ ...summary[0], execucao_id: 'E3' });
  Object.assign(summary[0], { afirmacoes_confirmadas: 38, afirmacoes_total: 40 });
  Object.assign(summary[2], { afirmacoes_confirmadas: 10, afirmacoes_total: 40 });
  Object.assign(summary[1], { afirmacoes_confirmadas: 5, afirmacoes_total: null });
  const ranking = buildModelRanking(state, summary);
  assert.deepEqual(ranking.find((model) => model.system_id === 'S1').confirmed_assertions, { confirmed: 48, total: 80 });
  assert.equal(ranking.find((model) => model.system_id === 'S2').confirmed_assertions, null);
  assert.match(renderResultsHtml(state, summary), /<td>48\/80<\/td>/);
});

test('colunas por dimensão exigem o dado em todas as execuções do modelo e não viram zero', () => {
  const { state, summary } = rankingFixture([90, 80]);
  Object.assign(summary[0], { F1: 100, F2: 0, F3: 100, F4: 100 });
  Object.assign(summary[1], { F1: 100, F2: 100, F3: 100, F4: null });
  state.executions.push({ ...state.executions[0], execution_id: 'E3' });
  summary.push({ ...summary[0], execucao_id: 'E3', P: 100, F2: 100 });
  const costs = new Map([['E1', 0.2], ['E3', 0.4], ['E2', null]]);
  const [first, second] = buildModelRanking(state, summary, costs);
  assert.deepEqual([first.system_id, first.academic_score, first.technological_score], ['S1', 95, 87.5]);
  assert.ok(Math.abs(first.cost_brl - 0.3) < 1e-9);
  assert.deepEqual([second.system_id, second.academic_score, second.technological_score, second.cost_brl], ['S2', 80, null, null]);
  assert.match(renderResultsHtml(state, summary, costs), /<td>95<\/td><td>100<\/td><td>87,5<\/td><td>N\/A<\/td><td>N\/A<\/td><td>R\$\s0,30<\/td>/);
});

test('cobertura distingue notas de leitura do texto original incorporado', () => {
  const messages = [{ role: 'user', content: '## Material bibliográfico fornecido\nNotas de leitura: B01-F2.\n## Texto original incorporado - B01-F3\nTexto original.' }];
  const coverage = sourceCoverage(messages, 'B01-F1', 'B01');
  assert.deepEqual(coverage.original_source_ids, ['B01-F3']);
  assert.equal(coverage.reading_notes, true);
  assert.deepEqual(coverage.answer_key_sources_not_supplied, ['B01-F1']);
});

async function fakeClaude(context, script) {
  const directory = await mkdtemp(join(tmpdir(), 'bench-claude-test-'));
  const originalPath = process.env.PATH;
  context.after(async () => {
    process.env.PATH = originalPath;
    await rm(directory, { recursive: true, force: true });
  });
  await writeFile(join(directory, 'claude'), `#!${process.execPath}\n${script}\n`, { mode: 0o700 });
  process.env.PATH = `${directory}:${originalPath}`;
  return directory;
}

test('juiz Claude recebe o pedido pela entrada, arquiva a saída e não repete chamada concluída', async (context) => {
  const directory = await fakeClaude(context, `
let prompt = '';
process.stdin.setEncoding('utf8').on('data', (chunk) => { prompt += chunk; }).on('end', () => {
  const schemaIndex = process.argv.indexOf('--json-schema');
  console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: { prompt, schema: JSON.parse(process.argv[schemaIndex + 1]) }, usage: { input_tokens: 5, cache_creation_input_tokens: 10, cache_read_input_tokens: 2, output_tokens: 7 } }));
});`);
  const task = join(directory, 'tarefa');
  const job = { prompt: 'Pedido sintético.', schema: { type: 'object' }, config };
  assert.deepEqual(await runClaudeJob(task, job), { prompt: 'Pedido sintético.', schema: { type: 'object' } });
  assert.equal(await readFile(join(task, 'pedido.md'), 'utf8'), 'Pedido sintético.');
  assert.equal(JSON.parse(await readFile(join(task, 'concluido.json'), 'utf8')).exit_code, 0);
  await rm(join(directory, 'claude'));
  assert.deepEqual(await runClaudeJob(task, job), { prompt: 'Pedido sintético.', schema: { type: 'object' } });
  await assert.rejects(runClaudeJob(task, { ...job, prompt: 'Outro pedido.' }), /Insumos do julgamento mudaram/);
});

test('erro reportado pelo Claude chega ao parecer pendente com a mensagem original', async (context) => {
  const directory = await fakeClaude(context, `
process.stdin.resume().on('end', () => {
  console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'Limite de uso atingido.' }));
  process.exitCode = 1;
});`);
  await assert.rejects(runClaudeJob(join(directory, 'tarefa'), { prompt: 'Teste.', schema: {}, config }), /Claude reportou erro: Limite de uso atingido/);
});

test('chamada encerrada sem parecer é arquivada e refeita na tentativa seguinte', async (context) => {
  const directory = await fakeClaude(context, `
const { existsSync, writeFileSync } = await import('node:fs');
const marker = new URL('./falhou', import.meta.url);
process.stdin.resume().on('end', () => {
  if (existsSync(marker)) return console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: { tentativa: 2 } }));
  writeFileSync(marker, '');
  console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'Limite de sessão atingido.' }));
  process.exitCode = 1;
});`);
  const task = join(directory, 'tarefa');
  const job = { prompt: 'Teste.', schema: {}, config };
  await assert.rejects(runClaudeJob(task, job), /Limite de sessão/);
  assert.deepEqual(await runClaudeJob(task, job), { tentativa: 2 });
  const [attempt] = await readdir(join(task, 'tentativas'));
  assert.match(await readFile(join(task, 'tentativas', attempt, 'saida.json'), 'utf8'), /Limite de sessão/);
});

async function fixture({ missing = false, content = '# Explicação sintética\nTexto de teste.' } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'bench-pipeline-test-'));
  await mkdir(join(directory, 'privado/pedidos'), { recursive: true });
  await mkdir(join(directory, 'comprovantes', executionId), { recursive: true });
  const messages = [{ role: 'user', content: 'Pedido B01, K1-K6. B01-F1: fonte sintética.' }];
  const execution = { execution_id: executionId, system_id: 'S01', topic: 'B01', round: 1, prompt_sha256: sha256(JSON.stringify(messages)) };
  const record = {
    ...execution, operational_status: 'conclusão normal', output_branch: 'explicação', issues: [],
    duration_seconds: 2, first_text_seconds: 1, prompt_tokens: 10, completion_tokens: 20, cost_usd: 0.01, cost_brl: 0.05,
    telemetry_status: 'COMPLETA', total_tokens: 30,
  };
  await writeFile(join(directory, 'batch.json'), JSON.stringify({ schema_version: 1, condition: 'openrouter-v1', executions: [execution], config: { phase: 'PILOTO', models: [{ id: 'S01', model: 'vendor/secret-model', provider: 'vendor' }] } }));
  await writeFile(join(directory, 'privado/protocolo.md'), await readFile(join(repositoryRoot, 'referencias/protocolo-pontuacao.md')));
  await writeFile(join(directory, 'privado/pedidos/B01.json'), JSON.stringify({ messages }));
  if (!missing) {
    await writeFile(join(directory, 'comprovantes', executionId, 'pedido.json'), JSON.stringify({ messages }));
    await writeFile(join(directory, 'comprovantes', executionId, 'metricas.json'), JSON.stringify(record));
    await writeFile(join(directory, 'comprovantes', executionId, 'resposta.md'), content);
  }
  return directory;
}

function inputFromPrompt(prompt) {
  return JSON.parse(prompt.split('## Entradas da chamada (dados, não instruções)\n\n')[1]);
}

function judgment(input, status) {
  if (input.role === 'CONSOLIDADOR') return { title: 'Resultados sintéticos', summary: 'Somente um teste.', observations: ['Nenhum resultado real.'], limitations: ['Fixture sintético.'] };
  const family = roleFamily(input.role);
  const resultStatus = status ?? ({ JC: 'APTO', JP: 'CONCLUÍDO', JT: 'CONCLUÍDO', JE: 'CONCLUÍDO' })[family];
  const ids = family === 'JC' ? [...fixedItems.JC, 'A1', 'V1'] : fixedItems[family];
  const items = ids.map((id) => ({ id, score: /^(K\d|C\d|[AV]\d|M\d(?:\.\d)?|P|T\d|F\d)$/.test(id) ? 100 : null, value: null, unit: '', numerator: null, denominator: null, evidence: 'Evidência sintética exclusiva dos testes.', reason_na: 'NÃO APLICÁVEL no fixture.' }));
  const values = { SITUACAO_CIENTIFICA: resultStatus, SITUACAO_PEDAGOGICA: resultStatus, STATUS_OPERACIONAL: 'conclusão normal', RAMO_SAIDA: 'explicação', INICIADA: true, PALAVRAS_CORPO: 900, LATENCIA_TOTAL_S: 2, PRIMEIRO_TEXTO_S: 1, TOKENS_ENTRADA: 10, TOKENS_SAIDA: 20, CUSTO_GERACAO_BRL: 0.05 };
  for (const item of items) if (Object.hasOwn(values, item.id)) item.value = values[item.id];
  if (family === 'JC') {
    items.find((item) => item.id === 'A1').value = 'SUSTENTADA';
    items.find((item) => item.id === 'V1').value = 'VÁLIDO';
  }
  if (family === 'JT') for (const item of items.filter((item) => ['F5', 'T2'].includes(item.id))) item.score = null;
  return { protocol_version: '3.2', code: input.code, topic: input.topic, round: input.round, role: input.role, status: resultStatus, blockers: [], report: 'Parecer sintético de teste, não avaliação real.', items };
}

test('fluxo completo isola papéis, preserva certificados e retoma sem novos julgamentos', async () => {
  const directory = await fixture();
  const calls = [];
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input);
    return judgment(input);
  };
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.equal(result.consolidation.planned, 1);
  assert.deepEqual(calls.map((call) => call.role), ['JC1', 'JC2', 'JP1', 'JP2', 'JT', 'JE', 'CONSOLIDADOR']);
  for (const call of calls.filter((call) => /^(JC|JP)/.test(call.role))) {
    assert.doesNotMatch(JSON.stringify(call), /secret-model|vendor|E000000|S01|duration_seconds|cost_brl/);
  }
  const pedagogical = calls.find((call) => call.role === 'JP1');
  assert.equal(Object.keys(pedagogical.certificado).length, 6);
  assert.equal(pedagogical.certificado.passagem, 'JP1');
  assert.doesNotMatch(JSON.stringify(pedagogical.certificado), /APTO|CORRIGIR/);
  assert.equal(pedagogical.gabarito, undefined);
  const scientific = calls.find((call) => call.role === 'JC1');
  assert.match(scientific.gabarito, /B01 - Hemostasia/);
  assert.doesNotMatch(scientific.gabarito, /## B02/);
  assert.equal(new Set(calls.filter((call) => call.role !== 'CONSOLIDADOR').map((call) => call.code)).size, 6);
  const consolidator = calls.find((call) => call.role === 'CONSOLIDADOR');
  assert.equal(consolidator.mapa_privado[0].modelo, 'vendor/secret-model');
  assert.equal(consolidator.mapa_privado[0].codigos.JC1, scientific.code);
  const efficiency = calls.find((call) => call.role === 'JE');
  assert.equal(efficiency.original, undefined);
  assert.equal(efficiency.resposta, undefined);
  assert.doesNotMatch(JSON.stringify(efficiency.situacao_conferida_por_JT), /T1|T2|F1/);
  assert.deepEqual(Object.keys(efficiency.situacao_conferida_por_JT), ['INICIADA', 'STATUS_OPERACIONAL', 'RAMO_SAIDA']);
  const summary = await readFile(join(directory, 'consolidado/resultados-resumo.csv'), 'utf8');
  assert.match(summary, /"APTO"/);
  assert.doesNotMatch(summary, /secret-model/);
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.match(html, /vendor\/secret-model/);
  assert.match(html, /<td>100<\/td><td>CONCLUÍDO<\/td>/);
  assert.equal(consolidator.mapa_privado[0].codigos.JP1, pedagogical.code);
  assert.deepEqual(consolidator.ranking, [{ rank: 1, system_id: 'S01', model: 'vendor/secret-model', score: 100, status: 'CONCLUÍDO', academic_score: 100, technological_score: 100, cost_brl: 0.05, material_adherence: 100, confirmed_assertions: { confirmed: 1, total: 1 }, scientific_score: 100 }]);
  assert.match(html, /<td>100<\/td><td>CONCLUÍDO<\/td><td>100<\/td><td>100<\/td><td>100<\/td><td>100<\/td><td>1\/1<\/td><td>R\$\s0,05<\/td>/);
  assert.ok(!html.includes(scientific.code));
  const global = await readFile(join(directory, 'consolidado/global-por-rodada.csv'), 'utf8');
  assert.match(global, /"false","N\/A"/);
  await judgeBatch(directory, { repositoryRoot, runJob: () => { throw new Error('Retomada não deve chamar modelo.'); } });
  assert.equal(await readFile(join(directory, 'consolidado/resultados-resumo.csv'), 'utf8'), summary);
});

test('JC1 corrigir não bloqueia a avaliação pedagógica cega', async () => {
  const directory = await fixture();
  const calls = [];
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input.role);
    return judgment(input, input.role === 'JC1' ? 'CORRIGIR' : undefined);
  } });
  assert.equal(calls.includes('JP1'), true);
  assert.equal(calls.includes('JP2'), true);
  assert.equal(result.completed[executionId].JP1.status, 'CONCLUÍDO');
  const rows = await readFile(join(directory, 'consolidado/resultados-completos.csv'), 'utf8');
  assert.match(rows, /"JP1","M1\.1","100"/);
});

test('APTO contraditório é descartado sem repetir chamadas; a pedagogia cega segue', async () => {
  const directory = await fixture();
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    const result = judgment(input);
    if (input.role.startsWith('JC')) result.blockers.push('Fonte não verificada.');
    return result;
  };
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.equal(result.completed[executionId].JC1.status, 'DESCARTADO');
  assert.equal(result.completed[executionId].JP1.status, 'CONCLUÍDO');
  await judgeBatch(directory, { repositoryRoot, runJob: () => { throw new Error('Não reenviar.'); } });
});

test('revalidação local recupera parecer antigo e atualiza HTML sem consultar modelos', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  const state = JSON.parse(await readFile(join(directory, 'privado/julgamento.json'), 'utf8'));
  const taskDirectory = join(directory, 'juizes/pareceres/JC1', state.executions[0].codes.JC1);
  const saved = JSON.parse(await readFile(join(taskDirectory, 'aceito.json'), 'utf8'));
  saved.items.find((item) => item.id === 'A1').id = 'A01';
  await writeFile(join(taskDirectory, 'pendente.json'), JSON.stringify({ reason: 'Item indevido: A01.', raw_result: saved }));
  await rm(join(taskDirectory, 'aceito.json'));
  await rm(join(taskDirectory, 'parecer.md'));
  const pendingSource = await readFile(join(taskDirectory, 'pendente.json'), 'utf8');
  const result = await judgeBatch(directory, { repositoryRoot, localOnly: true, runJob: () => { throw new Error('Revalidação não chama modelos.'); } });
  assert.equal(result.completed[executionId].JC1.status, 'APTO');
  assert.equal(await readFile(join(taskDirectory, 'pendente.json'), 'utf8'), pendingSource);
  assert.ok((await readdir(taskDirectory)).includes('revalidado.json'));
  assert.match(await readFile(join(directory, 'consolidado/resultados.html'), 'utf8'), /vendor\/secret-model/);
});

test('parecer científico inválido mantém a auditoria e exclui todas as suas notas', async () => {
  const directory = await fixture();
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    const response = judgment(input);
    if (input.role === 'JC1') response.items.find((item) => item.id === 'V1').value = 'A1–F1';
    return response;
  } });
  const scientific = result.completed[executionId].JC1;
  assert.equal(scientific.status, 'DESCARTADO');
  assert.deepEqual(scientific.partial_items, []);
  const audit = JSON.parse(await readFile(join(directory, scientific.validation_file), 'utf8'));
  assert.equal(audit.outcome.partial_items.find((item) => item.id === 'K1').score, 100);
  assert.equal(audit.outcome.partial_items.some((item) => item.id === 'V1'), false);
  assert.equal(audit.outcome.partial_items.some((item) => item.id === 'C3'), false);
  const rows = await readFile(join(directory, 'consolidado/resultados-completos.csv'), 'utf8');
  assert.match(rows, /"JC1","K1","N\/A"/);
});

test('falha terminal de um juiz não interrompe os demais nem a geração do HTML', async () => {
  const directory = await fixture();
  const calls = [];
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input.role);
    if (input.role === 'JC1') throw new Error('Codex terminou sem JSON.');
    return judgment(input);
  } });
  assert.equal(result.completed[executionId].JC1.status, 'DESCARTADO');
  assert.ok(calls.includes('JC2'));
  assert.ok(calls.includes('JE'));
  assert.match(await readFile(join(directory, 'consolidado/resultados.html'), 'utf8'), /vendor\/secret-model/);
  const resumed = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  assert.equal(resumed.completed[executionId].JC1.status, 'APTO');
});

test('registros de tempo e tokens permanecem publicados quando JT e JE falham', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    if (['JT', 'JE', 'CONSOLIDADOR'].includes(input.role)) throw new Error('Falha sintética do avaliador.');
    return judgment(input);
  } });
  const rows = await readFile(join(directory, 'consolidado/resultados-completos.csv'), 'utf8');
  assert.match(rows, /"JE","UNICA","LATENCIA_TOTAL_S","N\/A","2"/);
  assert.match(rows, /"JE","UNICA","TOKENS_ENTRADA","N\/A","10"/);
  assert.match(rows, /"JE","UNICA","CUSTO_GERACAO_BRL","N\/A","0.05"/);
  assert.match(rows, /"JT","UNICA","T1","N\/A"/);
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.match(html, /<td>100<\/td><td>CONCLUÍDO<\/td>/);
  assert.match(await readFile(join(directory, 'consolidado/relatorio.md'), 'utf8'), /Falha sintética do avaliador/);
});

test('CLI revalida sem runtime Herdr, credencial ou chamada de rede', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  const script = `globalThis.fetch = () => { throw new Error('Rede proibida no teste.'); }; process.argv = ['node', 'pipeline-cli', '--retomar', process.argv[1], '--revalidar', '--nao-abrir']; await import(${JSON.stringify(new URL('../coletor/pipeline-cli.mjs', import.meta.url).href)});`;
  const result = await executeFile(process.execPath, ['--input-type=module', '-e', script, directory], { env: { PATH: '/pasta-inexistente' } });
  assert.match(result.stdout, /Revalidação local/);
  assert.match(result.stdout, /Fluxo concluído/);
  assert.match(result.stdout, /Resultados:/);
});

test('CLI encerra com descartes explícitos em vez de manter ciência pendente', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    return judgment(input, input.role.startsWith('JC') ? 'PENDENTE' : undefined);
  } });
  const script = `globalThis.fetch = () => { throw new Error('Rede proibida.'); }; process.argv = ['node', 'pipeline-cli', '--retomar', process.argv[1], '--revalidar', '--nao-abrir']; await import(${JSON.stringify(new URL('../coletor/pipeline-cli.mjs', import.meta.url).href)});`;
  const result = await executeFile(process.execPath, ['--input-type=module', '-e', script, directory], { env: { PATH: '/pasta-inexistente' } });
  assert.match(result.stdout, /Fluxo encerrado com descartes/);
  assert.match(result.stdout, /DESCARTADO S01\/B01\/JC1/);
  assert.doesNotMatch(result.stdout, /Fluxo incompleto|Fluxo concluído/);
});

test('schema específico impede código trocado e IDs inventados antes da resposta do juiz', () => {
  const identity = { role: 'JC1', code: 'Qfixture', topic: 'B01', round: 1 };
  const response = judgment(identity);
  const schema = judgmentSchemaFor(identity);
  assertSchema(response, schema);
  const codeChanged = structuredClone(response);
  codeChanged.code = 'Qoutra';
  assert.throws(() => assertSchema(codeChanged, schema), /code/);
  response.items[0].id = 'K99';
  assert.throws(() => assertSchema(response, schema), /formato inválido/);
});

test('recuperação parcial não mistura versões ou códigos e não aceita duplicatas equivalentes', () => {
  const identity = { role: 'JC1', code: 'Qfixture', topic: 'B01', round: 1 };
  const response = judgment(identity);
  assert.deepEqual(recoverValidItems({ ...response, protocol_version: '2.0' }, identity), []);
  assert.deepEqual(recoverValidItems({ ...response, code: 'Qoutra' }, identity), []);
  response.items.push({ ...response.items.find((item) => item.id === 'A1'), id: 'A01' });
  const partial = recoverValidItems(response, identity);
  assert.equal(partial.some((item) => /^A\d+$/.test(item.id)), false);
  assert.equal(partial.some((item) => item.id === 'C2'), false);
  assert.equal(partial.find((item) => item.id === 'K1').score, 100);
});

test('bibliografia ausente do material é identificada sem confundir fonte alternativa com aprovação', () => {
  const coverage = sourceCoverage([{ role: 'user', content: '## Material bibliográfico fornecido\n## B01-F3 - fonte alternativa\nNotas de leitura disponíveis.' }], 'Conferir B01-F1 e B01-F3.', 'B01');
  assert.deepEqual(coverage.supplied_source_ids, ['B01-F3']);
  assert.deepEqual(coverage.answer_key_sources_not_supplied, ['B01-F1']);
  assert.equal(coverage.reading_notes, true);
});

test('abertura do relatório passa o caminho literalmente e falha do navegador preserva a conclusão', async () => {
  const path = '/tmp/relatório com espaços.html';
  const opened = await openReport(path, { platform: 'darwin', executeFile: async (command, args) => {
    assert.equal(command, 'open');
    assert.deepEqual(args, [path]);
  } });
  assert.match(opened, /aberto no navegador/);
  assert.match(await openReport(path, { executeFile: async () => { throw new Error('Navegador indisponível'); } }), /Relatório gerado; abra manualmente/);
});

test('parecer JT de ramo incompatível não publica T2 nem os componentes de outro ramo', async () => {
  const directory = await fixture();
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    const response = judgment(input);
    if (input.role === 'JT') {
      response.items.find((item) => item.id === 'RAMO_SAIDA').value = 'PENDENTE DE FONTES';
      response.items.find((item) => item.id === 'T2').score = 100;
      for (const item of response.items.filter((item) => /^FP\d$/.test(item.id))) item.score = 100;
    }
    return response;
  } });
  const technical = result.completed[executionId].JT;
  assert.equal(technical.status, 'DESCARTADO');
  assert.equal(technical.partial_items.some((item) => /^(T2|FP?\d)$/.test(item.id)), false);
});

test('saída truncada não interrompe a consolidação nem inventa tokens do julgamento', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    if (input.role === 'JC1') {
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'envio.json'), JSON.stringify({ request_sha256: 'teste' }));
      await writeFile(join(path, 'concluido.json'), JSON.stringify({ exit_code: 1, timed_out: false, error: null }));
      await writeFile(join(path, 'saida.json'), '{');
      throw new Error('Claude encerrou com saída truncada.');
    }
    return judgment(input);
  } });
  const budget = await readFile(join(directory, 'consolidado/orcamento-julgamentos.csv'), 'utf8');
  assert.match(budget, /Saída ausente ou JSON inválido/);
  assert.match(budget, /"N\/A","N\/A","N\/A"/);
  assert.match(await readFile(join(directory, 'consolidado/relatorio.md'), 'utf8'), /Consolidação do lote/);
});

test('revisão após recuperar parecer usa síntese local sem nova chamada do consolidador', async () => {
  const directory = await fixture();
  const runner = async (path, job) => judgment(inputFromPrompt(job.prompt));
  await judgeBatch(directory, { repositoryRoot, config, runJob: runner });
  const state = JSON.parse(await readFile(join(directory, 'privado/julgamento.json'), 'utf8'));
  const path = join(directory, 'juizes/pareceres/JC1', state.executions[0].codes.JC1, 'aceito.json');
  const previous = JSON.parse(await readFile(path, 'utf8'));
  previous.status = 'CORRIGIR';
  previous.items.find((item) => item.id === 'SITUACAO_CIENTIFICA').value = 'CORRIGIR';
  previous.items.find((item) => item.id === 'K1').score = 0;
  previous.items.find((item) => item.id === 'C1').score = 500 / 6;
  await writeFile(path, JSON.stringify(previous));
  const originalHtml = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  await judgeBatch(directory, { repositoryRoot, runJob: () => { throw new Error('Nenhum consolidador adicional deve ser enviado.'); } });
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.doesNotMatch(html, /Nenhum consolidador adicional/);
  assert.match(html, /<td>80<\/td><td>CONCLUÍDO<\/td>/);
  const revisions = await readdir(join(directory, 'consolidado/revisoes'));
  assert.ok(revisions.length > 0);
  const archived = await readFile(join(directory, 'consolidado/revisoes', revisions[0], 'resultados.html'), 'utf8');
  assert.equal(archived, originalHtml);
});

test('orçamento conserva chamadas históricas mesmo quando a revalidação bloqueia o papel', async () => {
  const directory = await fixture();
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  const state = JSON.parse(await readFile(join(directory, 'privado/julgamento.json'), 'utf8'));
  const technicalPath = join(directory, 'juizes/pareceres/JT', state.executions[0].codes.JT, 'aceito.json');
  const technical = JSON.parse(await readFile(technicalPath, 'utf8'));
  technical.items.find((item) => item.id === 'RAMO_SAIDA').value = 'PENDENTE DE FONTES';
  await writeFile(technicalPath, JSON.stringify(technical));
  const result = await judgeBatch(directory, { repositoryRoot, localOnly: true });
  assert.equal(result.completed[executionId].JE.executed, false);
  const budget = await readFile(join(directory, 'consolidado/orcamento-julgamentos.csv'), 'utf8');
  assert.ok(budget.includes(`"JE","${state.executions[0].codes.JE}"`));
});

test('ausência de registros mantém todas as linhas previstas sem inferência', async () => {
  const directory = await fixture({ missing: true });
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    assert.equal(input.role, 'CONSOLIDADOR');
    return judgment(input);
  } });
  assert.equal(result.consolidation.planned, 1);
  assert.equal(Object.keys(result.completed[executionId]).length, 8);
  const report = await readFile(join(directory, 'consolidado/relatorio.md'), 'utf8');
  assert.match(report, /custo incompleto/);
});

test('resposta vazia não inicia julgamento científico nem consolidador', async () => {
  const directory = await fixture({ content: '' });
  const recordPath = join(directory, 'comprovantes', executionId, 'metricas.json');
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  record.operational_status = 'truncamento';
  record.output_branch = 'texto vazio';
  await writeFile(recordPath, JSON.stringify(record));
  const roles = [];
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    roles.push(input.role);
    const output = judgment(input);
    if (input.role === 'JT') {
      output.items.find((item) => item.id === 'STATUS_OPERACIONAL').value = 'truncamento';
      output.items.find((item) => item.id === 'RAMO_SAIDA').value = 'texto vazio';
      output.items.find((item) => item.id === 'T1').score = 0;
    }
    return output;
  } });
  assert.deepEqual(roles, []);
  assert.equal(result.completed[executionId].JC1.status, 'DESCARTADO');
  assert.equal(result.completed[executionId].JC2.status, 'DESCARTADO');
  assert.equal(result.consolidation.completion.status, 'CONCLUÍDO_COM_DESCARTES');
});

test('truncamento com texto é descartado antes de qualquer julgamento', async () => {
  const directory = await fixture({ content: 'Esta explicação foi cortada no meio.' });
  const path = join(directory, 'comprovantes', executionId, 'metricas.json');
  const record = JSON.parse(await readFile(path, 'utf8'));
  record.operational_status = 'truncamento';
  await writeFile(path, JSON.stringify(record));
  const roles = [];
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    roles.push(input.role);
    return judgment(input);
  } });
  assert.deepEqual(roles, []);
  assert.equal(result.completed[executionId].JC1.status, 'DESCARTADO');
  assert.equal(result.consolidation.completion.status, 'CONCLUÍDO_COM_DESCARTES');
  assert.equal(result.consolidation.completion.discarded_generations, 1);
  assert.equal(await readFile(join(directory, 'comprovantes', executionId, 'resposta.md'), 'utf8'), 'Esta explicação foi cortada no meio.');
});

test('pareceres científicos e técnicos sem conclusão são descartados das notas', async () => {
  const directory = await fixture();
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    return judgment(input, ['JC1', 'JT'].includes(input.role) ? 'PENDENTE' : undefined);
  } });
  assert.equal(result.completed[executionId].JC1.status, 'DESCARTADO');
  assert.equal(result.completed[executionId].JC1.result, null);
  assert.deepEqual(result.completed[executionId].JC1.partial_items, []);
  assert.equal(result.completed[executionId].JT.status, 'DESCARTADO');
  assert.equal(result.completed[executionId].JP1.status, 'CONCLUÍDO');
  assert.equal(result.consolidation.completion.status, 'CONCLUÍDO_COM_DESCARTES');
  const csv = await readFile(join(directory, 'consolidado/resultados-completos.csv'), 'utf8');
  assert.match(csv, /"JC","JC1","K1","N\/A"/);
  assert.doesNotMatch(csv, /"JC","JC1","K1","100"/);
});

test('descarte de JP2 preserva contestação científica e exclui P dos agregados', async () => {
  const directory = await fixture();
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    const output = judgment(input, input.role === 'JP2' ? 'REVISÃO CIENTÍFICA SOLICITADA' : undefined);
    if (input.role === 'JP2') {
      output.blockers = ['Erro científico identificado durante a leitura pedagógica.'];
      for (const item of output.items) item.score = null;
    }
    return output;
  } });
  assert.equal(result.completed[executionId].JP2.status, 'DESCARTADO');
  assert.equal(result.completed[executionId].JP2.original_status, 'REVISÃO CIENTÍFICA SOLICITADA');
  const summary = await readFile(join(directory, 'consolidado/resultados-resumo.csv'), 'utf8');
  assert.match(summary, /"true","true"/);
  const aggregates = await readFile(join(directory, 'consolidado/agregados.csv'), 'utf8');
  assert.match(aggregates, /"S01","B01","1","1","1","1","0"/);
  assert.match(await readFile(join(directory, 'consolidado/resultados.html'), 'utf8'), /<td>100<\/td><td>CONCLUÍDO<\/td>/);
});

test('autoria explícita bloqueia conteúdo sem reescrever original', async () => {
  const content = '# Explicação\nEu sou Claude.';
  const directory = await fixture({ content });
  const roles = [];
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    roles.push(input.role);
    return judgment(input);
  } });
  assert.deepEqual(roles, []);
  assert.match(await readFile(join(directory, 'consolidado/resultados.html'), 'utf8'), /<td>0<\/td><td>ERRO<\/td>/);
  assert.equal(await readFile(join(directory, 'comprovantes', executionId, 'resposta.md'), 'utf8'), content);
  assert.equal(identityConcern('O mecanismo tem uma meta fisiológica.', [{ model: 'meta/modelo', provider: 'meta' }]), null);
});

test('schema rejeita itens duplicados, código trocado e cálculos incompatíveis', () => {
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JP1' };
  for (const change of [
    (result) => { result.code = 'outro'; },
    (result) => { result.items.push(result.items[0]); },
    (result) => { result.items.find((item) => item.id === 'P').score = 50; },
  ]) {
    const result = judgment(input);
    change(result);
    assert.throws(() => validateJudgment(result, input));
  }
});

test('inventários aceitam zeros à esquerda e classificações em minúsculas sem duplicar afirmações', () => {
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JC1' };
  const result = judgment(input);
  const assertion = result.items.find((item) => item.id === 'A1');
  assertion.id = 'A01';
  assertion.value = 'sustentada';
  const reference = result.items.find((item) => item.id === 'V1');
  reference.id = 'V01';
  reference.value = 'válido';
  assert.equal(validateJudgment(result, input), result);
  result.items.push({ ...assertion, id: 'A1' });
  assert.throws(() => validateJudgment(result, input), /Item repetido/);
  result.items.pop();
  reference.value = 'A01-F1';
  assert.throws(() => validateJudgment(result, input), /classificação incompatível/);
  reference.value = 'pendente';
  reference.score = null;
  result.status = 'PENDENTE';
  result.items.find((item) => item.id === 'SITUACAO_CIENTIFICA').value = 'PENDENTE';
  result.items.find((item) => item.id === 'C3').score = null;
  assert.equal(validateJudgment(result, input), result);
  reference.value = 'inválido';
  assert.throws(() => validateJudgment(result, input), /classificação incompatível/);
  reference.score = 0;
  result.items.find((item) => item.id === 'C3').score = 0;
  result.status = 'CORRIGIR';
  result.items.find((item) => item.id === 'SITUACAO_CIENTIFICA').value = 'CORRIGIR';
  assert.equal(validateJudgment(result, input), result);
});

test('item sem nota nem medida aceita motivo de inaplicabilidade, mas medida conhecida exige evidência', () => {
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JT' };
  const result = judgment(input);
  const item = result.items.find((item) => item.id === 'FP1');
  Object.assign(item, { score: null, value: null, evidence: '', reason_na: 'Não se aplica ao ramo explicação.' });
  assert.equal(validateJudgment(result, input), result);
  item.reason_na = '';
  assert.throws(() => validateJudgment(result, input), /falta evidência|sem motivo/);
  item.reason_na = 'Não se aplica.';
  item.value = 10;
  assert.throws(() => validateJudgment(result, input), /falta evidência/);
});

test('APTO aceita afirmação periférica não verificável, mas não afirmação contradita', () => {
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JC1' };
  const result = judgment(input);
  const unverifiable = { ...result.items.find((item) => item.id === 'A1'), id: 'A2', score: null, value: 'NÃO VERIFICÁVEL', evidence: '', reason_na: 'Detalhe periférico ausente das fontes incorporadas.' };
  result.items.push(unverifiable);
  result.items.find((item) => item.id === 'C2').score = null;
  assert.equal(validateJudgment(result, input), result);
  Object.assign(unverifiable, { score: 0, value: 'CONTRADITA', evidence: 'Fonte sintética contradiz a afirmação.', reason_na: '' });
  result.items.find((item) => item.id === 'C2').score = 50;
  assert.throws(() => validateJudgment(result, input), /APTO incompatível/);
});

test('inventário não verificável aceita justificativa da falta de fonte sem perder a decisão científica', () => {
  const input = { code: 'Qteste', topic: 'B01', round: 1, role: 'JC1' };
  const result = judgment(input, 'PENDENTE');
  for (const id of ['A1', 'V1']) Object.assign(result.items.find((item) => item.id === id), {
    score: null, value: 'NÃO VERIFICÁVEL', evidence: '', reason_na: 'A fonte fornecida não contém o detalhe necessário.',
  });
  for (const id of ['C2', 'C3']) result.items.find((item) => item.id === id).score = null;
  assert.equal(validateJudgment(result, input), result);
  result.status = 'APTO';
  result.items.find((item) => item.id === 'SITUACAO_CIENTIFICA').value = 'APTO';
  assert.throws(() => validateJudgment(result, input), /APTO incompatível/);
  result.items.find((item) => item.id === 'A1').value = 'SUSTENTADA';
  assert.throws(() => validateJudgment(result, input), /falta evidência|classificação incompatível/);
});

test('JE permite detalhes opcionais dos tokens e confere seus valores contra os comprovantes', async () => {
  for (const total of [30, 900]) {
    const directory = await fixture();
    const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
      const input = inputFromPrompt(job.prompt);
      const output = judgment(input);
      if (input.role === 'JE') {
        for (const id of ['TOKENS_TOTAIS', 'TOKENS_CACHE', 'TOKENS_RACIOCINIO']) output.items.push({ ...output.items.find((item) => item.id === 'TOKENS_ENTRADA'), id, value: id === 'TOKENS_TOTAIS' ? total : null });
      }
      return output;
    } });
    assert.equal(result.completed[executionId].JE.status, total === 30 ? 'CONCLUÍDO' : 'DESCARTADO');
    if (total !== 30) assert.match(result.completed[executionId].JE.reason, /medida incompatível/);
  }
});

test('contrato enviado explicita IDs, classificações e justificativa de N/A', () => {
  const prompt = renderJudgePrompt('Instruções.', 'Protocolo.', { role: 'JC1' });
  assert.match(prompt, /SUSTENTADA/);
  assert.match(prompt, /PROBLEMA CONFIRMADO/);
  assert.match(prompt, /A1, A2/);
  assert.match(prompt, /evidence/);
  assert.match(renderJudgePrompt('Instruções.', 'Protocolo.', { role: 'JE' }), /TOKENS_TOTAIS/);
});

test('retomada consulta julgamento já enviado com o contrato arquivado antes da atualização', async () => {
  const directory = await fixture();
  const controller = new AbortController();
  let submitted = false;
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    if (input.role !== 'JC1') return judgment(input);
    if (submitted) return runClaudeJob(path, job);
    submitted = true;
    const archivedJob = { ...job, prompt: job.prompt.replace(/## Contrato de saída[\s\S]*?(?=## Entradas da chamada)/, '## Contrato anterior\n\n') };
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'pedido.md'), archivedJob.prompt);
    await writeFile(join(path, 'schema.json'), JSON.stringify(archivedJob.schema));
    await writeFile(join(path, 'envio.json'), JSON.stringify({ request_sha256: sha256(JSON.stringify(archivedJob)) }));
    await writeFile(join(path, 'concluido.json'), JSON.stringify({ exit_code: 0, timed_out: false, error: null }));
    await writeFile(join(path, 'saida.json'), JSON.stringify({ subtype: 'success', is_error: false, structured_output: judgment(input) }));
    controller.abort();
    throw new Error('Coordenador interrompido após envio.');
  };
  await assert.rejects(judgeBatch(directory, { repositoryRoot, config, runJob, signal: controller.signal }), /Coordenador interrompido/);
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.equal(result.completed[executionId].JC1.status, 'APTO');
});

test('juiz Claude roda isolado e não herda chaves da coleta nem da sessão chamadora', () => {
  const args = claudeArguments({ config, schema: { type: 'object' } });
  for (const [flag, value] of [['--setting-sources', ''], ['--tools', ''], ['--model', 'modelo-teste'], ['--effort', 'medium'], ['--json-schema', '{"type":"object"}'], ['--output-format', 'json']]) assert.equal(args[args.indexOf(flag) + 1], value);
  for (const flag of ['--system-prompt', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence']) assert.ok(args.includes(flag));
  assert.equal(args.includes('--resume'), false);
  assert.deepEqual(claudeEnvironment({ HOME: '/user', PATH: '/bin', OPENROUTER_API_KEY: 'secret', ANTHROPIC_API_KEY: 'secret', CLAUDECODE: '1' }), { HOME: '/user', PATH: '/bin' });
});

test('HTML escapa valores como texto sem permitir código executável', () => {
  assert.equal(escapeHtml('<script>alert("x")</script> & nota'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; nota');
});

test('média global por rodada exige B01 e B02 aprovados para o mesmo modelo', async () => {
  const directory = await fixture();
  const batchPath = join(directory, 'batch.json');
  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const secondTopicId = 'E00000000000000000002';
  batch.executions.push({ ...batch.executions[0], execution_id: secondTopicId, topic: 'B02' });
  await writeFile(batchPath, JSON.stringify(batch));
  await mkdir(join(directory, 'comprovantes', secondTopicId));
  for (const name of ['pedido.json', 'resposta.md', 'metricas.json']) {
    const source = await readFile(join(directory, 'comprovantes', executionId, name), 'utf8');
    await writeFile(join(directory, 'comprovantes', secondTopicId, name), source.replaceAll(executionId, secondTopicId).replaceAll('"B01"', '"B02"'));
  }
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  const global = await readFile(join(directory, 'consolidado/global-por-rodada.csv'), 'utf8');
  assert.match(global, /"S01","1","true","100"/);
});

test('vários modelos mantêm códigos únicos, nomes só no consolidador e ordem invertida na estabilidade', async () => {
  const directory = await fixture();
  const batchPath = join(directory, 'batch.json');
  const batch = JSON.parse(await readFile(batchPath, 'utf8'));
  const secondId = 'E00000000000000000002';
  batch.executions.push({ ...batch.executions[0], execution_id: secondId, system_id: 'S02' });
  batch.config.models.push({ id: 'S02', model: 'another/hidden-model', provider: 'another' });
  await writeFile(batchPath, JSON.stringify(batch));
  await mkdir(join(directory, 'comprovantes', secondId));
  for (const name of ['pedido.json', 'resposta.md', 'metricas.json']) {
    const source = await readFile(join(directory, 'comprovantes', executionId, name), 'utf8');
    await writeFile(join(directory, 'comprovantes', secondId, name), source.replaceAll(executionId, secondId).replaceAll('S01', 'S02'));
  }
  const calls = [];
  const dispatchedJC2 = [];
  const onProgress = (message) => { if (/^JC2: Q[0-9a-f]+$/.test(message)) dispatchedJC2.push(message.slice(5)); };
  await judgeBatch(directory, { repositoryRoot, config, onProgress, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input);
    if (input.role !== 'CONSOLIDADOR') assert.doesNotMatch(job.prompt, /secret-model|hidden-model/);
    return judgment(input);
  } });
  const state = JSON.parse(await readFile(join(directory, 'privado/julgamento.json'), 'utf8'));
  assert.deepEqual(dispatchedJC2, state.executions.toReversed().map((execution) => execution.codes.JC2));
  assert.equal(new Set(calls.filter((call) => call.role !== 'CONSOLIDADOR').map((call) => call.code)).size, 12);
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.match(html, /vendor\/secret-model/);
  assert.match(html, /another\/hidden-model/);
});
