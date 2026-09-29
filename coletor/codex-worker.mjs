import { spawn } from 'node:child_process';
import { open, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function codexArguments(directory, config) {
  const disabledFeatures = [
    'shell_tool', 'unified_exec', 'apps', 'plugins', 'remote_plugin', 'hooks', 'memories',
    'multi_agent', 'multi_agent_v2', 'code_mode', 'code_mode_host', 'browser_use', 'computer_use',
    'in_app_browser', 'in_app_local_automation', 'image_generation', 'view_image', 'skill_search',
    'skill_mcp_dependency_install', 'shell_snapshot', 'unbounded_connection_retries', 'goals', 'sleep_tool',
  ];
  return [
    '--no-daemon', '--strict-config', '-a', 'never', 'exec', '--ignore-user-config', '--ignore-rules',
    '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--cd', directory,
    '--model', config.model, '-c', `model_reasoning_effort=${JSON.stringify(config.reasoning_effort)}`,
    '-c', 'project_doc_max_bytes=0', '-c', 'web_search="disabled"', '-c', 'mcp_servers={}',
    '-c', 'memories.use_memories=false', '-c', 'memories.generate_memories=false',
    '--enable', 'skip_host_skill_discovery',
    ...disabledFeatures.flatMap((feature) => ['--disable', feature]),
    '--json', '--color', 'never', '--output-schema', join(directory, 'schema.json'),
    '--output-last-message', join(directory, 'resultado.json'), '-',
  ];
}

export function codexEnvironment(environment) {
  const allowed = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'CODEX_HOME', 'SSL_CERT_FILE', 'SSL_CERT_DIR'];
  return Object.fromEntries(allowed.filter((name) => environment[name] !== undefined).map((name) => [name, environment[name]]));
}

export async function executeCodexJob(directory) {
  const startedAt = new Date().toISOString();
  await writeFile(join(directory, 'iniciado.json'), JSON.stringify({ started_at: startedAt }), { flag: 'wx', mode: 0o600 });
  const config = JSON.parse(await readFile(join(directory, 'config.json'), 'utf8'));
  const prompt = await readFile(join(directory, 'pedido.md'), 'utf8');
  const events = await open(join(directory, 'eventos.jsonl'), 'wx', 0o600);
  const errors = await open(join(directory, 'stderr.log'), 'wx', 0o600);
  let result;
  try {
    result = await new Promise((resolveJob) => {
      const child = spawn('codex', codexArguments(directory, config), {
        cwd: directory, env: codexEnvironment(process.env), stdio: ['pipe', events.fd, errors.fd],
      });
      let timedOut = false;
      let spawnError = null;
      let inputError = null;
      let forceTimer;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        forceTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      }, config.timeout_seconds * 1000);
      child.on('error', (error) => { spawnError = error.message; });
      child.stdin.on('error', (error) => { inputError = error.message; });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        clearTimeout(forceTimer);
        resolveJob({ exit_code: code, signal, timed_out: timedOut, error: spawnError ?? inputError });
      });
      child.stdin.end(prompt);
    });
  } finally {
    await events.close();
    await errors.close();
  }
  await writeFile(join(directory, 'concluido.json'), JSON.stringify({ ...result, started_at: startedAt, ended_at: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await executeCodexJob(import.meta.dirname); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
