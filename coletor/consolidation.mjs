import { mkdir, readFile, copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readJsonIfPresent, replaceDerivedFile } from './artifacts.mjs';
import { fixedItems, roleFamily } from './judgments.mjs';
import { writeHtmlReport } from './html-report.mjs';
import { recordedItems } from './record-results.mjs';
import { sha256, studyTopicIds } from './config.mjs';
import { assessPipelineCompletion } from './pipeline-completion.mjs';

const completeColumns = 'versao_protocolo,fase,execucao_id,sistema_id,modo_entrega,tema,rodada,codigo_publico,papel,passagem,item,nota_0_100,valor_bruto,unidade,numerador,denominador,situacao,execucao_avaliacao,avaliador_config_id,metodo_verificacao,arquivo_origem,evidencia,motivo_na'.split(',');
const summaryColumns = 'versao_protocolo,fase,execucao_id,sistema_id,modo_entrega,tema,rodada,iniciada,status_operacional,ramo_saida,situacao_JC1,K1,K2,K3,K4,K5,K6,C1,C2,C3,situacao_JP1,M1.1,M1.2,M2.1,M2.2,M3.1,M3.2,M4.1,M4.2,M5.1,M5.2,M1,M2,M3,M4,M5,P,T1,T2,E1,E2,E3,latencia_total_s,primeiro_texto_s,tempo_ate_falha_s,tokens_entrada,tokens_saida,custo_geracao_brl,origem_custo,metas_versao,contestacao_cientifica,provisorio,motivos_na,evidencia'.split(',');
const stabilityColumns = 'versao_protocolo,fase,execucao_id,sistema_id,modo_entrega,tema,rodada,papel,item,passagem_1,valor_1,passagem_2,valor_2,comparavel,diferenca,concordancia,motivo_exclusao,evidencia'.split(',');

export function renderCsv(columns, records) {
  const cell = (value) => {
    let content = value === null || value === undefined ? 'N/A' : String(value);
    if (typeof value === 'string' && /^[=+@\-\t\r\n]/.test(content)) content = `'${content}`;
    return `"${content.replaceAll('"', '""')}"`;
  };
  return `${columns.join(',')}\n${records.map((record) => columns.map((column) => cell(record[column])).join(',')).join('\n')}\n`;
}

function commonFields(execution, phase) {
  return {
    versao_protocolo: '3.2', fase: phase, execucao_id: execution.execution_id, sistema_id: execution.system_id,
    modo_entrega: 'api-openrouter-v1', tema: execution.topic, rodada: execution.round,
  };
}

function itemValue(judgment, id, field = 'score') {
  return (judgment?.result?.items ?? judgment?.partial_items)?.find((item) => item.id === id)?.[field] ?? null;
}

function sourceFile(judgment) {
  if (!judgment.executed) return 'privado/fila-julgamento.json';
  if (judgment.validation_file) return judgment.validation_file;
  const root = 'juizes/pareceres';
  if (judgment.revalidated) return `${root}/${judgment.role}/${judgment.code}/revalidado.json`;
  return `${root}/${judgment.role}/${judgment.code}/${judgment.result ? 'parecer.md' : 'pendente.json'}`;
}

function availableItems(execution, judgment) {
  const family = roleFamily(judgment.role);
  const judged = judgment.status === 'DESCARTADO' ? [] : judgment.result?.items ?? judgment.partial_items ?? [];
  const recorded = recordedItems(execution, family).filter((item) => judgment.status !== 'DESCARTADO' || item.id !== 'T1');
  const items = [...judged];
  for (const item of recorded) {
    if (!items.some((existing) => existing.id === item.id)) items.push(item);
  }
  for (const id of fixedItems[family]) {
    if (!items.some((item) => item.id === id)) items.push({ id, reason_na: judgment.reason ?? 'Item não disponível no parecer.', evidence: judgment.reason ?? 'Item não disponível no parecer.' });
  }
  return items;
}

function detailedRows(execution, phase, judgments) {
  return Object.values(judgments).flatMap((judgment) => {
    const family = roleFamily(judgment.role);
    const items = availableItems(execution, judgment);
    return items.map((item) => ({
      ...commonFields(execution, phase), codigo_publico: judgment.code, papel: family,
      passagem: ['JT', 'JE'].includes(family) ? 'UNICA' : judgment.role, item: item.id,
      nota_0_100: item.score, valor_bruto: item.value, unidade: item.unit,
      numerador: item.numerator, denominador: item.denominator, situacao: judgment.status,
      execucao_avaliacao: item.verification_method ? 'APURAÇÃO LOCAL' : judgment.executed ? 'EXECUTADO' : 'NÃO EXECUTADO',
      avaliador_config_id: item.verification_method ? null : judgment.executed ? 'CLAUDE-01' : null,
      metodo_verificacao: item.verification_method ?? (judgment.result || judgment.partial_items?.includes(item) ? 'LLM' : 'REGISTRO ADMINISTRATIVO'),
      arquivo_origem: item.verification_method ? `comprovantes/${execution.execution_id}/metricas.json` : sourceFile(judgment),
      evidencia: item.evidence, motivo_na: item.reason_na,
    }));
  });
}

function hasScientificDispute(judgments) {
  const first = judgments.JC1.result?.status;
  const second = judgments.JC2.result?.status;
  const pedagogicalReviewRequested = [judgments.JP1, judgments.JP2].some((judgment) => [judgment.status, judgment.original_status].includes('REVISÃO CIENTÍFICA SOLICITADA'));
  return Boolean(first && second && first !== second) || pedagogicalReviewRequested;
}

function summaryRow(execution, phase, judgments) {
  const available = Object.fromEntries(Object.entries(judgments).map(([role, judgment]) => [role, { partial_items: availableItems(execution, judgment) }]));
  const row = { ...commonFields(execution, phase) };
  for (const [role, pattern] of [['JC1', /^(K\d|C\d)$/], ['JP1', /^(M\d(?:\.\d)?|P)$/], ['JT', /^(T\d|F\d)$/], ['JE', /^E\d$/]]) {
    for (const id of fixedItems[roleFamily(role)].filter((id) => pattern.test(id))) row[id] = itemValue(available[role], id);
  }
  const efficiency = { latencia_total_s: 'LATENCIA_TOTAL_S', primeiro_texto_s: 'PRIMEIRO_TEXTO_S', tempo_ate_falha_s: 'TEMPO_ATE_FALHA_S', tokens_entrada: 'TOKENS_ENTRADA', tokens_saida: 'TOKENS_SAIDA', custo_geracao_brl: 'CUSTO_GERACAO_BRL', origem_custo: 'ORIGEM_CUSTO', metas_versao: 'METAS_VERSAO' };
  for (const [column, id] of Object.entries(efficiency)) row[column] = itemValue(available.JE, id, 'value');
  row.iniciada = itemValue(available.JT, 'INICIADA', 'value');
  row.status_operacional = itemValue(available.JT, 'STATUS_OPERACIONAL', 'value');
  row.ramo_saida = itemValue(available.JT, 'RAMO_SAIDA', 'value');
  row.situacao_JC1 = judgments.JC1.status;
  row.situacao_JP1 = judgments.JP1.status;
  row.contestacao_cientifica = hasScientificDispute(judgments);
  row.provisorio = true;
  row.motivos_na = Object.values(judgments).flatMap((judgment) => judgment.result ? judgment.result.items.filter((item) => item.score === null && item.reason_na).map((item) => `${judgment.role}/${item.id}: ${item.reason_na}`) : [`${judgment.role}: ${judgment.reason}`]).join('; ');
  row.evidencia = Object.values(judgments).filter((judgment) => judgment.executed).map(sourceFile).join('; ');
  return row;
}

async function archivePreviousReports(directory) {
  const reports = [];
  for (const filename of ['resultados.html', 'relatorio.md', 'status-fluxo.json', 'resultados-completos.csv', 'resultados-resumo.csv', 'estabilidade.csv', 'agregados.csv', 'global-por-rodada.csv', 'orcamento-julgamentos.csv']) {
    try { reports.push({ filename, hash: sha256(await readFile(join(directory, filename))) }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!reports.length) return;
  const revision = join(directory, 'revisoes', sha256(JSON.stringify(reports)));
  await mkdir(revision, { recursive: true, mode: 0o700 });
  for (const { filename } of reports) {
    try { await copyFile(join(directory, filename), join(revision, filename), 1); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}

function stabilityRows(execution, phase, judgments) {
  const rows = [];
  for (const family of ['JC', 'JP']) {
    const first = judgments[`${family}1`];
    const second = judgments[`${family}2`];
    for (const id of fixedItems[family]) {
      const field = id.startsWith('SITUACAO_') ? 'value' : 'score';
      const firstValue = itemValue(first, id, field);
      const secondValue = itemValue(second, id, field);
      const scienceApproved = judgments.JC1.result?.status === 'APTO' && judgments.JC2.result?.status === 'APTO';
      const pedagogyComplete = first.status === 'CONCLUÍDO' && second.status === 'CONCLUÍDO';
      const comparable = Boolean(first.result && second.result && firstValue !== null && secondValue !== null && (family === 'JC' || (scienceApproved && pedagogyComplete)));
      rows.push({
        ...commonFields(execution, phase), papel: family, item: id,
        passagem_1: first.role, valor_1: firstValue, passagem_2: second.role, valor_2: secondValue,
        comparavel: comparable,
        diferenca: comparable && typeof firstValue === 'number' && typeof secondValue === 'number' ? secondValue - firstValue : null,
        concordancia: comparable ? firstValue === secondValue : null,
        motivo_exclusao: comparable ? '' : 'Par sem dois pareceres válidos/medidas conhecidas ou sem elegibilidade pedagógica nos dois ramos.',
        evidencia: `${sourceFile(first)}; ${sourceFile(second)}`,
      });
    }
  }
  return rows;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function aggregateRows(summary) {
  const groups = new Map();
  for (const row of summary) {
    const key = `${row.sistema_id}/${row.tema}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map((rows) => {
    const scores = rows.filter((row) => row.situacao_JC1 === 'APTO' && row.situacao_JP1 === 'CONCLUÍDO' && !row.contestacao_cientifica && row.P !== null).map((row) => row.P);
    const average = mean(scores);
    return {
      sistema_id: rows[0].sistema_id, tema: rows[0].tema, n_previsto: rows.length,
      n_iniciado: rows.filter((row) => row.iniciada === true).length,
      n_concluido: rows.filter((row) => row.status_operacional === 'conclusão normal').length,
      n_apto: rows.filter((row) => row.situacao_JC1 === 'APTO').length, n_P: scores.length,
      P_media_condicional: average, P_minimo: scores.length ? Math.min(...scores) : null,
      P_maximo: scores.length ? Math.max(...scores) : null,
      P_desvio_padrao_amostral: scores.length > 1 ? Math.sqrt(scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / (scores.length - 1)) : null,
      interpretacao: 'Diagnóstico condicionado aos APTO elegíveis; revisão humana pendente. Não é ranking global.',
    };
  });
}

function globalRows(summary) {
  const groups = new Map();
  for (const row of summary) {
    const key = `${row.sistema_id}/${row.rodada}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map((rows) => {
    const coversStudyTopics = rows.length === studyTopicIds.length && studyTopicIds.every((topic) => rows.some((row) => row.tema === topic));
    const eligible = coversStudyTopics && rows.every((row) => row.situacao_JC1 === 'APTO' && row.situacao_JP1 === 'CONCLUÍDO' && !row.contestacao_cientifica && row.P !== null);
    return { sistema_id: rows[0].sistema_id, rodada: rows[0].rodada, elegivel: eligible, P_global: eligible ? mean(rows.map((row) => row.P)) : null, motivo: eligible ? 'Resultado provisório; revisão humana pendente.' : `Exige ${studyTopicIds.join(' e ')} com APTO e P completos, sem contestação.` };
  });
}

async function readClaudeUsage(directory) {
  let output;
  try { output = JSON.parse(await readFile(join(directory, 'saida.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return null; throw error; }
  const usage = output.usage;
  const counts = [usage?.input_tokens, usage?.cache_creation_input_tokens, usage?.cache_read_input_tokens, usage?.output_tokens];
  if (!counts.every((count) => Number.isSafeInteger(count) && count >= 0)) return null;
  return {
    input: usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens,
    cache: usage.cache_read_input_tokens, output: usage.output_tokens,
  };
}

async function judgmentBudget(batchDirectory, completed) {
  const rows = [];
  const consolidatorDirectory = join(batchDirectory, 'privado/consolidador');
  const consolidation = await readJsonIfPresent(join(consolidatorDirectory, 'aceito.json'));
  const consolidationLaunch = await readJsonIfPresent(join(consolidatorDirectory, 'envio.json'));
  const consolidationCompletion = await readJsonIfPresent(join(consolidatorDirectory, 'concluido.json'));
  const groups = [...Object.values(completed)];
  if (consolidation || consolidationLaunch || consolidationCompletion) groups.push({ CONSOLIDADOR: { executed: true, role: 'CONSOLIDADOR', code: 'CONSOLIDACAO' } });
  for (const judgments of groups) {
    for (const judgment of Object.values(judgments)) {
      const isConsolidator = judgment.role === 'CONSOLIDADOR';
      const directory = isConsolidator ? join(batchDirectory, 'privado/consolidador') : join(batchDirectory, 'juizes/pareceres', judgment.role, judgment.code);
      if (!judgment.executed) {
        let files;
        try { files = await readdir(directory); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        if (!files.some((filename) => ['envio.json', 'concluido.json', 'aceito.json'].includes(filename))) continue;
      }
      const completion = await readJsonIfPresent(join(directory, 'concluido.json'));
      const usage = await readClaudeUsage(directory);
      rows.push({ categoria: isConsolidator ? 'consolidação' : 'julgamento', papel: judgment.role, codigo: judgment.code, inicio: completion?.started_at, fim: completion?.ended_at, tokens_entrada: usage?.input ?? null, tokens_cache: usage?.cache ?? null, tokens_saida: usage?.output ?? null, custo_brl: null, motivo_na: `${usage ? '' : 'Saída ausente ou JSON inválido; consumo do julgamento não confirmado. '}saida.json traz o custo de tabela do Claude Code; assinatura não comprova cobrança marginal.` });
    }
  }
  return rows;
}

export async function consolidateResults(batchDirectory, state, completed, options) {
  const directory = join(batchDirectory, 'consolidado');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const complete = state.executions.flatMap((execution) => detailedRows(execution, state.phase, completed[execution.execution_id]));
  const summary = state.executions.map((execution) => summaryRow(execution, state.phase, completed[execution.execution_id]));
  const stability = state.executions.flatMap((execution) => stabilityRows(execution, state.phase, completed[execution.execution_id]));
  const aggregates = aggregateRows(summary);
  const global = globalRows(summary);
  const completion = assessPipelineCompletion(state, completed);
  await archivePreviousReports(directory);
  await writeHtmlReport(batchDirectory, state, completed, summary, aggregates, {
    ...options, localOnly: options.localOnly || completion.status === 'INCOMPLETO' || completion.eligible_generations === 0, completion,
  });
  const budget = await judgmentBudget(batchDirectory, completed);
  const files = [
    ['status-fluxo.json', `${JSON.stringify(completion, null, 2)}\n`],
    ['resultados-completos.csv', renderCsv(completeColumns, complete)],
    ['resultados-resumo.csv', renderCsv(summaryColumns, summary)],
    ['estabilidade.csv', renderCsv(stabilityColumns, stability)],
    ['agregados.csv', renderCsv(Object.keys(aggregates[0] ?? {}), aggregates)],
    ['global-por-rodada.csv', renderCsv(['sistema_id', 'rodada', 'elegivel', 'P_global', 'motivo'], global)],
    ['orcamento-julgamentos.csv', renderCsv(['categoria', 'papel', 'codigo', 'inicio', 'fim', 'tokens_entrada', 'tokens_cache', 'tokens_saida', 'custo_brl', 'motivo_na'], budget)],
  ];
  for (const [filename, content] of files) await replaceDerivedFile(join(directory, filename), content);
  const knownCosts = state.executions.map((execution) => execution.record?.cost_brl ?? null);
  const partialCost = knownCosts.reduce((sum, value) => sum + (value ?? 0), 0);
  const costComplete = knownCosts.every((value) => value !== null) && state.executions.every((execution) => !execution.record?.issues.includes('BYOK_CUSTO_EXTERNO_NAO_INCLUIDO'));
  const approved = summary.filter((row) => row.situacao_JC1 === 'APTO').length;
  const costPerApproved = !costComplete ? 'N/A - custo incompleto' : approved === 0 ? 'indefinido - nenhum APTO' : String(partialCost / approved);
  const pending = Object.values(completed).flatMap(Object.values).filter((judgment) => judgment.status === 'PENDENTE').length;
  const report = [
    '# Consolidação do lote', '',
    `Situação do processo automático: ${completion.status}; ${completion.eligible_generations} respostas completas; ${completion.discarded_generations} respostas descartadas; ${completion.discarded_judgments} avaliações descartadas, incluindo etapas não iniciadas.`,
    completion.limitation, '',
    ...completion.issues.map((issue) => `- ${issue.system_id}/${issue.topic}/${issue.stage}: ${issue.reason}`), '',
    ...completion.discards.map((discard) => `- DESCARTADO ${discard.system_id}/${discard.topic}/${discard.stage}: ${discard.reason}`), '',
    ...completion.missing_measurements.map((measure) => `- N/A ${measure.system_id}/${measure.topic}/${measure.stage}: ${measure.reason}`), '',
    `Protocolo 3.2; fase ${state.phase}; ${summary.length} execuções planejadas preservadas.`,
    'Consolidação programática v1; os pareceres são do Claude e permanecem provisórios até revisão humana.',
    `${budget.filter((row) => row.categoria === 'julgamento').length} chamadas de julgamento e ${budget.filter((row) => row.categoria === 'consolidação').length} consolidação(ões) registradas; ${pending} pendências administrativas ou de avaliação.`,
    `${approved} APTO primários; custo conhecido de geração: ${knownCosts.some((value) => value !== null) ? `R$ ${partialCost}` : 'N/A - nenhuma cobrança confirmada'}; cobertura ${knownCosts.filter((value) => value !== null).length}/${knownCosts.length}.`,
    `Custo por APTO primário: ${costPerApproved}. Inclui todas as gerações do lote, inclusive falhas.`,
    'Julgamentos: orçamento separado em orcamento-julgamentos.csv; custo monetário não observado. Pesquisa e pairwise não realizados por este comando.', '',
    '| Execução | Sistema | Tema | Rodada | JC1 | JP1 | P | T1 | T2 | E1 | E2 | E3 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...summary.map((row) => `| ${row.execucao_id} | ${row.sistema_id} | ${row.tema} | ${row.rodada} | ${row.situacao_JC1} | ${row.situacao_JP1} | ${row.P ?? 'N/A'} | ${row.T1 ?? 'N/A'} | ${row.T2 ?? 'N/A'} | ${row.E1 ?? 'N/A'} | ${row.E2 ?? 'N/A'} | ${row.E3 ?? 'N/A'} |`), '',
    'As tabelas completas preservam os itens e motivos de N/A; agregados.csv mostra a cobertura e a dispersão dos resultados elegíveis por sistema e tema.',
    `global-por-rodada.csv exige os temas do estudo (${studyTopicIds.join(' e ')}) com APTO e P completos. Um lote com um só tema não produz média global.`,
    'JC2/JP2 são estabilidade, nunca substitutos de JC1/JP1. Inventários A/V não foram alinhados semanticamente para concordância.',
    'Desacordos de JC e alertas de JP exigem revisão especializada. Não há medição de compreensão ou aprendizagem humana.',
    'A detecção de identidade é conservadora e não garante anonimato estilístico. F5 e fontes exigem revisão humana.',
    'Os juízes recebem somente material congelado, sem navegação. Notas de leitura não equivalem a acesso integral às obras.',
    'Nenhuma ausência foi convertida em zero. Os CSV usam IDs; resultados.html identifica os modelos por autorização do pesquisador.', '',
  ].join('\n');
  await replaceDerivedFile(join(directory, 'relatorio.md'), report);
  return { directory, pending, planned: summary.length, completion };
}
