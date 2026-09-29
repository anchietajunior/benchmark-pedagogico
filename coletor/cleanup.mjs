import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readJsonIfPresent } from './artifacts.mjs';
import { acquireOutputLock } from './output-lock.mjs';

const executeFile = promisify(execFile);
const batchNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-[a-f0-9-]{36}$/;

async function readProcessList() {
  const { stdout } = await executeFile('ps', ['-axo', 'comm=,args='], { maxBuffer: 4 * 1024 * 1024 });
  return stdout.split('\n').filter((line) => /^\s*(?:\S*\/)?node\s/.test(line));
}

async function directoryEntries(path) {
  try { return await readdir(path, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

export async function clearGeneratedFiles(configPath, options = {}) {
  const homeDirectory = options.homeDirectory ?? homedir();
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (typeof config.output_dir !== 'string' || !config.output_dir.trim()) throw new Error('output_dir ausente na configuração.');
  const outputDirectory = config.output_dir.startsWith('~/') ? join(homeDirectory, config.output_dir.slice(2)) : resolve(dirname(configPath), config.output_dir);
  const release = await acquireOutputLock(outputDirectory);
  try { return await clearBatches(outputDirectory, options); }
  finally { await release(); }
}

async function clearBatches(outputDirectory, options) {
  const processes = options.readProcessList ?? readProcessList;
  const running = await processes();
  if (running.some((line) => /(?:^|[\s/])(?:pipeline-cli\.mjs|cli\.mjs\s+(?:coletar|recuperar))(?:\s|$)/.test(line))) throw new Error('Há um fluxo ativo. Pressione Ctrl+C no terminal principal, espere encerrar e execute npm run apagar novamente.');
  const batches = [];
  for (const entry of await directoryEntries(outputDirectory)) {
    if (!entry.isDirectory() || !batchNamePattern.test(entry.name)) continue;
    const directory = join(outputDirectory, entry.name);
    const batch = await readJsonIfPresent(join(directory, 'batch.json'));
    if (batch?.condition !== 'openrouter-v1' || batch.schema_version !== 1 || !Array.isArray(batch.executions)) continue;
    const lock = await readJsonIfPresent(join(directory, 'privado/julgamento.lock'));
    if (Number.isSafeInteger(lock?.pid) && lock.pid > 0) {
      try { process.kill(lock.pid, 0); throw new Error(`O lote ${entry.name} ainda tem um coordenador ativo (PID ${lock.pid}).`); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    batches.push(directory);
  }
  for (const directory of batches) {
    await rm(directory, { recursive: true, force: true });
    options.onProgress?.(`Lote apagado: ${directory}`);
  }
  return { batches: batches.length };
}
