export function operationalValues(execution) {
  return {
    INICIADA: execution.record ? true : null,
    STATUS_OPERACIONAL: execution.record?.operational_status ?? 'desconhecido',
    RAMO_SAIDA: execution.record?.output_branch ?? 'desconhecido',
  };
}

export function resourceValues(execution) {
  const record = execution.record;
  const status = record?.operational_status;
  return {
    LATENCIA_TOTAL_S: status === 'conclusão normal' ? record.duration_seconds ?? null : null,
    PRIMEIRO_TEXTO_S: record?.first_text_seconds ?? null,
    TEMPO_ATE_FALHA_S: ['erro', 'timeout', 'truncamento'].includes(status) ? record.duration_seconds ?? null : null,
    TOKENS_ENTRADA: record?.prompt_tokens ?? null, TOKENS_SAIDA: record?.completion_tokens ?? null,
    TOKENS_TOTAIS: record?.total_tokens ?? null, TOKENS_CACHE: record?.cached_tokens ?? null,
    TOKENS_RACIOCINIO: record?.reasoning_tokens ?? null, CUSTO_GERACAO_BRL: record?.cost_brl ?? null,
    ORIGEM_CUSTO: record?.cost_source ?? null, METAS_VERSAO: null,
  };
}

export function recordedItems(execution, role) {
  if (!execution.record || !['JT', 'JE'].includes(role)) return [];
  const values = role === 'JT' ? operationalValues(execution) : resourceValues(execution);
  if (role === 'JT') {
    const knownStatus = ['conclusão normal', 'erro', 'timeout', 'truncamento'].includes(values.STATUS_OPERACIONAL);
    values.T1 = !knownStatus || execution.content === null ? null : values.STATUS_OPERACIONAL === 'conclusão normal' && execution.content.trim() ? 100 : 0;
  }
  return Object.entries(values).map(([id, value]) => ({
    id, score: id === 'T1' ? value : null, value: id === 'T1' ? null : value,
    unit: id.endsWith('_S') ? 's' : id.startsWith('TOKENS_') ? 'tokens' : id === 'CUSTO_GERACAO_BRL' ? 'BRL' : '',
    numerator: null, denominator: null,
    evidence: `Registro instrumentado: comprovantes/${execution.execution_id}/metricas.json${id === 'T1' ? ' e resposta.md; regra T1 do protocolo 3.2' : ''}.`,
    reason_na: value === null ? 'Medida indisponível no registro; nenhuma inferência substitui o dado.' : id === 'T1' ? '' : 'Medida bruta; não recebe nota.',
    verification_method: id === 'T1' ? 'PROGRAMÁTICO' : 'REGISTRO DO COLETOR',
  }));
}
