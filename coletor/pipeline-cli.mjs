import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { join, resolve, dirname } from 'node:path';
import { loadStudy } from './config.mjs';
import { collectBatch } from './collector.mjs';
import { checkJudgmentRuntime, readJsonIfPresent } from './herdr.mjs';
import { judgeBatch, validateJudgeConfig } from './pipeline.mjs';
import { acquireOutputLock } from './output-lock.mjs';
import { findLatestBatch, parsePipelineOptions } from './pipeline-options.mjs';
import { openReport } from './report-output.mjs';
import { sourceCoverage, answerKeySection } from './source-coverage.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');

async function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const environment = parseEnv(await readFile(join(repositoryRoot, '.env'), 'utf8'));
  if (!environment.OPENROUTER_API_KEY || environment.OPENROUTER_API_KEY.includes('PREENCHER')) throw new Error('Preencha OPENROUTER_API_KEY no .env.');
  return environment.OPENROUTER_API_KEY;
}

async function confirm() {
  if (!process.stdin.isTTY) throw new Error('Use um terminal interativo ou --confirmar para autorizar as chamadas.');
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try { return await terminal.question('Digite EXECUTAR para começar: ') === 'EXECUTAR'; }
  finally { terminal.close(); }
}

async function main() {
  const values = parsePipelineOptions(process.argv.slice(2));
  if (values.help) {
    console.log('Uso: npm run executar -- [--simular] [--modelo-juiz MODELO] [--esforco-juiz medium] [--confirmar] [--retomar [CAMINHO_DO_LOTE]] [--revalidar] [--nao-abrir]');
    console.log('--retomar sem caminho seleciona o lote mais recente em output_dir.');
    console.log('--revalidar recupera apenas os arquivos existentes, sem rede, Herdr ou modelos; usa o último lote se nenhum caminho for informado.');
    return;
  }
  if (values.revalidar && values.retomar === undefined) values.retomar = '';
  if (values.retomar === '') {
    values.retomar = await findLatestBatch(join(repositoryRoot, 'openrouter.config.json'));
    console.log(`Lote mais recente selecionado: ${values.retomar}`);
  }
  const saved = values.retomar ? await readJsonIfPresent(join(resolve(values.retomar), 'privado/julgamento.json')) : null;
  const config = {
    model: values['modelo-juiz'] ?? saved?.config.model ?? 'gpt-6-sol',
    reasoning_effort: values['esforco-juiz'] ?? saved?.config.reasoning_effort ?? 'medium',
    timeout_seconds: saved?.config.timeout_seconds ?? 900,
  };
  validateJudgeConfig(config);
  if (saved && JSON.stringify(saved.config) !== JSON.stringify(config)) throw new Error('Retomada deve preservar a configuração dos juízes.');
  const study = values.retomar ? null : await loadStudy(join(repositoryRoot, 'openrouter.config.json'), repositoryRoot);
  if (study) {
    const answerKeys = await readFile(join(repositoryRoot, 'referencias/gabaritos-conceituais.md'), 'utf8');
    for (const material of study.materials) {
      const coverage = sourceCoverage(material.messages, answerKeySection(answerKeys, material.topic), material.topic);
      console.log(`${material.topic}: fontes incorporadas ${coverage.supplied_source_ids.join(', ')}; referências do gabarito sem material: ${coverage.answer_key_sources_not_supplied.join(', ') || 'nenhuma'}.`);
      if (coverage.reading_notes) console.log(`${material.topic}: o pacote contém notas/paráfrases; APTO depende da sustentação encontrada no material, sem acesso às obras completas.`);
    }
  }
  const batch = values.retomar ? await readJsonIfPresent(join(resolve(values.retomar), 'batch.json')) : null;
  if (values.retomar && batch?.condition !== 'openrouter-v1') throw new Error('O diretório não contém lote OpenRouter compatível.');
  const count = study ? study.config.models.length * study.materials.length * study.config.rounds : batch.executions.length;
  const message = values.revalidar ? 'Revalidação local: nenhuma rede, geração, pane ou chamada de modelo. Relatórios anteriores serão arquivados.' : `${study ? count : 0} novas gerações OpenRouter; até ${count * 6} julgamentos e 1 consolidação Codex (${config.model}, ${config.reasoning_effort}).\nJP depende de APTO científico; somente o consolidador recebe o mapa código-modelo. Chamadas já iniciadas não são reenviadas.`;
  console.log(message);
  if (values.simular) {
    console.log('Simulação local concluída: nenhuma rede, pane, geração ou julgamento iniciado.');
    return;
  }
  const runtime = values.revalidar ? null : await checkJudgmentRuntime();
  const key = study ? await apiKey() : null;
  if (!values.revalidar && !values.confirmar && !(await confirm())) return;
  const release = await acquireOutputLock(study ? study.outputDirectory : dirname(resolve(values.retomar)));
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  let batchDirectory = values.retomar ? resolve(values.retomar) : null;
  try {
    if (study) {
      const collected = await collectBatch(study, { apiKey: key, signal: controller.signal, onProgress: console.log });
      batchDirectory = collected.batchDirectory;
    }
    console.log(`Lote para retomada: ${batchDirectory}`);
    if (controller.signal.aborted) throw new Error('Execução interrompida após a coleta; retome este lote.');
    const result = await judgeBatch(batchDirectory, {
      repositoryRoot, config, runtime, caller_pane: runtime?.caller_pane, localOnly: Boolean(values.revalidar), signal: controller.signal, onProgress: console.log,
    });
    const reportPath = join(result.consolidation.directory, 'resultados.html');
    const blocked = Object.values(result.completed).flatMap(Object.values).filter((judgment) => judgment.status === 'BLOQUEADO').length;
    console.log(`Fluxo concluído: ${result.consolidation.planned} execuções no relatório; ${result.consolidation.pending} pendências; ${blocked} avaliações pedagógicas bloqueadas.`);
    console.log(`Resultados: ${reportPath}`);
    if (!values['nao-abrir']) console.log(await openReport(reportPath));
    if (result.consolidation.pending > 0) process.exitCode = 2;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    if (batchDirectory) console.log(`Para retomar sem novas gerações: npm run executar -- --retomar ${JSON.stringify(batchDirectory)}`);
    await release();
  }
}

try { await main(); }
catch (error) { console.error(`Não foi possível concluir: ${error.message}`); process.exitCode = 1; }
