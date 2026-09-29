// Nota científica graduada S (protocolo 3.4). Pesos são convenção operacional deste estudo,
// não valores validados pela literatura; ficam publicados junto do resultado.
export const scientificDeductions = {
  K0: 40,                 // ponto obrigatório ausente ou errado
  K50: 15,                // ponto obrigatório sem uma relação essencial
  CONTRADITA: 10,         // afirmação contradita pelas fontes fornecidas ou por fonte externa
  NAO_VERIFICAVEL: 2,     // afirmação sem apoio no material nem confirmação externa
  VINCULO_PROBLEMA: 3,    // citação atribuída a uma fonte que não diz aquilo
  VINCULO_NAO_VERIFICAVEL: 1,
};

export function scientificScore(scientificResult, externalResult = null) {
  if (!scientificResult?.items?.length) return null;
  const external = new Map((externalResult?.status === 'CONCLUÍDO' ? externalResult.items : []).map((item) => [item.id, item.value]));
  const counts = { K0: 0, K50: 0, CONTRADITA: 0, NAO_VERIFICAVEL: 0, VINCULO_PROBLEMA: 0, VINCULO_NAO_VERIFICAVEL: 0 };
  for (const item of scientificResult.items) {
    if (/^K\d$/.test(item.id)) {
      if (item.score === 0) counts.K0 += 1;
      else if (item.score === 50) counts.K50 += 1;
      else if (item.score === null) counts.NAO_VERIFICAVEL += 1;
    } else if (/^A\d+$/.test(item.id)) {
      if (item.score === 0) counts.CONTRADITA += 1;
      else if (item.score === null) {
        const decision = external.get(item.id);
        if (decision === 'CONTRADITA_EXTERNA') counts.CONTRADITA += 1;
        else if (decision !== 'CONFIRMADA_EXTERNA') counts.NAO_VERIFICAVEL += 1;
      }
    } else if (/^V\d+$/.test(item.id)) {
      if (item.score === 0) counts.VINCULO_PROBLEMA += 1;
      else if (item.score === null) counts.VINCULO_NAO_VERIFICAVEL += 1;
    }
  }
  const deducted = Object.entries(counts).reduce((sum, [key, count]) => sum + count * scientificDeductions[key], 0);
  return { score: Math.max(0, 100 - deducted), counts, deducted };
}

// S da execução: média das passagens JC1 e JC2 disponíveis, para amortecer a instabilidade de uma passagem.
export function executionScientificScore(judgments) {
  const scores = ['JC1', 'JC2'].map((role) => judgments[role]?.scientific_score?.score).filter(Number.isFinite);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}
