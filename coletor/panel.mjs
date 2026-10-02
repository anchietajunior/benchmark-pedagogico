import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonIfPresent, replaceDerivedFile } from './artifacts.mjs';
import { renderCsv } from './consolidation.mjs';
import { escapeHtml } from './html-report.mjs';
import { materialAssertionCounts } from './external-verification.mjs';
import { candidateFamily, judgeFamily, listKits, readKitResults } from './judge-kit.mjs';
import { scientificScore } from './scientific-score.mjs';

// Painel de juízes (protocolo 3.4): uma tabela por juiz e a pontuação geral pela média dos juízes
// de família diferente da do modelo avaliado.

// CSV de renderCsv: cabeçalho sem aspas e células entre aspas, com vírgulas e quebras de linha possíveis.
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
  return new Map(parseQuotedCsv(text.slice(headerEnd + 1)).map((cells) => {
    const row = Object.fromEntries(columns.map((column, index) => [column, cells[index]]));
    return [row.execucao_id, row];
  }));
}

function numeric(value) {
  if (value === undefined || value === null || value === '' || value === 'N/A') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function judgeTable(judge, models, executions, scoresByExecution) {
  return models.map((model) => {
    const rows = executions.filter((execution) => execution.system_id === model.id);
    if (candidateFamily(model.model) === judge.family) return { system_id: model.id, model: model.model, status: 'MESMA FAMÍLIA' };
    const scored = rows.map((execution) => scoresByExecution.get(execution.execution_id)).filter((entry) => entry && Number.isFinite(entry.P) && Number.isFinite(entry.S));
    if (!rows.length || scored.length !== rows.length) return { system_id: model.id, model: model.model, status: 'INCOMPLETO', judged: scored.length, planned: rows.length };
    const counts = scored.every((entry) => entry.assertions) ? scored.reduce((sum, entry) => ({ confirmed: sum.confirmed + entry.assertions.confirmed, total: sum.total + entry.assertions.total }), { confirmed: 0, total: 0 }) : null;
    return {
      system_id: model.id, model: model.model, status: 'CONCLUÍDO',
      score: mean(scored.map((entry) => entry.P * entry.S / 100)), P: mean(scored.map((entry) => entry.P)), S: mean(scored.map((entry) => entry.S)), assertions: counts,
    };
  });
}

export function panelTable(models, judges) {
  return models.map((model) => {
    const eligible = judges.map((judge) => judge.table.find((row) => row.system_id === model.id)).filter((row) => row?.status === 'CONCLUÍDO');
    const excluded = judges.filter((judge) => judge.table.find((row) => row.system_id === model.id)?.status === 'MESMA FAMÍLIA').map((judge) => judge.name);
    return {
      system_id: model.id, model: model.model, judges: eligible.length, excluded,
      score: eligible.length ? mean(eligible.map((row) => row.score)) : null,
      P: eligible.length ? mean(eligible.map((row) => row.P)) : null,
      S: eligible.length ? mean(eligible.map((row) => row.S)) : null,
      by_judge: Object.fromEntries(judges.map((judge) => [judge.name, judge.table.find((row) => row.system_id === model.id)])),
    };
  }).toSorted((first, second) => (second.score ?? -1) - (first.score ?? -1));
}

export async function buildPanel(directory) {
  const batchDirectory = resolve(directory);
  const judgeState = await readJsonIfPresent(join(batchDirectory, 'privado/julgamento.json'));
  if (!judgeState) throw new Error('O lote ainda não foi julgado.');
  const { models, executions } = judgeState;
  const primary = await readPrimarySummary(batchDirectory);
  const primaryScores = new Map(executions.map((execution) => {
    const row = primary.get(execution.execution_id) ?? {};
    const confirmed = numeric(row.afirmacoes_confirmadas);
    const total = numeric(row.afirmacoes_total);
    return [execution.execution_id, { P: row.situacao_JP1 === 'CONCLUÍDO' ? numeric(row.P) : null, S: numeric(row.S), assertions: confirmed !== null && total ? { confirmed, total } : null }];
  }));
  const primaryName = judgeState.config.model;
  const judges = [{ name: primaryName, family: judgeFamily(primaryName), source: 'pipeline com verificação externa JX', table: null, scores: primaryScores }];
  for (const kitName of await listKits(batchDirectory)) {
    const { kit, results } = await readKitResults(batchDirectory, kitName);
    const scores = new Map(executions.map((execution) => {
      const judged = results[execution.execution_id] ?? {};
      return [execution.execution_id, {
        P: judged.JP1?.items.find((item) => item.id === 'P')?.score ?? null,
        S: judged.JC1 ? scientificScore(judged.JC1)?.score ?? null : null,
        assertions: judged.JC1 ? materialAssertionCounts(judged.JC1) : null,
      }];
    }));
    judges.push({ name: kit.judge, family: kit.family, source: 'kit manual, sem verificação externa JX', table: null, scores });
  }
  for (const judge of judges) judge.table = judgeTable(judge, models, executions, judge.scores);
  return { batchDirectory, judges, panel: panelTable(models, judges) };
}

function formatNumber(value) {
  return value === null || value === undefined ? 'N/A' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function judgeCell(row) {
  if (!row) return 'N/A';
  if (row.status === 'MESMA FAMÍLIA') return 'mesma família';
  if (row.status === 'INCOMPLETO') return `incompleto (${row.judged}/${row.planned})`;
  return formatNumber(row.score);
}

function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function renderPanelHtml(panel) {
  const judgeNames = panel.judges.map((judge) => judge.name);
  const summary = table(['Posição', 'Modelo', 'Pontuação do painel', 'Juízes considerados', ...judgeNames.map((name) => `Geral ${name}`), 'P painel', 'S painel'],
    panel.panel.map((row, index) => [index + 1, row.model, formatNumber(row.score), row.judges, ...judgeNames.map((name) => judgeCell(row.by_judge[name])), formatNumber(row.P), formatNumber(row.S)]));
  const perJudge = panel.judges.map((judge) => `<h3>${escapeHtml(judge.name)}</h3><p>Família ${escapeHtml(judge.family)}; ${escapeHtml(judge.source)}.</p>${table(['Modelo', 'Geral', 'P', 'S', 'Afirmações confirmadas'],
    judge.table.toSorted((first, second) => (second.score ?? -1) - (first.score ?? -1)).map((row) => [row.model, judgeCell(row), formatNumber(row.P), formatNumber(row.S), row.assertions ? `${row.assertions.confirmed}/${row.assertions.total}` : 'N/A']))}`).join('');
  return `<section class="panel"><h2>Painel de juízes</h2>
<p>Cada juiz aplica o protocolo 3.4 às mesmas respostas, em sessões isoladas. Geral = média por tema de P × S / 100. A pontuação do painel é a média dos juízes de família diferente da do modelo avaliado; o juiz da mesma família não conta.</p>
${summary}
<h2>Tabela de cada juiz</h2>
${perJudge}
<p>Somente o juiz principal teve verificação externa JX; nos demais, afirmações não verificáveis descontam 2 pontos em S sem consulta à web.</p>
</section>`;
}

export async function writePanel(directory) {
  const panel = await buildPanel(directory);
  const judgeNames = panel.judges.map((judge) => judge.name);
  const rows = panel.panel.map((row) => ({
    model: row.model, panel_score: row.score, panel_P: row.P, panel_S: row.S, judges: row.judges, excluded: row.excluded.join('; '),
    ...Object.fromEntries(judgeNames.map((name) => [`geral_${name}`, row.by_judge[name]?.score ?? row.by_judge[name]?.status ?? null])),
  }));
  await replaceDerivedFile(join(panel.batchDirectory, 'consolidado/painel.csv'), renderCsv(['model', 'panel_score', 'panel_P', 'panel_S', 'judges', 'excluded', ...judgeNames.map((name) => `geral_${name}`)], rows));
  await replaceDerivedFile(join(panel.batchDirectory, 'consolidado/painel.html'), `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Painel de juízes</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px 16px;color:#172b39;background:#f3f5f6}.panel{max-width:1180px;margin:0 auto;background:#fff;border:1px solid #dce3e6;border-radius:10px;padding:24px}.table-scroll{overflow-x:auto;margin-top:12px}table{border-collapse:collapse;width:100%}th,td{padding:10px;border-bottom:1px solid #e4e9eb;text-align:left;font-variant-numeric:tabular-nums}p{color:#526773}</style></head><body>${renderPanelHtml(panel)}</body></html>\n`);
  return panel;
}
