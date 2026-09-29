import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { readJsonIfPresent } from './artifacts.mjs';

export function parsePipelineOptions(args) {
  const normalizedArgs = args.map((argument, index) => {
    const nextArgument = args[index + 1];
    if (argument === '--retomar' && (!nextArgument || nextArgument.startsWith('-'))) return '--retomar=';
    return argument;
  });
  return parseArgs({ args: normalizedArgs, options: {
    simular: { type: 'boolean' }, retomar: { type: 'string' },
    revalidar: { type: 'boolean' }, 'nao-abrir': { type: 'boolean' },
    'modelo-juiz': { type: 'string' }, 'esforco-juiz': { type: 'string' }, help: { type: 'boolean' },
  } }).values;
}

export async function findLatestBatch(configPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (typeof config.output_dir !== 'string' || !config.output_dir.trim()) throw new Error('output_dir ausente na configuração.');
  const outputDirectory = config.output_dir.startsWith('~/')
    ? join(homedir(), config.output_dir.slice(2))
    : resolve(dirname(resolve(configPath)), config.output_dir);
  let entries;
  try { entries = await readdir(outputDirectory, { withFileTypes: true }); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Nenhum lote disponível para retomar em ${outputDirectory}.`);
    throw error;
  }
  const batches = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(outputDirectory, entry.name);
    const batch = await readJsonIfPresent(join(directory, 'batch.json'));
    if (batch?.condition !== 'openrouter-v1' || batch.schema_version !== 1 || !Array.isArray(batch.executions)) continue;
    const createdAt = Date.parse(batch.created_at);
    if (!Number.isFinite(createdAt)) throw new Error(`Lote com data de criação inválida: ${directory}. Informe --retomar CAMINHO_DO_LOTE.`);
    batches.push({ directory, createdAt });
  }
  batches.sort((first, second) => second.createdAt - first.createdAt || first.directory.localeCompare(second.directory));
  if (!batches.length) throw new Error(`Nenhum lote disponível para retomar em ${outputDirectory}.`);
  return batches[0].directory;
}
