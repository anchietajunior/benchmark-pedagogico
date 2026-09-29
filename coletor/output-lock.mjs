import { mkdir, open, rm } from 'node:fs/promises';
import { join } from 'node:path';

export async function acquireOutputLock(outputDirectory) {
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const path = join(outputDirectory, '.operacao.lock');
  let file;
  try { file = await open(path, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Outra operação reservou esta pasta: ${path}. Espere encerrar. Se houve encerramento abrupto, confira o PID registrado antes de remover essa trava.`);
    throw error;
  }
  try { await file.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })); }
  catch (error) { await file.close(); await rm(path); throw error; }
  await file.close();
  return () => rm(path);
}
