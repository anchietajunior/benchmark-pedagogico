import { canonicalItemId, roleFamily, validateJudgmentItem, average, checkCalculation } from './judgments.mjs';

export function recoverValidItems(result, identity) {
  if (!result || result.protocol_version !== '3.2' || ['code', 'topic', 'round', 'role'].some((field) => result[field] !== identity[field])) return [];
  if (!Array.isArray(result.items)) return [];
  const family = roleFamily(identity.role);
  const counts = new Map();
  for (const item of result.items) {
    if (typeof item?.id !== 'string') continue;
    const id = canonicalItemId(item.id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const valid = [];
  for (const item of result.items) {
    try {
      validateJudgmentItem(item, family);
      if (counts.get(canonicalItemId(item.id)) === 1 && !item.id.startsWith('SITUACAO_')) valid.push(item);
    } catch { continue; }
  }
  const invalidCalculations = new Set();
  const dependencies = {};
  if (family === 'JC') {
    dependencies.C1 = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'];
    dependencies.C2 = result.items.filter((item) => /^A\d+$/.test(item?.id)).map((item) => item.id);
    dependencies.C3 = result.items.filter((item) => /^V\d+$/.test(item?.id)).map((item) => item.id);
  }
  if (family === 'JP') {
    for (let dimension = 1; dimension <= 5; dimension += 1) dependencies[`M${dimension}`] = [`M${dimension}.1`, `M${dimension}.2`];
    dependencies.P = ['M1', 'M2', 'M3', 'M4', 'M5'];
  }
  if (family === 'JT') {
    const branch = valid.find((item) => item.id === 'RAMO_SAIDA')?.value;
    if (branch === 'explicação') dependencies.T2 = ['F1', 'F2', 'F3', 'F4', 'F5'];
    if (branch === 'PENDENTE DE FONTES') dependencies.T2 = ['FP1', 'FP2', 'FP3'];
    invalidCalculations.add('F5');
  }
  if (family === 'JE') for (const id of ['E1', 'E2', 'E3']) invalidCalculations.add(id);
  for (const [id, inputs] of Object.entries(dependencies)) {
    const aggregate = valid.find((item) => item.id === id);
    if (!aggregate) continue;
    const components = inputs.map((input) => valid.find((item) => item.id === input && !invalidCalculations.has(input)));
    if (components.some((item) => !item)) { invalidCalculations.add(id); continue; }
    try { checkCalculation(aggregate, average(components)); }
    catch { invalidCalculations.add(id); }
  }
  return valid.filter((item) => !invalidCalculations.has(item.id));
}
