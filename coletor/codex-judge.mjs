import { execFile, spawn } from 'node:child_process';
import { open, readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { sha256 } from './config.mjs';
import { readJsonIfPresent, writeJson } from './artifacts.mjs';

const executeFile = promisify(execFile);

// Juiz isolado: sem shell, navegação, plugins, MCP, memória ou skills; sandbox somente leitura.
// Recuperado do runner Codex anterior (commits 4ad3758..398e64c) e conferido com codex-cli 0.159.
const disabledFeatures = [
  'shell_tool', 'unified_exec', 'apps', 'plugins', 'remote_plugin', 'hooks', 'memories',
  'multi_agent', 'multi_agent_v2', 'code_mode', 'code_mode_host', 'browser_use', 'computer_use',
  'in_app_browser', 'in_app_local_automation', 'image_generation', 'view_image', 'skill_search',
  'skill_mcp_dependency_install', 'shell_snapshot', 'unbounded_connection_retries', 'goals', 'sleep_tool',
];

export async function checkCodexRuntime() {
  const { stdout } = await executeFile('codex', ['--version'], { timeout: 10000 });
  return { codex_version: stdout.trim(), checked_at: new Date().toISOString() };
}

export function codexArguments(directory, config) {
  return [
    '--no-daemon', '--strict-config', '-a', 'never', 'exec', '--ignore-user-config', '--ignore-rules',
    '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--cd', directory,
    '--model', config.model, '-c', `model_reasoning_effort=${JSON.stringify(config.reasoning_effort)}`,
    '-c', 'project_doc_max_bytes=0', '-c', 'web_search="disabled"', '-c', 'mcp_servers={}',
    '-c', 'suppress_unstable_features_warning=true',
    '-c', 'memories.use_memories=false', '-c', 'memories.generate_memories=false',
    '--enable', 'skip_host_skill_discovery',
    ...disabledFeatures.flatMap((feature) => ['--disable', feature]),
    '--json', '--color', 'never', '--output-schema', join(directory, 'schema.json'),
    '--output-last-message', join(directory, 'resultado.json'), '-',
  ];
}

export function codexEnvironment(environment) {
  const allowed = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'CODEX_HOME', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
    'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy', 'NODE_EXTRA_CA_CERTS'];
  return Object.fromEntries(allowed.filter((name) => environment[name] !== undefined).map((name) => [name, environment[name]]));
}

const knownStartupWarnings = [
  /^Code Mode is unavailable because code-mode host is disabled\./,
  /^Under-development features enabled: skip_host_skill_discovery\./,
];

// O parecer só vale se o Codex concluiu o turno sem ferramentas nem erros depois do início.
export function validateCodexEvents(events) {
  const entries = events.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  let turnStarted = false;
  for (const entry of entries) {
    if (entry.type === 'turn.started') turnStarted = true;
    if (entry.item?.type === 'error') {
      if (entry.type === 'item.completed' && !turnStarted && knownStartupWarnings.some((pattern) => pattern.test(entry.item.message ?? ''))) continue;
      throw new Error(`Codex reportou erro: ${entry.item.message ?? 'sem descrição'}.`);
    }
    if (entry.item && !['agent_message', 'reasoning'].includes(entry.item.type)) throw new Error(`O julgamento usou ferramentas ou eventos não previstos (${entry.item.type}); resultado pendente por isolamento.`);
    if (entry.type === 'turn.failed' || entry.type === 'error') throw new Error(`Codex não concluiu o turno: ${entry.error?.message ?? entry.message ?? entry.type}.`);
  }
  if (!entries.some((entry) => entry.type === 'turn.completed')) throw new Error('Eventos do Codex não confirmam conclusão íntegra.');
  return entries;
}

export async function readArchivedCodexResult(directory) {
  const completion = await readJsonIfPresent(join(directory, 'concluido.json'));
  if (!completion) throw new Error('Chamada sem conclusão arquivada.');
  if (completion.error) throw new Error(`Codex não iniciou: ${completion.error}.`);
  if (completion.timed_out) throw new Error('Codex excedeu o tempo limite; chamada preservada.');
  const entries = validateCodexEvents(await readFile(join(directory, 'eventos.jsonl'), 'utf8'));
  if (completion.exit_code !== 0) throw new Error(`Codex encerrou com saída ${completion.exit_code}; consulte stderr.log.`);
  let text;
  try { text = (await readFile(join(directory, 'resultado.json'), 'utf8')).trim(); }
  catch { text = entries.filter((entry) => entry.type === 'item.completed' && entry.item?.type === 'agent_message').at(-1)?.item.text?.trim(); }
  if (!text) throw new Error('Codex terminou sem resultado JSON.');
  try { return JSON.parse(text.replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1')); }
  catch { throw new Error('Codex terminou sem JSON íntegro; consulte resultado.json e eventos.jsonl.'); }
}

async function runCodex(directory, job, signal) {
  const startedAt = new Date();
  const events = await open(join(directory, 'eventos.jsonl'), 'w', 0o600);
  const errors = await open(join(directory, 'stderr.log'), 'w', 0o600);
  let result;
  try {
    result = await new Promise((resolveJob) => {
      const child = spawn('codex', codexArguments(directory, job.config), {
        cwd: directory, env: codexEnvironment(process.env), stdio: ['pipe', events.fd, errors.fd], signal,
      });
      let timedOut = false;
      let spawnError = null;
      let forceTimer;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        forceTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      }, job.config.timeout_seconds * 1000);
      child.on('error', (error) => { spawnError = error.message; });
      child.stdin.on('error', (error) => { spawnError ??= error.message; });
      child.on('close', (code, exitSignal) => {
        clearTimeout(timer);
        clearTimeout(forceTimer);
        resolveJob({ exit_code: code, signal: exitSignal, timed_out: timedOut, error: spawnError });
      });
      child.stdin.end(job.prompt);
    });
  } finally {
    await events.close();
    await errors.close();
  }
  if (signal?.aborted) throw new Error('Validação interrompida; a chamada será refeita ao retomar.');
  return { ...result, started_at: startedAt.toISOString(), ended_at: new Date().toISOString() };
}

export async function runCodexJob(directory, job, options = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const requestHash = sha256(JSON.stringify(job));
  const launch = await readJsonIfPresent(join(directory, 'envio.json'));
  if (launch && launch.request_sha256 !== requestHash) throw new Error('Insumos da validação mudaram; preserve o diretório e crie uma revisão explícita.');
  const completion = await readJsonIfPresent(join(directory, 'concluido.json'));
  if (completion) {
    try { return await readArchivedCodexResult(directory); }
    catch (error) {
      // Tentativa falha é arquivada e refeita uma vez por execução do comando.
      const attempt = join(directory, 'tentativas', completion.started_at.replaceAll(':', '-'));
      await mkdir(attempt, { recursive: true, mode: 0o700 });
      for (const filename of ['eventos.jsonl', 'stderr.log', 'resultado.json', 'concluido.json']) {
        try { await rename(join(directory, filename), join(attempt, filename)); }
        catch (renameError) { if (renameError.code !== 'ENOENT') throw renameError; }
      }
      options.onProgress?.(`${options.label}: tentativa anterior arquivada (${error.message}).`);
    }
  }
  if (!launch) {
    await writeFile(join(directory, 'pedido.md'), job.prompt, { mode: 0o600 });
    await writeJson(join(directory, 'schema.json'), job.schema);
    await writeJson(join(directory, 'envio.json'), { request_sha256: requestHash, requested_at: new Date().toISOString() });
  }
  options.onProgress?.(`${options.label}: aguardando o Codex (${job.config.model}, esforço ${job.config.reasoning_effort}).`);
  const result = await runCodex(directory, job, options.signal);
  const completionPath = join(directory, 'concluido.json');
  await writeFile(`${completionPath}.tmp`, JSON.stringify(result), { mode: 0o600 });
  await rename(`${completionPath}.tmp`, completionPath);
  return readArchivedCodexResult(directory);
}
