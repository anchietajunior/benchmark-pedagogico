import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { join, resolve, dirname } from 'node:path';
import { initializeConfig, loadStudy } from './config.mjs';
import { collectBatch, recoverBatch } from './collector.mjs';
import { verifyModelEndpoints } from './catalog.mjs';
import { acquireOutputLock } from './output-lock.mjs';
import { replaceFailedSystem } from './replace-system.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const commands = ['configurar', 'conferir', 'coletar', 'recuperar', 'refazer'];

async function readApiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const contents = await readFile(join(repositoryRoot, '.env'), 'utf8');
    return parseEnv(contents).OPENROUTER_API_KEY;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function confirmCollection(count) {
  if (!process.stdin.isTTY) throw new Error('Confirmação requer terminal interativo. Para execução planejada, acrescente --confirmar.');
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`${count} geração(ões) serão cobradas pela API. Digite COLETAR para começar: `);
    return answer === 'COLETAR';
  } finally {
    terminal.close();
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!commands.includes(command)) {
    console.log('Uso: npm run configurar | conferir | coletar | recuperar -- CAMINHO_DO_LOTE | refazer -- CAMINHO_DO_LOTE SISTEMA [--confirmar]');
    if (command && command !== '--help') process.exitCode = 1;
    return;
  }
  if (command === 'configurar') {
    if (args.length > 0) throw new Error('configurar não recebe argumentos.');
    console.log((await initializeConfig(repositoryRoot)).join('\n'));
    console.log('Preencha .env, openrouter.config.json e as fontes do tema. Depois: npm run conferir.');
    return;
  }
  const apiKey = await readApiKey();
  if (!apiKey || apiKey.includes('PREENCHER')) throw new Error('Preencha OPENROUTER_API_KEY em .env; nunca coloque a chave em prompts ou no Git.');
  if (command === 'recuperar') {
    if (args.length !== 1) throw new Error('Uso: npm run recuperar -- CAMINHO_DO_LOTE');
    const release = await acquireOutputLock(dirname(resolve(args[0])));
    try {
      const result = await recoverBatch(args[0], { apiKey });
      console.log(`Telemetria consultada sem gerar explicações: ${result.batchDirectory}`);
      if (result.records.some((record) => record.telemetry_status !== 'COMPLETA')) process.exitCode = 2;
    } finally { await release(); }
    return;
  }
  if (command === 'refazer') {
    const [batchPath, systemId, ...flags] = args;
    if (!batchPath || !systemId || flags.some((flag) => flag !== '--confirmar')) throw new Error('Uso: npm run refazer -- CAMINHO_DO_LOTE SISTEMA [--confirmar]');
    const config = JSON.parse(await readFile(join(repositoryRoot, 'openrouter.config.json'), 'utf8'));
    const model = config.models.find((candidate) => candidate.id === systemId);
    if (!model) throw new Error(`${systemId} não está em openrouter.config.json.`);
    const batch = JSON.parse(await readFile(join(resolve(batchPath), 'batch.json'), 'utf8'));
    const count = batch.executions.filter((execution) => execution.system_id === systemId).length;
    console.log(`${systemId}: ${count} geração(ões) sem texto serão refeitas com ${model.model} (${model.provider}), usando os pedidos congelados do lote.`);
    if (!flags.includes('--confirmar') && !(await confirmCollection(count))) {
      console.log('Cancelado antes de qualquer chamada.');
      return;
    }
    const release = await acquireOutputLock(dirname(resolve(batchPath)));
    try {
      const result = await replaceFailedSystem(batchPath, systemId, model, { apiKey, onProgress: console.log });
      console.log(`Para julgar somente as novas gerações: npm run executar -- --retomar ${JSON.stringify(result.batchDirectory)}`);
    } finally { await release(); }
    return;
  }
  if (args.some((arg) => arg !== '--confirmar') || (command === 'conferir' && args.length > 0)) throw new Error('Argumento inválido. coletar aceita somente --confirmar.');
  const study = await loadStudy(join(repositoryRoot, 'openrouter.config.json'), repositoryRoot);
  const count = study.config.models.length * study.materials.length * study.config.rounds;
  console.log(`Configuração local válida: ${count} geração(ões); destino ${study.outputDirectory}.`);
  for (const topic of study.config.topics) {
    if (!topic.sources_reviewed) console.log(`${topic.id}: fontes preparadas por IA; revisão humana PENDENTE. Permitido somente no PILOTO.`);
  }
  if (command === 'conferir') {
    const checks = await verifyModelEndpoints(study.config);
    for (const check of checks) console.log(`${check.system_id}: ${check.model} / ${check.provider} - catálogo compatível.`);
    console.log('Nenhuma geração iniciada. A chave e o saldo não foram validados; valores dos parâmetros ainda exigem piloto real.');
    return;
  }
  if (!args.includes('--confirmar') && !(await confirmCollection(count))) {
    console.log('Cancelado antes de qualquer chamada.');
    return;
  }
  const release = await acquireOutputLock(study.outputDirectory);
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const result = await collectBatch(study, { apiKey, signal: controller.signal, onProgress: console.log });
    console.log(`Arquivos: ${result.batchDirectory}`);
    console.log('Abra RESUMO.md e metricas.csv. PREPARAR-JULGAMENTO.md contém o próximo pedido para copiar.');
    if (result.records.length !== result.plannedCount || result.records.some((record) => !record.ready_for_comparison)) process.exitCode = 2;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    await release();
  }
}

try { await main(); }
catch (error) {
  console.error(`Não foi possível concluir: ${error.message}`);
  process.exitCode = 1;
}
