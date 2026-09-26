# Guia do estudo

Vamos comparar sistemas de IA explicando quatro temas de saúde.
Primeiro vem a correção científica; depois, a qualidade didática estimada.

| Curso | Tema |
| --- | --- |
| Biomedicina | B01 - Hemostasia e coagulação. |
| Biomedicina | B02 - Resposta imune e memória. |
| Nutrição | N01 - Metabolismo energético após refeição e no jejum noturno. |
| Nutrição | N02 - Absorção e regulação do ferro. |

## Material de estudo esperado

Cada explicação deve ter de 800 a 1.200 palavras, além da lista final de fontes.
O texto desenvolve os seis pontos do tema, explica as conexões do mecanismo, acompanha um exemplo e esclarece duas confusões conceituais.
Duas perguntas com respostas comentadas ajudam a revisar o raciocínio; a síntese final reúne três ideias principais.
O objetivo é uma pequena aula para estudo individual, com linguagem simples e profundidade delimitada, sem ampliar o assunto para além do recorte.
Quantidade de palavras não demonstra aprendizagem; os juízes continuam avaliando correção e qualidade didática estimada.

## O que você faz

Siga somente o [workflow](workflow.md) para começar.
Copie o [arquivo completo do tema](prompts/gerar-explicacao.md); com acesso local, o agente criará o ID e salvará o registro em ~/Documents/coletas/entrada/.
Confira a gravação, vincule o nome do arquivo ao planejamento e complete os dados que dependem de observação externa.
O registro reúne dados privados e resposta original; não é o arquivo enviado aos juízes de conteúdo.
O metaprompt organizador prepara essa separação e uma fila de arquivos para enviar.
Não é preciso instalar skills, construir tabelas, calcular notas ou criar códigos anônimos manualmente.

## Quem dá as notas

| Juiz | O que verifica | Resultado |
| --- | --- | --- |
| JC - Científico | Correção dos seis pontos e sustentação nas fontes lidas. | C1-C3 e APTO, CORRIGIR ou PENDENTE. |
| JP - Pedagógico | Clareza, organização, foco, causalidade e exemplos, somente após APTO. | Cinco dimensões e índice P, a partir de 10 itens. |
| JT - Tecnológico | Conclusão da geração e cumprimento do formato. | T1 e T2. |
| JE - Tempo e custo | Duração, consumo e gasto documentados. | Valores brutos e E1-E3, quando calculáveis. |

Cada papel recebe apenas seus materiais e trabalha em sessão separada.
Ciência e pedagogia têm duas passagens para verificar estabilidade, com códigos diferentes.
O organizador não julga; o consolidador reúne os quatro painéis sem produzir uma nota geral.
O [roteiro de avaliação](avaliacao.md) explica como seguir a fila e salvar os pareceres.

## Limites que permanecem

- Sem alunos participantes, as notas não comprovam aprendizagem ou probabilidade de compreensão.
- Agente e modelo diferentes comparam sistemas completos, não o efeito isolado do LLM.
- Anonimização remove identificadores explícitos, mas não garante que o estilo seja irreconhecível.
- Medidas desconhecidas ficam N/A; sem metas prévias de tempo/custo, publicam-se valores brutos, não notas E inventadas.
- Boa escrita, rapidez e preço não compensam erro científico; desacordos exigem revisão especializada.

Comece com o piloto de dois sistemas sobre B01.
A proposta definitiva continua sendo quatro sistemas × quatro temas × cinco rodadas, separada do piloto.
Antes dela, use o [planejamento completo](modelos/planejamento.md) para fixar condições, fontes, ordem, metas e revisão humana.
Critérios e fórmulas estão no [protocolo](referencias/protocolo-pontuacao.md).
