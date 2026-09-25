# Avaliação de explicações em Biomedicina e Nutrição

Protocolo 2.1, de 25 de setembro de 2026.
Kit para um estudo exploratório com explicações assistidas por fontes e julgamento de autoria anonimizada.
Correção científica é condição obrigatória: preço, rapidez e boa escrita não compensam erro.

## Comece aqui

Abra o [workflow.md](workflow.md) para seguir a coleta passo a passo.
Ele inclui os metaprompts de geração, julgamento, comparação pareada, apuração técnica e consolidação, além da estrutura de arquivos e dos campos de registro.
O [HTML](index.html) apresenta o estudo visualmente.
O [Protocolo de pontuação](referencias/protocolo-pontuacao.md) é a referência normativa das fórmulas, impedimentos e critérios.

## O que mudou na versão 2.1

- A rubrica pedagógica passa de 25 para 10 subcritérios, com dois itens por dimensão.
- Cada dimensão é a média de dois itens de 0/50/100: pode resultar em 0, 25, 50, 75 ou 100.
- O índice pedagógico P continua sendo a média das cinco dimensões, agora em passos de 5 por explicação.
- Ciência mantém seus três indicadores e a condição obrigatória APTO antes da avaliação pedagógica.
- Tecnologia, temas, fontes, geração, repetições e comparação pareada opcional mantêm as regras anteriores.
- O piloto passa a verificar explicitamente ambiguidades, sobreposições e estabilidade dos 10 itens antes da coleta definitiva.

Mais números na escala não criam mais informação.
Os dados adicionais vêm das evidências, subcritérios, medições e repetições.
As novas notas não são probabilidades nem uma escala psicométrica validada.
Dez itens é uma escolha prática, não uma quantidade validada pela literatura.
Não converter automaticamente resultados antigos: conservar a versão original e, se necessário, reavaliar os textos com o protocolo 2.1.
Os códigos M foram redefinidos; um mesmo código em versões diferentes não autoriza reaproveitar a nota.

## Materiais

| Arquivo | Uso |
| --- | --- |
| [Workflow](workflow.md) | Executar a coleta e organizar os arquivos até o relatório final. |
| [Guia visual](index.html) | Entender etapas, temas, critérios e resultados. |
| [Protocolo de pontuação](referencias/protocolo-pontuacao.md) | Fornecer critérios completos aos avaliadores e analistas. |
| [Metaprompt de geração](prompts/gerar-explicacao.md) | Produzir uma explicação com pedido e fontes comuns. |
| [Metaprompt científico-pedagógico](prompts/avaliar-explicacoes.md) | Conferir ciência e pontuar uma única resposta anonimizada. |
| [Metaprompt tecnológico](prompts/apurar-tecnologia.md) | Apurar registros sem reavaliar conteúdo. |
| [Metaprompt pairwise](prompts/comparar-pares.md) | Comparar dois APTO em duas ordens, quando previsto. |
| [Metaprompt de consolidação](prompts/consolidar-resultados.md) | Conferir cálculos e unir os três painéis sem ocultar falhas. |
| [Bibliografia por tema](referencias/bibliografia-por-tema.md) | Orientar consulta a fontes identificadas. |
| [Gabaritos conceituais](referencias/gabaritos-conceituais.md) | Guiar somente o juiz, com confronto obrigatório nas fontes. |
| [Nota de pesquisa metodológica](referencias/metodologia-avaliacao-tecnologica.md) | Consultar a pesquisa inicial e alternativas; as regras vigentes estão no protocolo de pontuação. |

## Quatro temas

| Curso | Código | Pedido |
| --- | --- | --- |
| Biomedicina | B01 | [Hemostasia e coagulação](prompts/pedidos/B01-hemostasia.md) |
| Biomedicina | B02 | [Resposta imune adaptativa e memória](prompts/pedidos/B02-memoria-imunologica.md) |
| Nutrição | N01 | [Metabolismo após refeição e no jejum noturno](prompts/pedidos/N01-metabolismo-energetico.md) |
| Nutrição | N02 | [Absorção e regulação do ferro](prompts/pedidos/N02-metabolismo-do-ferro.md) |

Os conteúdos se relacionam às disciplinas publicadas nos cursos de [Biomedicina](https://www.unirios.edu.br/graduacao/biomedicina) e [Nutrição](https://www.unirios.edu.br/graduacao/nutricao) do Centro Universitário do Rio São Francisco.
Os planos de [Hematologia Clínica, 2025.1](https://www.unirios.edu.br/arquivos/files/cursos/biomedicina/2025/1_semestre/5p/hematologia_clinica.pdf) e [Nutrição e Metabolismo, 2024.2](https://www.unirios.edu.br/arquivos/files/cursos/nutricao/2024/2_semestre/2p/nutricao_e_metabolismo.pdf) ajudam a fundamentar a pertinência curricular.
Não se afirma que sejam os quatro temas mais difíceis dos cursos.

## Três painéis, sem nota única

| Painel | Registros e notas |
| --- | --- |
| Científico | K1 a K6 e C1 a C3, com evidências, erros, pendências e situação APTO/CORRIGIR/PENDENTE. |
| Pedagógico | M1 clareza; M2 organização; M3 foco; M4 causalidade; M5 aplicação; cada M resulta de dois subcritérios e P é a média das cinco dimensões. |
| Tecnológico | T1 latência total; T2 primeiro texto; T3 custo; T4 conclusão técnica; T5 conformidade formal; tokens e comprovantes preservados. |

Os subcritérios pedagógicos recebem 0, 50 ou 100 com evidência; suas médias produzem notas de 0 a 100.
Somente APTO recebe pedagogia.
C1 a C3 podem descrever problemas em respostas CORRIGIR quando houver evidência suficiente, mas não cancelam os impedimentos científicos.
As notas T1 a T3 dependem de metas e limites registrados antes da coleta definitiva; sem eles, ficam N/A e os valores brutos permanecem publicados.
T4 mede funcionamento operacional, não correção: uma recusa entregue normalmente pode concluir tecnicamente e falhar no conteúdo.
T5 é medido no original, antes da anonimização.

## Repetições, comparação e limites

Comece com um piloto separado de dois modelos e B01.
Aplique J1/J2 aos textos do piloto e compare os 10 itens dos APTO, registrando divergências antes de congelar a rubrica.
Sem APTO, obtenha material elegível para testar a parte pedagógica antes da coleta definitiva.
A proposta completa tem quatro modelos, quatro temas e cinco rodadas, totalizando 80 execuções planejadas.
Cinco é uma escolha prática, não um tamanho amostral validado; quatro temas continuam sendo quatro temas.

Cada resposta recebe J1 e J2 em sessões novas e independentes, com códigos diferentes.
J1 é o resultado primário pré-definido; J2 verifica estabilidade e não cria outra amostra de conteúdo.
Metas, versões, fontes, chamadas e respostas originais são preservadas.
A classificação global de uma rodada exige quatro APTO e quatro P completos; nas cinco rodadas, a média geral exige 20 APTO e 20 P completos.
Distribuições entre respostas aprovadas são diagnósticas, não ranking global por média de sobreviventes.
Desacordos científicos que afetem elegibilidade precisam de revisão antes de recomendar vencedor definitivo.

A rubrica adapta princípios do [PEMAT](https://www.ahrq.gov/health-literacy/patient-education/pemat.html), de [Mayer](https://doi.org/10.1111/j.1365-2923.2010.03624.x) e do [Eberly Center](https://www.cmu.edu/teaching/principles/learning.html), sem reproduzir instrumentos validados para este público.
O PEMAT foi desenvolvido para educação de pacientes e parte da evidência de Mayer é multimodal.
LLM-as-a-Judge tem vieses e não substitui revisão especializada.
Recomenda-se revisão docente dos gabaritos e do novo protocolo antes da coleta definitiva.
Sem alunos participantes, a conclusão é qualidade didática estimada por IA, não aprendizagem demonstrada.
