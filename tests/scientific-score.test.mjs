import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executionScientificScore, scientificDeductions, scientificScore } from '../coletor/scientific-score.mjs';

function item(id, score) {
  return { id, score };
}

function verdict({ k = [100, 100, 100, 100, 100, 100], assertions = [100], references = [100] } = {}) {
  return {
    status: 'CORRIGIR',
    items: [
      ...k.map((score, index) => item(`K${index + 1}`, score)),
      ...assertions.map((score, index) => item(`A${index + 1}`, score)),
      ...references.map((score, index) => item(`V${index + 1}`, score)),
    ],
  };
}

test('resposta sem problemas recebe S = 100', () => {
  assert.equal(scientificScore(verdict()).score, 100);
});

test('descontos por gravidade seguem a tabela publicada', () => {
  const result = scientificScore(verdict({ k: [0, 50, 100, 100, 100, 100], assertions: [0, null, 100], references: [0, null] }));
  const expected = 100 - scientificDeductions.K0 - scientificDeductions.K50 - scientificDeductions.CONTRADITA
    - scientificDeductions.NAO_VERIFICAVEL - scientificDeductions.VINCULO_PROBLEMA - scientificDeductions.VINCULO_NAO_VERIFICAVEL;
  assert.equal(result.score, expected);
  assert.deepEqual(result.counts, { K0: 1, K50: 1, CONTRADITA: 1, NAO_VERIFICAVEL: 1, VINCULO_PROBLEMA: 1, VINCULO_NAO_VERIFICAVEL: 1 });
});

test('um vínculo mal atribuído desconta pouco em vez de zerar a resposta', () => {
  assert.equal(scientificScore(verdict({ assertions: Array(44).fill(100), references: [0] })).score, 100 - scientificDeductions.VINCULO_PROBLEMA);
});

test('JX confirma, contradiz ou mantém afirmações não verificáveis', () => {
  const pending = verdict({ assertions: [100, null, null, null] });
  const external = { status: 'CONCLUÍDO', items: [{ id: 'A2', value: 'CONFIRMADA_EXTERNA' }, { id: 'A3', value: 'CONTRADITA_EXTERNA' }, { id: 'A4', value: 'SEM_EVIDÊNCIA' }] };
  const result = scientificScore(pending, external);
  assert.deepEqual([result.counts.CONTRADITA, result.counts.NAO_VERIFICAVEL], [1, 1]);
  assert.equal(result.score, 100 - scientificDeductions.CONTRADITA - scientificDeductions.NAO_VERIFICAVEL);
  const unfinished = scientificScore(pending, { ...external, status: 'PENDENTE' });
  assert.equal(unfinished.counts.NAO_VERIFICAVEL, 3);
});

test('S nunca fica negativo e a execução usa a média das passagens disponíveis', () => {
  assert.equal(scientificScore(verdict({ k: [0, 0, 0, 100, 100, 100] })).score, 0);
  assert.equal(executionScientificScore({ JC1: { scientific_score: { score: 60 } }, JC2: { scientific_score: { score: 100 } } }), 80);
  assert.equal(executionScientificScore({ JC1: { scientific_score: null }, JC2: { scientific_score: { score: 90 } } }), 90);
  assert.equal(executionScientificScore({ JC1: {}, JC2: {} }), null);
  assert.equal(scientificScore(null), null);
});
