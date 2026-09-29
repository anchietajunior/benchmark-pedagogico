import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { sha256 } from './config.mjs';
import { writeJson } from './artifacts.mjs';

const executeFile = promisify(execFile);

export async function readJsonIfPresent(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function herdrCommand(args) {
  const { stdout } = await executeFile('herdr', args, {
    env: { ...process.env, HERDR_ENV: '1' }, timeout: 30000, maxBuffer: 1024 * 1024,
  });
  const response = JSON.parse(stdout);
  if (response.error) throw new Error(`Herdr: ${JSON.stringify(response.error)}`);
  return response.result;
}

export async function checkJudgmentRuntime() {
  const { pane } = await herdrCommand(['pane', 'current', '--current']);
  if (!pane?.pane_id) throw new Error('Herdr não informou o pane da sessão.');
  const { stdout: help } = await executeFile('codex', ['exec', '--help'], { timeout: 10000 });
  for (const option of ['--ignore-user-config', '--ignore-rules', '--ephemeral', '--output-schema']) {
    if (!help.includes(option)) throw new Error(`O Codex instalado não oferece ${option}. Atualize antes da coleta.`);
  }
  const { stdout: version } = await executeFile('codex', ['--version'], { timeout: 10000 });
  return { caller_pane: pane.pane_id, codex_version: version.trim(), checked_at: new Date().toISOString() };
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function archiveWorkerFiles(workspace, directory) {
  for (const filename of ['iniciado.json', 'resultado.json', 'eventos.jsonl', 'stderr.log', 'concluido.json']) {
    try { await copyFile(join(workspace, filename), join(directory, filename), 1); }
    catch (error) { if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error; }
  }
}

export async function runHerdrJob(directory, job, options) {
  const command = options.command ?? herdrCommand;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const requestHash = sha256(JSON.stringify(job));
  let launch = await readJsonIfPresent(join(directory, 'envio.json'));
  if (launch && launch.request_sha256 !== requestHash) throw new Error('Insumos do julgamento mudaram; preserve o lote e crie uma revisão explícita.');
  if (!launch) {
    const workspace = await mkdtemp(join(tmpdir(), 'bench-juiz-'));
    await writeFile(join(workspace, 'pedido.md'), job.prompt, { flag: 'wx', mode: 0o600 });
    await writeJson(join(workspace, 'schema.json'), job.schema);
    await writeJson(join(workspace, 'config.json'), job.config);
    await copyFile(new URL('./codex-worker.mjs', import.meta.url), join(workspace, 'worker.mjs'));
    await writeFile(join(directory, 'pedido.md'), job.prompt, { flag: 'wx', mode: 0o600 });
    await writeJson(join(directory, 'schema.json'), job.schema);
    const { pane } = await command(['pane', 'split', '--pane', options.caller_pane, '--direction', 'down', '--cwd', workspace, '--no-focus']);
    if (!pane?.pane_id) throw new Error('Herdr não informou o pane criado. Nenhum Codex foi iniciado.');
    launch = { workspace, pane_id: pane.pane_id, request_sha256: requestHash, requested_at: new Date().toISOString() };
    await writeJson(join(directory, 'envio.json'), launch);
    await command(['pane', 'run', launch.pane_id, `${shellQuote(process.execPath)} ${shellQuote(join(workspace, 'worker.mjs'))}`]);
  }
  const deadline = Date.now() + (job.config.timeout_seconds + 30) * 1000;
  let completion = await readJsonIfPresent(join(directory, 'concluido.json'));
  while (!completion && Date.now() < deadline) {
    completion = await readJsonIfPresent(join(launch.workspace, 'concluido.json'));
    if (completion) break;
    if (options.signal?.aborted) throw new Error(`Espera interrompida; o julgamento pode continuar no pane ${launch.pane_id}. Retome o mesmo lote, sem reenviar.`);
    await delay(500);
  }
  if (!completion) throw new Error(`Julgamento sem confirmação no pane ${launch.pane_id}. Retome o mesmo lote para consultar; não será reenviado.`);
  await archiveWorkerFiles(launch.workspace, directory);
  if (completion.exit_code !== 0 || completion.timed_out || completion.error) throw new Error(`Codex não concluiu; consulte ${directory}. A chamada foi preservada e não será repetida.`);
  const result = await readJsonIfPresent(join(directory, 'resultado.json'));
  if (!result) throw new Error('Codex terminou sem resultado JSON; chamada preservada sem reenvio.');
  const events = await readFile(join(directory, 'eventos.jsonl'), 'utf8');
  const entries = events.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const allowedItems = ['agent_message', 'reasoning'];
  if (entries.some((entry) => entry.item && !allowedItems.includes(entry.item.type))) throw new Error('O julgamento usou ferramentas ou eventos não previstos; resultado pendente por isolamento.');
  if (!entries.some((entry) => entry.type === 'turn.completed') || entries.some((entry) => entry.type === 'turn.failed' || entry.type === 'error')) throw new Error('Eventos do Codex não confirmam conclusão íntegra.');
  if (!(await readJsonIfPresent(join(directory, 'pane-finalizado.json')))) {
    try {
      const { pane } = await command(['pane', 'get', launch.pane_id]);
      if (pane && !pane.agent && pane.cwd === launch.workspace && pane.foreground_cwd === launch.workspace) {
        await command(['pane', 'close', launch.pane_id]);
        await writeJson(join(directory, 'pane-finalizado.json'), { closed_at: new Date().toISOString() });
      }
    } catch (error) {
      options.onProgress?.(`Parecer arquivado; não foi possível fechar o pane ${launch.pane_id}: ${error.message}`);
    }
  }
  return result;
}
