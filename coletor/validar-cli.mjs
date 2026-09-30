import { join, resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { checkCodexRuntime, runCodexJob } from './codex-judge.mjs';
import { findLatestBatch } from './pipeline-options.mjs';
import { acquireOutputLock } from './output-lock.mjs';
import { judgeFamily, runSecondValidation, validationRoles } from './second-validation.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');

async function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: {
    retomar: { type: 'string' }, 'modelo-juiz': { type: 'string' }, 'esforco-juiz': { type: 'string' },
    passadas: { type: 'string' }, paralelo: { type: 'string' }, 'familia-juiz': { type: 'string' },
    simular: { type: 'boolean' }, relatorio: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('Uso: npm run validar -- [--retomar CAMINHO_DO_LOTE] [--modelo-juiz gpt-6.1-sol] [--esforco-juiz medium] [--passadas 1|2] [--paralelo N] [--familia-juiz openai] [--simular] [--relatorio]');
    console.log('Segunda validação pelo Codex local: refaz JC e JP cego nas respostas do lote, sem julgar a família do próprio juiz.');
    console.log('--relatorio remonta a comparação com os pareceres arquivados, sem chamar o Codex.');
    return;
  }
  const batchDirectory = resolve(values.retomar || await findLatestBatch(join(repositoryRoot, 'openrouter.config.json')));
  const config = {
    model: values['modelo-juiz'] ?? 'gpt-6.1-sol',
    reasoning_effort: values['esforco-juiz'] ?? 'medium',
    timeout_seconds: 1800,
  };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(config.model)) throw new Error('--modelo-juiz inválido.');
  if (!['minimal', 'low', 'medium', 'high', 'xhigh'].includes(config.reasoning_effort)) throw new Error('--esforco-juiz inválido.');
  const passes = Number(values.passadas ?? 1);
  if (![1, 2].includes(passes)) throw new Error('--passadas deve ser 1 ou 2.');
  const concurrency = Number(values.paralelo ?? 2);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('--paralelo deve ser um inteiro de 1 a 8.');
  const family = values['familia-juiz'] ?? judgeFamily(config.model);
  console.log(`Lote: ${batchDirectory}`);
  console.log(`Juiz: Codex ${config.model}, esforço ${config.reasoning_effort}, família ${family}; papéis ${validationRoles(passes).join(', ')}; ${concurrency} chamada(s) em paralelo.`);
  if (values.simular) {
    console.log('Simulação: nenhuma chamada ao Codex.');
    return;
  }
  const runtime = values.relatorio ? null : await checkCodexRuntime();
  if (runtime) console.log(`Codex: ${runtime.codex_version}`);
  const release = await acquireOutputLock(dirname(batchDirectory));
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  try {
    const result = await runSecondValidation(batchDirectory, {
      config, passes, family, concurrency, localOnly: Boolean(values.relatorio), runJob: runCodexJob,
      signal: controller.signal, onProgress: console.log,
    });
    const { agreement } = result.comparison;
    console.log(`Concordância: |ΔP| médio ${agreement.mean_abs_diff_P ?? 'N/A'} (n=${agreement.n_P}); |ΔS| médio ${agreement.mean_abs_diff_S ?? 'N/A'} (n=${agreement.n_S}).`);
    for (const model of result.comparison.models) console.log(`${model.model}: geral ${model.primary_score ?? 'N/A'} / segundo juiz ${model.excluded ? 'mesma família' : model.second_score ?? 'N/A'} / painel ${model.panel_score ?? 'N/A'}`);
    console.log(`Comparação: ${join(batchDirectory, 'consolidado/segunda-validacao.html')}`);
    console.log(`Pareceres: ${result.root}`);
    if (result.pending.length) {
      console.log(`${result.pending.length} parecer(es) pendente(s); rode o mesmo comando para retomar.`);
      process.exitCode = 2;
    }
  } finally {
    await release();
  }
}

try { await main(); }
catch (error) { console.error(`Não foi possível concluir: ${error.message}`); process.exitCode = 1; }
