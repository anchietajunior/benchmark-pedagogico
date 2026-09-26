# Telemetria de Claude Code e OpenCode - pesquisa para o benchmark

Consulta em 2026-09-26, somente em documentação e código oficiais abertos durante a pesquisa.
Versões locais informadas pela main: Claude Code 2.1.283 e OpenCode 1.18.30.
Esta nota propõe um collector externo; não implementa CLI, não apresenta medições e não certifica a coleta existente.
Não foram executados modelos, usadas credenciais ou lidas sessões privadas nesta pesquisa.
As páginas do Claude são atuais e mutáveis; as conclusões de implementação do OpenCode usam a tag [v1.18.30](https://github.com/anomalyco/opencode/releases/tag/v1.18.30), não a documentação v2.

## Claude Code

- Headless: `claude -p "<pedido>" --output-format json`; para eventos, `--output-format stream-json --verbose`, acrescentando `--include-partial-messages` para deltas da API. [Headless](https://code.claude.com/docs/en/headless).
- O `result` final expõe `duration_ms`, `duration_api_ms`, `num_turns`, `session_id`, `is_error`, `subtype`, `usage` e `total_cost_usd`; o SDK também modela o detalhamento por modelo, chamado `modelUsage` no JSON e `model_usage` em Python. [Tipos oficiais](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/types.py), [contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- `modelUsage[modelo]` tem `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens` e `costUSD`. [Tipos oficiais](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/types.py).
- `usage` usa `input_tokens`, `output_tokens`, `cache_read_input_tokens` e `cache_creation_input_tokens`; cache deve permanecer separado da entrada não cacheada. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- Multipasso: `usage` cobre o agente principal; `modelUsage` e `total_cost_usd` incluem subagentes, inclusive durante a espera final documentada. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- Não somar mensagens `assistant` indiscriminadamente: blocos compartilham `message.id`, e `output_tokens` por mensagem é provisório; usar o resultado final para saída. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- Desde 2.1.277, retomar/forkar uma sessão restaura gasto anterior; somar resultados retomados duplica consumo. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- Crash pode zerar `usage`, `modelUsage` e custo; em `error_max_budget_usd`, `usage` omite a resposta que excedeu o limite, enquanto os outros dois a incluem. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- `parent_tool_use_id` identifica subagentes; `--forward-subagent-text` amplia os blocos encaminhados, mas não cria métricas ausentes. [Headless](https://code.claude.com/docs/en/headless).
- Retries geram `system/api_retry` com `attempt`, `max_retries`, `retry_delay_ms` e `error_status`; desde 2.1.246, os dois primeiros retries de 401/403 com `apiKeyHelper` podem ser silenciosos. [Headless](https://code.claude.com/docs/en/headless).
- A API atual documenta `usage.output_tokens_details.thinking_tokens`, incluído nos tokens de saída e enviado no `message_delta` final; o repasse e a agregação desse campo na CLI 2.1.283 não foram confirmados, portanto não presumir reasoning igual a zero nem estimá-lo pelo texto visível. [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking).
- Custo é estimativa local por tabela de preços, eventualmente contratada via `modelPricing`; assinatura não transforma essa estimativa em cobrança incremental, e cobrança autorizada vem do provedor. [Custos](https://code.claude.com/docs/en/costs).
- `modelUsage.costBasis` distingue `list`, `managed` e `unknown` desde 2.1.246; preservar a base da estimativa. [Contabilização](https://code.claude.com/docs/en/agent-sdk/cost-tracking).

## OpenCode 1.18.30

- Headless: `opencode run --format json --model <provedor/modelo> "<pedido>"`; a implementação aceita `--agent` e `--variant`, e escreve eventos JSON por linha com `type`, `timestamp`, `sessionID` e `part`. [CLI da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/cli/cmd/run.ts).
- `step_finish.part` contém `reason`, `cost`, `tokens.input`, `tokens.output`, `tokens.reasoning`, `tokens.cache.read`, `tokens.cache.write` e `tokens.total` opcional. [Schema da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/schema/src/v1/session.ts).
- A normalização subtrai cache de `input` e reasoning de `output`; assim, neste formato, entrada, cache de leitura/escrita, saída e reasoning são categorias separadas. [getUsage da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/session.ts).
- `tokens.total` vem do provedor/adaptador, não é recalculado nessa função; comparar com a soma das categorias quando disponíveis, sem substituir silenciosamente divergências. [getUsage da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/session.ts).
- Valores ausentes, não finitos ou negativos podem virar zero; preços ausentes também viram zero, logo `0` isolado não prova ausência de consumo ou gratuidade. [getUsage da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/session.ts).
- `cost` normalmente resulta de tokens multiplicados pelo preço configurado, com reasoning à tarifa de saída; existe ramo específico para metadado `copilot.totalNanoAiu`, mas nenhum dos caminhos é comprovante de cobrança. [getUsage da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/session.ts).
- Multipasso: o processador grava um `step-finish` com uso/custo por passo, incrementa o custo da mensagem e substitui seus tokens pelo uso daquele passo; somar mensagens só é seguro após conferir sua correspondência com os passos. [Processador da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/processor.ts).
- Subagentes: o loop de `run` acompanha IDs filhos para permissões, mas descarta `message.part.updated` cujo `part.sessionID` difira da sessão principal; o stdout sozinho não cobre toda a árvore. [CLI da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/cli/cmd/run.ts).
- Retries: o processador publica estado `retry` com `attempt`, `next`, `message` e `action`; `run` usa `session.status` para encerrar em `idle`, sem emitir esses estados no JSON. [Processador](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/processor.ts), [CLI](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/cli/cmd/run.ts).
- Mensagens têm `time.created` e, no assistant, `time.completed` opcional; `step-finish` não possui duração dedicada no schema. [Schema da tag](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/schema/src/v1/session.ts).
- A documentação oficial de desenvolvimento descreve `/event`, `/session/:id/message` e `/session/:id/children`, úteis à reconciliação; confirmar esses contratos no `/doc` da versão instalada antes de implementar o adaptador. [Servidor](https://dev.opencode.ai/docs/server/).

## Normalização e limites

| Medida | Regra proposta |
| --- | --- |
| Entrada e cache | Guardar entrada não cacheada, cache lido e cache escrito separadamente, com origem e unidade. |
| Saída e reasoning | Claude inclui thinking na saída da API; OpenCode separa reasoning na normalização citada; registrar a relação e evitar dupla soma. |
| Duração | Cronômetro monotônico externo do envio/início definido até término/falha; preservar durações nativas em campos distintos. |
| Tempo reconstruído | Diferenças entre timestamps de mensagens são aproximações com fronteiras próprias, sem presumir inclusão de startup ou toda atividade auxiliar. |
| Custo | Separar `custo_estimado`, `base_estimativa` e `custo_cobrado`; o último exige evidência de cobrança atribuível à execução. |
| Ausência | `N/A` com motivo, nunca conversão automática de ausente em zero; preservar também o valor bruto. |

As durações da CLI, intervalos entre eventos e somas de durações de chamadas não demonstram tempo exclusivo de inferência; concorrência, ferramentas e retries impedem tratá-las como equivalentes sem validação.
A cobertura de chamadas auxiliares, retries sem usage, respostas interrompidas e atividade que sobrevive ao processo continua incerta; estas fontes não permitem prometer captura de 100% do consumo no provedor.

## Collector externo proposto - não implementado

1. Antes da execução, vincular `execucao_id` ao pedido, versão, modelo/provedor, parâmetros, limites, política de retries e sessão nova ou fronteira explícita em sessão existente.
2. Capturar stdout/stderr, eventos estruturados, início/fim monotônicos, código de saída, timeout e sinais fora do LLM, persistindo incrementalmente em armazenamento privado autorizado.
3. No Claude, guardar o `result` e seu detalhamento por modelo; no OpenCode, guardar passos e reconciliar mensagens e sessões filhas vinculadas, usando somente registros autorizados daquela execução.
4. Deduplicar por identidade nativa de sessão/mensagem/parte, agregar todos os passos e modelos e conferir a árvore; nunca somar simultaneamente totais e seus componentes, nem resultados cumulativos de retomadas.
5. Manter tentativas e falhas com seus consumos recuperáveis; eventos de retry sem métricas não provam custo zero e não bastam para fechar a cobertura.
6. Aplicar fail-closed: classificar como `completa` somente com resposta, vínculo e métricas exigidas pelo protocolo presentes, semanticamente válidas e com cobertura reconciliada.
7. Distinguir conclusão operacional de integridade da telemetria; em crash, ausência de fechamento, zeros ambíguos ou discrepâncias, registrar `parcial`/`indisponível` com motivo e preservar os valores observados.
8. Manter falhas e coletas incompletas no denominador operacional, reportar cobertura das métricas e não excluir silenciosamente casos que consumiram recursos.
9. Antes de adotar o fluxo, homologar fixtures de sucesso multipasso, subagentes, retomada, retry, cache, reasoning, timeout e crash para cada versão/provedor, sem chamar essa homologação de garantia de faturamento completo.

Decisão de desenho: telemetria produzida e reconciliada pelo collector, nunca números declarados pelo modelo gerador.
Esta pesquisa termina na proposta; implementação, instalações, novas execuções e integração com outros agentes ficam fora do escopo.
