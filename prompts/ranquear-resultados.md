# Metaprompt de apresentação do ranking - protocolo 3.2

Atue como apresentador de resultados já consolidados.
Receba resultados-resumo.csv, relatorio.md, planejamento e, quando necessário, resultados-completos.csv e estabilidade.csv.
Use o Protocolo de pontuação 3.2 fornecido.
Não reavalie textos, invente notas, escolha o parecer mais favorável ou crie uma média dos quatro painéis.

## Conferência e ordenação

Confira versão, fase, temas/rodadas planejados e sistema_id.
Não trate linhas de estabilidade como novas explicações.
Se houver duplicatas, junções pendentes ou contestações, mantenha-as visíveis e suspenda a ordenação afetada.
Dentro de cada tema e rodada, ordene APTO em JC1 com JP1 concluído por P decrescente, preservando empates.
Mostre APTO incompleto, PENDENTE, CORRIGIR e AUSENTE em grupos fora do ranking, com seus motivos.
Não desempate P por tempo, custo ou T1/T2.
Recomendação afetada por desacordo científico fica provisória até revisão.

Média global da rodada exige os dois temas (B01 e B02) APTO com P completo por sistema.
Média geral das cinco rodadas exige 10 APTO e 10 P completos por sistema.
Uma média apenas dos sobreviventes é diagnóstico com n elegível/n previsto, não ranking global.
No piloto, apresente somente os temas/rodadas realizados e suas limitações, sem extrapolar ao estudo completo.
Agrupe por sistema_id, sem misturar agentes, modelos, versões ou configurações.

Transcreva medidas e agregados da consolidação, com cobertura e origem.
Preserve falhas, tempos até erro, custos incorridos e todos os N/A.
Diferencie cobranças observadas, estimativas documentadas e dados indisponíveis.
Não converta moeda sem taxa, fonte e data.
Não use números autodeclarados pelo gerador como cobrança ou cronometragem verificada.
Custo por APTO inclui todas as gerações do recorte e APTO em JC1; sem custo completo, N/A; sem APTO, indefinido.
O fornecimento do mapa com autorização explícita permite mostrar agente/modelo; caso contrário, mantenha sistema_id.

## Entrega

Produza um único HTML autocontido, com CSS inline, sem scripts, para salvar como ranking_DATA.html.
Inclua título, fase, data, protocolo, quantidades previstas/observadas e legenda.
Mostre tabelas por tema/rodada com posição, sistema, situações JC1/JP1, C1-C3, M1-M5/P, T1/T2, E1-E3, tempos, tokens, custo, origem e pendências.
Inclua os 10 subitens pedagógicos em tabela de detalhamento, sem substituir a tabela completa de evidências.
Mostre agregados elegíveis, estabilidade e limitações conforme o relatório.
Use thead e th com scope; identifique situações por texto, não somente por cor.
Explique que ciência, pedagogia, tecnologia e recursos não são somados em nota geral.
Sem revisão humana ou aprendizagem medida, declare a ausência.
A comparação é entre sistemas agente + modelo, não o efeito isolado do LLM.

<ranking versao="3.2">
<protocolo>[ANEXE O PROTOCOLO 3.2.]</protocolo>
<planejamento>[FASE, SISTEMAS, TEMAS, RODADAS E EXECUÇÕES PREVISTAS.]</planejamento>
<consolidado>[ANEXE RESUMO, RELATÓRIO E TABELAS DETALHADAS NECESSÁRIAS.]</consolidado>
<identidades>[MAPA sistema_id E AUTORIZAÇÃO PARA REVELAR NOMES, OU MANTER ANÔNIMO.]</identidades>
</ranking>
