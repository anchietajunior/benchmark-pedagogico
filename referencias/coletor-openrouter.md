# Coletor OpenRouter - configuração e evidências

Para executar, siga apenas o [workflow](../workflow.md).
Este documento registra as decisões técnicas da condição openrouter-v1, com rubricas acadêmicas 3.2.
O coletor não é um agente de programação: faz uma chamada de geração por explicação e não oferece ferramentas ao modelo.

## Configuração inicial

`npm run configurar` cria `.env`, `openrouter.config.json` e quatro arquivos-modelo de fontes, sem sobrescrever arquivos existentes.
Credenciais, configuração local e trechos bibliográficos ficam ignorados pelo Git.
A variável de ambiente OPENROUTER_API_KEY, se definida, prevalece sobre `.env`.
Não coloque a chave na configuração JSON, no prompt, em arquivos de fontes ou em capturas compartilhadas.

IDs e endpoints consultados no catálogo público em 28 de setembro de 2026:

| Sistema | Modelo solicitado | Endpoint do provedor |
| --- | --- | --- |
| S01 | [anthropic/claude-opus-5](https://openrouter.ai/anthropic/claude-opus-5) | anthropic |
| S02 | [anthropic/claude-fable-5.1](https://openrouter.ai/anthropic/claude-fable-5.1) | anthropic |
| S03 | [openai/gpt-6-astra](https://openrouter.ai/openai/gpt-6-astra) | openai |
| S04 | [deepseek/deepseek-v4.1-flash](https://openrouter.ai/deepseek/deepseek-v4.1-flash) | deepseek |
| S05 | [meta/muse-spark-1.3](https://openrouter.ai/meta/muse-spark-1.3) | meta |
| S06 | [google/gemini-3.8-flash](https://openrouter.ai/google/gemini-3.8-flash) | google-ai-studio |

A consulta confirmou disponibilidade e parâmetros declarados, não uma geração autenticada bem-sucedida.
Antes de cada lote, o programa consulta novamente os endpoints públicos e bloqueia modelos, provedores ou parâmetros incompatíveis, sem substituí-los.
O catálogo consultado é arquivado no lote; identidade solicitada e identidade retornada são registradas separadamente.
IDs sem data não garantem imutabilidade dos pesos; compare também a versão descrita no catálogo e a data da coleta.

O piloto usa max_tokens de 8.192 e reasoning.effort medium para todos.
Temperature foi omitido porque os endpoints diretos de Opus 5.5, Fable 5.1 e GPT-6 Astra não o listaram como suportado.
Em 2026-09-29, S01 passou de anthropic/claude-opus-5.5 para anthropic/claude-opus-5, depois de a geração do Opus 5.5 falhar com HTTP 529 do provedor.
Ausência do parâmetro não significa temperatura zero ou igualdade de amostragem entre modelos.
Mesmo nível nominal de raciocínio também não garante igual esforço computacional.
O teto de tokens não é meta de extensão; o prompt continua pedindo de 800 a 1.200 palavras.
Teste esses limites no piloto e congele qualquer revisão em uma condição identificada antes da coleta definitiva.

## Fontes comuns

O repositório tem pedidos e referências, mas não os capítulos completos necessários à verificação.
Preencha os arquivos em fontes/openrouter/ com trechos autorizados e efetivamente consultados.
Mantenha códigos como B01-F1, título, edição, seção/página, origem e data de acesso.
Respeite as condições de acesso e reprodução; não distribua livros protegidos sem autorização.
O modelo recebe o texto do arquivo, não acesso à página mencionada nele.

sources_reviewed confirma que o pesquisador conferiu o pacote para os seis pontos; não é um laudo gerado pelo programa.
No PILOTO, `pilot_sources_prepared: true` permite testar um pacote preparado por IA mantendo `sources_reviewed: false`.
O terminal e o manifesto registram explicitamente a revisão humana pendente; a mesma configuração é bloqueada na fase DEFINITIVA.
Notas de leitura devem ser identificadas como paráfrases, não apresentadas como transcrição ou acesso integral do gerador à obra.
Essa preparação serve para testar o fluxo; antes da coleta definitiva, o pesquisador precisa conferir suficiência, fidelidade, licenças e o contexto fornecido a geradores e juízes.
A validação local rejeita arquivos vazios ou modelos não preenchidos, mas não consegue atestar suficiência científica.
O prompt deve retornar PENDENTE DE FONTES se identificar insuficiência, e JC ainda faz a verificação independente.
Uma resposta PENDENTE, curta ou incorreta é preservada, nunca substituída por uma versão melhor.

### Piloto local preparado em 2026-09-28

A configuração local foi preenchida para B01, seis modelos e uma rodada.
A cotação é 5,2132 BRL/USD, PTAX venda de 2026-09-28, com URL da consulta oficial em usd_brl.source.
Ela é uma referência fixa para comparação, não a taxa efetiva do cartão; não se atualiza silenciosamente durante o lote.
O arquivo local B01 contém notas de leitura de B01-F2, F3, F4 e F5, identificadas na [bibliografia](bibliografia-por-tema.md), preparadas por IA e ainda sem revisão humana.
Não contém cópia de livros nem o texto de OpenStax: a página atual declara restrição à ingestão em LLMs sem autorização prévia.
O material do piloto é diferente do pacote originalmente sugerido; não misture seus resultados com coletas de outra bibliografia ou condição.
Em 2026-09-29, B02 foi preparado da mesma forma, com notas de leitura de B02-F3 a F5 e o texto original das seções consultadas de F3 e F4; F1 e F2 ficaram sem material porque o NCBI Bookshelf exigiu verificação humana.
Esses arquivos locais ficam fora do Git; esta seção descreve a preparação nesta máquina, não promete configuração pronta em outra cópia do repositório.

Para incluir os dois temas, substitua topics na configuração pelo bloco abaixo somente depois de preencher e conferir os dois arquivos:

```json
"topics": [
  { "id": "B01", "source_file": "fontes/openrouter/B01.md", "sources_reviewed": true },
  { "id": "B02", "source_file": "fontes/openrouter/B02.md", "sources_reviewed": true }
]
```

Com seis modelos, dois temas e rounds igual a 1, o comando planeja 12 chamadas pagas.
Com rounds igual a 5, seriam 60; a mudança não dispensa planejamento amostral, metas e revisão humana.

## O que entra na API

São duas mensagens novas: o metaprompt comum de sistema e o pedido temático com os trechos bibliográficos.
Não entram AGENTS.md, skills, memória, respostas anteriores, gabaritos ou resultados de juízes.
Não existe navegação, execução de shell, revisão em outra chamada ou fallback de modelo.
Plugins e transforms são enviados como listas vazias; o provedor é limitado por only/order e allow_fallbacks false.
service_tier default mantém a capacidade padrão; não ativa modalidades flex ou priority.
require_parameters true impede o roteamento a endpoints que não declaram suporte aos parâmetros enviados.
O cache de respostas é explicitamente desativado; um HIT retornado é marcado como desvio experimental.
Cache de prompt do provedor é diferente: pode permanecer ativo e seus tokens são registrados quando disponíveis.
Esses controles seguem a documentação de [roteamento](https://openrouter.ai/docs/guides/routing/provider-selection) e de [cache de respostas](https://openrouter.ai/docs/guides/features/response-caching).

## Tempo, tokens e dinheiro

| Campo | Definição |
| --- | --- |
| duration_seconds | Cronômetro monotônico antes do POST até fim/falha do stream; inclui instrumentação de recebimento. |
| first_text_seconds | Intervalo até o primeiro delta de conteúdo; raciocínio e comentários SSE não contam. |
| prompt_tokens / completion_tokens | Contagens nativas reportadas pelo serviço. |
| total_tokens | Total reportado ou soma identificada de entrada e saída nativas disponíveis. |
| cached_tokens / reasoning_tokens | Detalhamentos preservados; não são acrescentados novamente ao total. |
| cost_credits_reported | usage.cost original, em créditos, sem tratá-lo sozinho como prova do custo em USD. |
| cost_usd | total_cost em USD, obtido de /generation pelo mesmo ID. |
| cost_brl | cost_usd multiplicado pela cotação documentada em usd_brl. |
| provider_generation_ms / provider_latency_ms | Tempos adicionais do serviço; não substituem o cronômetro do cliente. |

Dados de uso seguem [Usage Accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting); os campos monetários e temporais complementares vêm de [Generation metadata](https://openrouter.ai/docs/api/api-reference/generations/get-generation).
Preparação das fontes, consulta ao catálogo e consultas posteriores de custo ficam fora de duration_seconds.
Primeiro texto não é tempo até terminar todo o raciocínio nem TTFT medido no servidor.
Numa falha, duration_seconds é tempo até falha, não latência de conclusão.
Tokenizadores variam entre modelos; contagens não equivalem automaticamente à mesma quantidade de informação.
Conversão para reais não é cobrança bancária, impostos, IOF, taxa de compra de créditos ou mensalidade.
Não use BYOK nesta condição: pode haver cobrança no provedor fora do valor observado no OpenRouter.
O programa não apresenta limite de tokens como garantia de teto monetário; configure o limite da chave na conta.

## Arquivos e recuperação

Cada lote contém planejamento prévio em batch.json e lote.md, configuração, catálogo, protocolo e código arquivados em privado/.
Cada execução tem um ID opaco E seguido de 20 algarismos, ligado explicitamente ao sistema, tema, rodada e ordem.
Pedidos e fontes têm SHA-256; os arquivos de entrada nunca são sobrescritos.

Em comprovantes/ID/ ficam pedido.json, inicio.json, http.json, resposta.sse, resposta.md, transporte.json, consultas geracao-*.json e metricas-iniciais.json.
metricas.json, accounting.json e metricas.csv são visões derivadas que podem ser atualizadas durante a conciliação.
accounting.json preserva o último valor não nulo observado de cada campo; os retornos brutos e seus horários permanecem em geracao-*.json.
Uma consulta posterior que falhe não apaga medidas já confirmadas.
Os arquivos brutos podem conter raciocínio retornado pelo serviço e identidades; são privados, não anexos dos juízes de conteúdo.

O recebimento trata comentários SSE, fragmentos UTF-8, chunk final de usage, truncamento, erro HTTP e erro dentro de HTTP 200, conforme a [documentação de streaming](https://openrouter.ai/docs/api_reference/streaming).
Há até três consultas de accounting, com timeout de 15 segundos por consulta; elas não geram texto.
Não existe reenvio automático do POST de geração.
Pendências de telemetria não apagam a tentativa nem impedem registrar as demais linhas planejadas.
Erros 401/402 ou interrupção do operador interrompem o restante do lote; as linhas não executadas continuam no planejamento.

recuperar consulta somente IDs já conhecidos e acrescenta conciliacao-*.json, sem reescrever a entrada original nem iniciar as linhas restantes.
Espere a coleta terminar antes de executar recuperar; não execute duas conciliações simultâneas sobre o mesmo lote.
Se o processo for encerrado abruptamente, o custo ainda pode ser recuperável pelo ID do cabeçalho, mas duração e texto final podem permanecer desconhecidos.
Sem ID recuperável não se adivinha a execução pela hora, modelo ou última atividade da conta.
Não reinicie coletar para recuperar dados: esse comando cria outro lote e novas chamadas pagas.
Uma interrupção que deixe linhas não executadas exige registrar a decisão de continuar em outro lote; não confunda ausência de registro com falha do modelo.

refazer (`npm run refazer -- CAMINHO_DO_LOTE SISTEMA`) gera de novo, no mesmo lote, as execuções de um sistema cujas tentativas terminaram sem texto.
O modelo vem do cadastro atual do sistema em openrouter.config.json; pedido, fontes, parâmetros, tema, rodada e ordem vêm do lote congelado.
O catálogo do novo modelo é conferido antes do POST, e cada execução substituta recebe um novo ID.
Sistemas com resposta textual ou conclusão normal são recusados antes de qualquer chamada.
batch.json passa a listar a execução substituta e guarda a original em replacements; lote.md recebe a seção Substituição de sistema.
Se os juízes já tiverem começado, privado/julgamento.json troca somente a execução substituída, com novos códigos anônimos.

COMPLETA indica campos obrigatórios presentes e consistentes; não significa APTO científico.
ready_for_comparison é triagem operacional da medição, não elegibilidade acadêmica ou nota.
Campos opcionais ausentes, como cache ou raciocínio, ficam null e não são estimados.
Os testes locais verificam os caminhos de sucesso e falha com dados sintéticos; a integração autenticada, o custo real e a suficiência das fontes precisam do piloto.

## Julgamento e limites

O arquivo PREPARAR-JULGAMENTO.md contém o metaprompt organizador com o diretório do lote já informado.
O organizador usa o pedido real arquivado e prepara quatro papéis separados, preservando o bloqueio pedagógico até APTO científico.
O coletor não modifica rubricas, não atribui notas e não transforma telemetria completa em evidência de aprendizagem.
Falhas, tentativas pendentes e coletas cientificamente reprovadas permanecem nos denominadores pertinentes.
Comparações valem para modelo + provedor + configuração + executor nesta condição, não para Codex, Claude Code ou OpenCode.
Privacidade continua dependendo das políticas do OpenRouter e dos provedores; não inclua dados pessoais ou sigilosos nos trechos.
