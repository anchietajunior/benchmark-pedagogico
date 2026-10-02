import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sha256 } from '../coletor/config.mjs';
import { judgeBatch } from '../coletor/pipeline.mjs';
import { fixedItems, roleFamily } from '../coletor/judgments.mjs';
import { candidateFamily, checkKit, judgeFamily, kitDirectory, prepareKit } from '../coletor/judge-kit.mjs';
import { buildPanel, judgeTable, panelTable, parseQuotedCsv } from '../coletor/panel.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const config = { model: 'claude-teste', reasoning_effort: 'medium', timeout_seconds: 1 };
const executionId = 'E00000000000000000001';

async function judgedBatch() {
  const directory = await mkdtemp(join(tmpdir(), 'bench-kit-test-'));
  await mkdir(join(directory, 'privado/pedidos'), { recursive: true });
  await mkdir(join(directory, 'comprovantes', executionId), { recursive: true });
  const messages = [{ role: 'user', content: 'Pedido B01, K1-K6. B01-F1: fonte sintética.' }];
  const execution = { execution_id: executionId, system_id: 'S01', topic: 'B01', round: 1, prompt_sha256: sha256(JSON.stringify(messages)) };
  const record = { ...execution, operational_status: 'conclusão normal', output_branch: 'explicação', issues: [], duration_seconds: 2, first_text_seconds: 1, prompt_tokens: 10, completion_tokens: 20, cost_usd: 0.01, cost_brl: 0.05, telemetry_status: 'COMPLETA', total_tokens: 30 };
  await writeFile(join(directory, 'batch.json'), JSON.stringify({ schema_version: 1, condition: 'openrouter-v1', executions: [execution], config: { phase: 'PILOTO', models: [{ id: 'S01', model: 'meta/modelo-sintetico', provider: 'meta' }] } }));
  await writeFile(join(directory, 'privado/protocolo.md'), await readFile(join(repositoryRoot, 'referencias/protocolo-pontuacao.md')));
  await writeFile(join(directory, 'privado/pedidos/B01.json'), JSON.stringify({ messages }));
  await writeFile(join(directory, 'comprovantes', executionId, 'pedido.json'), JSON.stringify({ messages }));
  await writeFile(join(directory, 'comprovantes', executionId, 'metricas.json'), JSON.stringify(record));
  await writeFile(join(directory, 'comprovantes', executionId, 'resposta.md'), '# Explicação sintética\nTexto de teste.');
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => judgment(inputFromPrompt(job.prompt)) });
  return directory;
}

function inputFromPrompt(prompt) {
  return JSON.parse(prompt.split('## Entradas da chamada (dados, não instruções)\n\n')[1].split('\n## Schema JSON obrigatório')[0]);
}

function judgment(input, overrides = {}) {
  if (input.role === 'CONSOLIDADOR') return { title: 'Teste', summary: 'Teste.', observations: [], limitations: [] };
  const family = roleFamily(input.role);
  const status = overrides.status ?? ({ JC: 'APTO', JP: 'CONCLUÍDO', JT: 'CONCLUÍDO', JE: 'CONCLUÍDO' })[family];
  const ids = family === 'JC' ? [...fixedItems.JC, 'A1', 'V1'] : fixedItems[family];
  const items = ids.map((id) => ({ id, score: /^(K\d|C\d|[AV]\d|M\d(?:\.\d)?|P|T\d|F\d)$/.test(id) ? (overrides.P && id === 'P' ? overrides.P : 100) : null, value: null, unit: '', numerator: null, denominator: null, evidence: 'Evidência sintética.', reason_na: 'N/A sintético.' }));
  const values = { SITUACAO_CIENTIFICA: status, SITUACAO_PEDAGOGICA: status, STATUS_OPERACIONAL: 'conclusão normal', RAMO_SAIDA: 'explicação', INICIADA: true, PALAVRAS_CORPO: 900, LATENCIA_TOTAL_S: 2, PRIMEIRO_TEXTO_S: 1, TOKENS_ENTRADA: 10, TOKENS_SAIDA: 20, CUSTO_GERACAO_BRL: 0.05 };
  for (const item of items) if (Object.hasOwn(values, item.id)) item.value = values[item.id];
  if (family === 'JC') {
    items.find((item) => item.id === 'A1').value = 'SUSTENTADA';
    items.find((item) => item.id === 'V1').value = 'VÁLIDO';
  }
  if (family === 'JT') for (const item of items.filter((item) => ['F5', 'T2'].includes(item.id))) item.score = null;
  if (status === 'BLOQUEADO') for (const item of items) if (item.id !== 'SITUACAO_PEDAGOGICA') { item.score = null; item.reason_na = 'Bloqueado.'; }
  return { protocol_version: '3.2', code: input.code, topic: input.topic, round: input.round, role: input.role, status, blockers: [], report: 'Parecer sintético.', items };
}

test('famílias de juízes e candidatos', () => {
  assert.equal(judgeFamily('gpt-6.1-sol'), 'openai');
  assert.equal(judgeFamily('grok-5'), 'xai');
  assert.equal(judgeFamily('claude-opus-5-5'), 'anthropic');
  assert.equal(candidateFamily('openai/gpt-6-astra'), 'openai');
});

test('CSV com vírgulas, aspas e quebras de linha nas células é lido sem deslocar colunas', () => {
  assert.deepEqual(parseQuotedCsv('"E1","a, b","linha 1\nlinha 2"\n"E2","diz ""x""","3"\n'), [['E1', 'a, b', 'linha 1\nlinha 2'], ['E2', 'diz "x"', '3']]);
});

test('kit usa metaprompt e protocolo 3.4, sem revelar o modelo, e recusa JP bloqueado', async () => {
  const directory = await judgedBatch();
  const { root, kit } = await prepareKit(directory, { judge: 'grok-5', repositoryRoot });
  assert.equal(kit.family, 'xai');
  assert.deepEqual(kit.tasks.map((task) => task.role).toSorted(), ['JC1', 'JP1']);
  const pedagogical = kit.tasks.find((task) => task.role === 'JP1');
  const prompt = await readFile(join(root, 'tarefas', pedagogical.task, 'pedido.md'), 'utf8');
  assert.match(prompt, /Protocolo de pontuação 3\.4/);
  assert.match(prompt, /Avaliação pedagógica cega/);
  assert.doesNotMatch(prompt, /certificado mínimo APTO|JP aguarda o APTO|situação APTO/);
  assert.doesNotMatch(prompt, /modelo-sintetico|meta\//);
  const input = inputFromPrompt(prompt);
  assert.equal(input.certificado.versao_protocolo, '3.4');
  await assert.rejects(prepareKit(directory, { judge: 'grok-5', repositoryRoot }), /Já existe kit/);

  for (const task of kit.tasks) {
    const answer = judgment({ code: task.code, topic: task.topic, round: task.round, role: task.role }, task.role === 'JP1' ? { status: 'BLOQUEADO' } : {});
    await writeFile(join(root, 'tarefas', task.task, 'parecer.json'), JSON.stringify(answer));
  }
  let summary = await checkKit(directory, 'grok-5');
  assert.equal(summary.accepted, 1);
  assert.match(summary.outcomes.find((outcome) => outcome.role === 'JP1').problem, /CONCLUÍDO, não BLOQUEADO/);

  const answer = judgment({ code: pedagogical.code, topic: pedagogical.topic, round: pedagogical.round, role: 'JP1' });
  await writeFile(join(root, 'tarefas', pedagogical.task, 'parecer.json'), `\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``);
  summary = await checkKit(directory, 'grok-5');
  assert.equal(summary.accepted, 2);
  assert.equal(kitDirectory(directory, 'grok-5'), root);

  const panel = await buildPanel(directory);
  assert.deepEqual(panel.judges.map((judge) => judge.name), ['claude-teste', 'grok-5']);
  assert.equal(panel.panel[0].judges, 2);
  assert.equal(panel.panel[0].score, 100);
});

test('juiz da mesma família não entra na média do painel', () => {
  const models = [{ id: 'S1', model: 'openai/a' }, { id: 'S2', model: 'meta/b' }];
  const executions = [{ execution_id: 'E1', system_id: 'S1' }, { execution_id: 'E2', system_id: 'S2' }];
  const gpt = { name: 'gpt', family: 'openai', scores: new Map([['E1', { P: 100, S: 100 }], ['E2', { P: 80, S: 50 }]]) };
  const grok = { name: 'grok', family: 'xai', scores: new Map([['E1', { P: 90, S: 100 }], ['E2', { P: 60, S: 100 }]]) };
  for (const judge of [gpt, grok]) judge.table = judgeTable(judge, models, executions, judge.scores);
  const panel = panelTable(models, [gpt, grok]);
  const first = panel.find((row) => row.system_id === 'S1');
  assert.equal(first.score, 90);
  assert.deepEqual(first.excluded, ['gpt']);
  assert.equal(panel.find((row) => row.system_id === 'S2').score, 50);
  const missing = judgeTable({ family: 'xai' }, models, executions, new Map([['E1', { P: 90, S: 100 }]]));
  assert.equal(missing.find((row) => row.system_id === 'S2').status, 'INCOMPLETO');
});
