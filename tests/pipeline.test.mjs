import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, copyFile, symlink, rm, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sha256 } from '../coletor/config.mjs';
import { judgeBatch, identityConcern } from '../coletor/pipeline.mjs';
import { fixedItems, roleFamily, validateJudgment, renderJudgePrompt } from '../coletor/judgments.mjs';
import { runHerdrJob } from '../coletor/herdr.mjs';
import { codexArguments, codexEnvironment } from '../coletor/codex-worker.mjs';
import { escapeHtml } from '../coletor/html-report.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const config = { model: 'modelo-teste', reasoning_effort: 'medium', timeout_seconds: 1 };
const executionId = 'E00000000000000000001';
const executeFile = promisify(execFile);

test('Herdr aceita sucesso vazio de pane run e exige JSON nos comandos de consulta', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-herdr-cli-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'herdr'), `#!${process.execPath}\nif (process.argv[3] === 'get') console.log(JSON.stringify({ result: { pane: { pane_id: 'wtest:p2' } } }));\n`, { mode: 0o700 });
  const script = `import { herdrCommand } from ${JSON.stringify(new URL('../coletor/herdr.mjs', import.meta.url).href)}; console.log(JSON.stringify(await herdrCommand(JSON.parse(process.argv[1]))));`;
  const options = { env: { ...process.env, PATH: directory } };
  const run = await executeFile(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(['pane', 'run', 'wtest:p2', 'true'])], options);
  assert.equal(run.stdout.trim(), 'null');
  const get = await executeFile(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(['pane', 'get', 'wtest:p2'])], options);
  assert.equal(JSON.parse(get.stdout).pane.pane_id, 'wtest:p2');
  await assert.rejects(executeFile(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(['pane', 'current', '--current'])], options), /JSON/);
});

test('worker inicia por diretório simbólico e registra conclusão sem chamar Codex real', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-worker-link-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const workspace = join(directory, 'workspace');
  const alias = join(directory, 'alias');
  await mkdir(workspace);
  await symlink(workspace, alias, 'dir');
  await copyFile(new URL('../coletor/codex-worker.mjs', import.meta.url), join(workspace, 'worker.mjs'));
  await writeFile(join(workspace, 'config.json'), JSON.stringify(config));
  await writeFile(join(workspace, 'contexto.json'), JSON.stringify({ label: 'JC1: Qteste' }));
  await writeFile(join(workspace, 'pedido.md'), 'Teste local.');
  await writeFile(join(directory, 'codex'), `#!${process.execPath}\nprocess.stdin.resume();\nconsole.log(JSON.stringify({ type: 'turn.completed' }));\n`, { mode: 0o700 });
  const execution = await executeFile(process.execPath, [join(alias, 'worker.mjs')], { env: { ...process.env, PATH: directory } });
  assert.match(execution.stdout, /JC1: Qteste/);
  assert.match(execution.stdout, /Aguardando.*Codex/);
  assert.match(execution.stdout, /concluiu.*validação/);
  const completed = JSON.parse(await readFile(join(workspace, 'concluido.json'), 'utf8'));
  assert.equal(completed.exit_code, 0);
  assert.equal(completed.error, null);
  await assert.rejects(executeFile(process.execPath, [join(alias, 'worker.mjs')], { env: { ...process.env, PATH: directory } }), /EEXIST/);
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
  assert.equal(pedagogical.certificado.passagem_cientifica_origem, 'JC1');
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
  assert.ok(html.includes(scientific.code));
  assert.ok(html.includes(pedagogical.code));
  const global = await readFile(join(directory, 'consolidado/global-por-rodada.csv'), 'utf8');
  assert.match(global, /"false","N\/A"/);
  await judgeBatch(directory, { repositoryRoot, runJob: () => { throw new Error('Retomada não deve chamar modelo.'); } });
  assert.equal(await readFile(join(directory, 'consolidado/resultados-resumo.csv'), 'utf8'), summary);
});

test('JC1 corrigir bloqueia apenas JP1; JC2 apto libera somente JP2', async () => {
  const directory = await fixture();
  const calls = [];
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input.role);
    return judgment(input, input.role === 'JC1' ? 'CORRIGIR' : undefined);
  } });
  assert.equal(calls.includes('JP1'), false);
  assert.equal(calls.includes('JP2'), true);
  assert.equal(result.completed[executionId].JP1.executed, false);
  const rows = await readFile(join(directory, 'consolidado/resultados-completos.csv'), 'utf8');
  assert.match(rows, /"JP1","M1\.1","N\/A"/);
});

test('APTO contraditório fica pendente e não libera pedagogia nem é repetido', async () => {
  const directory = await fixture();
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    const result = judgment(input);
    if (input.role.startsWith('JC')) result.blockers.push('Fonte não verificada.');
    return result;
  };
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.equal(result.completed[executionId].JC1.status, 'PENDENTE');
  assert.equal(result.completed[executionId].JP1.executed, false);
  await judgeBatch(directory, { repositoryRoot, runJob: () => { throw new Error('Não reenviar.'); } });
});

test('ausência de registros mantém todas as linhas previstas sem inferência', async () => {
  const directory = await fixture({ missing: true });
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    assert.equal(input.role, 'CONSOLIDADOR');
    return judgment(input);
  } });
  assert.equal(result.consolidation.planned, 1);
  assert.equal(Object.keys(result.completed[executionId]).length, 6);
  const report = await readFile(join(directory, 'consolidado/relatorio.md'), 'utf8');
  assert.match(report, /custo incompleto/);
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
  assert.deepEqual(roles, ['CONSOLIDADOR']);
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

test('JE permite detalhes opcionais dos tokens e confere seus valores contra os comprovantes', async () => {
  for (const total of [null, 900]) {
    const directory = await fixture();
    const result = await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
      const input = inputFromPrompt(job.prompt);
      const output = judgment(input);
      if (input.role === 'JE') {
        for (const id of ['TOKENS_TOTAIS', 'TOKENS_CACHE', 'TOKENS_RACIOCINIO']) output.items.push({ ...output.items.find((item) => item.id === 'TOKENS_ENTRADA'), id, value: id === 'TOKENS_TOTAIS' ? total : null });
      }
      return output;
    } });
    assert.equal(result.completed[executionId].JE.status, total === null ? 'CONCLUÍDO' : 'PENDENTE');
    if (total !== null) assert.match(result.completed[executionId].JE.reason, /medida incompatível/);
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
  let submitted = false;
  const runJob = async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    if (input.role !== 'JC1') return judgment(input);
    if (submitted) return runHerdrJob(path, job, { command: async () => ({}) });
    submitted = true;
    const archivedJob = { ...job, prompt: job.prompt.replace(/## Contrato de saída[\s\S]*?(?=## Entradas da chamada)/, '## Contrato anterior\n\n') };
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'pedido.md'), archivedJob.prompt);
    await writeFile(join(path, 'schema.json'), JSON.stringify(archivedJob.schema));
    await writeFile(join(path, 'envio.json'), JSON.stringify({ workspace: path, pane_id: 'wtest:p2', request_sha256: sha256(JSON.stringify(archivedJob)) }));
    await writeFile(join(path, 'concluido.json'), JSON.stringify({ exit_code: 0, timed_out: false, error: null }));
    await writeFile(join(path, 'resultado.json'), JSON.stringify(judgment(input)));
    await writeFile(join(path, 'eventos.jsonl'), JSON.stringify({ type: 'turn.completed' }));
    throw new Error('Coordenador interrompido após envio.');
  };
  await assert.rejects(judgeBatch(directory, { repositoryRoot, config, runJob }), /Coordenador interrompido/);
  const result = await judgeBatch(directory, { repositoryRoot, config, runJob });
  assert.equal(result.completed[executionId].JC1.status, 'APTO');
});

test('envio Herdr incerto não duplica o comando ao retomar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-herdr-test-'));
  const commands = [];
  const command = async (args) => {
    commands.push(args);
    if (args[1] === 'split') return { pane: { pane_id: 'wtest:p2' } };
    throw new Error('Conexão perdida depois do envio.');
  };
  const job = { prompt: 'Somente teste local.', schema: {}, config };
  await assert.rejects(runHerdrJob(directory, job, { caller_pane: 'wtest:p1', command, workspaceRoot: directory }), /Conexão perdida/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runHerdrJob(directory, job, { caller_pane: 'wtest:p1', command, signal: controller.signal }), /não será|sem reenviar/);
  assert.equal(commands.filter((args) => args[1] === 'run').length, 1);
});

test('worker Codex recebe configuração isolada e não herda chaves da coleta', () => {
  const args = codexArguments('/tmp/neutral', config);
  for (const flag of ['--no-daemon', '--ignore-user-config', '--ignore-rules', '--ephemeral', 'skip_host_skill_discovery', 'project_doc_max_bytes=0', 'web_search="disabled"']) assert.ok(args.includes(flag));
  assert.equal(args.includes('--resume'), false);
  assert.deepEqual(codexEnvironment({ HOME: '/user', PATH: '/bin', OPENROUTER_API_KEY: 'secret', OPENAI_API_KEY: 'secret', HERDR_PANE_ID: 'private' }), { HOME: '/user', PATH: '/bin' });
});

test('HTML trata texto do consolidador como texto e não como código executável', () => {
  assert.equal(escapeHtml('<script>alert("x")</script> & nota'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; nota');
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
  await judgeBatch(directory, { repositoryRoot, config, runJob: async (path, job) => {
    const input = inputFromPrompt(job.prompt);
    calls.push(input);
    if (input.role !== 'CONSOLIDADOR') assert.doesNotMatch(job.prompt, /secret-model|hidden-model/);
    return judgment(input);
  } });
  const state = JSON.parse(await readFile(join(directory, 'privado/julgamento.json'), 'utf8'));
  assert.deepEqual(calls.filter((call) => call.role === 'JC2').map((call) => call.code), state.executions.toReversed().map((execution) => execution.codes.JC2));
  assert.equal(new Set(calls.filter((call) => call.role !== 'CONSOLIDADOR').map((call) => call.code)).size, 12);
  const html = await readFile(join(directory, 'consolidado/resultados.html'), 'utf8');
  assert.match(html, /vendor\/secret-model/);
  assert.match(html, /another\/hidden-model/);
});

test('simulador de transporte arquiva saída e rejeita ferramentas inesperadas', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-herdr-output-test-'));
  let workspace;
  const command = async (args) => {
    if (args[1] === 'split') {
      workspace = args[args.indexOf('--cwd') + 1];
      return { pane: { pane_id: 'wtest:p2' } };
    }
    if (args[1] === 'run') {
      await writeFile(join(workspace, 'resultado.json'), JSON.stringify({ response: 'sintética' }));
      await writeFile(join(workspace, 'eventos.jsonl'), `${JSON.stringify({ type: 'item.completed', item: { type: 'command_execution' } })}\n${JSON.stringify({ type: 'turn.completed' })}\n`);
      await writeFile(join(workspace, 'concluido.json'), JSON.stringify({ exit_code: 0, timed_out: false, error: null }));
    }
    return {};
  };
  await assert.rejects(runHerdrJob(directory, { prompt: 'Teste', schema: {}, config }, { caller_pane: 'wtest:p1', command, workspaceRoot: directory }), /ferramentas/);
  assert.ok((await readdir(directory)).includes('resultado.json'));
});

test('avisos conhecidos antes do turno não são ferramentas e o pane arquivado é fechado', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-codex-warnings-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const events = [
    { type: 'thread.started', thread_id: 'fixture' },
    { type: 'item.completed', item: { type: 'error', message: 'Under-development features enabled: skip_host_skill_discovery. Under-development features are incomplete and may behave unpredictably. To suppress this warning, set `suppress_unstable_features_warning = true` in /user/.codex/config.toml.' } },
    { type: 'item.completed', item: { type: 'error', message: 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.' } },
    { type: 'turn.started' },
    { type: 'item.completed', item: { type: 'agent_message', text: '{}' } },
    { type: 'turn.completed' },
  ];
  const messages = [];
  const commands = [];
  let workspace;
  const command = async (args) => {
    commands.push(args[1]);
    if (args[1] === 'split') {
      workspace = args[args.indexOf('--cwd') + 1];
      assert.ok(workspace.startsWith(await realpath(directory)));
      return { pane: { pane_id: 'wtest:p2' } };
    }
    if (args[1] === 'run') {
      await writeFile(join(workspace, 'resultado.json'), '{}');
      await writeFile(join(workspace, 'eventos.jsonl'), events.map((event) => JSON.stringify(event)).join('\n'));
      await writeFile(join(workspace, 'concluido.json'), JSON.stringify({ exit_code: 0, timed_out: false, error: null }));
    }
    if (args[1] === 'get') return { pane: { cwd: workspace, foreground_cwd: workspace } };
    return {};
  };
  const job = { prompt: 'Teste local.', schema: {}, config };
  const options = { command, caller_pane: 'wtest:p1', workspaceRoot: directory, label: 'JC1: Qteste', onProgress: (message) => messages.push(message) };
  assert.deepEqual(await runHerdrJob(directory, job, options), {});
  assert.equal(messages.filter((message) => message.startsWith('Aviso Codex:')).length, 2);
  assert.equal(commands.filter((name) => name === 'close').length, 1);
  assert.equal(JSON.parse(await readFile(join(workspace, 'contexto.json'), 'utf8')).label, 'JC1: Qteste');
  events.splice(4, 0, { type: 'item.completed', item: { type: 'error', message: 'Falha inesperada no julgamento.' } });
  await writeFile(join(directory, 'eventos.jsonl'), events.map((event) => JSON.stringify(event)).join('\n'));
  await assert.rejects(runHerdrJob(directory, job, options), /Falha inesperada no julgamento/);
  events[4].item.message = events[1].item.message;
  await writeFile(join(directory, 'eventos.jsonl'), events.map((event) => JSON.stringify(event)).join('\n'));
  await assert.rejects(runHerdrJob(directory, job, options), /Codex reportou erro/);
});
