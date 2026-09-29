import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findLatestBatch, parsePipelineOptions } from '../coletor/pipeline-options.mjs';

test('retomar aceita caminho opcional sem consumir as demais opções', () => {
  assert.equal(parsePipelineOptions([]).retomar, undefined);
  assert.equal(parsePipelineOptions(['--retomar']).retomar, '');
  const automatic = parsePipelineOptions(['--retomar', '--simular']);
  assert.equal(automatic.retomar, '');
  assert.equal(automatic.simular, true);
  assert.equal(parsePipelineOptions(['--retomar', '/lote com espaços']).retomar, '/lote com espaços');
  assert.equal(parsePipelineOptions(['--retomar=/lote']).retomar, '/lote');
  assert.throws(() => parsePipelineOptions(['--retomar', '--opcao-inexistente']));
});

async function prepareDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'bench-retomada-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configPath = join(directory, 'config.json');
  await writeFile(configPath, JSON.stringify({ output_dir: 'lotes' }));
  return { directory, configPath, outputDirectory: join(directory, 'lotes') };
}

async function saveBatch(directory, createdAt, overrides = {}) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'batch.json'), JSON.stringify({
    schema_version: 1, condition: 'openrouter-v1', executions: [], created_at: createdAt, ...overrides,
  }));
}

test('seleciona pela criação do lote, ignorando diretórios incompatíveis e links', async (t) => {
  const { directory, configPath, outputDirectory } = await prepareDirectory(t);
  await saveBatch(join(outputDirectory, 'z-antigo'), '2026-09-28T23:00:00Z');
  const latest = join(outputDirectory, 'a-recente');
  await saveBatch(latest, '2026-09-29T03:00:00Z');
  await mkdir(join(latest, 'consolidado'));
  await writeFile(join(latest, 'consolidado/resultados.html'), 'relatório existente');
  await saveBatch(join(outputDirectory, 'incompativel'), '2026-09-30T03:00:00Z', { condition: 'outra' });
  await mkdir(join(outputDirectory, 'sem-manifesto'));
  const external = join(directory, 'externo');
  await saveBatch(external, '2026-10-01T03:00:00Z');
  await symlink(external, join(outputDirectory, 'link'));
  assert.equal(await findLatestBatch(configPath), latest);
});

test('sem lotes ou pasta de saída, retomada encerra com mensagem clara', async (t) => {
  const { configPath, outputDirectory } = await prepareDirectory(t);
  await assert.rejects(findLatestBatch(configPath), /Nenhum lote disponível para retomar/);
  await mkdir(outputDirectory);
  await assert.rejects(findLatestBatch(configPath), /Nenhum lote disponível para retomar/);
});

test('manifesto danificado não seleciona silenciosamente um lote anterior', async (t) => {
  const { configPath, outputDirectory } = await prepareDirectory(t);
  await saveBatch(join(outputDirectory, 'antigo'), '2026-09-28T23:00:00Z');
  const invalid = join(outputDirectory, 'danificado');
  await saveBatch(invalid, 'data inválida');
  await assert.rejects(findLatestBatch(configPath), /data de criação inválida/);
  await writeFile(join(invalid, 'batch.json'), '{');
  await assert.rejects(findLatestBatch(configPath), SyntaxError);
});
