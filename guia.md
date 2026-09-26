# Guia do protocolo 3.0: primeiro correta, depois compreensível

Protocolo para comparar como diferentes sistemas de IA explicam temas complexos da saúde, com conferência bibliográfica e julgamento de autoria anonimizada.
Recorte acadêmico: cursos de Biomedicina e Nutrição do Centro Universitário do Rio São Francisco, o UniRios.
Quatro juízes: ciência (JC), pedagogia (JP), tecnologia (JT) e tempo/custo (JE).
Boa redação e baixo custo não compensam erro científico.

| Dimensão | Quantidade |
| --- | --- |
| Cursos da área da saúde | 2 |
| Temas com recortes definidos | 4 |
| Subcritérios pedagógicos observáveis | 10 |
| Execuções previstas em cinco rodadas | 80 |

Lógica central: JC pergunta se o conteúdo está correto, confrontando conceitos, exemplos e relações causais com fontes efetivamente consultadas.
Somente respostas APTO avançam para JP, que pergunta como o texto ajuda a entender e calcula cinco notas de 0 a 100 a partir de 10 subcritérios com evidências.
JT verifica funcionamento e formato; JE apura tempo, tokens e custo.

## 01. Desenho do experimento: quatro juízes, uma consolidação

Cada papel recebe apenas os dados de sua competência.
Comece com dois sistemas e B01 no piloto; depois, congele a coleta proposta de quatro sistemas × quatro temas × cinco rodadas.
Sistema significa agente + modelo + configuração.

| Passo | Responsável | O que fazer |
| --- | --- | --- |
| 01 | Pesquisador | Congelar o desenho: registrar agente, modelo, regras, ferramentas, fontes e políticas; testar os quatro papéis no piloto e resolver ambiguidades antes da coleta. |
| 02 | Geradores | Gerar e preservar: usar sessão e diretório isolados, somente com pedido e fontes; salvar a primeira resposta e os registros de todas as chamadas, tentativas e falhas. |
| 03 | Pesquisador | Anonimizar: remover somente autoria explícita, sem melhorar o texto; preparar códigos distintos para JC1, JC2, JP1 e JP2 e manter a chave privada. |
| 04 | JC, científico | Confrontar as fontes: conferir cobertura, afirmações, exemplos e referências; registrar C1-C3 e APTO, CORRIGIR ou PENDENTE, sem notas pedagógicas. |
| 05 | JP, pedagógico | Pontuar os APTO: receber o mesmo texto e um certificado mínimo, sem o parecer de JC; julgar 10 subcritérios, calcular cinco dimensões e P em sessão separada. |
| 06 | JT, tecnológico | Verificar a saída: usar original e registros para apurar T1 conclusão e T2 conformidade; declarar se houve inspeção humana, rotina programática ou LLM. |
| 07 | JE, tempo e custo | Apurar recursos: calcular segundos, tokens e reais com comprovantes; E1-E3 só recebem notas com metas prévias válidas e dados faltantes ficam N/A. |
| 08 | Estabilidade | Repetir dentro do papel: JC2 verifica estabilidade de JC1 e JP2 de JP1, sem ler pareceres anteriores; JC1 habilita JP1 e JC2 habilita JP2; pairwise de JP é opcional. |
| 09 | Consolidação | Reunir todos os itens: bloquear pareceres antes de remapear autores; unir ciência, pedagogia, tecnologia e recursos em uma tabela auditável, sem nota geral compensatória. |

Na coleta manual descrita no README, o pesquisador executa os passos 01 a 03, a sessão única de julgamento cobre os passos 04 a 07 e o metaprompt de ranking cobre o passo 09.

Quatro papéis, não necessariamente quatro LLMs.
JT/JE podem usar verificações e cálculos sem IA.
JC/JP ficam em sessões separadas, mas isso não garante independência estatística.
O consolidador não é um quinto juiz.
As 80 execuções repetem quatro temas, não representam 80 conteúdos diferentes.

Regras comuns a todos os sistemas:

- Mesmo público e conteúdo: graduando de saúde com conhecimentos introdutórios; cada pedido exige seis pontos essenciais e um exemplo concreto.
- Mesmo formato: até 600 palavras antes de `## Fontes consultadas`, Markdown sem imagens, título, `## Síntese` com três itens e `## Registro de geração` ao final, com tempo, tokens e custo declarados pelo próprio agente.
- Mesmas fontes acessíveis: preferir trechos idênticos e identificados; sem material suficiente, salvar `PENDENTE DE FONTES`, sem inventar uma explicação conferida.

Passo a passo completo no [workflow](workflow.md); regras e fórmulas no [protocolo](referencias/protocolo-pontuacao.md).

## 02. Conteúdo avaliado: quatro temas, um recorte por explicação

Os pedidos exigem relações entre conceitos, não apenas definições.
Cada tema tem seis pontos de cobertura, um cenário concreto e limites de escopo para tornar a comparação consistente.

### B01, Biomedicina: hemostasia e coagulação

Pergunta: como o corpo interrompe um sangramento sem deixar a formação de coágulos sair de controle?
Cenário: uma pequena lesão em um vaso sanguíneo.

1. Mudanças no vaso lesionado que iniciam a resposta hemostática.
2. Adesão, ativação e agregação das plaquetas na formação do tampão.
3. Ativação dos fatores de coagulação e formação de trombina e fibrina.
4. Estabilização pela fibrina e integração entre hemostasia primária e secundária.
5. Regulação da coagulação e remoção da fibrina pela fibrinólise.
6. Diferença entre hemostasia fisiológica e trombose.

Fora do recorte: enumerar todos os fatores de coagulação ou exames laboratoriais.
[Pedido completo](prompts/pedidos/B01-hemostasia.md).

### B02, Biomedicina: resposta imune e memória

Pergunta: como linfócitos B e T participam da resposta adaptativa e da memória imunológica?
Cenário: vacinação hipotética seguida de contato com o agente correspondente.

1. Antígeno, resposta inata e apresentação de antígenos na ativação adaptativa.
2. Papéis dos linfócitos B, plasmócitos e anticorpos.
3. Funções distintas dos linfócitos T auxiliares e citotóxicos.
4. Expansão clonal e formação de células de memória.
5. Resposta de memória em um novo contato com o mesmo antígeno.
6. Relação com a vacinação e limites das afirmações de proteção.

Fora do recorte: vacinas comerciais específicas, todas as citocinas, subclasses de anticorpos e plataformas vacinais.
[Pedido completo](prompts/pedidos/B02-memoria-imunologica.md).

### N01, Nutrição: energia entre refeição e jejum

Pergunta: de onde vem a energia após uma refeição e durante um jejum noturno habitual?
Cenário: adulto saudável, do período após o jantar até antes do café da manhã.

1. Disponibilidade de nutrientes e sinalização relativa de insulina e glucagon.
2. Fígado, armazenamento de glicogênio e manutenção da glicose sanguínea.
3. Diferenças entre as funções do glicogênio muscular e hepático.
4. Armazenamento e mobilização de gordura no tecido adiposo.
5. Glicogenólise e gliconeogênese no fornecimento de glicose durante o jejum.
6. Integração gradual dos processos e necessidades diferentes dos tecidos.

Fora do recorte: recomendações alimentares, todas as enzimas e adaptações ao jejum prolongado.
[Pedido completo](prompts/pedidos/N01-metabolismo-energetico.md).

### N02, Nutrição: absorção e regulação do ferro

Pergunta: por que ingerir ferro não significa absorvê-lo ou disponibilizá-lo integralmente aos tecidos?
Cenário: uma refeição e sua relação com absorção, transporte, armazenamento e regulação.

1. Ferro heme e não heme e suas diferenças de biodisponibilidade.
2. Absorção pelo enterócito e exportação para o sangue pela ferroportina.
3. Funções distintas de transferrina e ferritina.
4. Ação da hepcidina sobre a ferroportina e a disponibilidade de ferro.
5. Vitamina C e fatores alimentares inibidores da absorção do ferro não heme.
6. Influência da inflamação e das reservas corporais na interpretação da disponibilidade.

Fora do recorte: suplementos, doses, diagnóstico individual e enumeração de todos os transportadores e exames.
[Pedido completo](prompts/pedidos/N02-metabolismo-do-ferro.md).

A seleção se apoia nas disciplinas publicadas nos cursos e nos planos de [Hematologia Clínica (2025.1)](https://www.unirios.edu.br/arquivos/files/cursos/biomedicina/2025/1_semestre/5p/hematologia_clinica.pdf) e [Nutrição e Metabolismo (2024.2)](https://www.unirios.edu.br/arquivos/files/cursos/nutricao/2024/2_semestre/2p/nutricao_e_metabolismo.pdf).
Isso fundamenta a pertinência curricular, não uma classificação dos quatro assuntos como os mais difíceis dos cursos.

## 03. JC, juiz científico: notas com evidência, erros com consequência

C1, C2 e C3 descrevem aspectos científicos de 0 a 100.
São indicadores diagnósticos, não uma média que permita compensar falsidades.
Um erro localizado também exige correção.

JC verifica, não presume: confere os seis pontos e todas as afirmações relevantes, inclusive exemplos, analogias e generalizações.
O gabarito orienta a busca; a fonte efetivamente consultada sustenta a decisão.
Uma afirmação desconhecida não é automaticamente falsa: registre a falta de evidência e mantenha a medida afetada N/A.

Trilha de evidência por item: identificador, trecho ou ausência, resultado, fonte e localização, justificativa.
Registrar obra, edição disponível, seção ou página observada, data e extensão do acesso.
Preservar numeradores, denominadores, erros e pendências.

| Indicador | Cálculo 0-100 | Regra de evidência |
| --- | --- | --- |
| C1, cobertura | Média de K1 a K6. | 100: essencial correto e suficiente; 50: parte correta, mas relação essencial ausente; 0: ausência ou erro confirmado; N/A: não verificável. |
| C2, sustentação factual | 100 × afirmações sustentadas ÷ afirmações inventariadas. | Inventário de proposições distintas, sem inflar por repetições; qualquer afirmação não verificável torna C2 N/A. |
| C3, vínculos bibliográficos | 100 × vínculos válidos ÷ vínculos declarados. | A fonte deve existir e sustentar a associação; vínculo não verificável ou inexistência de vínculos declarados produz C3 N/A. |

Um K de 50 ou 0 implica CORRIGIR.
Se algum K for N/A, C1 também é N/A, sem descartar o item.
Sem afirmações inventariadas, C2 é N/A.
Fonte inventada confirmada exige CORRIGIR; falta de citação isolada é uma questão formal, não prova de falsidade.

| Situação | Condição | Consequência |
| --- | --- | --- |
| APTO | K1 a K6 = 100, afirmações verificadas e nenhum erro ou pendência científica/bibliográfica relevante. | Avança para a pontuação pedagógica. |
| CORRIGIR | Erro confirmado, omissão essencial, recusa, saída vazia ou truncada efetivamente fornecida; indicadores calculáveis continuam visíveis. | Pedagogia N/A; fora do ranking. |
| PENDENTE | Acesso insuficiente, evidência indisponível, conflito não resolvido ou mensagem PENDENTE DE FONTES, sem erro confirmado prioritário. | Pedagogia N/A; aguarda evidência. |

A nota não substitui o impedimento: mesmo com C2 próximo de 100, um erro confirmado exige CORRIGIR.
A prioridade é CORRIGIR > PENDENTE > APTO.
Falha sem resposta é registrada como AUSENTE, não como um quarto julgamento científico.
APTO não garante infalibilidade.

## 04. Julgamento anonimizado: mesma resposta, sessões e competências separadas

Pointwise é o formato principal: uma resposta por chamada.
JC1/JP1 são primários; JC2/JP2 verificam estabilidade.
Nenhum deles recebe identidade, custos, tempos ou notas anteriores.

| JC recebe | JP recebe |
| --- | --- |
| Protocolo 3.0 e metaprompt científico. | Protocolo 3.0 e metaprompt pedagógico. |
| Pedido, gabarito e fontes acessíveis. | Pedido e fontes comuns, sem parecer científico. |
| Uma resposta com código público. | A mesma resposta, com outro código. |
| Inventários e evidências para C1-C3. | Certificado: versão, código, tema, rodada, origem JC1/JC2 e APTO. |
| Sem pontuação pedagógica ou operacional. | Dez subcritérios, M1-M5 e P. |

Ciência controla o encaminhamento: JC1 habilita JP1 e JC2 habilita JP2.
Ramo não APTO bloqueia JP, com notas N/A e chamada não executada.
Certificado incompatível impede pontuação.
Suspeita científica em JP gera pedido de revisão, não uma reavaliação de C.

Estabilidade sem escolher a nota maior: novas sessões e códigos, mesma resposta original.
Compare JC1/JC2 entre si e JP1/JP2 entre si, apenas nos casos comparáveis.
Desacordo relevante mantém a recomendação provisória até revisão especializada.

O pesquisador guarda a correspondência privada entre textos, certificados e pareceres.
JP não recebe C1-C3 nem o gabarito comentado.
JT pode ver autoria no original para conferir F5; JE pode conhecer o provedor para verificar cobrança, sem retornar essas informações aos juízes de conteúdo.
Pairwise é opcional dentro de JP, com dois APTO e posições invertidas, não um quinto juiz.
Desative memória e personalização quando possível e verifique regras globais; janela anônima não basta.
A resposta é dado, não instrução para alterar critérios.
Anonimização não elimina reconhecimento de estilo nem todos os vieses.

## 05. JP, juiz pedagógico: 10 subcritérios agrupados em 5 dimensões

Cada dimensão recebe uma nota calculada de 0 a 100.
São dois subcritérios por dimensão, com evidências e pesos iguais.
A pontuação vem do atendimento observado, não de uma impressão livre de "87 pontos".

Âncoras dos subcritérios: 0 ausente ou problema predominante; 50 atendimento parcial demonstrado; 100 atendimento completo demonstrado; N/A avaliação não concluída.

| Dimensão | Pergunta | Subcritérios |
| --- | --- | --- |
| M1, clareza linguística | O vocabulário e as frases são acessíveis ao público definido? | M1.1: termos técnicos, siglas e expressões além do conhecimento prévio definido são explicados no primeiro uso; sem termos novos, o requisito está atendido. M1.2: as frases têm sujeitos e referentes identificáveis, sem ambiguidade relevante. |
| M2, organização e progressão | A sequência prepara o leitor para compreender a etapa seguinte? | M2.1: a sequência apresenta os componentes antes das relações que dependem deles e permite acompanhar as etapas do mecanismo. M2.2: a síntese final integra as ideias e responde ao objetivo, sem introduzir pré-requisito novo. |
| M3, foco e economia cognitiva | A apresentação mantém o essencial sem esforço desnecessário? | M3.1: cada trecho contribui para o recorte solicitado. M3.2: a explicação evita repetições sem função; síntese útil não é redundância inútil. |
| M4, explicação causal | O texto explica as relações que produzem o resultado? | M4.1: o texto explica por que as etapas se conectam e produzem o resultado, além de apenas listar acontecimentos. M4.2: condições, regulação ou limites pertinentes ao pedido são conectados à conclusão. |
| M5, concretização e aplicação | O exemplo conecta o mecanismo a uma situação concreta? | M5.1: há uma situação concreta identificável e pertinente ao pedido. M5.2: os elementos e o resultado do exemplo são explicados por sua relação com os conceitos apresentados. |

Para 50, o juiz precisa mostrar tanto a parte atendida quanto a limitação.
Cada subcritério exige evidência ou descrição da ausência.
M2 observa ordem e síntese; M4, causalidade e condições; M5, concretização no exemplo.
M3 não mede carga cognitiva real; M5 não comprova transferência de aprendizagem.

Cálculo transparente: `M = soma de seus 2 itens ÷ 2` e `P = (M1 + M2 + M3 + M4 + M5) ÷ 5`.
Exemplo aritmético: (100 + 50) ÷ 2 = 75.
Em uma explicação, cada M pode ser 0, 25, 50, 75 ou 100; P avança em passos de 5.
Médias entre explicações podem ter outros valores.
Qualquer subitem N/A impede a média correspondente e P.

Mais dados, não precisão inventada: os dados adicionais são os subcritérios, as evidências e as repetições.
Mudar a escala sozinho não cria informação.
Nota 80 não significa 80% de chance de entendimento.
As categorias e médias são experimentais, não uma medida psicométrica validada.

Somente APTO recebe pedagogia: respostas CORRIGIR e PENDENTE mantêm todas as notas M e P como N/A.
Não se atribui nota a uma versão imaginada ou corrigida da resposta.
Limites de analogias e generalizações continuam sujeitos à conferência científica.
Dez itens é uma escolha operacional, não uma quantidade validada pela literatura.
O piloto compara JC1/JC2 na ciência e JP1/JP2 item a item nos ramos APTO, registra ambiguidades e solicita revisão docente; sem APTO, a parte pedagógica ainda precisa ser testada.
Esse procedimento não valida psicometricamente a rubrica.

## 06. JT, juiz tecnológico: funcionou e cumpriu as instruções?

JT usa o original e os registros operacionais.
Não julga verdade científica, didática, preço ou velocidade.
Pode atuar em paralelo a JC/JP, sem lhes transmitir seus dados.

| Código | Dado observado | Pontuação |
| --- | --- | --- |
| T1, conclusão técnica | Saída não vazia, término normal, sem erro técnico ou truncamento. | 100 por conclusão normal; 0 por falha observada; N/A se desconhecido. Agregado: 100 × concluídas ÷ iniciadas. |
| T2, conformidade formal | F1 título; F2 até 600 palavras; F3 síntese de três itens; F4 declaração de fontes; F5 sem autoria explícita/imagens. | Média dos cinco itens 0/100, medidos no original antes da anonimização. Item necessário desconhecido torna T2 N/A. |

- Ramo PENDENTE DE FONTES: FP1 marcador inicial; FP2 material faltante identificado; FP3 sem explicação apresentada como verificada. T2 é a média dos três itens; publicar o ramo separadamente.
- Recusa e falha sem saída: T2 = 0 quando documentadas, com itens formais não aplicados N/A. Registro indisponível não é falha observada. Uma recusa entregue normalmente pode ter T1 = 100.
- Verificador declarado: registrar rotina/versão ou inspeção humana/LLM. Este kit define verificações, mas não implementa um executor. Inspeção por IA não equivale a teste determinístico executado.

Presença de referência não prova correção: F4 verifica formato; JC verifica fonte e sustentação.
Sem rastros, não atribua notas de planejamento ou uso de ferramentas ao agente.
Não há média geral de T1/T2.

## 07. JE, juiz de tempo e custo: quanto demorou e quanto consumiu?

Horários, tokens e cobrança vêm de registros.
JE usa a situação operacional documentada por JT, sem receber notas C/M/P.
O custo abrange o sistema completo, não somente a última chamada ao LLM.

| Código | Medida | Condição da nota |
| --- | --- | --- |
| E1, latência total | Segundos do primeiro envio até a conclusão normal, incluindo ferramentas e reenvios. | Meta e limite de espera pré-fixados. |
| E2, primeiro texto | Segundos até o primeiro fragmento textual visível, quando observado. | Meta, limite e observação disponíveis; não presumir TTFT de token. |
| E3, custo de geração | Reais de todas as chamadas, ferramentas e tentativas de geração, sem dupla contagem. | Meta e limite de custo; identificar cobrança medida ou estimativa. |

Normalização de E1 a E3: `nota = 100 × (limite − valor) ÷ (limite − alvo)`, com 100 até o alvo e 0 a partir do limite.
Exigir 0 ≤ alvo < limite, com os mesmos parâmetros para todos, justificados antes da coleta.
Sem metas, sem nota inventada: metas ausentes ou inválidas produzem N/A, preservando dados brutos.
Falha técnica deixa E1-E3 N/A; gasto incorrido e tempo até erro permanecem.
Não há média geral de E1/E2/E3.

- Tokens não são qualidade: preservar campos de entrada, saída, raciocínio e cache como fornecidos; subconjuntos não podem ser somados novamente; tokenizadores diferentes não equivalem à mesma quantidade de palavras.
- Custo por APTO: o consolidador divide todos os custos de geração do recorte pelos APTO em JC1, incluindo falhas e reprovados; sem APTO, indefinido; sem custo completo, N/A.
- Orçamento separado: geração, quatro avaliações, pairwise e pesquisa em categorias distintas; julgamentos repetidos não duplicam gerações; assinatura não revela custo marginal por resposta.

No chat manual, medidas visuais são aproximadas e tokens/custos podem não estar disponíveis.
Tarifas, unidades, câmbio e datas precisam de evidência.
Recusa ou PENDENTE DE FONTES entregue normalmente pode ter E calculável sem ser sucesso científico.

## 08. Fundamentação metodológica: de onde vêm os critérios?

A rubrica combina princípios pedagógicos estabelecidos em uma operacionalização própria.
A combinação de subcritérios, pesos, normalizações e IA como juiz ainda não foi validada para este público.

| Eixo | Base | Uso e limite |
| --- | --- | --- |
| Linguagem e organização | [PEMAT, AHRQ](https://www.ahrq.gov/health-literacy/patient-education/pemat.html) | Inspira a atenção a vocabulário, estrutura e apresentação compreensível; o instrumento foi desenvolvido para educação de pacientes e não é aplicado em sua escala original nem como verificação de exatidão científica. |
| Foco e progressão | [Mayer, Medical Education, 2010](https://doi.org/10.1111/j.1365-2923.2010.03624.x) | Coerência, sinalização, segmentação e preparação de conceitos definem o que observar; parte da evidência é multimodal e a adaptação textual não transfere automaticamente seus efeitos. |
| Conhecimento e aplicação | [Eberly Center, Carnegie Mellon](https://www.cmu.edu/teaching/principles/learning.html) | Conhecimento prévio, organização de conceitos e apoio à aplicação orientam progressão, causalidade e exemplos; avaliar esses sinais no texto não demonstra aprendizagem em estudantes reais. |
| Controle do julgamento | [Zheng et al., MT-Bench e Chatbot Arena, 2023](https://arxiv.org/abs/2306.05685) | A literatura discute efeitos de posição, extensão e preferência pelo próprio modelo; códigos anônimos, critérios fixos e novo julgamento examinam a sensibilidade sem garantir validade humana. |
| Múltiplas dimensões | [HELM, Stanford](https://crfm.stanford.edu/2022/11/17/helm.html) e [MLPerf Inference](https://mlcommons.org/2025/09/small-llm-inference-5-1/) | Ciência, qualidade didática e recursos são eixos distintos; a normalização usa metas locais, sem alegar certificação de benchmark. |
| Regras e variabilidade | [IFEval, Zhou et al.](https://arxiv.org/abs/2311.07911) e [Blackwell et al.](https://arxiv.org/abs/2410.03492) | Requisitos formais verificáveis complementam a avaliação semântica; repetições de geração examinam o sistema e repetições de julgamento examinam o avaliador. |

A conferência por afirmações se relaciona ao [FActScore](https://aclanthology.org/2023.emnlp-main.741/).
Este protocolo adapta ideias de avaliação; não executa os benchmarks citados nem herda automaticamente sua validação.
Recomenda-se revisão docente e uma amostra humana cega para verificar os próprios juízes.

## 09. Consolidação: todos os itens, sem apagar as falhas

O consolidador reúne JC1 + JP1 + JT + JE após o bloqueio dos pareceres.
Confere cálculos, mas não volta a julgar depois de conhecer os autores.
JC2/JP2 permanecem na análise de estabilidade.

| Responsável | Itens preservados | Evidência e situação |
| --- | --- | --- |
| JC | K1-K6, C1-C3, cada afirmação A e vínculo V. | Fonte/localização, erros, pendências e APTO/CORRIGIR/PENDENTE. |
| JP | 10 subitens, M1-M5 e P. | Trechos, certificado, conclusão, bloqueios e alertas. |
| JT | T1/T2, F1-F5 ou FP1-FP3. | Original, situação operacional, método e resultado de cada checagem. |
| JE | E1-E3, segundos, tokens e reais. | Logs, tentativas, cobrança, tarifas, metas e cobertura. |

Regras de elegibilidade:

1. Por tema/rodada: APTO em JC1 e JP1 concluído com 10 itens válidos; classificar por P, preservando empates.
2. Média da rodada: quatro APTO e quatro P completos por sistema.
3. Média geral das cinco rodadas: 20 APTO e 20 P completos; não ranquear apenas sobreviventes.
4. Exibir todas as execuções previstas, inclusive falhas, bloqueios e ausências; se ninguém for elegível, não há vencedor global recomendável.
5. Desacordos científicos e alertas de JP deixam a recomendação provisória até revisão humana documentada.

Arquivos da consolidação, definidos em [resultados e registros](referencias/resultados-e-registros.md):

- resultados-completos.csv: uma linha por execução, papel, passagem e item, com notas, dados brutos, evidências e motivos de N/A.
- resultados-resumo.csv: uma linha por execução, reunindo os quatro painéis e os 10 subitens pedagógicos.
- estabilidade.csv e relatorio.md: comparações dentro de cada papel, agregados elegíveis, limitações e orçamento; pairwise separado.
- Na coleta manual, a tabela de notas em `.md` e o ranking em `.html` substituem esses arquivos; o `.html` é o único produto final fora do Markdown.

O agente também faz parte do resultado: instruções automáticas, skills, contexto, leitura de fontes, ferramentas e chamadas internas podem alterar o texto e seu custo.
Se agente e LLM mudarem juntos, o estudo compara as combinações, não isola a superioridade do modelo.
Serem da mesma empresa não demonstra vantagem por si só, e não há uma porcentagem universal de efeito.
Registre a configuração de geradores e juízes, nunca dê ao gerador acesso à raiz do projeto com gabaritos e resultados, use ambientes isolados e declare condições ocultas.
A [documentação da Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distingue o modelo do ambiente do agente; o [OpenCode documenta controles de prompt, modelo e passos](https://opencode.ai/docs/agents/).

Sem estudantes, a conclusão é qualidade didática estimada, não aprendizagem demonstrada.
Quatro temas não representam todo o currículo.
Conserve protocolos anteriores sem converter ou misturar notas, e separe piloto da coleta definitiva.
JP bloqueado fica N/A e NÃO EXECUTADO quando não houve chamada.
Não some os quatro painéis em uma nota geral.

## 10. Bibliografia e materiais: as fontes fazem parte do experimento

Geradores e juízes de conteúdo recebem as fontes do tema; gabaritos ficam somente com JC.
O ideal é conservar uma versão identificada dos mesmos trechos para todos, respeitando as condições de acesso e reprodução.

| Tema | Fontes-base | Complementar |
| --- | --- | --- |
| B01, hemostasia e coagulação | [OpenStax, Anatomy and Physiology 2e, seção 18.5: Hemostasis](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-5-hemostasis); [MSD Manual, versão profissional: Overview of Hemostasis](https://www.msdmanuals.com/professional/hematology-and-oncology/hemostasis/overview-of-hemostasis). | Hoffbrand e Moss, *Fundamentos em Hematologia*, 6ª ed., Artmed, 2013. |
| B02, resposta imune e memória | [Janeway et al., Immunobiology, 5ª ed., 2001: Immunological memory](https://www.ncbi.nlm.nih.gov/sites/books/NBK27158/); [Alberts et al., Molecular Biology of the Cell, 4ª ed., 2002: The Adaptive Immune System](https://www.ncbi.nlm.nih.gov/sites/books/NBK21070/). | Abbas, Lichtman e Pillai, *Imunologia Celular e Molecular*, 10ª ed., Guanabara Koogan, 2023; as fontes-base antigas sustentam mecanismos fundamentais, não recomendações atuais de vacinas específicas. |
| N01, metabolismo energético | [OpenStax, Anatomy and Physiology 2e, seção 24.5: Metabolic States of the Body](https://openstax.org/books/anatomy-and-physiology-2e/pages/24-5-metabolic-states-of-the-body); [Endotext: Glucagon Physiology](https://www.ncbi.nlm.nih.gov/sites/books/NBK279127/); [StatPearls: Biochemistry, Glycogen](https://www.ncbi.nlm.nih.gov/sites/books/NBK539802/). | *Princípios de Bioquímica de Lehninger*, 8ª ed., Artmed, 2022. |
| N02, absorção e regulação do ferro | [NIH Office of Dietary Supplements: Iron, Fact Sheet for Health Professionals](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/); [Nemeth et al., Science, 2004: regulação da ferroportina pela hepcidina](https://pubmed.ncbi.nlm.nih.gov/15514116/). | Cozzolino, *Biodisponibilidade de nutrientes*, 7ª ed., Manole, 2024; no artigo de Nemeth, o acesso ao resumo não deve ser registrado como leitura integral. |

Referência indicada não é fonte consultada: os capítulos completos das obras complementares não foram consultados na preparação do kit.
Para usá-los como evidência, é necessário disponibilizar e ler os trechos pertinentes.
Falta de acesso ou conflito não resolvido mantém a verificação pendente.
A lista completa de arquivos do protocolo está na seção Materiais do [README](README.md).

Protocolo 3.0, atualizado em 25 de setembro de 2026.
Documento explicativo de um estudo piloto, sem resultados experimentais ou chancela institucional declarada.
