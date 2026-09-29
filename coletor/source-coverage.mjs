export function sourceCoverage(messages, answerKey, topic) {
  const content = messages.filter((message) => message.role === 'user').map((message) => message.content).join('\n');
  const marker = '## Material bibliográfico fornecido';
  const sources = content.includes(marker) ? content.slice(content.indexOf(marker) + marker.length) : content;
  const pattern = new RegExp(`\\b${topic}-F\\d+\\b`, 'g');
  const suppliedIds = [...new Set(sources.match(pattern) ?? [])].sort();
  const keyIds = [...new Set(answerKey.match(pattern) ?? [])].sort();
  return {
    topic, supplied_source_ids: suppliedIds, answer_key_source_ids: keyIds,
    answer_key_sources_not_supplied: keyIds.filter((id) => !suppliedIds.includes(id)),
    reading_notes: /notas de leitura|paráfrases?/i.test(sources),
    scope: 'Somente o material incorporado pode ser lido pelo juiz; links e bibliografia não equivalem a leitura das obras completas. Fontes alternativas fornecidas podem sustentar os mesmos conceitos.',
  };
}

export function answerKeySection(document, topic) {
  const section = document.split(/(?=^## )/m).find((part) => part.startsWith(`## ${topic} -`));
  if (!section) throw new Error(`Gabarito de ${topic} não encontrado.`);
  return section;
}
