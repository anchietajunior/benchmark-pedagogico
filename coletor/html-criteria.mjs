export function answerKeySummary(answerKey) {
  const lines = answerKey.split('\n');
  const title = lines[0].replace(/^## /, '').trim();
  const points = lines.filter((line) => /^\d+\. /.test(line)).map((line) => line.replace(/^\d+\. /, '').trim());
  const alertPrefix = 'Alertas de erro central:';
  const alerts = lines.find((line) => line.startsWith(alertPrefix))?.slice(alertPrefix.length).trim() ?? null;
  return { title, points, alerts };
}

function topicsJudged(executions) {
  const answerKeysByTopic = new Map();
  for (const execution of executions) {
    if (execution.answer_key && !answerKeysByTopic.has(execution.topic)) answerKeysByTopic.set(execution.topic, execution.answer_key);
  }
  return [...answerKeysByTopic.values()].map(answerKeySummary);
}

function pedagogicalAudience(protocol) {
  const audienceLine = protocol?.split('\n').find((line) => line.startsWith('Público: '));
  return audienceLine ? audienceLine.slice('Público: '.length).trim() : 'graduando de Biomedicina ainda sem domínio do mecanismo pedido.';
}

function introduction(judgeConfig) {
  const judge = judgeConfig ? ` do Claude (${judgeConfig.model}, esforço ${judgeConfig.reasoning_effort})` : ' do Claude';
  return [
    `Cada explicação passou por quatro juízes independentes, em chamadas isoladas${judge}, sem ferramentas nem navegação.`,
    'Os juízes recebem códigos anônimos no lugar do nome do modelo; a identificação aparece somente nesta página.',
    'Cada juiz recebe apenas o material do seu papel e aplica o protocolo de pontuação 3.2.',
  ];
}

function scientificSection(topics) {
  return {
    heading: 'Científico - juiz JC',
    paragraphs: [
      'Confere a explicação contra os trechos bibliográficos entregues ao modelo e contra o gabarito do tema; o conhecimento próprio do juiz não conta como evidência.',
      'Duas passagens independentes: JC1 decide o resultado e JC2 mede a estabilidade do julgamento.',
    ],
    lists: [
      ...topics.map((topic) => ({
        title: `Seis pontos obrigatórios (K1 a K6) - ${topic.title}`, ordered: true, items: topic.points,
        note: topic.alerts ? `Erros centrais que o juiz procura: ${topic.alerts}` : null,
      })),
      { title: 'Como pontua', items: [
        'K1 a K6: 100 quando o ponto está presente, correto e suficiente; 50 quando falta uma relação essencial; 0 quando está ausente ou errado. C1 é a média dos seis.',
        'C2 - sustentação factual: cada afirmação do texto é classificada como sustentada, contradita ou não verificável pelos trechos fornecidos; C2 é a porcentagem de sustentadas e só é calculado quando todas foram decididas.',
        'C3 - vínculos bibliográficos: cada citação feita pelo modelo é conferida contra a fonte indicada.',
        'Decisão: APTO exige os seis pontos com 100, nenhuma afirmação contradita, citações conferidas e nenhum impedimento; erro confirmado ou omissão essencial leva a CORRIGIR. Só respostas APTO seguem para a avaliação acadêmica.',
      ] },
    ],
  };
}

function academicSection(audience) {
  return {
    heading: 'Acadêmico - juiz JP',
    paragraphs: [
      `Avalia se a explicação ensina o público definido no protocolo: ${audience}`,
      'Recebe somente respostas APTO, sem as notas científicas. Dez subcritérios recebem 0, 50 ou 100; cada métrica é a média dos seus dois subcritérios, e o índice P é a média das cinco métricas.',
      'JP1 fornece a nota; JP2 mede a estabilidade do julgamento.',
    ],
    lists: [{ title: 'Métricas e subcritérios', items: [
      'M1 Clareza linguística: termos técnicos e siglas explicados no primeiro uso (M1.1); frases com sujeitos e referentes identificáveis, sem ambiguidade relevante (M1.2).',
      'M2 Organização e progressão: componentes apresentados antes das relações que dependem deles (M2.1); síntese final que integra as ideias sem introduzir pré-requisito novo (M2.2).',
      'M3 Foco e economia cognitiva: cada trecho contribui para o recorte pedido (M3.1); sem repetições sem função (M3.2).',
      'M4 Explicação causal: explica por que as etapas se conectam e produzem o resultado (M4.1); condições, regulação ou limites pertinentes ligados à conclusão (M4.2).',
      'M5 Concretização e aplicação: uma situação concreta e pertinente ao pedido (M5.1); elementos e resultado do exemplo explicados pelos conceitos apresentados (M5.2).',
    ] }],
  };
}

function technologicalSection() {
  return {
    heading: 'Tecnológico - juiz JT',
    paragraphs: [
      'Verifica requisitos objetivos da saída, sem avaliar ciência ou didática. Cada requisito vale 100 quando atendido e 0 quando descumprido.',
      'A coluna Tecnológico mostra a média de F1 a F4.',
    ],
    lists: [{ title: 'Requisitos', items: [
      'T1 - conclusão técnica: saída não vazia, término normal e nenhum erro ou truncamento.',
      'F1 - a primeira linha é um título Markdown iniciado por "# ".',
      'F2 - o corpo didático tem de 800 a 1.200 palavras.',
      'F3 - as oito seções pedidas aparecem uma vez e na ordem, com duas confusões a evitar, duas perguntas com resposta comentada e síntese de três itens.',
      'F4 - a seção final "Fontes consultadas" traz um identificador autorizado do tema, título e localização da consulta.',
      'F5 - não há declaração de autoria do modelo nem imagem incorporada; exige revisão humana e ainda não entra na nota.',
    ] }],
  };
}

function formatExchangeRate(exchangeRate) {
  const rate = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 }).format(exchangeRate.rate);
  const date = new Date(`${exchangeRate.date}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  return `${rate} por dólar, cotação de ${date}`;
}

function costSection(exchangeRate) {
  const conversion = exchangeRate ? `convertido para reais a ${formatExchangeRate(exchangeRate)}` : 'convertido para reais pelo câmbio registrado no lote';
  return {
    heading: 'Custos - juiz JE e registros do coletor',
    paragraphs: [
      `A coluna mostra o custo de geração de cada explicação cobrado pelo OpenRouter em dólares, ${conversion}.`,
      'Tempo total, tempo até o primeiro texto e tokens de entrada e saída também são registrados, sem virar nota.',
      'As notas E1 a E3 exigem metas de tempo e custo fixadas antes da coleta; este lote não as definiu, por isso ficam N/A e a página mostra o valor medido.',
      'O custo dos julgamentos feitos pelo Claude não entra nesse valor.',
    ],
    lists: [],
  };
}

export function judgingCriteria(state, exchangeRate) {
  return {
    introduction: introduction(state.config),
    sections: [
      scientificSection(topicsJudged(state.executions)),
      academicSection(pedagogicalAudience(state.protocol)),
      technologicalSection(),
      costSection(exchangeRate),
    ],
  };
}
