# Avaliação de explicações em Biomedicina e Nutrição

Protocolo 3.0, de 25 de setembro de 2026.
Kit documental para um estudo exploratório com explicações assistidas por fontes e autoria anonimizada.
Quatro juízes avaliam competências separadas; a consolidação reúne os resultados sem criar uma nota que compense erro científico.
Não há resultados coletados nem executor automatizado neste projeto; a coleta e o julgamento são feitos com os metaprompts.

## Comece aqui

O [workflow](workflow.md) explica geração, armazenamento, anonimização, quatro avaliações e consolidação, com sete metaprompts completos.
O [guia](guia.md) apresenta o fluxo, os temas e os critérios em Markdown.
O único arquivo `.html` do estudo é o ranking final, gerado pelo metaprompt de ranking depois da coleta.
O [protocolo](referencias/protocolo-pontuacao.md) é a referência normativa; o [esquema de resultados](referencias/resultados-e-registros.md) define registros e tabelas.

## Fluxo manual em três metaprompts

1. [Geração](prompts/gerar-explicacao.md): cole em cada agente e salve a resposta integral como `<curso>_assunto_<nn>_modelo_<nn>.md`, por exemplo `biomedicina_assunto_02_modelo_01.md`, sem nada que identifique agente ou modelo; o rodapé "Registro de geração", com tempo, tokens e custo, é escrito pelo próprio agente.
2. [Julgamento](prompts/julgar-explicacoes.md): uma sessão recebe os arquivos anônimos, o protocolo, pedidos, gabaritos e fontes, aplica JC, JP, JT e JE em sequência e devolve um `.md` com a tabela de notas por arquivo.
3. [Ranking](prompts/ranquear-resultados.md): recebe as tabelas de notas e o mapa `modelo_nn` para agente e modelo, que só o pesquisador possui, e gera um `.html` ordenado sem nota geral.

Só o pesquisador conhece a correspondência entre o número do modelo e o sistema real; ela não entra nos arquivos nem na sessão de julgamento.

## Quatro juízes, uma tabela de resultados

| Papel | Responsabilidade | Registros e notas |
| --- | --- | --- |
| JC - Científico | Conferir correção e bibliografia. | K1-K6, inventários de afirmações/vínculos, C1-C3 e APTO/CORRIGIR/PENDENTE. |
| JP - Pedagógico | Avaliar indícios de compreensibilidade, somente após APTO. | Dez subcritérios, M1-M5 e índice P; não mede aprendizagem real. |
| JT - Tecnológico | Verificar funcionamento e instruções formais. | T1 conclusão e T2 conformidade, com F1-F5 ou FP1-FP3. |
| JE - Tempo e custo | Apurar registros de recursos. | Segundos, tokens, reais e E1-E3 quando houver metas prévias válidas. |

JC e JP atuam em sessões separadas, sem identidade do autor, tempo ou custo.
JP recebe somente um certificado APTO do ramo científico correspondente, nunca C1-C3 ou o parecer completo.
JC1/JP1 são primários; JC2/JP2 verificam estabilidade dentro de cada papel.
JT/JE podem usar inspeções, testes e cálculos sem LLM; registrar o método efetivamente usado.
Quatro papéis não exigem quatro LLMs e não garantem independência estatística.
O consolidador confere cálculos e reúne os pareceres; não é um quinto juiz.

A saída inclui resultados-completos.csv com todos os itens, notas, dados brutos, evidências e N/A justificados.
resultados-resumo.csv reúne os quatro painéis por execução; estabilidade.csv preserva as comparações entre passagens.
Zero é falha observada; N/A é ausência, impedimento ou não aplicabilidade identificada.

## O que muda na versão 3.0

- Ciência e pedagogia deixam de compartilhar a mesma chamada.
- Tecnologia fica com conclusão operacional e conformidade; tempo e custo ganham apuração própria.
- Temas, fontes, seis pontos científicos por tema e 10 subcritérios pedagógicos são preservados.
- O antigo metaprompt combinado vira um índice de encaminhamento, não deve ser executado.
- Os registros identificam agente + modelo + configuração, evitando confundir comparação de sistemas com comparação do LLM isolado.
- Resultados antigos ficam em sua versão; não converter ou misturar notas automaticamente.

Os subcritérios pedagógicos usam 0/50/100; cada M é a média de dois itens e P é a média das cinco dimensões.
M varia em passos de 25 e P em passos de 5 por explicação.
Essa resolução não cria uma escala psicométrica validada nem uma probabilidade de entendimento.
E1-E3 dependem de metas e limites definidos antes da coleta; sem eles, publique dados brutos e N/A nas notas.

## Materiais

| Arquivo | Uso |
| --- | --- |
| [Workflow](workflow.md) | Seguir a coleta e copiar os metaprompts de cada etapa. |
| [Guia](guia.md) | Consultar fluxo, conteúdos e quatro papéis. |
| [Protocolo](referencias/protocolo-pontuacao.md) | Aplicar critérios, fórmulas e impedimentos. |
| [Resultados e registros](referencias/resultados-e-registros.md) | Preparar manifestos, evidências e tabelas completas. |
| [Geração](prompts/gerar-explicacao.md) | Gerar uma explicação com pedido e fontes comuns. |
| [JC - Ciência](prompts/avaliar-ciencia.md) | Conferir fontes, cobertura e afirmações. |
| [JP - Pedagogia](prompts/avaliar-pedagogia.md) | Pontuar os 10 itens do texto certificado. |
| [JT - Tecnologia](prompts/apurar-tecnologia.md) | Apurar conclusão e conformidade no original. |
| [JE - Tempo e custo](prompts/apurar-tempo-custo.md) | Apurar recursos e notas E. |
| [Pairwise opcional](prompts/comparar-pares.md) | Comparar dois APTO em duas ordens, dentro de JP. |
| [Consolidação](prompts/consolidar-resultados.md) | Reunir os quatro painéis e a estabilidade. |
| [Julgamento em sessão única](prompts/julgar-explicacoes.md) | Pontuar os arquivos anônimos nos quatro painéis e gerar a tabela de notas. |
| [Ranking](prompts/ranquear-resultados.md) | Cruzar notas com o mapa de identidades e gerar o HTML ordenado. |
| [Bibliografia](referencias/bibliografia-por-tema.md) | Preparar fontes acessíveis por tema. |
| [Gabaritos](referencias/gabaritos-conceituais.md) | Orientar somente JC, sem substituir fontes. |
| [Pesquisa metodológica histórica](referencias/metodologia-avaliacao-tecnologica.md) | Consultar alternativas anteriores, sem substituir as regras vigentes. |

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

## Modelo e agente não são a mesma variável

Compare quatro sistemas fixos, com agente, LLM, provedor, configurações e acesso às fontes registrados.
Se agente e modelo mudarem juntos, a diferença pertence à combinação, não pode ser atribuída somente ao LLM.
Não há vantagem demonstrada apenas por os dois serem do mesmo fornecedor.
A [documentação de avaliação da Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distingue o modelo do ambiente que organiza sua atuação.
Para isolar o agente seria necessário outro desenho controlado, mantendo o mesmo modelo em agentes compatíveis.

Não forneça a raiz deste projeto ao gerador: ela contém gabaritos e materiais de avaliação.
Use sessões e diretórios isolados, apenas com o pedido e o pacote autorizado de fontes.
Documente também regras globais, skills, memória e configurações não observáveis, inclusive dos juízes.

## Piloto, comparação e limites

Comece com dois sistemas e B01 em um piloto separado.
Teste JC1/JC2 e, nos ramos APTO, JP1/JP2; confira JT/JE e os registros.
Sem APTO, o piloto pedagógico ainda não foi feito.
Solicite revisão docente de fontes, gabaritos e rubrica; uma amostra humana cega de julgamentos ajuda a verificar o desempenho dos próprios juízes.

A proposta definitiva tem quatro sistemas × quatro temas × cinco rodadas = 80 execuções planejadas.
Cinco repetições é uma escolha exploratória, não cálculo de poder; quatro temas continuam sendo quatro temas.
A média global exige quatro APTO/quatro P por rodada e 20 APTO/20 P no conjunto completo por sistema.
Médias apenas dos sobreviventes são diagnósticas, não ranking global.
Desacordos científicos e alertas de JP tornam a recomendação provisória até revisão.

A rubrica adapta princípios do [PEMAT](https://www.ahrq.gov/health-literacy/patient-education/pemat.html), de [Mayer](https://doi.org/10.1111/j.1365-2923.2010.03624.x) e do [Eberly Center](https://www.cmu.edu/teaching/principles/learning.html), sem reproduzir instrumentos validados para este público.
O PEMAT foi desenvolvido para educação de pacientes e parte da evidência de Mayer é multimodal.
LLM-as-a-Judge tem vieses e não substitui revisão especializada.
Sem estudantes participantes, a conclusão é qualidade didática estimada por IA, não aprendizagem demonstrada.
