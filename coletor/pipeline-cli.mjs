import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { join, resolve, dirname } from 'node:path';
import { loadStudy } from './config.mjs';
import { collectBatch } from './collector.mjs';
import { readJsonIfPresent } from './artifacts.mjs';
import { checkJudgmentRuntime } from './claude-judge.mjs';
import { judgeBatch, validateJudgeConfig } from './pipeline.mjs';
import { acquireOutputLock } from './output-lock.mjs';
import { findLatestBatch, parsePipelineOptions } from './pipeline-options.mjs';
import { openReport } from './report-output.mjs';
import { sourceCoverage, answerKeySection } from './source-coverage.mjs';
import { shouldOpenReport } from './pipeline-completion.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');

async function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const environment = parseEnv(await readFile(join(repositoryRoot, '.env'), 'utf8'));
  if (!environment.OPENROUTER_API_KEY || environment.OPENROUTER_API_KEY.includes('PREENCHER')) throw new Error('Preencha OPENROUTER_API_KEY no .env.');
  return environment.OPENROUTER_API_KEY;
}

async function main() {
  const values = parsePipelineOptions(process.argv.slice(2));
  if (values.help) {
    console.log('Uso: npm run executar -- [--simular] [--modelo-juiz MODELO] [--esforco-juiz low|medium|high|xhigh|max] [--retomar [CAMINHO_DO_LOTE]] [--revalidar] [--nao-abrir]');
    console.log('--retomar sem caminho seleciona o lote mais recente em output_dir.');
    console.log('--revalidar recupera apenas os arquivos existentes, sem rede ou modelos; usa o último lote se nenhum caminho for informado.');
    console.log('Respostas incompletas e pareceres sem conclusão válida são descartados das notas e documentados no relatório final.');
    return;
  }
  if (values.revalidar && values.retomar === undefined) values.retomar = '';
  if (values.retomar === '') {
    values.retomar = await findLatestBatch(join(repositoryRoot, 'openrouter.config.json'));
    console.log(`Lote mais recente selecionado: ${values.retomar}`);
  }
  const saved = values.retomar ? await readJsonIfPresent(join(resolve(values.retomar), 'privado/julgamento.json')) : null;
  const config = {
    model: values['modelo-juiz'] ?? saved?.config.model ?? 'claude-opus-5-5',
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
      if (coverage.original_source_ids.length) console.log(`${material.topic}: texto original incorporado de ${coverage.original_source_ids.join(', ')}.`);
      if (coverage.reading_notes) console.log(`${material.topic}: o pacote também contém notas/paráfrases; APTO depende da sustentação encontrada no material efetivamente incorporado.`);
    }
  }
  const batch = values.retomar ? await readJsonIfPresent(join(resolve(values.retomar), 'batch.json')) : null;
  if (values.retomar && batch?.condition !== 'openrouter-v1') throw new Error('O diretório não contém lote OpenRouter compatível.');
  const count = study ? study.config.models.length * study.materials.length * study.config.rounds : batch.executions.length;
  const message = values.revalidar ? 'Revalidação local: nenhuma rede, geração ou chamada de modelo. Relatórios anteriores serão arquivados.' : `${study ? count : 0} novas gerações OpenRouter; até ${count * 6} julgamentos e 1 consolidação Claude (${config.model}, ${config.reasoning_effort}).\nJP depende de APTO científico; somente o consolidador recebe o mapa código-modelo. Julgamentos concluídos não são repetidos ao retomar.`;
  console.log(message);
  if (values.simular) {
    console.log('Simulação local concluída: nenhuma rede, geração ou julgamento iniciado.');
    return;
  }
  const runtime = values.revalidar ? null : await checkJudgmentRuntime();
  const key = study ? await apiKey() : null;
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
      repositoryRoot, config, runtime, localOnly: Boolean(values.revalidar), signal: controller.signal, onProgress: console.log,
    });
    const reportPath = join(result.consolidation.directory, 'resultados.html');
    const blocked = Object.values(result.completed).flatMap(Object.values).filter((judgment) => judgment.status === 'BLOQUEADO').length;
    const completion = result.consolidation.completion;
    if (completion.status === 'CONCLUÍDO') {
      console.log(`Fluxo concluído: ${completion.planned} execuções; ${blocked} avaliações pedagógicas bloqueadas por decisão científica. Revisão humana pendente.`);
      console.log(`Resultados: ${reportPath}`);
    } else if (completion.status === 'CONCLUÍDO_COM_DESCARTES') {
      console.log(`Fluxo encerrado com descartes: ${completion.planned} tentativas; ${completion.eligible_generations} respostas completas; ${completion.discarded_generations} gerações descartadas; ${completion.discarded_judgments} avaliações descartadas.`);
      for (const discard of completion.discards) console.log(`DESCARTADO ${discard.system_id}/${discard.topic}/${discard.stage}: ${discard.reason}`);
      console.log(`Resultados: ${reportPath}`);
    } else {
      console.log(`Fluxo incompleto: ${completion.planned} execuções; ${completion.issues.length} impedimentos; ${blocked} avaliações pedagógicas bloqueadas.`);
      for (const issue of completion.issues) console.log(`${issue.system_id}/${issue.topic}/${issue.stage}: ${issue.reason}`);
      console.log(`Relatório parcial: ${reportPath}`);
      console.log('Há etapas não processadas; retome o lote para encerrá-las.');
      process.exitCode = 2;
    }
    for (const measurement of completion.missing_measurements) console.log(`N/A ${measurement.system_id}/${measurement.topic}/${measurement.stage}: ${measurement.reason}`);
    if (shouldOpenReport(completion, values)) console.log(await openReport(reportPath));
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    if (batchDirectory) console.log(`Para retomar sem novas gerações: npm run executar -- --retomar ${JSON.stringify(batchDirectory)}`);
    await release();
  }
}

try { await main(); }
catch (error) { console.error(`Não foi possível concluir: ${error.message}`); process.exitCode = 1; }
