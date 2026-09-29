import { join, resolve } from 'node:path';
import { clearGeneratedFiles } from './cleanup.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Uso: npm run apagar\nApaga todos os lotes em output_dir e seus temporários de julgamento. Não há desfazer.');
  } else {
    if (args.length > 0) throw new Error('Uso: npm run apagar (sem argumentos).');
    const configPath = join(resolve(import.meta.dirname, '..'), 'openrouter.config.json');
    const result = await clearGeneratedFiles(configPath, { onProgress: console.log });
    console.log(`Limpeza concluída: ${result.batches} lote(s) e ${result.workspaces} temporário(s) removidos.`);
    console.log('Código, configuração, credenciais e fontes preservados. Para recomeçar: npm run executar');
  }
} catch (error) {
  console.error(`Não foi possível apagar: ${error.message}`);
  process.exitCode = 1;
}
