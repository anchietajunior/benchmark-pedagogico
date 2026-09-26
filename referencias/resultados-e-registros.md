# Resultados e registros - protocolo 3.1

Este é o esquema de armazenamento e consolidação dos quatro papéis.
Leia em conjunto com o [protocolo](protocolo-pontuacao.md) e o [workflow](../workflow.md).
Os exemplos são estruturas vazias, não resultados experimentais.
Não crie notas nem medições para preencher células.
Use UTF-8, vírgula como separador de CSV, ponto decimal, aspas em campos com vírgulas/quebras de linha e N/A acompanhado de motivo.
Preserve valores sem arredondamento nos registros; use duas casas decimais somente na apresentação.

## Coleta simples sem CSV

Para começar manualmente, use [planejamento](../modelos/planejamento.md) uma vez e [ficha de coleta](../modelos/ficha-coleta.md) em cada execução.
Não é necessário preencher as tabelas CSV deste documento durante a geração.
Planejamento e fichas ficam privados; o consolidador os converte para os campos detalhados depois.

| No fluxo manual | Equivalente no esquema detalhado |
| --- | --- |
| planejamento.md | Manifesto, sistemas, avaliadores e metas, com datas e configurações. |
| E001/resposta.md | Original da execução E001. |
| E001/ficha.md | Registro operacional, uso/custo e, ao avaliar, mapa privado dos códigos de cada passagem. |
| E001/comprovantes/ | Prints, logs, cobrança e registros brutos efetivamente disponíveis. |
| E001/avaliacoes/ | Cópias públicas, certificados, pareceres e bloqueios, ligados pela ficha. |
| consolidado/ | Tabelas e relatório produzidos somente após o julgamento. |

Dados não fornecidos ficam N/A; formato simples não transforma uma medida ausente em zero.
O consolidador deve pedir esclarecimento quando não conseguir mapear um campo, sem adivinhá-lo.
A chave detalhada de uma execução é preservada mesmo quando o registro foi feito em Markdown.

## 1. Identidades, condições e acesso

Uma execução tem um execucao_id único, um sistema_id, tema, rodada, fase e versão.
sistema_id identifica uma configuração fixa, não apenas o nome comercial do modelo.
Alterações de agente, modelo, provedor, fontes ou parâmetros relevantes não podem ser agrupadas silenciosamente na mesma condição.
Códigos públicos de JC1, JC2, JP1 e JP2 são diferentes e não contêm sistema_id.
Somente depois do bloqueio dos pareceres o consolidador os liga à execução e ao sistema.
Não envie registros privados, pastas de outros concorrentes ou resultados aos geradores ou juízes de conteúdo.

Guarde em 01-privado/sistemas.csv, ou em registros vinculados por sistema_id:

| Grupo | Campos mínimos |
| --- | --- |
| Identificação | sistema_id, agente_nome, agente_versao, agente_modo, provedor, modelo_id_exato, modelo_versao, modo_acesso, data_configuracao. |
| Orquestração | roteamento, modelos_auxiliares, passos_limite, politica_reenvio, timeout, limite_saida, orcamento_raciocinio. |
| Contexto | instrucoes_visiveis_arquivo, skills, arquivos_regras, memoria, personalizacao, compactacao, isolamento_execucao. |
| Ferramentas | ferramentas_habilitadas, permissoes, acesso_rede, fontes_versao, politica_acesso_fontes. |
| Parâmetros | temperatura, top_p, seed e demais valores realmente expostos, sem presumir equivalência entre provedores. |
| Observabilidade | configuracoes_ocultas, rastros_disponiveis, local_comprovantes, limitacoes. |

Use NÃO OBSERVÁVEL para configuração oculta; NÃO INFORMADO para dado não fornecido; DESATIVADO somente quando confirmado.
Não arquive senhas, chaves de API ou tokens de autenticação.
Registre separadamente a mesma configuração para os avaliadores, com avaliador_config_id e papel/passagem.
JT/JE feitos sem LLM registram método, responsável e versão da rotina, quando existente.
Sessões distintas do mesmo avaliador não são avaliadores estatisticamente independentes.

Mapa privado mínimo:

```csv
versao_protocolo,execucao_id,sistema_id,tema,rodada,papel,passagem,codigo_publico,arquivo_original,arquivo_anonimizado,alteracoes_anonimizacao,parecer_origem,certificado_arquivo
```

Registre remoções de autoria explícita e de eventual rodapé operacional indevido nas cópias de conteúdo; preserve o original e o conteúdo didático, a ordem, os erros, a estrutura e as referências.
Nomes de arquivos e metadados enviados também não podem revelar autoria.
Certificados de JP contêm somente versão, código público de destino, tema, rodada, passagem de origem JC1/JC2 e APTO.
A ligação ao parecer e ao corpo original fica no mapa privado, não no certificado entregue ao juiz.

## 2. Registros de execução e recursos

Preserve pedido enviado, fontes fornecidas, saída original, horários com fuso, tentativas e recibos disponíveis.
Diferencie saída vazia efetivamente recebida de inexistência de resposta por falha.
Registre iniciada, status_operacional, ramo_saida, método de cronometragem, versão das metas e a origem de cada medida.
A classificação operacional é apurada por JT; JE usa essa evidência sem reinterpretar o conteúdo.

Cabeçalho de tentativas:

```csv
execucao_id,tentativa_id,tipo,inicio,primeiro_texto,fim,status,request_id,uso_arquivo,custo_original,moeda,custo_brl,origem_custo,comprovante,motivo_na
```

tipo distingue chamada principal, chamada interna do agente, ferramenta e reenvio de transporte.
Preserve hierarquia/IDs quando uma ferramenta ou tentativa contiver várias chamadas, sem somar subtotais e totais duplicadamente.
Inclua todas as chamadas internas e reenvios no custo de geração, não apenas a última resposta.
Mensuração de latência cobre o primeiro envio até o término final, incluindo ferramentas e espera entre tentativas.
Sem rastros completos, sinalize custo parcial; não o apresente como custo integral do sistema.
Não estime tokens por quantidade de palavras.

Recursos de julgamento e pesquisa têm registros próprios com categoria, papel, passagem, avaliador_config_id, uso e cobrança.
Não entram em E3 da geração.
Taxa de assinatura não é custo marginal observado por resposta.
Guarde campos brutos de raciocínio/cache para documentar quando já estão incluídos em entrada/saída.
Tarifas e câmbio exigem moeda, unidade, fonte, data e memória de cálculo.
Reconstrução por tabela de preços é ESTIMADO; cobrança comprovada é MEDIDO; ausência é INDISPONÍVEL.

## 3. Tabela única detalhada: resultados-completos.csv

Uma linha corresponde a execução + papel + passagem + item.
Essa chave é única dentro de versão e fase.
A/V usam IDs locais únicos por inventário e passagem; o mesmo número em JC1 e JC2 não garante a mesma afirmação.

```csv
versao_protocolo,fase,execucao_id,sistema_id,tema,rodada,codigo_publico,papel,passagem,item,nota_0_100,valor_bruto,unidade,numerador,denominador,situacao,execucao_avaliacao,avaliador_config_id,metodo_verificacao,arquivo_origem,evidencia,motivo_na
```

| Campo | Regra |
| --- | --- |
| papel | JC, JP, JT ou JE; consolidação não é um quinto avaliador. |
| passagem | JC1/JC2, JP1/JP2 ou UNICA para JT/JE. |
| nota_0_100 | Nota permitida para o item ou N/A; não converter todo dado bruto em nota. |
| valor_bruto / unidade | Segundos, tokens, reais, classificação textual ou outros registros explicitados. |
| numerador / denominador | Contagens e somas necessárias à auditoria, ou N/A quando não se aplicam. |
| situacao | Situação da avaliação do papel; a situação operacional também tem linha própria de JT. |
| execucao_avaliacao | EXECUTADO ou NÃO EXECUTADO; um bloqueio registrado pelo pesquisador não vira julgamento por IA. |
| avaliador_config_id | Configuração privada rastreável do avaliador, ou N/A quando não executado. |
| metodo_verificacao | LLM, HUMANO, PROGRAMATICO, CALCULO ou REGISTRO ADMINISTRATIVO, conforme o que realmente ocorreu. |
| arquivo_origem / evidencia | Parecer ou comprovante e trecho/localização que sustentam o item; sem caminhos privados identificadores em versões compartilhadas. |
| motivo_na | Obrigatório quando a nota esperada ou medida estiver ausente; distinguir NÃO APLICÁVEL, BLOQUEADO, NÃO INICIADO e DADO INDISPONÍVEL. |

Inventário obrigatório:

| Papel | Itens e linhas | Notas e dados |
| --- | --- | --- |
| JC, em cada passagem | K1-K6, C1-C3, A1…An e V1…Vn existentes, SITUACAO_CIENTIFICA. | K em 0/50/100; A/V em 0/100; C conforme fórmula; N/A quando não verificável. |
| JP, em cada passagem | M1.1/M1.2 a M5.1/M5.2, M1-M5, P, SITUACAO_PEDAGOGICA. | Dez itens em 0/50/100, dimensões em passos de 25 e P em passos de 5; bloqueio não é zero. |
| JT | T1, T2, F1-F5, FP1-FP3, STATUS_OPERACIONAL, RAMO_SAIDA, INICIADA, PALAVRAS_CORPO. | F ou FP do ramo ativo em 0/100; ramo não aplicado fica N/A com motivo; T conforme protocolo. |
| JE | E1-E3, LATENCIA_TOTAL_S, PRIMEIRO_TEXTO_S, TEMPO_ATE_FALHA_S, TOKENS_ENTRADA, TOKENS_SAIDA, CUSTO_GERACAO_BRL, ORIGEM_CUSTO, METAS_VERSAO. | E depende de metas prévias e conclusão normal; dados brutos conhecidos permanecem mesmo sem nota. |

Campos adicionais de uso do provedor ficam no comprovante vinculado, com unidades e inclusão em outros campos explicitadas.
Para linhas de situação e dados brutos, nota_0_100 é N/A por NÃO APLICÁVEL.
Para A/V, valor_bruto preserva a classificação SUSTENTADA/CONTRADITA/NÃO VERIFICÁVEL ou VÁLIDO/PROBLEMA CONFIRMADO/NÃO VERIFICÁVEL.
evidencia deve conservar a afirmação, fonte/localização e justificativa, diretamente ou por referência inequívoca ao inventário integral.
Inventários de JC1 e JC2 exigem alinhamento semântico para comparação; não compare A1 com A1 automaticamente.

Mantenha os itens fixos previstos mesmo para execuções não iniciadas, falhas sem saída e JP bloqueado.
Não invente linhas de afirmações ou vínculos para textos inexistentes.
F/FP não aplicados são N/A; T2 = 0 em recusa sem explicação ou falha sem saída documentada, conforme protocolo.
Sem registro suficiente, não há autorização para transformar ausência em zero.
Os campos C de uma recusa sem conteúdo são N/A, ainda que a situação científica seja CORRIGIR.
Se JC não foi chamado por ausência documentada de saída, registre AUSENTE administrativamente e NÃO EXECUTADO.
JP BLOQUEADO sem chamada tem suas 16 notas previstas N/A e NÃO EXECUTADO.
Um JP chamado que constata impedimento registra EXECUTADO, o estado de bloqueio/pendência e as notas N/A; não apague o custo dessa chamada.

## 4. Resumo de todas as execuções: resultados-resumo.csv

Uma linha por execução planejada.
Reúne JC1, JP1, JT e JE; as passagens de estabilidade permanecem na tabela completa.
Não omita execuções reprovadas, pendentes ou não iniciadas.

```csv
versao_protocolo,fase,execucao_id,sistema_id,tema,rodada,iniciada,status_operacional,ramo_saida,situacao_JC1,K1,K2,K3,K4,K5,K6,C1,C2,C3,situacao_JP1,M1.1,M1.2,M2.1,M2.2,M3.1,M3.2,M4.1,M4.2,M5.1,M5.2,M1,M2,M3,M4,M5,P,T1,T2,E1,E2,E3,latencia_total_s,primeiro_texto_s,tempo_ate_falha_s,tokens_entrada,tokens_saida,custo_geracao_brl,origem_custo,metas_versao,contestacao_cientifica,provisorio,motivos_na,evidencia
```

Publique também uma tabela Markdown legível por execução ou tema, com os mesmos campos, podendo organizar colunas por painel.
O resumo não substitui resultados-completos.csv, onde ficam F/FP, inventários, evidências e ambas as passagens.
Não acrescente uma média geral C + P + T + E.
Nomes comerciais só entram na versão de publicação após autorização do pesquisador; a chave privada não precisa ser publicada.

## 5. Estabilidade e comparações

```csv
versao_protocolo,fase,execucao_id,sistema_id,tema,rodada,papel,item,passagem_1,valor_1,passagem_2,valor_2,comparavel,diferenca,concordancia,motivo_exclusao,evidencia
```

Em JC, compare decisões de situação e indicadores calculáveis, com suas coberturas; ausência administrativa não é concordância de dois juízos executados.
Em JP, compare os 10 itens, M1-M5 e P somente com APTO nos dois ramos e avaliações concluídas.
diferenca = segunda passagem - primeira passagem quando numérica e comparável.
Não calcule concordância entre JC e JP nem trate passagens como novas gerações.
Desacordos e alertas ficam provisórios até revisão humana documentada; originais não são sobrescritos.
Adjudicações humanas têm arquivo separado, autor/revisor, data, justificativa e efeito declarado.
Pairwise opcional permanece em tabela própria com dois códigos, duas ordens, decisões, elegibilidade e remapeamento privado.

## 6. Agregação e auditoria final

Agrupe por sistema_id, tema e rodada, sem misturar PILOTO/DEFINITIVA ou versões.
Mostre n previsto, iniciado, concluído, APTO e pedagogicamente completo.
Preserve distribuições e faltantes; o protocolo define quando uma média global é elegível.
Custo por APTO é derivado na consolidação de todas as gerações do recorte e APTO em JC1; não é nova nota do juiz JE.
Não duplique custos da geração por repetição dos pareceres.
Sem denominador APTO positivo, o custo por APTO é indefinido; sem custo completo, N/A.
Não atribua a diferença entre sistemas ao efeito isolado do modelo ou do agente.
Não existem dados coletados neste kit; gerar essas tabelas depende da execução e dos registros reais.
