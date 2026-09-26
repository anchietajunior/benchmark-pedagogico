# Metaprompt de ranking - protocolo 3.0

Atue como consolidador: receba a tabela de notas anonimizadas e o mapa que liga cada número de modelo ao agente e ao modelo reais, e produza um arquivo HTML com o ranking.
Não reavalie conteúdo, não altere notas e não crie nota geral somando painéis.

## Entradas

Receba um ou mais arquivos de notas gerados pelo metaprompt de julgamento, com a tabela-resumo e as seções por arquivo.
Receba o mapa de identidades no formato `modelo_01: <agente>, <modelo>, <provedor>, <data>`; ele é a única fonte para revelar nomes.
Receba, se existirem, as metas de tempo e custo e a taxa de câmbio usadas no julgamento.
Se um arquivo da tabela não tiver correspondência no mapa, mantenha o código anônimo e sinalize a pendência.
Se o mesmo arquivo aparecer em mais de uma tabela de notas, preserve as duas linhas e marque a divergência; não escolha a mais favorável.

## Regras de ordenação

Dentro de cada assunto, ordene assim: APTO com P completo, em ordem decrescente de P; depois APTO sem P; depois PENDENTE; por fim CORRIGIR, recusas e falhas.
Mantenha empates na mesma posição; não desempate por tecnologia, tempo ou custo.
Ciência, tecnologia e custo ficam em colunas próprias, sem soma ponderada.
No quadro geral por modelo, mostre APTO sobre total de arquivos, média de P apenas dos arquivos elegíveis com o n informado, T1 agregado, T2 médio com cobertura, tempo e custo totais e médios, e custo por APTO (custo de todos os arquivos do modelo dividido pelo número de APTO; indefinido sem APTO; N/A sem custo completo).
Uma média de P só representa o modelo quando todos os seus arquivos forem APTO com P; caso contrário, apresente-a como diagnóstico com cobertura.
Não converta N/A em zero e não atribua a diferença entre modelos ao LLM isolado quando agente e modelo variarem juntos.

## Saída obrigatória

Entregue um único arquivo HTML autocontido, com CSS inline simples e sem scripts, que o pesquisador salvará como `ranking_<data>.html`.
Inclua, nesta ordem:

1. Título, data, versão do protocolo e quantidade de arquivos, assuntos e modelos.
2. Legenda das colunas e a regra de ordenação acima.
3. Uma tabela por assunto com posição, arquivo, agente e modelo, situação científica, C1, C2, C3, P e M1 a M5, T1, T2, tempo, tokens, custo, E1 a E3 e observações.
4. Quadro geral por modelo com as agregações da seção anterior.
5. Pendências: contestações, revisões científicas solicitadas, arquivos sem mapa, valores N/A e seus motivos.
6. Limitações: notas atribuídas por IA sem revisão docente, tempo e custo declarados pelos geradores e não conferidos, ausência de medição de aprendizagem humana e comparação de combinações agente + modelo.

Use tabelas HTML acessíveis, com thead e th com scope, e marque APTO, PENDENTE e CORRIGIR por texto e cor, nunca só por cor.

<ranking versao="3.0">
<notas>[COLE OS ARQUIVOS DE NOTAS COMPLETOS.]</notas>
<mapa>[COLE O MAPA modelo_nn: agente, modelo, provedor, data.]</mapa>
<metas_e_cambio>[COLE METAS E TAXA DE CÂMBIO OU N/A.]</metas_e_cambio>
</ranking>
