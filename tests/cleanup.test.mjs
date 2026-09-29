import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clearGeneratedFiles } from '../coletor/cleanup.mjs';
import { acquireOutputLock } from '../coletor/output-lock.mjs';

async function fixture(context) {
  const home = await mkdtemp(join(tmpdir(), 'bench-cleanup-test-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const output = join(home, 'coletas');
  const batch = join(output, 'piloto-2026-09-29T02-51-42.248Z-35fd38d9-621f-403c-b67c-337ff6c5879c');
  const task = join(batch, 'juizes/pareceres/JT/Qteste');
  const workspace = join(home, 'Documents/tmp/bench-juiz-abc123');
  const configPath = join(home, 'openrouter.config.json');
  await mkdir(task, { recursive: true });
  await mkdir(workspace, { recursive: true });
  await mkdir(join(batch, 'privado'));
  await writeFile(configPath, JSON.stringify({ output_dir: '~/coletas' }));
  await writeFile(join(home, '.env'), 'CREDENCIAL_DE_TESTE');
  await writeFile(join(home, 'fonte.md'), 'Fonte preservada.');
  await writeFile(join(batch, 'batch.json'), JSON.stringify({ condition: 'openrouter-v1', schema_version: 1, executions: [] }));
  await writeFile(join(task, 'envio.json'), JSON.stringify({ pane_id: 'wtest:p2', workspace }));
  await writeFile(join(workspace, 'worker.mjs'), 'Executor simulado.');
  const options = { homeDirectory: home, readProcessList: async () => [], command: async () => { throw Object.assign(new Error('Pane ausente.'), { stderr: JSON.stringify({ error: { code: 'pane_not_found' } }) }); } };
  return { home, output, batch, task, workspace, configPath, options };
}

test('apagar remove lotes e temporários associados, preserva configuração e fontes e pode repetir', async (context) => {
  const data = await fixture(context);
  const originalConfig = await readFile(data.configPath, 'utf8');
  await mkdir(join(data.output, 'outros-arquivos'));
  await writeFile(join(data.output, 'outros-arquivos/nota.md'), 'Preservar.');
  await symlink(data.home, join(data.output, 'atalho'));
  assert.deepEqual(await clearGeneratedFiles(data.configPath, data.options), { batches: 1, workspaces: 1 });
  assert.equal(await readFile(data.configPath, 'utf8'), originalConfig);
  assert.equal(await readFile(join(data.home, '.env'), 'utf8'), 'CREDENCIAL_DE_TESTE');
  assert.equal(await readFile(join(data.home, 'fonte.md'), 'utf8'), 'Fonte preservada.');
  assert.deepEqual((await readdir(data.output)).sort(), ['atalho', 'outros-arquivos']);
  await assert.rejects(readdir(data.workspace), { code: 'ENOENT' });
  assert.deepEqual(await clearGeneratedFiles(data.configPath, data.options), { batches: 0, workspaces: 0 });
});

test('apagar fecha somente o pane associado ao diretório do julgamento', async (context) => {
  const data = await fixture(context);
  const calls = [];
  const command = async (args) => {
    calls.push(args);
    return { pane: { cwd: data.workspace, foreground_cwd: data.workspace, agent: 'codex' } };
  };
  await clearGeneratedFiles(data.configPath, { ...data.options, command });
  assert.deepEqual(calls, [['pane', 'get', 'wtest:p2'], ['pane', 'close', 'wtest:p2']]);
});

test('apagar recusa temporário fora da pasta permitida antes de remover qualquer lote', async (context) => {
  const data = await fixture(context);
  const external = join(data.home, 'bench-juiz-fora');
  await mkdir(external);
  await writeFile(join(data.task, 'envio.json'), JSON.stringify({ workspace: external, pane_id: 'wtest:p2' }));
  await assert.rejects(clearGeneratedFiles(data.configPath, data.options), /fora das pastas/);
  assert.ok((await readdir(data.batch)).includes('batch.json'));
  assert.deepEqual(await readdir(external), []);
});

test('apagar preserva arquivos quando o pane foi reutilizado para outra tarefa', async (context) => {
  const data = await fixture(context);
  const command = async (args) => {
    assert.equal(args[1], 'get');
    return { pane: { cwd: data.home, foreground_cwd: data.home } };
  };
  await assert.rejects(clearGeneratedFiles(data.configPath, { ...data.options, command }), /outro diretório/);
  assert.ok((await readdir(data.batch)).includes('batch.json'));
});

test('apagar recusa coleta ativa e trava com PID vivo sem remover dados', async (context) => {
  const data = await fixture(context);
  await assert.rejects(clearGeneratedFiles(data.configPath, { ...data.options, readProcessList: async () => ['node node coletor/pipeline-cli.mjs'] }), /fluxo ativo/);
  await assert.rejects(clearGeneratedFiles(data.configPath, { ...data.options, readProcessList: async () => ['node node cli.mjs coletar --confirmar'] }), /fluxo ativo/);
  await writeFile(join(data.batch, 'privado/julgamento.lock'), JSON.stringify({ pid: process.pid }));
  await assert.rejects(clearGeneratedFiles(data.configPath, data.options), /coordenador ativo/);
  assert.ok((await readdir(data.batch)).includes('batch.json'));
});

test('limpeza e execução reservam a mesma pasta antes de tocar nos lotes', async (context) => {
  const data = await fixture(context);
  const release = await acquireOutputLock(data.output);
  await assert.rejects(clearGeneratedFiles(data.configPath, data.options), /Outra operação/);
  assert.ok((await readdir(data.batch)).includes('batch.json'));
  await release();
  const command = async () => {
    await assert.rejects(acquireOutputLock(data.output), /Outra operação/);
    throw Object.assign(new Error('Pane ausente.'), { stderr: JSON.stringify({ error: { code: 'pane_not_found' } }) });
  };
  await clearGeneratedFiles(data.configPath, { ...data.options, command });
  const releaseAfterCleanup = await acquireOutputLock(data.output);
  await releaseAfterCleanup();
});
