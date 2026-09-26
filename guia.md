# Guia rápido: o que vamos coletar

Vamos comparar explicações de temas da saúde produzidas por diferentes combinações de agente e modelo.
Primeiro verificaremos se estão corretas; depois, se ajudam a entender o assunto.
Tempo, custo e funcionamento serão avaliados separadamente.

## O que fazer agora

Siga o [workflow](workflow.md) e comece com um piloto: dois sistemas explicando B01 uma vez cada.
“Sistema” significa a combinação fixa de agente, modelo e configuração.
Em cada execução, salve dois arquivos:

| Arquivo | Conteúdo | Quem preenche |
| --- | --- | --- |
| resposta.md | A primeira resposta inteira, com as fontes, sem corrigir o texto. | Você copia a saída do agente. |
| ficha.md | Tema, sistema, rodada, tempo, tokens, custo e ocorrências. | Você copia os dados da ferramenta ou usa N/A. |

Guarde prints ou logs quando a ferramenta mostrar consumo, custo ou erro.
Não peça ao modelo para adivinhar quanto gastou ou quanto demorou.
A ficha contém informações privadas e não vai para os juízes de ciência e pedagogia.

## Os quatro assuntos

Os pedidos completos já estão prontos para copiar e colar.

| Curso | Código | Assunto e pedido pronto |
| --- | --- | --- |
| Biomedicina | B01 | [Hemostasia e coagulação](pacotes/B01.md) |
| Biomedicina | B02 | [Resposta imune e memória](pacotes/B02.md) |
| Nutrição | N01 | [Energia após refeição e no jejum noturno](pacotes/N01.md) |
| Nutrição | N02 | [Absorção e regulação do ferro](pacotes/N02.md) |

Cada pacote contém instruções, pedido e endereços bibliográficos autorizados.
O agente precisa conseguir ler as fontes; sem acesso, a saída será PENDENTE DE FONTES.
Use o mesmo material para todos os sistemas.

## O que acontecerá com os arquivos

| Juiz | O que verifica | Resultado |
| --- | --- | --- |
| Científico, JC | Correção e sustentação bibliográfica. | C1-C3 e APTO, CORRIGIR ou PENDENTE. |
| Pedagógico, JP | Clareza, organização, foco, causalidade e exemplos, somente após APTO. | Cinco dimensões e índice P, a partir de 10 itens. |
| Tecnológico, JT | Conclusão da geração e cumprimento do formato. | T1 e T2. |
| Tempo e custo, JE | Registros de duração, consumo e gasto. | Valores brutos e E1-E3, quando calculáveis. |

Cada papel trabalha separadamente.
O [roteiro de avaliação](avaliacao.md) explica quais arquivos enviar e onde salvar as notas.
Ao final, a consolidação reúne todos os itens em tabelas, preservando falhas e N/A.
O ranking HTML é uma apresentação desses resultados, não um novo julgamento.

## Três cuidados

- Sem alunos participantes, o resultado é qualidade didática estimada, não aprendizagem comprovada.
- Se agente e modelo mudarem juntos, a comparação é entre as combinações, não entre LLMs isolados.
- Dados ausentes ficam N/A; preço baixo ou boa escrita não compensam erro científico.

A proposta completa continua sendo quatro sistemas × quatro temas × cinco rodadas.
Não é preciso executar as 80 gerações para testar o procedimento.
Os detalhes científicos e estatísticos ficam no [protocolo](referencias/protocolo-pontuacao.md).
