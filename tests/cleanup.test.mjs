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
  const configPath = join(home, 'openrouter.config.json');
  await mkdir(task, { recursive: true });
  await mkdir(join(batch, 'privado'));
  await writeFile(configPath, JSON.stringify({ output_dir: '~/coletas' }));
  await writeFile(join(home, '.env'), 'CREDENCIAL_DE_TESTE');
  await writeFile(join(home, 'fonte.md'), 'Fonte preservada.');
  await writeFile(join(batch, 'batch.json'), JSON.stringify({ condition: 'openrouter-v1', schema_version: 1, executions: [] }));
  await writeFile(join(task, 'envio.json'), JSON.stringify({ request_sha256: 'teste' }));
  const options = { homeDirectory: home, readProcessList: async () => [] };
  return { home, output, batch, task, configPath, options };
}

test('apagar remove lotes, preserva configuração e fontes e pode repetir', async (context) => {
  const data = await fixture(context);
  const originalConfig = await readFile(data.configPath, 'utf8');
  await mkdir(join(data.output, 'outros-arquivos'));
  await writeFile(join(data.output, 'outros-arquivos/nota.md'), 'Preservar.');
  await symlink(data.home, join(data.output, 'atalho'));
  assert.deepEqual(await clearGeneratedFiles(data.configPath, data.options), { batches: 1 });
  assert.equal(await readFile(data.configPath, 'utf8'), originalConfig);
  assert.equal(await readFile(join(data.home, '.env'), 'utf8'), 'CREDENCIAL_DE_TESTE');
  assert.equal(await readFile(join(data.home, 'fonte.md'), 'utf8'), 'Fonte preservada.');
  assert.deepEqual((await readdir(data.output)).sort(), ['atalho', 'outros-arquivos']);
  assert.deepEqual(await clearGeneratedFiles(data.configPath, data.options), { batches: 0 });
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
  const readProcessList = async () => {
    await assert.rejects(acquireOutputLock(data.output), /Outra operação/);
    return [];
  };
  await clearGeneratedFiles(data.configPath, { ...data.options, readProcessList });
  const releaseAfterCleanup = await acquireOutputLock(data.output);
  await releaseAfterCleanup();
});
