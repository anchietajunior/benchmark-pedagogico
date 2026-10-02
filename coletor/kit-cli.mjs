import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { findLatestBatch } from './pipeline-options.mjs';
import { checkKit, judgeFamily, prepareKit } from './judge-kit.mjs';
import { writePanel } from './panel.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const usage = [
  'Uso: npm run kit -- preparar --juiz NOME [--familia FAMILIA] [--retomar CAMINHO_DO_LOTE]',
  '     npm run kit -- conferir --juiz NOME [--retomar CAMINHO_DO_LOTE]',
  '     npm run kit -- painel [--retomar CAMINHO_DO_LOTE]',
  'preparar cria uma pasta por parecer em juizes/kits/NOME/tarefas; cada tarefa é respondida em sessão nova, gravando parecer.json.',
  'conferir valida todos os parecer.json e lista os recusados com o motivo.',
  'painel monta consolidado/painel.html com uma tabela por juiz e a pontuação do painel.',
];

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({ args: rest, options: { juiz: { type: 'string' }, familia: { type: 'string' }, retomar: { type: 'string' }, help: { type: 'boolean' } } });
  if (!command || values.help || !['preparar', 'conferir', 'painel'].includes(command)) {
    console.log(usage.join('\n'));
    return;
  }
  const batchDirectory = resolve(values.retomar || await findLatestBatch(join(repositoryRoot, 'openrouter.config.json')));
  console.log(`Lote: ${batchDirectory}`);
  if (command !== 'painel' && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(values.juiz ?? '')) throw new Error('Informe --juiz com o nome do modelo julgador, por exemplo gpt-6.1-sol ou grok-5.');
  if (command === 'preparar') {
    const { root, kit } = await prepareKit(batchDirectory, { judge: values.juiz, family: values.familia ?? judgeFamily(values.juiz), repositoryRoot });
    console.log(`Kit de ${kit.judge} (família ${kit.family}): ${kit.tasks.length} tarefas em ${join(root, 'tarefas')}.`);
    for (const skipped of kit.skipped) console.log(`Fora do kit ${skipped.execution_id}: ${skipped.reason}.`);
    console.log('Responda cada tarefa em sessão nova, gravando parecer.json na pasta da tarefa; depois rode npm run kit -- conferir.');
    return;
  }
  if (command === 'conferir') {
    const summary = await checkKit(batchDirectory, values.juiz);
    for (const outcome of summary.outcomes) {
      console.log(`${outcome.task}: ${outcome.status}${outcome.decision ? ` (${outcome.decision})` : ''}${outcome.problem ? ` - ${outcome.problem}` : ''}`);
    }
    console.log(`${summary.accepted}/${summary.total} pareceres aceitos.`);
    if (summary.accepted !== summary.total) process.exitCode = 2;
    return;
  }
  const panel = await writePanel(batchDirectory);
  for (const row of panel.panel) console.log(`${row.model}: painel ${row.score ?? 'N/A'} (${row.judges} juiz(es))${row.excluded.length ? `; sem ${row.excluded.join(', ')} (mesma família)` : ''}`);
  console.log(`Painel: ${join(batchDirectory, 'consolidado/painel.html')}`);
}

try { await main(); }
catch (error) { console.error(`Não foi possível concluir: ${error.message}`); process.exitCode = 1; }
