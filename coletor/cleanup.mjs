import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, realpath, lstat, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { herdrCommand, readJsonIfPresent } from './herdr.mjs';
import { acquireOutputLock } from './output-lock.mjs';

const executeFile = promisify(execFile);
const batchNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-[a-f0-9-]{36}$/;

async function readProcessList() {
  const { stdout } = await executeFile('ps', ['-axo', 'comm=,args='], { maxBuffer: 4 * 1024 * 1024 });
  return stdout.split('\n').filter((line) => /^\s*(?:\S*\/)?(?:node|codex)\s/.test(line));
}

async function directoryEntries(path) {
  try { return await readdir(path, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function findLaunches(directory) {
  const launches = [];
  for (const entry of await directoryEntries(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) launches.push(...await findLaunches(path));
    if (entry.isFile() && entry.name === 'envio.json') {
      const launch = await readJsonIfPresent(path);
      launches.push({ ...launch, closed: Boolean(await readJsonIfPresent(join(directory, 'pane-finalizado.json'))) });
    }
  }
  return launches;
}

async function verifiedWorkspace(path, allowedRoots) {
  if (typeof path !== 'string' || !/^bench-juiz-[a-zA-Z0-9]+$/.test(basename(path))) throw new Error('Temporário de julgamento com caminho inválido.');
  let attributes;
  try { attributes = await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!attributes.isDirectory() || attributes.isSymbolicLink()) throw new Error(`Temporário não é um diretório próprio do fluxo: ${path}`);
  const canonical = await realpath(path);
  const roots = [];
  for (const root of allowedRoots) {
    try { roots.push(await realpath(root)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!roots.includes(dirname(canonical))) throw new Error(`Temporário fora das pastas do fluxo: ${path}`);
  return canonical;
}

function missingPane(error) {
  try { return JSON.parse(error.stderr).error?.code === 'pane_not_found'; }
  catch { return false; }
}

async function closeJudgmentPane(launch, command, onProgress) {
  if (launch.closed || !launch.workspace) return;
  let pane;
  try { ({ pane } = await command(['pane', 'get', launch.pane_id])); }
  catch (error) { if (missingPane(error)) return; throw error; }
  if (!pane?.cwd || !pane.foreground_cwd) throw new Error(`Não foi possível confirmar o diretório do pane ${launch.pane_id}.`);
  if (await realpath(pane.cwd) !== launch.workspace || await realpath(pane.foreground_cwd) !== launch.workspace) throw new Error(`O pane ${launch.pane_id} está em outro diretório; nenhum arquivo foi removido.`);
  await command(['pane', 'close', launch.pane_id]);
  onProgress?.(`Pane de julgamento fechado: ${launch.pane_id}`);
}

export async function clearGeneratedFiles(configPath, options = {}) {
  const homeDirectory = options.homeDirectory ?? homedir();
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (typeof config.output_dir !== 'string' || !config.output_dir.trim()) throw new Error('output_dir ausente na configuração.');
  const outputDirectory = config.output_dir.startsWith('~/') ? join(homeDirectory, config.output_dir.slice(2)) : resolve(dirname(configPath), config.output_dir);
  const release = await acquireOutputLock(outputDirectory);
  try { return await clearBatches(outputDirectory, homeDirectory, options); }
  finally { await release(); }
}

async function clearBatches(outputDirectory, homeDirectory, options) {
  const processes = options.readProcessList ?? readProcessList;
  const running = await processes();
  if (running.some((line) => /(?:^|[\s/])(?:pipeline-cli\.mjs|cli\.mjs\s+(?:coletar|recuperar))(?:\s|$)/.test(line))) throw new Error('Há um fluxo ativo. Pressione Ctrl+C no terminal principal, espere encerrar e execute npm run apagar novamente.');
  const batches = [];
  const launches = [];
  const allowedRoots = [join(homeDirectory, 'Documents', 'tmp'), options.temporaryDirectory ?? tmpdir()];
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
    for (const launch of await findLaunches(directory)) {
      const workspace = await verifiedWorkspace(launch.workspace, allowedRoots);
      launches.push({ ...launch, workspace, originalWorkspace: launch.workspace });
    }
    batches.push(directory);
  }
  for (const launch of launches) await closeJudgmentPane(launch, options.command ?? herdrCommand, options.onProgress);
  const workspaces = [...new Set(launches.map((launch) => launch.workspace).filter(Boolean))];
  const workspacePaths = launches.flatMap((launch) => [launch.workspace, launch.originalWorkspace]).filter(Boolean);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const active = await processes();
    if (!active.some((line) => workspacePaths.some((workspace) => line.includes(workspace)))) break;
    if (attempt === 19) throw new Error('Um juiz ainda está ativo após fechar seu pane; arquivos preservados.');
    await delay(250);
  }
  for (const workspace of workspaces) {
    await rm(workspace, { recursive: true, force: true });
    options.onProgress?.(`Temporário apagado: ${workspace}`);
  }
  for (const directory of batches) {
    await rm(directory, { recursive: true, force: true });
    options.onProgress?.(`Lote apagado: ${directory}`);
  }
  return { batches: batches.length, workspaces: workspaces.length };
}
