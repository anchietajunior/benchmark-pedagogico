import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonIfPresent, replaceDerivedFile, writeJson } from './artifacts.mjs';
import { judgmentSchemaFor, renderJudgePrompt, roleFamily, validateJudgment } from './judgments.mjs';
import { buildInput } from './pipeline.mjs';
import { executionDiscardReason } from './pipeline-completion.mjs';

// Kit manual de julgamento (protocolo 3.4): uma pasta por parecer, com o pedido completo e o schema,
// para outro juiz responder em sessões novas e isoladas. Usa os metaprompts e o protocolo atuais do
// repositório, não os congelados no lote, para que JP siga a avaliação cega da 3.4.

export const kitRoles = ['JC1', 'JP1'];

export function judgeFamily(judge) {
  if (/^(gpt|o\d|codex)/i.test(judge)) return 'openai';
  if (/^grok/i.test(judge)) return 'xai';
  if (/^claude/i.test(judge)) return 'anthropic';
  if (/^gemini/i.test(judge)) return 'google';
  return judge.split(/[-/]/)[0].toLowerCase();
}

export function candidateFamily(model) {
  return model.split('/')[0].toLowerCase();
}

export function kitDirectory(batchDirectory, judge) {
  return join(batchDirectory, 'juizes/kits', judge.replace(/[^a-zA-Z0-9._-]/g, '_'));
}

const taskInstructions = (role) => `# Tarefa de julgamento ${role}

Você é um avaliador independente de um benchmark pedagógico.
Esta tarefa é isolada: não abra outros arquivos ou pastas, não use ferramentas, web ou memória de outras tarefas, e não compare com outras respostas.
Leia todo este pedido e produza um único parecer.

Formato da resposta:
- Responda somente com um objeto JSON válido que siga exatamente o schema ao final deste arquivo; sem texto antes ou depois e sem bloco de código.
- Todos os IDs obrigatórios devem aparecer, inclusive os não aplicáveis, com score null e reason_na preenchido.
- Toda nota exige evidence; todo N/A exige reason_na. Confira cada soma e média antes de responder.
${role.startsWith('JP') ? '- Avaliação pedagógica cega (protocolo 3.4): avalie a resposta sem conhecer a decisão científica. A situação deve ser CONCLUÍDO, com os 10 itens M1.1 a M5.2 pontuados (0, 50 ou 100), M1 a M5 e P calculados. Não use BLOQUEADO, PENDENTE nem REVISÃO CIENTÍFICA SOLICITADA; possíveis erros científicos vão apenas no report.\n' : '- A situação científica deve ser APTO, CORRIGIR ou PENDENTE conforme o protocolo; PENDENTE é decisão válida quando os trechos fornecidos não permitem conferir afirmações.\n'}
`;

export async function prepareKit(directory, options) {
  const batchDirectory = resolve(directory);
  const judgeState = await readJsonIfPresent(join(batchDirectory, 'privado/julgamento.json'));
  if (!judgeState) throw new Error('O lote ainda não foi julgado; rode npm run executar antes de preparar o kit.');
  const judge = options.judge;
  const family = options.family ?? judgeFamily(judge);
  const root = kitDirectory(batchDirectory, judge);
  if (await readJsonIfPresent(join(root, 'kit.json'))) throw new Error(`Já existe kit para ${judge} em ${root}; confira-o com npm run kit -- conferir.`);
  const repositoryRoot = options.repositoryRoot;
  const templates = {
    JC: await readFile(join(repositoryRoot, 'prompts/avaliar-ciencia.md'), 'utf8'),
    JP: await readFile(join(repositoryRoot, 'prompts/avaliar-pedagogia.md'), 'utf8'),
  };
  const protocol = await readFile(join(repositoryRoot, 'referencias/protocolo-pontuacao.md'), 'utf8');
  const tasks = [];
  const skipped = [];
  for (const execution of judgeState.executions) {
    const model = judgeState.models.find((candidate) => candidate.id === execution.system_id);
    const discard = executionDiscardReason(execution);
    if (discard) { skipped.push({ execution_id: execution.execution_id, reason: `descartada: ${discard}` }); continue; }
    if (candidateFamily(model.model) === family) { skipped.push({ execution_id: execution.execution_id, reason: `mesma família do juiz (${family})` }); continue; }
    for (const role of kitRoles) tasks.push({ execution, role, code: `Q${randomUUID().replaceAll('-', '')}` });
  }
  // Ordem embaralhada para que o número da pasta não revele modelo nem tema.
  for (let index = tasks.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [tasks[index], tasks[other]] = [tasks[other], tasks[index]];
  }
  await mkdir(join(root, 'tarefas'), { recursive: true, mode: 0o700 });
  const manifest = [];
  for (const [index, task] of tasks.entries()) {
    const name = `${String(index + 1).padStart(2, '0')}-${task.role}`;
    const directory = join(root, 'tarefas', name);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const identity = { code: task.code, topic: task.execution.topic, round: task.execution.round, role: task.role };
    const input = buildInput({ ...task.execution, codes: { ...task.execution.codes, [task.role]: task.code } }, task.role, {});
    const schema = judgmentSchemaFor(identity);
    const prompt = `${taskInstructions(task.role)}\n${renderJudgePrompt(templates[roleFamily(task.role)], protocol, input)}\n## Schema JSON obrigatório\n\n${JSON.stringify(schema, null, 2)}\n`;
    await writeFile(join(directory, 'pedido.md'), prompt, { mode: 0o600 });
    await writeJson(join(directory, 'schema.json'), schema);
    manifest.push({ task: name, execution_id: task.execution.execution_id, role: task.role, code: task.code, topic: task.execution.topic, round: task.execution.round });
  }
  const kit = { schema_version: 1, created_at: new Date().toISOString(), protocol: '3.4', judge, family, roles: kitRoles, tasks: manifest, skipped };
  await writeJson(join(root, 'kit.json'), kit);
  return { root, kit };
}

export function blindPedagogyProblem(result) {
  if (result.role.startsWith('JP') && result.status !== 'CONCLUÍDO') return `JP cego deve ter situação CONCLUÍDO, não ${result.status}; pontue os 10 itens e calcule M1 a M5 e P.`;
  return null;
}

function parseAnswer(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
  return JSON.parse(trimmed);
}

export async function checkKit(directory, judge) {
  const root = kitDirectory(resolve(directory), judge);
  const kit = await readJsonIfPresent(join(root, 'kit.json'));
  if (!kit) throw new Error(`Kit de ${judge} não encontrado em ${root}.`);
  const outcomes = [];
  for (const task of kit.tasks) {
    const taskDirectory = join(root, 'tarefas', task.task);
    const identity = { code: task.code, topic: task.topic, round: task.round, role: task.role };
    let text;
    try { text = await readFile(join(taskDirectory, 'parecer.json'), 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      outcomes.push({ ...task, status: 'FALTANDO', problem: 'parecer.json ausente.' });
      continue;
    }
    let result;
    let problem = null;
    try {
      result = parseAnswer(text);
      validateJudgment(result, identity);
      problem = blindPedagogyProblem(result);
    } catch (error) { problem = error instanceof SyntaxError ? `JSON inválido: ${error.message}` : error.message; }
    const outcome = problem ? { ...task, status: 'RECUSADO', problem } : { ...task, status: 'ACEITO', decision: result.status };
    await replaceDerivedFile(join(taskDirectory, 'situacao.json'), `${JSON.stringify(outcome, null, 2)}\n`);
    outcomes.push(outcome);
  }
  const summary = { judge: kit.judge, accepted: outcomes.filter((outcome) => outcome.status === 'ACEITO').length, total: outcomes.length, outcomes };
  await replaceDerivedFile(join(root, 'conferencia.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function listKits(batchDirectory) {
  try { return (await readdir(join(batchDirectory, 'juizes/kits'), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

// Pareceres aceitos do kit, por execução e papel.
export async function readKitResults(batchDirectory, kitName) {
  const root = join(batchDirectory, 'juizes/kits', kitName);
  const kit = await readJsonIfPresent(join(root, 'kit.json'));
  const results = {};
  for (const task of kit.tasks) {
    const identity = { code: task.code, topic: task.topic, round: task.round, role: task.role };
    try {
      const result = parseAnswer(await readFile(join(root, 'tarefas', task.task, 'parecer.json'), 'utf8'));
      validateJudgment(result, identity);
      if (blindPedagogyProblem(result)) continue;
      (results[task.execution_id] ??= {})[task.role] = result;
    } catch { /* pareceres ausentes ou recusados ficam fora; a conferência os lista */ }
  }
  return { kit, results };
}
