export async function verifyModelEndpoints(config, fetchImpl = fetch) {
  const checks = [];
  for (const model of config.models) {
    const url = `https://openrouter.ai/api/v1/models/${model.model}/endpoints`;
    const response = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw new Error(`${model.id}: consulta pública de endpoints falhou (HTTP ${response.status}). Nenhuma geração iniciada.`);
    const catalog = await response.json();
    const endpoint = catalog.data?.endpoints?.find((candidate) => candidate.tag === model.provider);
    if (!endpoint || endpoint.model_id !== model.model) throw new Error(`${model.id}: endpoint ${model.provider} não encontrado para ${model.model}.`);
    if (endpoint.status !== 0) throw new Error(`${model.id}: endpoint ${model.provider} não está disponível no catálogo.`);
    const unsupported = Object.keys(config.parameters).filter((parameter) => !endpoint.supported_parameters?.includes(parameter));
    if (unsupported.length > 0) throw new Error(`${model.id}: parâmetros sem suporte no endpoint: ${unsupported.join(', ')}. A configuração não será alterada automaticamente.`);
    if (endpoint.max_completion_tokens && config.parameters.max_tokens > endpoint.max_completion_tokens) throw new Error(`${model.id}: max_tokens excede o limite do endpoint.`);
    checks.push({ system_id: model.id, model: model.model, provider: model.provider, provider_name: endpoint.provider_name, checked_at: new Date().toISOString(), url, catalog });
  }
  return checks;
}
