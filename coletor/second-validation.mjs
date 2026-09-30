import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonIfPresent, replaceDerivedFile, writeJson } from './artifacts.mjs';
import { judgmentSchemaFor, renderJudgePrompt, roleFamily, validateJudgment } from './judgments.mjs';
import { buildInput } from './pipeline.mjs';
import { executionDiscardReason } from './pipeline-completion.mjs';
import { scientificScore } from './scientific-score.mjs';
import { renderCsv } from './consolidation.mjs';
import { escapeHtml } from './html-report.mjs';

// Segunda validação (protocolo 3.4): outro juiz, de outra família, refaz JC e JP cego sobre as mesmas respostas.
// Não altera pareceres do lote; grava tudo em juizes/segunda-validacao/<modelo>/.

const isolationNote = 'Você é um avaliador independente de um benchmark pedagógico. Não use ferramentas, arquivos ou navegação; siga somente este pedido e responda apenas com o JSON do schema.\n\n';

export function judgeFamily(model) {
  if (/^(gpt|o\d|codex)/i.test(model)) return 'openai';
  if (/^claude/i.test(model)) return 'anthropic';
  if (/^gemini/i.test(model)) return 'google';
  return model.split(/[-/]/)[0].toLowerCase();
}

function modelSlug(model) {
  return model.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validationRoles(passes) {
  return passes === 2 ? ['JC1', 'JC2', 'JP1', 'JP2'] : ['JC1', 'JP1'];
}

function scoreOf(result) {
  return result?.items.find((item) => item.id === 'P')?.score ?? null;
}

function mean(values) {
  const known = values.filter(Number.isFinite);
  return known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
}

async function loadOrCreateState(root, judgeState, config, passes, family) {
  const path = join(root, 'estado.json');
  const previous = await readJsonIfPresent(path);
  if (previous) {
    if (previous.config.model !== config.model || previous.config.reasoning_effort !== config.reasoning_effort) throw new Error('Esta pasta já tem validação com outro modelo ou esforço; use outro --modelo-juiz ou preserve a anterior.');
    if (previous.passes !== passes) throw new Error(`Validação iniciada com ${previous.passes} passada(s); retome com --passadas ${previous.passes}.`);
    return previous;
  }
  const roles = validationRoles(passes);
  const state = {
    schema_version: 1, created_at: new Date().toISOString(), protocol: '3.4', config, passes, judge_family: family,
    codes: Object.fromEntries(judgeState.executions.map((execution) => [execution.execution_id, Object.fromEntries(roles.map((role) => [role, `Q${randomUUID().replaceAll('-', '')}`]))])),
    limitation: 'Segunda validação sem verificação externa JX: afirmações não verificáveis descontam 2 pontos em S. Respostas da mesma família do juiz não são julgadas por ele.',
  };
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeJson(path, state);
  return state;
}

async function judgeOne(root, judgeState, execution, role, code, options) {
  const identity = { code, topic: execution.topic, round: execution.round, role };
  const directory = join(root, role, code);
  const accepted = await readJsonIfPresent(join(directory, 'aceito.json'));
  if (accepted) return { ...identity, status: accepted.status, result: accepted };
  if (options.localOnly) return { ...identity, status: 'PENDENTE', result: null, reason: 'Sem parecer arquivado; o relatório local não inicia chamadas.' };
  const input = buildInput({ ...execution, codes: { ...execution.codes, [role]: code } }, role, {});
  const job = {
    prompt: isolationNote + renderJudgePrompt(judgeState.documents[roleFamily(role)], judgeState.protocol, input),
    schema: judgmentSchemaFor(identity), config: options.config,
  };
  let result;
  try { result = await options.runJob(directory, job, { ...options, label: `${role}: ${code}` }); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    return { ...identity, status: 'PENDENTE', result: null, reason: error.message };
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { validateJudgment(result, identity); }
  catch (error) {
    await replaceDerivedFile(join(directory, 'pendente.json'), `${JSON.stringify({ reason: error.message, raw_result: result }, null, 2)}\n`);
    return { ...identity, status: 'PENDENTE', result: null, reason: error.message };
  }
  await writeJson(join(directory, 'aceito.json'), result);
  await replaceDerivedFile(join(directory, 'parecer.md'), result.report);
  return { ...identity, status: result.status, result };
}

// CSV gerado por renderCsv: cabeçalho sem aspas e células entre aspas, que podem conter vírgulas e quebras de linha.
export function parseQuotedCsv(text) {
  const rows = [];
  let row = [];
  for (const match of text.matchAll(/"((?:[^"]|"")*)"(,|\r?\n|$)/g)) {
    row.push(match[1].replaceAll('""', '"'));
    if (match[2] !== ',') { rows.push(row); row = []; }
    if (match.index + match[0].length >= text.length) break;
  }
  return rows;
}

async function readPrimarySummary(batchDirectory) {
  const text = await readFile(join(batchDirectory, 'consolidado/resultados-resumo.csv'), 'utf8');
  const headerEnd = text.indexOf('\n');
  const columns = text.slice(0, headerEnd).split(',');
  const rows = parseQuotedCsv(text.slice(headerEnd + 1));
  return new Map(rows.map((cells) => {
    const row = Object.fromEntries(columns.map((column, index) => [column, cells[index]]));
    return [row.execucao_id, row];
  }));
}

function numeric(value) {
  const number = Number(value);
  return value === undefined || value === 'N/A' || value === '' || !Number.isFinite(number) ? null : number;
}

export function buildComparison(judgeState, validationState, outcomes, primary) {
  const executions = judgeState.executions.map((execution) => {
    const model = judgeState.models.find((candidate) => candidate.id === execution.system_id);
    const judged = outcomes[execution.execution_id] ?? {};
    const first = primary.get(execution.execution_id) ?? {};
    const secondS = mean(['JC1', 'JC2'].map((role) => judged[role]?.result ? scientificScore(judged[role].result)?.score : null));
    const secondP = scoreOf(judged.JP1?.result);
    const primaryS = numeric(first.S);
    const primaryP = numeric(first.P);
    const excluded = judged.excluded ?? null;
    return {
      execution_id: execution.execution_id, system_id: execution.system_id, model: model.model, topic: execution.topic,
      excluded, primary_P: primaryP, primary_S: primaryS, second_P: secondP, second_S: secondS,
      second_status_JC1: judged.JC1?.status ?? null, second_status_JP1: judged.JP1?.status ?? null,
      panel_P: excluded ? primaryP : mean([primaryP, secondP]), panel_S: excluded ? primaryS : mean([primaryS, secondS]),
    };
  });
  const models = judgeState.models.map((model) => {
    const rows = executions.filter((row) => row.system_id === model.id);
    const combined = (p, s) => (Number.isFinite(p) && Number.isFinite(s) ? p * s / 100 : null);
    const average = (key) => (rows.length && rows.every((row) => Number.isFinite(row[key])) ? mean(rows.map((row) => row[key])) : null);
    const score = (pKey, sKey) => {
      const values = rows.map((row) => combined(row[pKey], row[sKey]));
      return rows.length && values.every(Number.isFinite) ? mean(values) : null;
    };
    return {
      system_id: model.id, model: model.model, excluded: rows.some((row) => row.excluded),
      primary_score: score('primary_P', 'primary_S'), second_score: rows.some((row) => row.excluded) ? null : score('second_P', 'second_S'),
      panel_score: score('panel_P', 'panel_S'),
      primary_P: average('primary_P'), second_P: average('second_P'), primary_S: average('primary_S'), second_S: average('second_S'),
    };
  }).toSorted((first, second) => (second.panel_score ?? -1) - (first.panel_score ?? -1));
  const pairs = executions.filter((row) => !row.excluded && Number.isFinite(row.second_P) && Number.isFinite(row.primary_P));
  const sPairs = executions.filter((row) => !row.excluded && Number.isFinite(row.second_S) && Number.isFinite(row.primary_S));
  const agreement = {
    mean_abs_diff_P: pairs.length ? mean(pairs.map((row) => Math.abs(row.primary_P - row.second_P))) : null,
    mean_abs_diff_S: sPairs.length ? mean(sPairs.map((row) => Math.abs(row.primary_S - row.second_S))) : null,
    n_P: pairs.length, n_S: sPairs.length,
  };
  return { judge: validationState.config.model, judge_family: validationState.judge_family, executions, models, agreement };
}

function formatNumber(value) {
  return value === null || value === undefined ? 'N/A' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

export function renderComparisonHtml(comparison, primaryJudge) {
  const row = (cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
  const head = (cells) => `<thead><tr>${cells.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('')}</tr></thead>`;
  const models = comparison.models.map((model) => row([
    model.model, formatNumber(model.primary_score), model.excluded ? 'mesma família' : formatNumber(model.second_score), formatNumber(model.panel_score),
    formatNumber(model.primary_P), model.excluded ? '—' : formatNumber(model.second_P), formatNumber(model.primary_S), model.excluded ? '—' : formatNumber(model.second_S),
  ])).join('');
  const executions = comparison.executions.map((entry) => row([
    entry.model, entry.topic, formatNumber(entry.primary_P), entry.excluded ? '—' : formatNumber(entry.second_P),
    formatNumber(entry.primary_S), entry.excluded ? '—' : formatNumber(entry.second_S), entry.excluded ?? entry.second_status_JC1 ?? 'N/A',
  ])).join('');
  return `<section class="second-validation"><h2>Segunda validação: ${escapeHtml(comparison.judge)}</h2>
<p>O mesmo protocolo foi reaplicado por um juiz de outra família (${escapeHtml(comparison.judge_family)}) às mesmas respostas, sem verificação externa JX. Respostas da família do juiz ficam só com ${escapeHtml(primaryJudge)}. O painel usa a média dos dois juízes em P e S.</p>
<p>Diferença média absoluta entre os juízes: P ${formatNumber(comparison.agreement.mean_abs_diff_P)} (n = ${comparison.agreement.n_P}); S ${formatNumber(comparison.agreement.mean_abs_diff_S)} (n = ${comparison.agreement.n_S}).</p>
<div class="table-scroll"><table>${head(['Modelo', `Geral ${primaryJudge}`, `Geral ${comparison.judge}`, 'Geral painel', `P ${primaryJudge}`, `P ${comparison.judge}`, `S ${primaryJudge}`, `S ${comparison.judge}`])}<tbody>${models}</tbody></table></div>
<div class="table-scroll"><table>${head(['Modelo', 'Tema', `P ${primaryJudge}`, `P ${comparison.judge}`, `S ${primaryJudge}`, `S ${comparison.judge}`, 'Situação JC1 do segundo juiz'])}<tbody>${executions}</tbody></table></div>
</section>`;
}

export async function runSecondValidation(directory, options) {
  const batchDirectory = resolve(directory);
  const judgeState = await readJsonIfPresent(join(batchDirectory, 'privado/julgamento.json'));
  if (!judgeState) throw new Error('O lote ainda não foi julgado; rode npm run executar antes da segunda validação.');
  const passes = options.passes ?? 1;
  const family = options.family ?? judgeFamily(options.config.model);
  const root = join(batchDirectory, 'juizes/segunda-validacao', modelSlug(options.config.model));
  const validationState = await loadOrCreateState(root, judgeState, options.config, passes, family);
  const roles = validationRoles(passes);
  const outcomes = {};
  const queue = [];
  for (const execution of judgeState.executions) {
    const model = judgeState.models.find((candidate) => candidate.id === execution.system_id);
    const discard = executionDiscardReason(execution);
    const sameFamily = model.model.split('/')[0].toLowerCase() === family;
    outcomes[execution.execution_id] = { excluded: discard ? `descartada: ${discard}` : sameFamily ? `mesma família do juiz (${family})` : null };
    if (discard || sameFamily) continue;
    for (const role of roles) queue.push({ execution, role });
  }
  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const { execution, role } = queue[next];
      next += 1;
      if (options.signal?.aborted) throw new Error('Validação interrompida; retome o mesmo lote.');
      const code = validationState.codes[execution.execution_id][role];
      const outcome = await judgeOne(root, judgeState, execution, role, code, options);
      outcomes[execution.execution_id][role] = outcome;
      options.onProgress?.(`${role}: ${code} - ${outcome.status}${outcome.reason ? `: ${outcome.reason}` : ''}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency ?? 2) }, worker));
  const comparison = buildComparison(judgeState, validationState, outcomes, await readPrimarySummary(batchDirectory));
  const primaryJudge = judgeState.config.model;
  await replaceDerivedFile(join(root, 'comparacao.json'), `${JSON.stringify(comparison, null, 2)}\n`);
  await replaceDerivedFile(join(batchDirectory, 'consolidado/segunda-validacao.csv'), renderCsv(
    ['execution_id', 'system_id', 'model', 'topic', 'excluded', 'primary_P', 'second_P', 'panel_P', 'primary_S', 'second_S', 'panel_S', 'second_status_JC1', 'second_status_JP1'],
    comparison.executions,
  ));
  await replaceDerivedFile(join(batchDirectory, 'consolidado/segunda-validacao.html'), `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Segunda validação</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px 16px;color:#172b39;background:#f3f5f6}.second-validation{max-width:1100px;margin:0 auto;background:#fff;border:1px solid #dce3e6;border-radius:10px;padding:24px}.table-scroll{overflow-x:auto;margin-top:16px}table{border-collapse:collapse;width:100%}th,td{padding:10px;border-bottom:1px solid #e4e9eb;text-align:left}td:not(:first-child){font-variant-numeric:tabular-nums}p{color:#526773}</style></head><body>${renderComparisonHtml(comparison, primaryJudge)}</body></html>\n`);
  const pending = Object.values(outcomes).flatMap((entry) => roles.map((role) => entry[role])).filter((outcome) => outcome && !outcome.result);
  return { root, comparison, pending, planned: queue.length };
}
