export function executionDiscardReason(execution) {
  const record = execution.record;
  if (!record) return 'Registro final ausente; resposta completa não comprovada.';
  if (record.operational_status !== 'conclusão normal') {
    const providerReason = record.provider_error ? ` ${record.provider_error.code ?? ''}: ${record.provider_error.message}` : '';
    const reasoningOnly = !execution.content?.trim() && record.completion_tokens > 0 && record.reasoning_tokens === record.completion_tokens;
    const reasoningReason = reasoningOnly ? ` Os ${record.completion_tokens} tokens de saída foram consumidos pelo raciocínio, sem texto.` : '';
    return `Resposta não concluída: ${record.operational_status}.${providerReason}${reasoningReason}`;
  }
  if (!execution.content?.trim()) return 'Resposta vazia; não há explicação completa para julgar.';
  if (record.output_branch && record.output_branch !== 'explicação') return `Sem explicação completa: ramo ${record.output_branch}.`;
  return execution.identity_concern ?? null;
}

export function discardUnfinishedJudgment(judgment) {
  if (['BLOQUEADO', 'DESCARTADO'].includes(judgment.status)) return judgment;
  const finalStatuses = judgment.role.startsWith('JC') ? ['APTO', 'CORRIGIR'] : ['CONCLUÍDO'];
  if (judgment.result && finalStatuses.includes(judgment.result.status)) return judgment;
  const reasons = judgment.reason || judgment.result?.blockers?.join('; ') || judgment.result?.report || 'Sem parecer completo e validado.';
  return { ...judgment, status: 'DESCARTADO', original_status: judgment.status, result: null, partial_items: [], reason: reasons };
}

export function assessPipelineCompletion(state, completed) {
  const discards = [];
  const missingMeasurements = [];
  const issues = [];
  let discardedGenerations = 0;
  for (const execution of state.executions) {
    const judgments = completed[execution.execution_id] ?? {};
    const identity = { execution_id: execution.execution_id, system_id: execution.system_id, topic: execution.topic };
    const generationReason = executionDiscardReason(execution);
    if (generationReason) {
      discardedGenerations += 1;
      discards.push({ ...identity, stage: 'COLETA', reason: generationReason });
    }
    if (execution.record?.telemetry_status !== 'COMPLETA') missingMeasurements.push({ ...identity, stage: 'TELEMETRIA', reason: 'Medição incompleta; custos ou outros valores ausentes ficam N/A e são excluídos das respectivas comparações.' });
    for (const role of ['JC1', 'JC2', 'JP1', 'JP2', 'JT', 'JE']) {
      const judgment = judgments[role];
      if (!judgment) issues.push({ ...identity, stage: role, reason: 'Etapa ainda não processada.' });
      else if (judgment.status === 'DESCARTADO' && !generationReason) discards.push({ ...identity, stage: role, reason: judgment.reason });
      else if (!['DESCARTADO', 'BLOQUEADO'].includes(judgment.status)) {
        const finalStatuses = role.startsWith('JC') ? ['APTO', 'CORRIGIR'] : ['CONCLUÍDO'];
        if (!judgment.result || !finalStatuses.includes(judgment.result.status)) issues.push({ ...identity, stage: role, reason: 'Parecer sem decisão final nem descarte registrado.' });
      }
    }
  }
  return {
    discard_policy_version: 'completed-only-v1',
    status: issues.length ? 'INCOMPLETO' : discards.length ? 'CONCLUÍDO_COM_DESCARTES' : 'CONCLUÍDO',
    planned: state.executions.length,
    eligible_generations: state.executions.length - discardedGenerations,
    discarded_generations: discardedGenerations,
    discarded_judgments: Object.values(completed).flatMap(Object.values).filter((judgment) => judgment.status === 'DESCARTADO').length,
    discards, missing_measurements: missingMeasurements, issues,
    limitation: 'Somente respostas completas e pareceres finais validados participam das notas. CORRIGIR é uma decisão científica final e mantém pedagogia bloqueada. Descartes e medidas ausentes ficam N/A nos registros; o ranking HTML apresenta modelos sem avaliação pedagógica completa com 0 e ERRO. Revisão humana não realizada.',
  };
}

export function shouldOpenReport(completion, values) {
  if (values['nao-abrir']) return false;
  return completion.status !== 'INCOMPLETO';
}
