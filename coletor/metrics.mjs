function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function nonnegativeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function nonemptyText(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function measureRecord(execution, transport, metadata, exchangeRate) {
  const usage = transport.usage;
  const promptTokens = tokenCount(usage?.prompt_tokens) ?? tokenCount(metadata?.native_tokens_prompt);
  const completionTokens = tokenCount(usage?.completion_tokens) ?? tokenCount(metadata?.native_tokens_completion);
  const summedTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  const totalTokens = tokenCount(usage?.total_tokens) ?? summedTokens;
  const issues = [...transport.issues];
  if (summedTokens !== null && totalTokens !== summedTokens) issues.push('TOKENS_INCONSISTENTES');
  for (const [usageField, metadataField] of [['prompt_tokens', 'native_tokens_prompt'], ['completion_tokens', 'native_tokens_completion']]) {
    if (tokenCount(usage?.[usageField]) !== null && tokenCount(metadata?.[metadataField]) !== null && usage[usageField] !== metadata[metadataField]) issues.push('USAGE_DIVERGE_DA_GERACAO');
  }
  const costUsd = nonnegativeNumber(metadata?.total_cost);
  const servedModel = nonemptyText(transport.model) ?? nonemptyText(metadata?.model);
  const servedProvider = nonemptyText(transport.provider) ?? nonemptyText(metadata?.provider_name);
  if (servedModel && servedModel !== execution.model) issues.push('MODELO_RETORNADO_DIFERENTE');
  if (transport.model && metadata?.model && transport.model !== metadata.model) issues.push('MODELO_DIVERGE_DA_GERACAO');
  if (metadata?.provider_name && execution.expected_provider_name && metadata.provider_name !== execution.expected_provider_name) issues.push('PROVEDOR_RETORNADO_DIFERENTE');
  if (metadata?.is_byok === true || usage?.is_byok === true) issues.push('BYOK_CUSTO_EXTERNO_NAO_INCLUIDO');
  if (metadata?.preset_id || metadata?.router) issues.push('CONFIGURACAO_REMOTA_INESPERADA');
  if (metadata?.num_search_results > 0 || usage?.server_tool_use?.web_search_requests > 0) issues.push('FERRAMENTA_REMOTA_INESPERADA');
  if (['flex', 'priority'].includes(metadata?.service_tier)) issues.push('NIVEL_DE_SERVICO_INESPERADO');
  const duration = nonnegativeNumber(transport.duration_seconds);
  const firstText = nonnegativeNumber(transport.first_text_seconds);
  const complete = duration !== null && promptTokens !== null && completionTokens !== null && totalTokens !== null && costUsd !== null && Boolean(transport.generation_id) && Boolean(servedModel) && Boolean(servedProvider);
  const accountingIssues = ['TOKENS_INCONSISTENTES', 'USAGE_DIVERGE_DA_GERACAO', 'BYOK_CUSTO_EXTERNO_NAO_INCLUIDO'];
  const completeAndConsistent = complete && !issues.some((issue) => accountingIssues.includes(issue));
  let outputBranch = 'explicação';
  if (!transport.content) outputBranch = transport.done ? 'texto vazio' : 'sem saída';
  else if (transport.content.trimStart().startsWith('PENDENTE DE FONTES')) outputBranch = 'PENDENTE DE FONTES';
  if (transport.refusal || transport.finish_reason === 'content_filter') outputBranch = 'recusa';
  return {
    ...execution,
    started_at: transport.started_at,
    ended_at: transport.ended_at,
    operational_status: transport.operational_status,
    http_status: transport.http_status,
    output_branch: outputBranch,
    duration_seconds: duration,
    first_text_seconds: firstText,
    first_text_unavailable_reason: firstText === null ? 'Nenhum delta de texto observado ou medição interrompida.' : null,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cached_tokens: tokenCount(usage?.prompt_tokens_details?.cached_tokens) ?? tokenCount(metadata?.native_tokens_cached),
    cache_write_tokens: tokenCount(usage?.prompt_tokens_details?.cache_write_tokens),
    reasoning_tokens: tokenCount(usage?.completion_tokens_details?.reasoning_tokens) ?? tokenCount(metadata?.native_tokens_reasoning),
    cost_credits_reported: nonnegativeNumber(usage?.cost),
    cost_usd: costUsd,
    cost_brl: costUsd === null ? null : costUsd * exchangeRate.rate,
    exchange_rate: exchangeRate,
    cost_source: costUsd === null ? null : '/generation.data.total_cost (USD)',
    token_source: usage ? 'usage; campos faltantes complementados por native_tokens_* quando disponíveis' : '/generation.data.native_tokens_*',
    generation_id: transport.generation_id,
    served_model: servedModel,
    served_provider: servedProvider,
    metadata_provider: metadata?.provider_name ?? null,
    service_tier: metadata?.service_tier ?? null,
    response_cache: transport.response_headers['x-openrouter-cache-status'] ?? 'NÃO INFORMADO',
    finish_reason: transport.finish_reason,
    native_finish_reason: transport.native_finish_reason,
    provider_generation_ms: nonnegativeNumber(metadata?.generation_time),
    provider_latency_ms: nonnegativeNumber(metadata?.latency),
    telemetry_status: completeAndConsistent ? 'COMPLETA' : 'PENDENTE',
    ready_for_comparison: completeAndConsistent && transport.operational_status === 'conclusão normal' && issues.length === 0,
    issues: [...new Set(issues)],
  };
}

const CSV_COLUMNS = [
  'execution_id', 'system_id', 'topic', 'round', 'order', 'model', 'provider',
  'served_model', 'served_provider', 'generation_id', 'operational_status', 'output_branch',
  'telemetry_status', 'ready_for_comparison', 'duration_seconds', 'first_text_seconds',
  'prompt_tokens', 'completion_tokens', 'total_tokens', 'cached_tokens', 'cache_write_tokens',
  'reasoning_tokens', 'cost_credits_reported', 'cost_usd', 'cost_brl', 'cost_source',
  'response_cache', 'service_tier', 'finish_reason', 'issues',
];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = Array.isArray(value) ? value.join('; ') : String(value);
  if (/^[=+@\-\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function recordsCsv(records) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of records) lines.push(CSV_COLUMNS.map((column) => csvCell(record[column])).join(','));
  return `${lines.join('\n')}\n`;
}
