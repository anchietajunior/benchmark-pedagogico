# Avaliação: o que enviar a cada juiz

Use este roteiro somente depois de salvar as respostas e fichas pelo [workflow](workflow.md).
Você não dará as notas: copiará as instruções, fornecerá os materiais e salvará cada parecer.
Os critérios completos estão no [protocolo 3.1](referencias/protocolo-pontuacao.md), que deve ser anexado aos avaliadores.
Anexe o arquivo de fato ou cole seu conteúdo; citar um caminho não garante acesso.

## 1. Prepare cópias sem autoria

Mantenha resposta.md e ficha.md originais na pasta da execução.
Crie uma pasta avaliacoes/ para guardar as cópias e os pareceres.
Para cada passagem, escolha um código aleatório sem relação com o sistema, como Q7M2.
Use códigos diferentes em JC1, JC2, JP1 e JP2.
Registre a correspondência somente no final privado da ficha.

Copie resposta.md para avaliacoes/Q7M2.md.
Se houver autoria explícita, remova somente esse trecho e registre a remoção na ficha.
Preserve fontes, estrutura, erros e extensão.
Um eventual rodapé indevido de tempo/custo fica no original e é retirado da cópia de conteúdo, com remoção registrada.
Isso não transforma o rodapé em dado técnico verificado.
Não inclua sistema, tempo, custo ou nome identificador no arquivo enviado a JC/JP.

## 2. Ciência: a resposta pode avançar?

Abra uma sessão nova para uma única resposta.
Copie o [metaprompt científico](prompts/avaliar-ciencia.md) e preencha seus campos:

- Identificação: código público, tema, rodada e JC1.
- Protocolo: [protocolo de pontuação](referencias/protocolo-pontuacao.md).
- Pedido: texto do tema em [B01](prompts/pedidos/B01-hemostasia.md), [B02](prompts/pedidos/B02-memoria-imunologica.md), [N01](prompts/pedidos/N01-metabolismo-energetico.md) ou [N02](prompts/pedidos/N02-metabolismo-do-ferro.md).
- Gabarito: somente a seção do tema em [gabaritos conceituais](referencias/gabaritos-conceituais.md).
- Fontes: as mesmas referências/trechos usados na geração.
- Resposta: a cópia anonimizada, sem ficha.

Salve o parecer inteiro em avaliacoes/Q7M2-JC1.md.
Confira se há situação científica, notas calculáveis e evidências.
Se estiver incompleto, registre a pendência; não complete notas por conta própria.

## 3. Pedagogia: somente se JC1 disser APTO

Prepare a mesma resposta com o código de JP1, sem alterar o conteúdo.
Copie o [certificado](modelos/certificado-pedagogico.md), preencha seus seis campos e confira a ligação privada com JC1.
Crie o certificado somente quando o parecer científico correspondente for APTO.

Em outra sessão nova, use o [metaprompt pedagógico](prompts/avaliar-pedagogia.md).
Envie protocolo, identificação JP1, pedido, fontes, cópia anonimizada e certificado.
Não envie o parecer científico, suas notas, gabarito, ficha ou identidade.
Salve a resposta do juiz como avaliacoes/CODIGO-JP1.md.

Se JC1 não for APTO, não faça essa chamada.
Salve um registro administrativo com situação BLOQUEADO, M/P N/A, motivo e NÃO EXECUTADO.
Se JP solicitar revisão científica, preserve o alerta e encaminhe a um especialista; não troque a nota pelo parecer mais favorável.

## 4. Tecnologia e recursos: duas apurações separadas

| Papel e prompt | O que enviar | O que salvar |
| --- | --- | --- |
| [JT - Tecnologia](prompts/apurar-tecnologia.md) | Protocolo, ID/tema/rodada, pedido enviado, resposta original e somente os campos iniciada, status_operacional, ramo_saida e ocorrencias da ficha. | avaliacoes/JT.md |
| [JE - Tempo e custo](prompts/apurar-tempo-custo.md) | Protocolo, ID/tema/rodada, situação operacional conferida por JT, dados de tempo/uso/custo da ficha, comprovantes e metas ou N/A. | avaliacoes/JE.md |

Não envie a ficha inteira a JT, nem notas de conteúdo a JT/JE.
JE não precisa da explicação.
Se não houve resposta, forneça a falha documentada, não uma explicação inventada.
Não afirme que executou testes automáticos; informe inspeção por LLM ou humana quando for o caso.
Sem tokens, custo, metas ou primeiro texto observados, a medida afetada fica N/A.
Guarde dados de consumo/custo dos próprios julgamentos separadamente dos da geração.

## 5. Repita o julgamento de conteúdo para verificar estabilidade

JC2 é uma repetição de JC1 em sessão nova, com outro código e a mesma resposta.
JP2 usa o APTO de JC2, outro certificado e outra sessão.
Repita os passos 2 e 3, sem mostrar os pareceres anteriores e alterando a ordem das respostas no lote.
Não gere uma explicação nova.
Se ambos forem APTO, serão seis pareceres por execução: JC1, JC2, JP1, JP2, JT e JE.
Se a ciência bloquear a pedagogia, haverá registros de bloqueio no lugar desses pareceres.
Quatro papéis não significam quatro chamadas no desenho com repetição.
A comparação pareada é opcional e não é necessária para começar; só a faça se prevista no planejamento.

## 6. Reúna as notas, sem julgar de novo

Depois de salvar e bloquear os pareceres, abra uma sessão de consolidação.
Use [consolidar-resultados.md](prompts/consolidar-resultados.md).
Envie protocolo, [esquema de registros](referencias/resultados-e-registros.md), planejamento, fichas/mapa privado, todos os pareceres e certificados.
Inclua ausências, bloqueios e dados de execuções planejadas não iniciadas.
No fluxo simples, planejamento.md faz o papel do manifesto; o final de cada ficha faz o papel do mapa.
O consolidador organiza as tabelas, não cria avaliações ausentes.

Salve em coleta/piloto/consolidado/ ou coleta/definitiva/consolidado/:

- resultados-completos.csv: todos os itens, evidências e passagens.
- resultados-resumo.csv: uma linha por execução com os quatro painéis.
- estabilidade.csv: comparação das passagens de cada papel.
- relatorio.md: tabelas, cobertura, orçamento, limitações e pendências.

Se quiser o relatório visual, use o [metaprompt de ranking](prompts/ranquear-resultados.md) sobre essa consolidação já conferida.
Forneça nomes dos sistemas somente se quiser revelá-los nessa etapa.
O piloto não autoriza um vencedor global de quatro temas.
Desacordos científicos que afetem elegibilidade precisam de revisão antes de uma recomendação definitiva.

Confira por amostragem se código, resposta e parecer correspondem e se o consolidador não transformou N/A em zero.
Sem revisão humana, declare essa limitação; notas por IA não comprovam aprendizagem.
