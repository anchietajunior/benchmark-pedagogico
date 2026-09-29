import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { recordsCsv } from './metrics.mjs';

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

export async function replaceDerivedFile(path, content) {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, content, { flag: 'wx', mode: 0o600 });
  await rename(temporaryPath, path);
}

function renderManifest(batch) {
  const config = batch.config;
  const lines = [
    '# Lote OpenRouter - privado', '',
    '- versao_protocolo: 3.2',
    '- condicao_experimental: openrouter-v1',
    '- modo_entrega_planejado: api-openrouter-v1',
    '- formato_coleta: registro-unico-v1 + comprovantes JSON/SSE',
    `- fase: ${config.phase}`,
    `- criado_em: ${batch.created_at}`,
    '- agente: coletor-isolado 0.1.0; uma chamada por execução; sem ferramentas ou memória',
    '- ordem: sorteada por rodada antes da primeira chamada; plano abaixo preservado',
    '- timeout_e_reenvios: timeout configurado por chamada; nenhum reenvio automático de geração',
    '- fontes: textos congelados em privado/pedidos/; sources_reviewed é declaração humana, não validação científica automática',
    ...config.topics.map((topic) => `- ${topic.id}: ${topic.sources_reviewed ? 'revisão humana declarada' : 'preparação por IA; revisão humana PENDENTE - somente piloto'}`),
    '- metas_E1_E2_E3: N/A - não definidas por este coletor',
    `- cambio: ${config.usd_brl.rate} BRL/USD; ${config.usd_brl.date}; ${config.usd_brl.source}`,
    '- duracao: envio HTTP até término ou falha do stream, incluindo instrumentação de recebimento; sem consultas posteriores de accounting',
    '- primeiro_texto: primeiro delta de conteúdo, excluindo raciocínio, comentários SSE e cabeçalhos',
    '- configuracoes_ocultas: NÃO OBSERVÁVEL no provedor; ausência local de skills não elimina processamento interno do serviço',
    '', '## Sistemas', '',
    '| ID | Modelo solicitado | Provedor/endpoint solicitado |',
    '| --- | --- | --- |',
    ...config.models.map((model) => `| ${model.id} | ${model.model} | ${model.provider} |`),
    '', 'Parâmetros, limites e configuração completos: privado/configuracao.json.',
    'Prompts e fontes efetivamente enviados: comprovantes/ID/pedido.json.',
    'Cópia do código executado: privado/coletor/.',
    '', '## Execuções previstas - nesta ordem', '',
    '| Execução planejada | Sistema | Tema | Rodada | Arquivo coletado |',
    '| --- | --- | --- | --- | --- |',
    ...batch.executions.map((execution) => `| ${execution.execution_id} | ${execution.system_id} | ${execution.topic} | R${String(execution.round).padStart(2, '0')} | ${execution.execution_id}.md |`),
    '', 'O vínculo acima é reservado antes das chamadas; arquivo ausente não prova que a execução começou.',
    'metricas.csv inclui somente tentativas registradas e nunca substitui o plano ou os comprovantes.',
    'PENDENTE de telemetria não significa custo zero e não autoriza remover a tentativa da análise de falhas.',
    'COMPLETA se refere à telemetria, não à qualidade da explicação ou ao APTO científico.',
    '', '## Avaliadores - preencher antes do julgamento', '',
    '- JC_configuracao: NÃO INFORMADO', '- JP_configuracao: NÃO INFORMADO',
    '- JT_metodo: NÃO INFORMADO - o coletor fornece evidências, não atribui T1/T2',
    '- JE_metodo: aritmética do coletor para valores brutos; metas e notas E ainda não definidas',
    '- passagens: JC1 e JP1 primárias; JC2 e JP2 para estabilidade',
    '- revisao_humana: PENDENTE', '',
  ];
  return lines.join('\n');
}

function measured(value) {
  return value === null || value === undefined ? 'N/A - indisponível no registro' : String(value);
}

export function renderEntry(record, content, phase) {
  return [
    '# Registro privado de execução', '',
    '- versao_protocolo: 3.2', '- condicao_experimental: openrouter-v1',
    '- modo_entrega: api-openrouter-v1',
    `- execucao_id: ${record.execution_id}`, '- origem_id: gerador criptográfico do coletor',
    `- tema: ${record.topic}`, `- sistema_id: ${record.system_id}`, `- rodada: R${String(record.round).padStart(2, '0')}`,
    `- fase: ${phase}`, '- agente: coletor-isolado 0.1.0',
    `- modelo_solicitado: ${record.model}`, `- provedor_solicitado: ${record.provider}`,
    `- modelo_retornado: ${measured(record.served_model)}`, `- provedor_retornado: ${measured(record.served_provider)}`,
    `- generation_id: ${measured(record.generation_id)}`,
    `- data_hora_fuso: ${record.started_at} (UTC)`, `- termino: ${measured(record.ended_at)}`,
    '- iniciada: sim', `- status_operacional: ${record.operational_status}`, `- ramo_saida: ${record.output_branch}`,
    `- duracao_s: ${measured(record.duration_seconds)}; cronômetro monotônico, envio ao fim/falha do stream`,
    `- primeiro_texto_s: ${measured(record.first_text_seconds)}; primeiro delta de conteúdo`,
    `- tokens: entrada=${measured(record.prompt_tokens)}; saída=${measured(record.completion_tokens)}; total=${measured(record.total_tokens)}; cache=${measured(record.cached_tokens)}; raciocínio=${measured(record.reasoning_tokens)}`,
    '- regra_tokens: cache e raciocínio são detalhamentos; não são somados novamente ao total',
    `- custo: USD ${measured(record.cost_usd)}; BRL ${measured(record.cost_brl)}; origem=${measured(record.cost_source)}`,
    `- cambio: ${record.exchange_rate.rate} BRL/USD; data=${record.exchange_rate.date}; fonte=${record.exchange_rate.source}`,
    `- telemetria: ${record.telemetry_status}`,
    `- cobertura_uso_custo: ${record.telemetry_status === 'COMPLETA' ? 'chamada única, conforme registros do serviço' : 'incompleta ou inconsistente - não usar como total comprovado'}`,
    `- comprovantes: comprovantes/${record.execution_id}/; conciliações posteriores acrescentam evidências sem alterar este original`,
    `- pedido_e_anexos: comprovantes/${record.execution_id}/pedido.json; SHA-256 mensagens=${record.prompt_sha256}; fontes=${record.source_sha256}`,
    `- ocorrencias: ${record.issues.join('; ') || 'nenhuma identificada'}`,
    '', '## RESPOSTA ORIGINAL - TUDO ABAIXO É A SAÍDA DO GERADOR', content,
  ].join('\n');
}

export async function saveSummary(batchDirectory, records, plannedCount) {
  await replaceDerivedFile(join(batchDirectory, 'metricas.csv'), recordsCsv(records));
  const complete = records.filter((record) => record.telemetry_status === 'COMPLETA').length;
  const missingCosts = records.filter((record) => record.cost_usd === null).length;
  const costBrl = records.reduce((total, record) => total + (record.cost_brl ?? 0), 0);
  const summary = [
    '# Resultado da coleta', '',
    `- Execuções planejadas: ${plannedCount}.`,
    `- Tentativas registradas: ${records.length}.`,
    `- Linhas sem registro final: ${plannedCount - records.length}; confira o planejamento e os comprovantes, sem presumir falha ou ausência de início.`,
    `- Telemetria completa: ${complete}.`,
    `- Telemetria pendente: ${records.length - complete}.`,
    `- Custo conhecido: R$ ${costBrl.toFixed(6)}${missingCosts ? `; SOMA PARCIAL, ${missingCosts} tentativa(s) sem custo confirmado` : '; soma das chamadas com cobrança reportada'}.`,
    '', 'Abra metricas.csv para a tabela e entrada/ para as explicações com cabeçalho privado.',
    'Não envie esses arquivos identificados diretamente aos juízes científicos ou pedagógicos.',
    'Use PREPARAR-JULGAMENTO.md na sessão organizadora.',
    'Não há notas automáticas de ciência ou pedagogia, nem aprovação científica implícita.',
    '', 'Para consultar novamente os dados faltantes, sem outra geração:', '',
    '```sh', `npm run recuperar -- '${batchDirectory.replaceAll("'", "'\\''")}'`, '```', '',
    'As primeiras respostas e os registros de entrada não são substituídos por conciliações.',
    'Os arquivos metricas.csv e comprovantes/ID/metricas.json são visões derivadas atualizáveis.', '',
  ].join('\n');
  await replaceDerivedFile(join(batchDirectory, 'RESUMO.md'), summary);
}

export async function archiveBatch(batchDirectory, batch, study) {
  for (const directory of ['entrada', 'comprovantes', 'privado/pedidos', 'privado/coletor']) {
    await mkdir(join(batchDirectory, directory), { recursive: true, mode: 0o700 });
  }
  await writeJson(join(batchDirectory, 'batch.json'), batch);
  await writeJson(join(batchDirectory, 'privado/configuracao.json'), study.config);
  await writeFile(join(batchDirectory, 'lote.md'), renderManifest(batch), { flag: 'wx', mode: 0o600 });
  await writeFile(join(batchDirectory, 'privado/protocolo.md'), study.protocol, { flag: 'wx', mode: 0o600 });
  for (const material of study.materials) await writeJson(join(batchDirectory, 'privado/pedidos', `${material.topic}.json`), material);
  for (const filename of ['cli.mjs', 'config.mjs', 'openrouter.mjs', 'metrics.mjs', 'artifacts.mjs', 'collector.mjs', 'catalog.mjs', 'pipeline-cli.mjs', 'pipeline-options.mjs', 'pipeline-completion.mjs', 'pipeline.mjs', 'herdr.mjs', 'codex-worker.mjs', 'judgments.mjs', 'judgment-recovery.mjs', 'record-results.mjs', 'source-coverage.mjs', 'report-output.mjs', 'consolidation.mjs', 'html-report.mjs', 'output-lock.mjs']) {
    const code = await readFile(join(import.meta.dirname, filename), 'utf8');
    await writeFile(join(batchDirectory, 'privado/coletor', filename), code, { flag: 'wx', mode: 0o600 });
  }
  const organizerPrompt = await readFile(new URL('../prompts/preparar-julgamento.md', import.meta.url), 'utf8');
  const instructions = `Diretório de coleta deste lote: ${batchDirectory}\nCondição: openrouter-v1; use os pedidos efetivos arquivados, não os prompts manuais.\n\n${organizerPrompt}`;
  await writeFile(join(batchDirectory, 'PREPARAR-JULGAMENTO.md'), instructions, { flag: 'wx', mode: 0o600 });
}
