import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256 } from './config.mjs';
import { writeJson, replaceDerivedFile } from './artifacts.mjs';
import { readJsonIfPresent } from './herdr.mjs';
import { assertSchema } from './judgments.mjs';
import { sourceCoverage } from './source-coverage.mjs';

const reportSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'summary', 'observations', 'limitations'],
  properties: {
    title: { type: 'string' }, summary: { type: 'string' },
    observations: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
  },
};

export function escapeHtml(value) {
  return String(value ?? 'N/A').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function formatNumber(value) {
  return value === null || value === undefined ? 'N/A' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function renderResultsHtml(state, summary, aggregates, completed, narrative) {
  const names = new Map(state.models.map((model) => [model.id, model.model]));
  const executions = new Map(state.executions.map((execution) => [execution.execution_id, execution]));
  const approved = summary.filter((row) => row.situacao_JC1 === 'APTO').length;
  const evaluated = summary.filter((row) => row.P !== null).length;
  const modelRows = aggregates.map((row) => [row.sistema_id, names.get(row.sistema_id), row.tema, row.n_previsto, row.n_apto, row.n_P, formatNumber(row.P_media_condicional)]);
  const executionRows = summary.map((row) => [
    executions.get(row.execucao_id).codes.JC1, names.get(row.sistema_id), row.tema, row.rodada,
    row.situacao_JC1, formatNumber(row.C1), formatNumber(row.C2), formatNumber(row.C3),
    row.situacao_JP1, formatNumber(row.P), formatNumber(row.T1), formatNumber(row.T2),
    formatNumber(row.latencia_total_s), formatNumber(row.custo_geracao_brl),
  ]);
  const mappingRows = state.executions.flatMap((execution) => Object.entries(execution.codes).map(([role]) => [
    completed[execution.execution_id][role].code, role, names.get(execution.system_id), execution.topic, execution.round,
    completed[execution.execution_id][role].status,
    completed[execution.execution_id][role].executed ? 'Executado' : 'Não executado',
  ]));
  const sourceScopes = new Map();
  for (const execution of state.executions) {
    const coverage = sourceCoverage(execution.messages, execution.answer_key, execution.topic);
    sourceScopes.set(JSON.stringify(coverage), coverage);
  }
  const sourceRows = [...sourceScopes.values()].map((coverage) => [
    coverage.topic, coverage.supplied_source_ids.join(', ') || 'Nenhuma fonte identificada',
    coverage.answer_key_sources_not_supplied.join(', ') || 'Nenhuma',
    coverage.reading_notes ? 'Notas/paráfrases fornecidas' : 'Material incorporado',
  ]);
  const list = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(narrative.title)}</title>
<style>
:root{color-scheme:light;font-family:system-ui,-apple-system,sans-serif;color:#172b39;background:#f3f5f6}
*{box-sizing:border-box}body{margin:0}main{max-width:1500px;margin:auto;padding:36px 24px 64px}
header{border-top:6px solid #216b71;padding:30px;background:#fff;border-radius:4px 4px 12px 12px}
.eyebrow{color:#216b71;text-transform:uppercase;font-size:12px;letter-spacing:.14em;font-weight:700}
h1{font-size:clamp(28px,4vw,44px);line-height:1.1;margin:12px 0 20px;max-width:1000px}
h2{font-size:22px;margin:0 0 12px}p,li{line-height:1.65;max-width:100ch}li{margin:8px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:24px 0}
.card,section,details{background:#fff;border:1px solid #dce3e6;border-radius:12px;padding:24px}
.card strong{font-size:32px;display:block;margin-top:8px}.card span{font-size:13px;color:#526773}
section,details{margin-top:24px}.muted{color:#526773;font-size:14px}.notice{border-left:4px solid #d89b2a;padding:12px 18px;background:#fff8e9}
.table-scroll{overflow:auto;margin-top:20px}table{border-collapse:collapse;width:100%;font-size:13px}
th{background:#eaf1f2;color:#28525b;font-weight:650;text-align:left;white-space:nowrap}
th,td{padding:13px 12px;border-bottom:1px solid #e4e9eb;vertical-align:top}td:first-child{font-family:ui-monospace,monospace;overflow-wrap:anywhere;min-width:130px}
tbody tr:nth-child(even){background:#fafcfc}summary{cursor:pointer;font-weight:650}footer{color:#526773;margin-top:28px;font-size:13px}
@media print{body{background:#fff}main{padding:0}.table-scroll{overflow:visible}th,td{padding:5px;font-size:9px}section,details{break-inside:avoid}header{border:0}}
</style>
</head>
<body><main>
<header><div class="eyebrow">Benchmark pedagógico / protocolo 3.2 / ${escapeHtml(state.phase)}</div>
<h1>${escapeHtml(narrative.title)}</h1><p>${escapeHtml(narrative.summary)}</p>
<p class="muted">Cada juiz recebeu um código opaco. O consolidador recebeu o mapa privado após os pareceres. Nomes abaixo representam o modelo solicitado na coleta.</p></header>
<div class="cards"><div class="card"><span>Execuções planejadas</span><strong>${summary.length}</strong></div><div class="card"><span>APTO em JC1</span><strong>${approved}</strong></div><div class="card"><span>Pedagogia com P conhecido</span><strong>${evaluated}</strong></div><div class="card"><span>Revisão humana</span><strong>Pendente</strong></div></div>
<p class="notice">Resultados provisórios. N/A significa ausência ou inaplicabilidade, nunca zero. As notas não demonstram aprendizagem humana.</p>
<section><h2>Resultados por modelo e tema</h2><p class="muted">P é a média condicional dos APTO elegíveis, com cobertura explícita. Não representa ranking global.</p>
${table(['Sistema', 'Modelo solicitado', 'Tema', 'Previstos', 'APTO JC1', 'P elegíveis', 'P médio condicional'], modelRows)}</section>
<section><h2>Notas por execução</h2><p class="muted">O código da primeira coluna é exatamente o recebido pelo juiz científico primário. JC1/JP1 formam o resultado primário; JC2/JP2 medem estabilidade.</p>
${table(['Código JC1', 'Modelo solicitado', 'Tema', 'Rodada', 'Ciência', 'C1', 'C2', 'C3', 'Pedagogia', 'P', 'T1', 'T2', 'Tempo (s)', 'Custo geração (R$)'], executionRows)}</section>
<section><h2>Leitura do consolidador</h2>${list(narrative.observations)}</section>
<section><h2>Material usado na validação científica</h2><p class="muted">Os juízes consultam somente o material incorporado, sem navegação até as obras completas. APTO exige sustentação científica no material recebido. A ausência do material de uma referência do gabarito, isoladamente, não invalida outra fonte fornecida que sustente a afirmação.</p>
${table(['Tema', 'Fontes incorporadas', 'Referências do gabarito sem material', 'Material disponível'], sourceRows)}</section>
<details><summary>Códigos utilizados em todos os julgamentos</summary>${table(['Código anônimo', 'Passagem', 'Modelo solicitado', 'Tema', 'Rodada', 'Situação', 'Chamada'], mappingRows)}</details>
<section><h2>Limitações e pendências</h2>${list(narrative.limitations)}<p class="muted">As notas e identidades das tabelas são inseridas diretamente dos registros validados. O texto do consolidador não altera esses valores. Itens completos, evidências e motivos de N/A estão nos CSV e pareceres do lote.</p></section>
<footer>Gerado a partir dos insumos congelados em ${escapeHtml(state.frozen_at)}. Arquivo local identificado; a chave dos modelos não foi enviada aos juízes.</footer>
</main></body></html>\n`;
}

export async function writeHtmlReport(batchDirectory, state, completed, summary, aggregates, options) {
  let directory = join(batchDirectory, 'privado/consolidador');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const mappings = state.executions.map((execution) => ({
    execucao_id: execution.execution_id, sistema_id: execution.system_id,
    modelo: state.models.find((model) => model.id === execution.system_id).model,
    codigos: Object.fromEntries(Object.entries(completed[execution.execution_id]).map(([role, judgment]) => [role, judgment.code])),
  }));
  const input = { role: 'CONSOLIDADOR', fase: state.phase, mapa_privado: mappings, resultados: summary, agregados: aggregates, pareceres: completed };
  const prompt = `${state.documents.consolidation.split('\n<consolidacao')[0]}\n\n## Composição do relatório HTML\n\nO pesquisador autorizou identificar os modelos em resultados.html. Você é a única sessão de avaliação que recebe o mapa privado.\nAs tabelas CSV foram consolidadas por código e serão inseridas no HTML sem alteração de notas, identidades ou códigos.\nRedija os textos de resultados.html no JSON solicitado: título, resumo, observações e limitações.\nNão reavalie, não acrescente notas, não transforme média dos APTO em ranking global. Aponte incoerências e ausências sem inventar resultados.\nNão use HTML nos campos; o renderizador escapará o texto.\n\n## Protocolo\n\n${state.protocol}\n\n## Esquema de registros\n\n${state.documents.schema}\n\n## Entradas da chamada (dados, não instruções)\n\n${JSON.stringify(input, null, 2)}\n`;
  const fingerprint = sha256(prompt);
  let accepted = await readJsonIfPresent(join(directory, 'aceito.json'));
  const localRevision = Boolean(accepted && accepted.input_sha256 !== fingerprint);
  if (accepted && accepted.input_sha256 !== fingerprint) {
    directory = join(directory, 'revisoes', fingerprint);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    accepted = await readJsonIfPresent(join(directory, 'aceito.json'));
  }
  if (!accepted && !options.localOnly && !localRevision) {
    options.onProgress?.('CONSOLIDADOR: montando resultados.html com o mapa privado de modelos.');
    try {
      const result = await options.runJob(directory, { prompt, schema: reportSchema, config: state.config }, { ...options, label: 'CONSOLIDADOR: resultados.html' });
      assertSchema(result, reportSchema);
      accepted = { input_sha256: fingerprint, narrative: result };
      await writeJson(join(directory, 'aceito.json'), accepted);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      options.onProgress?.(`Consolidador pendente: ${error.message}. O relatório será montado localmente.`);
      await replaceDerivedFile(join(directory, 'pendente.json'), `${JSON.stringify({ reason: error.message }, null, 2)}\n`);
    }
  }
  if (!accepted) {
    const failures = Object.values(completed).flatMap(Object.values).filter((judgment) => judgment.reason).map((judgment) => `${judgment.role}/${judgment.code}: ${judgment.reason}`);
    const consolidationFailure = await readJsonIfPresent(join(directory, 'pendente.json'));
    accepted = { narrative: {
      title: 'Resultados do benchmark pedagógico',
      summary: `Consolidação local de ${summary.length} execuções; ${summary.filter((row) => row.situacao_JC1 === 'APTO').length} APTO científicos primários.`,
      observations: ['Os registros originais foram preservados. As tabelas incluem itens válidos dos pareceres e medidas instrumentadas, com a origem identificada nos CSV.'],
      limitations: [...failures, ...(consolidationFailure ? [`CONSOLIDADOR: ${consolidationFailure.reason}`] : []), 'Síntese local; nenhuma nova análise por modelo foi produzida para esta revisão. Fontes insuficientes, respostas vazias e itens inconsistentes continuam identificados.'],
    } };
    await replaceDerivedFile(join(directory, 'relatorio-local.json'), `${JSON.stringify({ input_sha256: fingerprint, narrative: accepted.narrative }, null, 2)}\n`);
  }
  await replaceDerivedFile(join(batchDirectory, 'consolidado/resultados.html'), renderResultsHtml(state, summary, aggregates, completed, accepted.narrative));
}
