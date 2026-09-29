import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

export async function openReport(path, options = {}) {
  const platform = options.platform ?? process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = platform === 'win32' ? ['url.dll,FileProtocolHandler', path] : [path];
  try {
    await (options.executeFile ?? executeFile)(command, args, { timeout: 10000 });
    return `Relatório aberto no navegador: ${path}`;
  } catch (error) {
    return `Relatório gerado; abra manualmente ${path}. O navegador não abriu: ${error.message}`;
  }
}
