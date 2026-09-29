# Métodos de avaliação e métricas tecnológicas para o piloto

**NOTA HISTÓRICA DE PESQUISA / NÃO NORMATIVA**

As decisões atuais estão no [Protocolo de pontuação 3.2](protocolo-pontuacao.md) e no [workflow](../workflow.md).
Esta nota preserva as alternativas pesquisadas antes da revisão; códigos T/J e divisões de papéis abaixo são históricos, não instruções de coleta.
Em caso de diferença de escala, normalização, denominador ou competência, prevalece o protocolo 3.2 com JC, JP, JT e JE.

Consulta: 25/09/2026.
Recorte: métodos de julgamento, repetibilidade e desempenho operacional das explicações nos dois temas.
As escolhas abaixo são propostas locais, não requisitos das fontes citadas.

## Métodos de julgamento e verificações objetivas

Não há uma classificação universal de avaliação de IA limitada a dois métodos.
Para organizar este estudo, distinguir verificações objetivas, com regras e registros, de avaliações que exigem interpretação do conteúdo por pessoas ou modelos.
Uma verificação determinística de tamanho não comprova correção científica.

Dois formatos úteis de julgamento são pontuação individual por rubrica, chamada pointwise ou single-answer grading, e comparação entre pares, chamada pairwise.
No primeiro, cada texto recebe notas; no segundo, o avaliador escolhe entre duas respostas ou declara empate.
Esses formatos, assim como o uso de referências para orientar a avaliação, são discutidos em [Zheng et al., 2023](https://arxiv.org/abs/2306.05685).

Proposta local: manter a conferência bibliográfica como condição obrigatória e a rubrica individual como resultado pedagógico principal.
Para reduzir influência entre candidatos, pode-se pontuar uma resposta por chamada e consolidar as notas posteriormente; isso seria uma alteração de execução a documentar antes da coleta.
A comparação pareada pode ser uma análise secundária, entre respostas APTO do mesmo tema e rodada, sem revelar notas anteriores ao juiz.
Inverter a posição dos textos e registrar empates e inconsistências, sem escolher a ordem que produz o resultado preferido.
Quatro participantes permitem seis pares por tema quando todos forem elegíveis; esta etapa aumenta o custo de julgamento.
Ausência de pares elegíveis não é empate nem evidência de superioridade.

Não usar BLEU ou ROUGE como desfecho principal para estas explicações abertas.
São medidas de sobreposição textual com referências, não testes suficientes de correção ou compreensão; limitações de alinhamento com julgamento humano são discutidas no [G-Eval, Liu et al., 2023](https://aclanthology.org/2023.emnlp-main.153/).
Essa observação não significa que a rubrica local implemente ou reproduza o G-Eval.

## Estocasticidade e repetibilidade

Estocástico descreve um processo com componente aleatório, não um critério de qualidade.
Execuções de um modelo podem variar mesmo com o mesmo pedido; temperatura zero e seed fixo não garantem determinismo em todos os sistemas.
A necessidade de quantificar essa variabilidade é investigada por [Blackwell, Barry e Cohn, 2024](https://arxiv.org/abs/2410.03492).

Proposta exploratória: cinco gerações por modelo e tema, em sessões independentes, conservando configurações e fontes.
Com quatro modelos e dois temas, isso produziria 40 explicações em cinco rodadas completas.
Com os seis modelos do novo coletor, seriam 60; o piloto configurado usa apenas B01 e uma rodada.
O manifesto de cada lote define o desenho efetivo, sem misturar condições experimentais.
Cinco é uma escolha exploratória de repetições, não um tamanho amostral validado ou garantia de poder estatístico.
Intercalar a ordem dos modelos entre rodadas e registrar condições de execução.
Repetir geração mede variação das respostas; julgar novamente o mesmo texto mede estabilidade do avaliador.
São duas fontes distintas de variação e seus registros não devem ser misturados.

Por modelo e tema, apresentar contagens e proporções de APTO, CORRIGIR, PENDENTE e falhas operacionais.
Para as notas elegíveis, mostrar distribuição e número de observações, sem esconder resultados sem nota.
Para o juiz, relatar concordância de situação científica e diferenças de notas somente quando ambas as avaliações forem APTO.
Uma nota ausente continua N/A, não zero.
Consistência textual ou concordância entre juízes não prova verdade: é possível repetir o mesmo erro.
As regras globais atuais permanecem por rodada; não criar uma média de sobreviventes entre rodadas aprovadas.
Repetir quatro perguntas não as transforma em uma amostra de 80 temas independentes nem permite generalizar para todos os conteúdos dos cursos.

## Dimensões separadas, sem nota única compensatória

A abordagem de múltiplas métricas do [HELM, Stanford CRFM](https://crfm.stanford.edu/2022/11/17/helm.html) considera, entre outras dimensões, correção, robustez e eficiência.
Para este estudo, a proposta é apresentar três painéis: situação científica, qualidade pedagógica estimada e desempenho tecnológico.
Tempo e custo permanecem ocultos do juiz pedagógico.
Usar segundos, tokens, reais e proporções nas métricas técnicas, sem convertê-las arbitrariamente em notas Likert.
Comparar custos e tempos junto da taxa de aprovação; não permitir compensação de erro científico por rapidez ou preço.
Revisão por especialista e avaliação com estudantes responderiam a perguntas diferentes e não são substituídas por instrumentação técnica.

## Fundamentação e unidade de comparação

O [MLPerf Endpoints](https://mlcommons.org/benchmarks/endpoints/) mede sistemas que combinam modelo, software e hardware sob determinada concorrência.
O [MLPerf Inference 5.1](https://mlcommons.org/2025/09/small-llm-inference-5-1/) distingue TTFT, TPOT e desempenho agregado, com limites específicos de cada cenário.
Esses limites não devem ser transplantados para este piloto.
Descrever como estudo inspirado nessas referências, nunca como benchmark MLPerf oficial ou certificado.

A unidade comparada será modelo/versão + serviço/plataforma + configuração + data + modo de acesso.
Filas, rede, ferramentas e interface influenciam os resultados; não atribuir diferenças exclusivamente ao modelo.
Registrar tema, rodada, contexto fornecido, parâmetros disponíveis, concorrência e tentativa original de cada reenvio.
Separar chat manual de API e preservar todas as tentativas.

## Cinco métricas principais

Considere `N` envios efetivos de geração no recorte analisado, incluindo falhas e reenvios identificados.
Um envio pode envolver várias chamadas internas e ferramentas.
Apresentar contagens por tema e sistema, identificando reenvios.
Denominadores zero produzem resultados indefinidos.

| Métrica | Definição e apresentação |
| --- | --- |
| T1 - Latência total E2E | `L_i = t_fim,i - t_envio,i`, em segundos, até recebimento completo e término normal da operação, incluindo consultas a fontes e ferramentas. |
| T2 - Tempo até primeiro texto | `F_i = t_primeiro_fragmento_textual,i - t_envio,i`, em segundos, medido em streaming; informar exatamente qual evento foi observado. |
| T3 - Custo de geração | `C_total = Σ C_i`; média por tentativa `C_total/N`, na mesma moeda, acompanhada dos consumos registrados. |
| T4 - Conclusão técnica | `100 × N_conclusões_normais/N`, exigindo resposta não vazia, término normal e ausência de interrupção ou truncamento. |
| T5 - Conformidade formal integral | `100 × N_tentativas_com_todos_os_requisitos_aplicáveis_cumpridos/N`, com verificadores previamente definidos e versão registrada. |

Para T1 e T2, publicar observações, mediana, amplitude e `n_medido/N`; evitar percentis extremos com poucas observações.
Falhas permanecem na base: registrar tempo até erro ou timeout, sem apresentá-lo como latência de resposta completa.
Sem primeiro texto, T2 fica indisponível, nunca zero.

T4 descreve funcionamento operacional, não correção científica: uma resposta CORRIGIR ou uma declaração completa PENDENTE DE FONTES pode terminar normalmente.
Discriminar timeout, erro de rede/servidor, limite de uso, interrupção, truncamento, recusa e indisponibilidade de fontes, documentando evidências.

O [IFEval original, Zhou et al., 2023](https://arxiv.org/pdf/2311.07911) fundamenta verificações por instrução e por resposta integral.
Para T5, aproveitar requisitos existentes: título, até 600 palavras no corpo, síntese de três itens e identificadores bibliográficos permitidos.
Fixar contagem de palavras, delimitação das fontes e interpretação da estrutura Markdown antes da coleta.
O ramo PENDENTE DE FONTES tem requisitos próprios; falha sem resposta não satisfaz T5.
Presença de citação não comprova consulta ou veracidade; cobertura conceitual e adequação pedagógica não são verificações sintáticas.
Conformidade formal não altera APTO/CORRIGIR/PENDENTE.

## Streaming, tokens e observabilidade

As [convenções OpenTelemetry](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-metrics.md) distinguem primeiro fragmento no cliente de primeiro token no servidor.
Um fragmento pode agregar tokens; excluir eventos de controle, campos vazios, reasoning e ferramentas do primeiro texto, conforme os [eventos de streaming](https://developers.openai.com/api/docs/guides/streaming-responses).
Denominar T2 “tempo até primeiro fragmento textual”; somente chamar TTFT medido quando a instrumentação identificar efetivamente o primeiro token e seu ponto de observação.
Sem streaming instrumentado, não reconstruir TTFT a partir do texto final ou de E2E.

No chat manual, cronômetro ou gravação permitem E2E e início visual aproximados, incluindo renderização e erro humano.
Não revelam necessariamente tokens faturados, raciocínio interno, cache, chamadas ocultas ou custo por envio.
Marcar dados ausentes como indisponíveis.

## Consumo e cobrança sem duplicação

Guardar registros brutos de entrada, saída, reasoning, leitura/escrita de cache, ferramentas e identificadores de cobrança.
Na [documentação de reasoning](https://developers.openai.com/api/docs/guides/reasoning), raciocínio integra saída faturada e pode gerar cobrança mesmo sem texto visível.
Esquemas diferem: [cache como subconjunto da entrada](https://developers.openai.com/api/docs/guides/prompt-caching) versus [campos de entrada comum e cache separados](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-caching.md).

Reconciliar cobranças por chamada com o [relatório oficial de uso/custo](https://platform.claude.com/docs/en/manage-claude/usage-cost-api), quando disponível.
Para reconstrução, usar `C_i = Σ_k(q_ik × p_k) + taxas_distintas_i - créditos_i`, com quantidades e tarifas da mesma unidade e categorias faturáveis sem sobreposição.
Não somar novamente reasoning já incluído na saída, cache já incluído na entrada ou tokens de ferramentas já contabilizados.
Somar taxas distintas de ferramentas; não somar totais agregados às suas parcelas.
Sem conciliação, identificar custo calculado como estimativa; assinatura rateada não demonstra custo marginal por resposta.

## Três derivadas opcionais

1. **TPOT e seu inverso:** `TPOT_i = (t_último_token,i - t_primeiro_token,i)/(O_i - 1)` e `TPS_i = 1/TPOT_i`, para `O_i > 1` tokens observáveis e intervalo positivo.
   A exclusão do primeiro token segue as [métricas de inferência](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/perf_analyzer/genai-perf/README.html#metrics).
   Com fragmentos agregados, identificar a aproximação; saída faturada com reasoning oculto não serve como `O_i` do texto visível.
   `O_i/E2E_i` inclui espera inicial e não equivale a esse TPS; throughput agregado usa todos os tokens divididos pela duração da janela comum.
   [Tokenizadores diferentes](https://huggingface.co/docs/tokenizers/components) segmentam textos diferentemente: registrar tokenizador e extensão textual, sem equiparar tokens a palavras ou inferir eficiência computacional entre serviços.
2. **Custo por resposta APTO:** `C_APTO = C_total/N_APTO`, incluindo no numerador todas as falhas, reenvios, CORRIGIR e PENDENTE do mesmo recorte.
   Manter uma resposta por sistema-tema-rodada, sem escolher a melhor tentativa.
   Reenvios de transporte da mesma execução não duplicam respostas no denominador; novas gerações de conteúdo pertencem a novas rodadas e preservam seus próprios resultados.
   Com zero APTO, resultado indefinido; com custo ausente, indisponível.
   Preservar e publicar separadamente APTO, CORRIGIR e PENDENTE.
3. **Conformidade por requisito:** `100 × Σ requisitos_cumpridos/Σ requisitos_aplicáveis`, incluindo os requisitos previstos nas tentativas falhas como não cumpridos.
   Discriminar ramo de explicação e ramo de fontes pendentes; não excluir falhas para melhorar o resultado.
