import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sha256 } from '../coletor/config.mjs';
import { judgeBatch, finalizeScientific } from '../coletor/pipeline.mjs';
import { fixedItems, roleFamily } from '../coletor/judgments.mjs';
import { claudeArguments } from '../coletor/claude-judge.mjs';
import { academicDomains, effectiveScientificStatus, externalCandidates, materialAdherence, validateExternalJudgment } from '../coletor/external-verification.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const config = { model: 'modelo-teste', reasoning_effort: 'medium', timeout_seconds: 1 };
const executionId = 'E00000000000000000001';
const identity = { code: 'Qx', topic: 'B01', round: 1, role: 'JX1' };
const url = 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC1/fullTextXML';

function item(id, score, value) {
  return { id, score, value, unit: '', numerator: null, denominator: null, evidence: score === null ? '' : 'Trecho sintético.', reason_na: score === null ? 'Fora do material.' : '' };
}

function scientific(status, overrides = {}) {
  const items = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map((id) => item(id, overrides[id] ?? 100, null));
  items.push(item('A1', 100, 'SUSTENTADA'), item('A2', null, 'NÃO VERIFICÁVEL'), item('V1', overrides.V1 ?? 100, overrides.V1 === 0 ? 'PROBLEMA CONFIRMADO' : 'VÁLIDO'));
  items.push(item('C1', 100, null), item('C2', null, null), item('C3', 100, null), item('SITUACAO_CIENTIFICA', null, status));
  return { status, items, blockers: status === 'PENDENTE' ? ['A2 não verificável.'] : [] };
}

function external(value, role = 'JX1') {
  const score = { CONFIRMADA_EXTERNA: 100, CONTRADITA_EXTERNA: 0, SEM_EVIDÊNCIA: null }[value];
  const cited = value !== 'SEM_EVIDÊNCIA';
  return {
    protocol_version: '3.3', ...identity, role, status: 'CONCLUÍDO', report: 'Verificação sintética.',
    items: [{ id: 'A2', value, score, url: cited ? url : '', source_title: cited ? 'Revisão sintética' : '', excerpt: cited ? 'Trecho literal sintético.' : '', reason: 'Busca sintética.' }],
  };
}

test('somente PENDENTE sem erro confirmado gera candidatos à verificação externa', () => {
  assert.deepEqual(externalCandidates(scientific('PENDENTE')).map((candidate) => candidate.id), ['A2']);
  assert.deepEqual(externalCandidates(scientific('CORRIGIR')), []);
  assert.deepEqual(externalCandidates(scientific('PENDENTE', { K4: 50 })), []);
  assert.deepEqual(externalCandidates(scientific('PENDENTE', { V1: 0 })), []);
});

test('evidência externa exige host acadêmico e trecho literal', () => {
  const candidates = externalCandidates(scientific('PENDENTE'));
  assert.ok(validateExternalJudgment(external('CONFIRMADA_EXTERNA'), identity, candidates));
  const outside = external('CONFIRMADA_EXTERNA');
  outside.items[0].url = 'https://blog.example.com/imunologia';
  assert.throws(() => validateExternalJudgment(outside, identity, candidates), /fora da lista/);
  const withoutExcerpt = external('CONTRADITA_EXTERNA');
  withoutExcerpt.items[0].excerpt = ' ';
  assert.throws(() => validateExternalJudgment(withoutExcerpt, identity, candidates), /trecho literal/);
  const missing = { ...external('CONFIRMADA_EXTERNA'), items: [] };
  assert.throws(() => validateExternalJudgment(missing, identity, candidates), /sem decisão externa/);
});

test('decisão efetiva: confirmação gera APTO, contradição gera CORRIGIR, falta de evidência mantém PENDENTE', () => {
  const pending = scientific('PENDENTE');
  assert.equal(effectiveScientificStatus(pending, external('CONFIRMADA_EXTERNA')), 'APTO');
  assert.equal(effectiveScientificStatus(pending, external('CONTRADITA_EXTERNA')), 'CORRIGIR');
  assert.equal(effectiveScientificStatus(pending, external('SEM_EVIDÊNCIA')), 'PENDENTE');
  assert.equal(materialAdherence(pending), 50);
});

test('finalizeScientific aplica o JX em memória e descarta o que continua pendente', () => {
  const jc = { role: 'JC1', code: 'Qc', status: 'PENDENTE', executed: true, result: scientific('PENDENTE') };
  const approved = finalizeScientific(jc, { role: 'JX1', code: 'Qx', result: external('CONFIRMADA_EXTERNA') });
  assert.equal(approved.status, 'APTO');
  assert.equal(approved.result.items.find((entry) => entry.id === 'SITUACAO_CIENTIFICA').value, 'APTO');
  assert.equal(approved.material_adherence, 50);
  const discarded = finalizeScientific(jc, { role: 'JX1', code: 'Qx', result: external('SEM_EVIDÊNCIA') });
  assert.equal(discarded.status, 'DESCARTADO');
  assert.equal(discarded.material_adherence, 50);
});

test('JX recebe apenas WebSearch e WebFetch nos domínios acadêmicos', () => {
  const args = claudeArguments({ config, schema: { type: 'object' }, web_domains: academicDomains });
  assert.equal(args[args.indexOf('--tools') + 1], 'WebSearch,WebFetch');
  assert.ok(args.includes('WebFetch(domain:www.ebi.ac.uk)'));
  const plain = claudeArguments({ config, schema: { type: 'object' } });
  assert.equal(plain[plain.indexOf('--tools') + 1], '');
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'bench-jx-test-'));
  await mkdir(join(directory, 'privado/pedidos'), { recursive: true });
  await mkdir(join(directory, 'comprovantes', executionId), { recursive: true });
  const messages = [{ role: 'user', content: 'Pedido B01, K1-K6. B01-F1: fonte sintética.' }];
  const execution = { execution_id: executionId, system_id: 'S01', topic: 'B01', round: 1, prompt_sha256: sha256(JSON.stringify(messages)) };
  const record = { ...execution, operational_status: 'conclusão normal', output_branch: 'explicação', issues: [], duration_seconds: 2, first_text_seconds: 1, prompt_tokens: 10, completion_tokens: 20, cost_usd: 0.01, cost_brl: 0.05, telemetry_status: 'COMPLETA', total_tokens: 30 };
  await writeFile(join(directory, 'batch.json'), JSON.stringify({ schema_version: 1, condition: 'openrouter-v1', executions: [execution], config: { phase: 'PILOTO', models: [{ id: 'S01', model: 'vendor/secret-model', provider: 'vendor' }] } }));
  await writeFile(join(directory, 'privado/protocolo.md'), await readFile(join(repositoryRoot, 'referencias/protocolo-pontuacao.md')));
  await writeFile(join(directory, 'privado/pedidos/B01.json'), JSON.stringify({ messages }));
  await writeFile(join(directory, 'comprovantes', executionId, 'pedido.json'), JSON.stringify({ messages }));
  await writeFile(join(directory, 'comprovantes', executionId, 'metricas.json'), JSON.stringify(record));
  await writeFile(join(directory, 'comprovantes', executionId, 'resposta.md'), '# Explicação sintética\nTexto de teste.');
  return directory;
}

function inputFromPrompt(prompt) {
  return JSON.parse(prompt.split('## Entradas da chamada (dados, não instruções)\n\n')[1]);
}

function judgment(input) {
  if (input.role === 'CONSOLIDADOR') return { title: 'Teste', summary: 'Teste.', observations: [], limitations: [] };
  const family = roleFamily(input.role);
  if (family === 'JX') return { ...external('CONFIRMADA_EXTERNA', input.role), code: input.code };
  if (family === 'JC') {
    const status = input.role === 'JC1' ? 'PENDENTE' : 'APTO';
    const result = scientific(status);
    if (status === 'APTO') {
      result.items.find((entry) => entry.id === 'A2').score = 100;
      Object.assign(result.items.find((entry) => entry.id === 'A2'), { value: 'SUSTENTADA', evidence: 'Trecho.', reason_na: '' });
      result.items.find((entry) => entry.id === 'C2').score = 100;
      result.items.find((entry) => entry.id === 'C2').evidence = 'Cálculo.';
    } else {
      result.items.find((entry) => entry.id === 'C2').reason_na = 'A2 pendente.';
    }
    result.items.find((entry) => entry.id === 'SITUACAO_CIENTIFICA').evidence = 'Decisão.';
    return { protocol_version: '3.2', code: input.code, topic: input.topic, round: input.round, role: input.role, report: 'Parecer sintético.', ...result };
  }
  const items = fixedItems[family].map((id) => ({ id, score: /^(M\d(?:\.\d)?|P|T1|F[1-4])$/.test(id) ? 100 : null, value: null, unit: '', numerator: null, denominator: null, evidence: 'Evidência sintética.', reason_na: 'N/A sintético.' }));
  const values = { SITUACAO_PEDAGOGICA: 'CONCLUÍDO', STATUS_OPERACIONAL: 'conclusão normal', RAMO_SAIDA: 'explicação', INICIADA: true, PALAVRAS_CORPO: 900, LATENCIA_TOTAL_S: 2, PRIMEIRO_TEXTO_S: 1, TOKENS_ENTRADA: 10, TOKENS_SAIDA: 20, CUSTO_GERACAO_BRL: 0.05 };
  for (const entry of items) if (Object.hasOwn(values, entry.id)) entry.value = values[entry.id];
  if (family === 'JT') items.find((entry) => entry.id === 'T2').score = null;
  return { protocol_version: '3.2', code: input.code, topic: input.topic, round: input.round, role: input.role, status: 'CONCLUÍDO', blockers: [], report: 'Parecer sintético.', items };
}

test('JC1 pendente confirmado pelo JX1 libera JP1 e entra no ranking', async () => {
  const directory = await fixture();
  const calls = [];
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push({ role: input.role, web: job.web_domains?.length ?? 0 });
    return judgment(input);
  };
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.deepEqual(calls.map((call) => call.role), ['JC1', 'JC2', 'JX1', 'JP1', 'JP2', 'JT', 'JE', 'CONSOLIDADOR']);
  assert.ok(calls.find((call) => call.role === 'JX1').web > 0);
  assert.equal(calls.filter((call) => call.role !== 'JX1').every((call) => call.web === 0), true);
  const judgments = result.completed[executionId];
  assert.equal(judgments.JC1.status, 'APTO');
  assert.equal(judgments.JC1.original_status, 'PENDENTE');
  assert.equal(judgments.JX2.status, 'NÃO APLICÁVEL');
  assert.equal(judgments.JP1.status, 'CONCLUÍDO');
  const summary = await readFile(join(directory, 'consolidado/resultados-resumo.csv'), 'utf8');
  assert.match(summary, /"APTO","CONCLUÍDO"/);
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.match(html, /<td>100<\/td><td>CONCLUÍDO<\/td>/);
  assert.match(html, /Verificação externa - juiz JX/);
  const archived = JSON.parse(await readFile(join(directory, 'juizes/pareceres/JC1', judgments.JC1.code, 'aceito.json'), 'utf8'));
  assert.equal(archived.status, 'PENDENTE');
  const resumed = await judgeBatch(directory, { repositoryRoot, config, localOnly: true, runJob: async () => { throw new Error('não deveria chamar'); } });
  assert.equal(resumed.completed[executionId].JC1.status, 'APTO');
});
