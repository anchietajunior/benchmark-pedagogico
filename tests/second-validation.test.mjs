import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codexArguments, codexEnvironment, validateCodexEvents } from '../coletor/codex-judge.mjs';
import { buildComparison, judgeFamily, parseQuotedCsv, validationRoles } from '../coletor/second-validation.mjs';

test('família do juiz é inferida pelo nome do modelo', () => {
  assert.equal(judgeFamily('gpt-6.1-sol'), 'openai');
  assert.equal(judgeFamily('claude-opus-5-5'), 'anthropic');
  assert.equal(judgeFamily('gemini-3.8-flash'), 'google');
  assert.deepEqual(validationRoles(1), ['JC1', 'JP1']);
  assert.deepEqual(validationRoles(2), ['JC1', 'JC2', 'JP1', 'JP2']);
});

test('CSV com vírgulas, aspas e quebras de linha nas células é lido sem deslocar colunas', () => {
  const rows = parseQuotedCsv('"E1","a, b","linha 1\nlinha 2"\n"E2","diz ""x""","3"\n');
  assert.deepEqual(rows, [['E1', 'a, b', 'linha 1\nlinha 2'], ['E2', 'diz "x"', '3']]);
});

test('Codex roda isolado, somente leitura e com schema de saída', () => {
  const args = codexArguments('/lote/tarefa', { model: 'gpt-6.1-sol', reasoning_effort: 'medium' });
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  assert.equal(args[args.indexOf('--model') + 1], 'gpt-6.1-sol');
  assert.ok(args.includes('web_search="disabled"'));
  assert.ok(args.includes('shell_tool'));
  assert.equal(args[args.indexOf('--output-schema') + 1], '/lote/tarefa/schema.json');
  assert.deepEqual(codexEnvironment({ PATH: '/bin', OPENAI_API_KEY: 'segredo', OPENROUTER_API_KEY: 'segredo' }), { PATH: '/bin' });
});

test('eventos do Codex só valem com turno concluído e sem ferramentas', () => {
  const ok = [
    { type: 'item.completed', item: { type: 'error', message: 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed.' } },
    { type: 'turn.started' }, { type: 'item.completed', item: { type: 'agent_message', text: '{}' } }, { type: 'turn.completed' },
  ].map((entry) => JSON.stringify(entry)).join('\n');
  assert.ok(validateCodexEvents(ok));
  const tool = [{ type: 'turn.started' }, { type: 'item.completed', item: { type: 'command_execution' } }, { type: 'turn.completed' }].map((entry) => JSON.stringify(entry)).join('\n');
  assert.throws(() => validateCodexEvents(tool), /ferramentas/);
  const unfinished = [{ type: 'turn.started' }].map((entry) => JSON.stringify(entry)).join('\n');
  assert.throws(() => validateCodexEvents(unfinished), /conclusão íntegra/);
});

test('comparação calcula painel e exclui a família do juiz', () => {
  const judgeState = {
    models: [{ id: 'S1', model: 'anthropic/a' }, { id: 'S2', model: 'openai/b' }],
    executions: [{ execution_id: 'E1', system_id: 'S1', topic: 'B01' }, { execution_id: 'E2', system_id: 'S2', topic: 'B01' }],
  };
  const pItems = (score) => ({ status: 'CONCLUÍDO', items: [{ id: 'P', score }] });
  const outcomes = { E1: { excluded: null, JP1: { status: 'CONCLUÍDO', result: pItems(80) }, JC1: { status: 'APTO', result: { items: [{ id: 'K1', score: 100 }] } } }, E2: { excluded: 'mesma família do juiz (openai)' } };
  const primary = new Map([['E1', { P: '90', S: '100' }], ['E2', { P: '85', S: '100' }]]);
  const comparison = buildComparison(judgeState, { config: { model: 'gpt-6.1-sol' }, judge_family: 'openai' }, outcomes, primary);
  const first = comparison.models.find((model) => model.system_id === 'S1');
  assert.equal(first.panel_score, 85);
  assert.equal(first.second_score, 80);
  const second = comparison.models.find((model) => model.system_id === 'S2');
  assert.equal(second.excluded, true);
  assert.equal(second.panel_score, 85);
  assert.deepEqual([comparison.agreement.mean_abs_diff_P, comparison.agreement.n_P], [10, 1]);
});
