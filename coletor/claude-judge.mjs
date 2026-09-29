import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { sha256 } from './config.mjs';
import { readJsonIfPresent, replaceDerivedFile, writeJson } from './artifacts.mjs';

const executeFile = promisify(execFile);
const judgeSystemPrompt = 'Você é um avaliador independente de um benchmark pedagógico. Siga somente o pedido recebido, sem ferramentas nem navegação, e responda no formato estruturado solicitado.';
const externalSystemPrompt = 'Você é um verificador independente de um benchmark pedagógico. Use somente WebSearch e WebFetch nos hosts permitidos, siga o pedido recebido e responda no formato estruturado solicitado.';

export async function checkJudgmentRuntime() {
  const { stdout } = await executeFile('claude', ['--version'], { timeout: 10000 });
  return { claude_version: stdout.trim(), checked_at: new Date().toISOString() };
}

export function claudeArguments(job) {
  const web = Boolean(job.web_domains?.length);
  const tools = web
    ? ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch', ...job.web_domains.map((domain) => `WebFetch(domain:${domain})`)]
    : ['--tools', ''];
  return [
    '-p', '--model', job.config.model, '--effort', job.config.reasoning_effort,
    '--system-prompt', web ? externalSystemPrompt : judgeSystemPrompt, '--setting-sources', '', ...tools,
    '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    '--output-format', 'json', '--json-schema', JSON.stringify(job.schema),
  ];
}

export function claudeEnvironment(environment) {
  const proxy = ['HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy', 'NODE_EXTRA_CA_CERTS'];
  const allowed = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'CLAUDE_CONFIG_DIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR', ...proxy];
  return Object.fromEntries(allowed.filter((name) => environment[name] !== undefined).map((name) => [name, environment[name]]));
}

async function runClaude(directory, job, signal) {
  const startedAt = new Date();
  const timeoutMilliseconds = job.config.timeout_seconds * 1000;
  const child = spawn('claude', claudeArguments(job), {
    cwd: directory, env: claudeEnvironment(process.env), timeout: timeoutMilliseconds, signal,
  });
  let output = '';
  let diagnostics = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { diagnostics += chunk; });
  child.stdin.on('error', (error) => { diagnostics += `\nstdin: ${error.message}`; });
  child.stdin.end(job.prompt);
  let spawnError = null;
  let exitCode = null;
  let exitSignal = null;
  try { [exitCode, exitSignal] = await once(child, 'close'); }
  catch (error) { spawnError = error; }
  if (signal?.aborted) throw new Error('Julgamento interrompido; a chamada será refeita ao retomar o lote.');
  const endedAt = new Date();
  await replaceDerivedFile(join(directory, 'saida.json'), output);
  await replaceDerivedFile(join(directory, 'stderr.log'), diagnostics);
  return {
    exit_code: exitCode, signal: exitSignal,
    timed_out: exitSignal !== null && endedAt - startedAt >= timeoutMilliseconds,
    error: spawnError?.message ?? null,
    started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(),
  };
}

export async function readArchivedClaudeResult(directory) {
  const completion = await readJsonIfPresent(join(directory, 'concluido.json'));
  if (!completion) throw new Error('Chamada sem conclusão arquivada.');
  if (completion.error) throw new Error(`Claude não iniciou: ${completion.error}.`);
  if (completion.timed_out) throw new Error('Claude excedeu o tempo limite; chamada preservada.');
  let output;
  try { output = JSON.parse(await readFile(join(directory, 'saida.json'), 'utf8')); }
  catch { throw new Error(`Claude terminou sem JSON íntegro (saída ${completion.exit_code}); consulte saida.json e stderr.log.`); }
  if (output.is_error || output.subtype !== 'success') throw new Error(`Claude reportou erro: ${output.result || output.subtype}.`);
  if (completion.exit_code !== 0) throw new Error(`Claude encerrou com saída ${completion.exit_code}; consulte stderr.log.`);
  if (!output.structured_output) throw new Error('Claude terminou sem resultado estruturado.');
  return output.structured_output;
}

async function hasFailedAttempt(directory) {
  if (!await readJsonIfPresent(join(directory, 'concluido.json'))) return false;
  try { await readArchivedClaudeResult(directory); return false; }
  catch { return true; }
}

async function archiveFailedAttempt(directory) {
  const completion = await readJsonIfPresent(join(directory, 'concluido.json'));
  const attemptDirectory = join(directory, 'tentativas', completion.started_at.replaceAll(':', '-'));
  await mkdir(attemptDirectory, { recursive: true, mode: 0o700 });
  for (const filename of ['envio.json', 'pedido.md', 'schema.json', 'saida.json', 'stderr.log', 'concluido.json']) {
    try { await rename(join(directory, filename), join(attemptDirectory, filename)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function runClaudeJob(directory, job, options = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (await hasFailedAttempt(directory)) await archiveFailedAttempt(directory);
  const requestHash = sha256(JSON.stringify(job));
  const launch = await readJsonIfPresent(join(directory, 'envio.json'));
  if (launch && launch.request_sha256 !== requestHash) throw new Error('Insumos do julgamento mudaram; preserve o lote e crie uma revisão explícita.');
  if (await readJsonIfPresent(join(directory, 'concluido.json'))) return readArchivedClaudeResult(directory);
  if (!launch) {
    await writeFile(join(directory, 'pedido.md'), job.prompt, { flag: 'wx', mode: 0o600 });
    await writeJson(join(directory, 'schema.json'), job.schema);
    await writeJson(join(directory, 'envio.json'), { request_sha256: requestHash, requested_at: new Date().toISOString() });
  }
  options.onProgress?.(`${options.label ?? 'Avaliação'}: aguardando o Claude (${job.config.model}, esforço ${job.config.reasoning_effort}).`);
  const completion = await runClaude(directory, job, options.signal);
  await writeJson(join(directory, 'concluido.json'), completion);
  return readArchivedClaudeResult(directory);
}
