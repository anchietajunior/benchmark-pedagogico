import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, isAbsolute } from 'node:path';

const TOPICS = {
  B01: 'prompts/pedidos/B01-hemostasia.md',
  B02: 'prompts/pedidos/B02-memoria-imunologica.md',
};

export const studyTopicIds = Object.keys(TOPICS);

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireKeys(value, allowed, label) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), `${label}: objeto obrigatório.`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  requireCondition(unknown.length === 0, `${label}: campos não aceitos: ${unknown.join(', ')}.`);
}

function filledText(value) {
  return typeof value === 'string' && value.trim().length > 0 && !value.includes('PREENCHER');
}

function resolveLocalPath(value, baseDirectory) {
  if (value.startsWith('~/')) return join(homedir(), value.slice(2));
  return isAbsolute(value) ? value : resolve(baseDirectory, value);
}

function validateConfig(config) {
  requireKeys(config, ['batch_name', 'output_dir', 'phase', 'rounds', 'request_timeout_seconds', 'parameters', 'usd_brl', 'models', 'topics'], 'Configuração');
  requireCondition(typeof config.batch_name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,60}$/.test(config.batch_name), 'batch_name: use letras, números, hífen ou sublinhado.');
  requireCondition(filledText(config.output_dir), 'output_dir: informe a pasta de destino.');
  requireCondition(['PILOTO', 'DEFINITIVA'].includes(config.phase), 'phase: use PILOTO ou DEFINITIVA.');
  requireCondition(Number.isInteger(config.rounds) && config.rounds >= 1 && config.rounds <= 100, 'rounds: inteiro de 1 a 100.');
  requireCondition(Number.isInteger(config.request_timeout_seconds) && config.request_timeout_seconds >= 1 && config.request_timeout_seconds <= 1800, 'request_timeout_seconds: inteiro entre 1 e 1800.');
  requireKeys(config.parameters, ['temperature', 'max_tokens', 'top_p', 'seed', 'reasoning'], 'parameters');
  if (config.parameters.temperature !== undefined) requireCondition(Number.isFinite(config.parameters.temperature) && config.parameters.temperature >= 0 && config.parameters.temperature <= 2, 'temperature: valor entre 0 e 2.');
  requireCondition(Number.isSafeInteger(config.parameters.max_tokens) && config.parameters.max_tokens > 0, 'max_tokens: inteiro positivo.');
  if (config.parameters.top_p !== undefined) requireCondition(Number.isFinite(config.parameters.top_p) && config.parameters.top_p > 0 && config.parameters.top_p <= 1, 'top_p: valor maior que 0 e até 1.');
  if (config.parameters.seed !== undefined) requireCondition(Number.isSafeInteger(config.parameters.seed), 'seed: inteiro obrigatório quando informado.');
  if (config.parameters.reasoning !== undefined) {
    requireKeys(config.parameters.reasoning, ['effort'], 'reasoning');
    requireCondition(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(config.parameters.reasoning.effort), 'reasoning.effort: nível inválido.');
  }
  requireKeys(config.usd_brl, ['rate', 'date', 'source'], 'usd_brl');
  requireCondition(Number.isFinite(config.usd_brl.rate) && config.usd_brl.rate > 0, 'usd_brl.rate: informe a cotação BRL por USD.');
  const exchangeDate = config.usd_brl.date;
  requireCondition(typeof exchangeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(exchangeDate) && !Number.isNaN(Date.parse(exchangeDate)) && new Date(exchangeDate).toISOString().slice(0, 10) === exchangeDate, 'usd_brl.date: informe uma data válida YYYY-MM-DD.');
  requireCondition(filledText(config.usd_brl.source), 'usd_brl.source: informe a fonte da cotação.');
  requireCondition(Array.isArray(config.models) && config.models.length > 0, 'models: cadastre pelo menos um modelo.');
  requireCondition(Array.isArray(config.topics) && config.topics.length > 0, 'topics: cadastre pelo menos um tema.');
  const systemIds = new Set();
  for (const model of config.models) {
    requireKeys(model, ['id', 'model', 'provider'], 'Modelo');
    requireCondition(typeof model.id === 'string' && /^S\d{2,}$/.test(model.id) && !systemIds.has(model.id), 'Cada modelo precisa de um id único, como S01.');
    systemIds.add(model.id);
    requireCondition(filledText(model.model) && /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(model.model) && !model.model.startsWith('openrouter/'), 'model: informe o ID explícito organização/modelo, sem router, preset ou variante automática.');
    requireCondition(filledText(model.provider) && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(model.provider), 'provider: informe o slug do endpoint/provedor, não o nome de exibição.');
  }
  const topicIds = new Set();
  for (const topic of config.topics) {
    requireKeys(topic, ['id', 'source_file', 'sources_reviewed', 'pilot_sources_prepared'], 'Tema');
    requireCondition(Object.hasOwn(TOPICS, topic.id) && !topicIds.has(topic.id), `Tema inválido ou repetido: use ${studyTopicIds.join(' ou ')}.`);
    topicIds.add(topic.id);
    requireCondition(filledText(topic.source_file), `${topic.id}: informe source_file.`);
    requireCondition(typeof topic.sources_reviewed === 'boolean', `${topic.id}: sources_reviewed deve ser true ou false.`);
    if (topic.pilot_sources_prepared !== undefined) requireCondition(typeof topic.pilot_sources_prepared === 'boolean', `${topic.id}: pilot_sources_prepared deve ser true ou false.`);
    const preparedPilot = config.phase === 'PILOTO' && topic.pilot_sources_prepared === true;
    requireCondition(topic.sources_reviewed || preparedPilot, `${topic.id}: falta revisão humana dos trechos; depois da conferência, marque sources_reviewed como true.`);
  }
  requireCondition(config.models.length * config.topics.length * config.rounds <= 1000, 'O lote excede 1.000 gerações; reduza a configuração.');
}

export async function loadStudy(configPath, repositoryRoot) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  validateConfig(config);
  const baseDirectory = dirname(resolve(configPath));
  const systemPrompt = await readFile(join(repositoryRoot, 'prompts/openrouter/gerar-explicacao.md'), 'utf8');
  const materials = [];
  for (const topic of config.topics) {
    const topicPrompt = await readFile(join(repositoryRoot, TOPICS[topic.id]), 'utf8');
    const sourcePath = resolveLocalPath(topic.source_file, baseDirectory);
    const sources = await readFile(sourcePath, 'utf8');
    requireCondition(sources.trim().length > 0 && !sources.includes('PREENCHER_'), `${topic.id}: o arquivo de fontes está vazio ou ainda contém trechos-modelo.`);
    requireCondition(new RegExp(`${topic.id}-F\\d+`).test(sources), `${topic.id}: identifique as fontes com códigos como ${topic.id}-F1.`);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${topicPrompt}\n\n## Material bibliográfico fornecido\n\n${sources}` },
    ];
    materials.push({ topic: topic.id, messages, source_sha256: sha256(sources), prompt_sha256: sha256(JSON.stringify(messages)) });
  }
  return {
    config,
    outputDirectory: resolveLocalPath(config.output_dir, baseDirectory),
    materials,
    protocol: await readFile(join(repositoryRoot, 'referencias/protocolo-pontuacao.md'), 'utf8'),
  };
}

export function buildRequest(config, model, material) {
  return {
    model: model.model,
    messages: material.messages,
    ...config.parameters,
    stream: true,
    service_tier: 'default',
    provider: { only: [model.provider], order: [model.provider], allow_fallbacks: false, require_parameters: true },
    plugins: [],
    transforms: [],
  };
}

export async function initializeConfig(repositoryRoot) {
  const templates = [
    ['openrouter.config.json', await readFile(join(repositoryRoot, 'openrouter.config.example.json'), 'utf8')],
    ['.env', await readFile(join(repositoryRoot, '.env.example'), 'utf8')],
  ];
  for (const topic of Object.keys(TOPICS)) {
    templates.push([`fontes/openrouter/${topic}.md`, `# Fontes comuns - ${topic}\n\nPREENCHER_TRECHOS_AUTORIZADOS\n\n## ${topic}-F1 - Título, edição e seção/página\n\n- Origem: PREENCHER_URL_OU_OBRA\n- Data de acesso: PREENCHER_DATA\n- Escopo: trecho efetivamente consultado; não alegar leitura integral sem acesso.\n\nPREENCHER_TEXTO_DA_FONTE\n\nRepita uma seção por fonte necessária para cobrir os seis pontos do pedido.\nConfira referencias/bibliografia-por-tema.md.\nNão inclua gabaritos, notas de juízes ou respostas dos modelos.\n`]);
  }
  const results = [];
  for (const [relativePath, content] of templates) {
    const destination = join(repositoryRoot, relativePath);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    try {
      await writeFile(destination, content, { flag: 'wx', mode: 0o600 });
      results.push(`Criado: ${relativePath}`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      results.push(`Preservado: ${relativePath}`);
    }
  }
  return results;
}
