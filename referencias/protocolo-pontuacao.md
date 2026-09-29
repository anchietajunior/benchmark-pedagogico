# Protocolo de pontuação 3.2

Versão: 3.2, de 26 de setembro de 2026.
Esta revisão pede material de estudo desenvolvido, com 800 a 1.200 palavras, mecanismo passo a passo, exemplo interpretado, duas confusões esclarecidas e duas perguntas com respostas comentadas.
F2 passa a verificar a faixa de extensão e F3 a estrutura didática; os quatro papéis, fórmulas, seis pontos científicos por tema, fontes e 10 subcritérios pedagógicos são preservados.
A faixa é uma decisão operacional a testar no piloto, não um limiar validado de aprendizagem.
Mais texto não autoriza incluir conteúdos fora do recorte nem relaxar a conferência bibliográfica.

Esta é a referência normativa dos quatro avaliadores e da consolidação.
Dados operacionais continuam fora do corpo didático, no cabeçalho privado do registro-unico-v1.
Identifique modo_entrega: api-openrouter-v1, arquivo-direto-v1 ou manual-v1; preserve o pedido completo e não misture esses modos silenciosamente nas comparações de tempo/custo.
Os metaprompts não implementam medição automática de tempo ou tokens; essa lacuna exige instrumentação separada.

Coletas 3.1 preservam seu pedido e limite anterior de até 600 palavras; não aplique a elas o mínimo de 800 palavras nem as novas seções.
Use o kit e o protocolo efetivamente arquivados daquela versão para avaliá-las; sem esses materiais, registre pendência, sem reconstruir a regra por suposição.
Não peça que o agente expanda uma resposta antiga e a mantenha como se fosse a primeira geração.
Novas gerações com o pedido 3.2 pertencem a um lote separado; não agregue suas notas, tempos ou custos aos da versão 3.1 sem distinguir as condições.
Conserve resultados antigos com sua versão; não converta notas automaticamente.
Identifique toda medida por versão + código.

## Quatro responsabilidades, uma consolidação

| Papel | Competência exclusiva | Entradas necessárias | Saída |
| --- | --- | --- | --- |
| JC - Científico | Correção, cobertura e sustentação bibliográfica. | Resposta anonimizada, pedido, gabarito e fontes acessíveis. | K1-K6, C1-C3, inventários e APTO/CORRIGIR/PENDENTE. |
| JP - Pedagógico | Indícios de compreensibilidade para o público definido. | Resposta anonimizada, pedido, fontes e certificado mínimo APTO. | 10 subnotas, M1-M5/P ou bloqueio justificado. |
| JT - Tecnológico | Conclusão operacional e cumprimento de instruções verificáveis. | Original, pedido e registros operacionais mínimos. | T1 conclusão, F1-F5 ou FP1-FP3, T2 conformidade e evidências. |
| JE - Tempo e custo | Latência, consumo e custo de geração. | Horários, uso, cobrança, tentativas, metas e situação operacional documentada. | Valores brutos, E1-E3 e memória de cálculo. |

Quatro juízes são quatro papéis, não uma exigência de quatro modelos distintos.
JC e JP atuam em sessões separadas, com autoria anonimizada; o mesmo modelo em sessões diferentes não garante independência estatística.
JT e JE usam verificações programáticas e cálculos sempre que disponíveis; um LLM pode organizar os registros, mas não inventar medidas nem afirmar que executou testes inexistentes.
JT não confere verdade científica; JE não julga conteúdo, conformidade formal ou elegibilidade.
O consolidador não é um quinto juiz: confere aritmética e une resultados bloqueados, sem reavaliar conteúdo ou produzir uma média dos quatro papéis.
Somente o pesquisador, sua sessão organizadora e o consolidador acessam a chave completa de identidades.
A sessão organizadora apenas separa materiais e encaminha pareceres; nunca atribui notas nem é reaproveitada como juiz.
JT pode precisar do original com autoria para verificar F5; essa informação nunca retorna a JC ou JP.
JE pode conhecer provedor e versão para conferir tarifas, sem transmitir essa informação aos juízes de conteúdo.
Cada item sem evidência fica N/A com motivo; zero indica descumprimento observado.

## Coleta instrumentada via OpenRouter

A condição openrouter-v1 usa um executor único e uma chamada de geração por explicação, sem ferramentas, skills ou histórico compartilhado.
O [workflow](../workflow.md) orienta a execução; o [guia do coletor](coletor-openrouter.md) define as medições e os artefatos.
As rubricas 3.2 e os seis pontos de cada tema são preservados, mas o pedido para API e o fornecimento de trechos fixos constituem outra condição experimental.
Use os pedidos efetivamente arquivados, não os metaprompts manuais com instruções de navegação e gravação.
Não misture essa condição com coletas de agentes de programação, mesmo quando o nome do modelo for igual.
O tempo principal começa imediatamente antes do envio HTTP e termina no fim ou falha do stream, incluindo a instrumentação de recebimento.
Preparação das fontes, consultas ao catálogo, accounting posterior e preparação dos juízes ficam fora desse intervalo e não podem ser comparados silenciosamente com duração total de um agente.
Tokens e custo pertencem à chamada; cache e raciocínio não devem ser somados novamente aos totais.
Custo em reais é a conversão do USD reportado pelo serviço pela cotação documentada, não o total da fatura, impostos ou mensalidade.
Telemetria COMPLETA não equivale a conclusão normal, APTO científico ou elegibilidade para ranking.
Telemetria PENDENTE impede tratar consumo/custo como medidas completas; não autoriza excluir a tentativa, nem impede julgamento de conteúdo que esteja preservado.
Quedas abruptas e perda de conexão podem deixar dados irrecuperáveis; desconhecido não vira zero.
Conciliações acrescentam evidências sem alterar a primeira resposta ou o cabeçalho original.

## Coleta manual anterior

O [workflow manual](../workflow-manual.md) preserva o roteiro anterior; [avaliacao.md](../avaliacao.md) explica o encaminhamento posterior.
Nesse fluxo, ~/Documents/coletas/lote.md é o manifesto e ~/Documents/coletas/entrada/E001.md reúne registro privado e resposta original após um marcador explícito.
Os pedidos completos por tema geram um ID automático se o pesquisador não fornecer um.
A coluna “Arquivo coletado” do manifesto liga esse ID ao sistema, tema e rodada planejados; nomes antigos com ID planejado continuam aceitos.
Preserve a correspondência e o original, sem atribuir rodada ou sistema pela ordem dos arquivos.
O ID automático identifica armazenamento, não aleatorização experimental; vínculo ausente exige esclarecimento antes do julgamento.
O agente pode salvar o registro com dados de logs efetivamente acessíveis; o pesquisador confirma término e medidas observadas externamente.
Autodeclarações sem evidência não validam consumo, custo ou duração; mantenha os campos afetados N/A.
O corpo didático não contém os dados operacionais do cabeçalho nem a confirmação de gravação no chat.
Na entrega direta, duração e custo da execução incluem as operações de gravação até a conclusão final.
JC/JP recebem o pedido sem a seção operacional de entrega, que contém ID e caminho privados; a versão integral fica arquivada.
O organizador preserva o arquivo e extrai original, registros e cópias anônimas antes do envio aos juízes.
O formato anterior com planejamento.md, resposta.md e ficha.md continua aceito, sem conversão de notas nem exigência de CSV na coleta.
A fila privada indica o arquivo completo permitido por chamada; nunca é enviada aos juízes.
JP aguarda o APTO da passagem científica correspondente; JE recebe a situação operacional conferida por JT, sem notas T.
Campos não preenchidos, modelos vazios e arquivos de controle não contam como execuções realizadas.
Um número declarado pelo modelo não comprova duração, consumo ou cobrança; use observação, logs ou estimativa documentada.
Não é válido apenas pedir ao juiz que ignore os dados operacionais: JC e JP não devem recebê-los.
Para anonimização, preserve o original e registre toda remoção de autoria ou de rodapé operacional indevido, sem editar o conteúdo didático.
JT aplica F1-F5 ao original, não à cópia limpa; limpeza não apaga um descumprimento observado.
Os resultados de geração e julgamento são preservados independentemente de aprovação.

## Desenho, ordem e cegamento

Uma execução é uma geração por sistema, tema e rodada, com identificador único.
Um sistema é a combinação de agente, modelo, provedor, configuração, ferramentas e política de acesso às fontes.
Uma rodada completa contém B01, B02, N01 e N02 para cada sistema.
O desenho anterior de quatro sistemas × quatro temas × cinco rodadas previa 80 execuções.
Com os seis modelos selecionados para OpenRouter, o mesmo desenho teria 120 execuções; o piloto configurado usa somente B01 e uma rodada, com seis gerações.
O manifesto congelado define o número efetivamente planejado; falhas e ausências permanecem no conjunto.
Nas regras de agregação deste protocolo, “por modelo” significa por sistema fixo identificado, nunca mistura de agentes ou configurações para o mesmo LLM.
Cinco repetições é uma escolha exploratória, não cálculo de poder estatístico; quatro temas continuam sendo quatro temas.
Novas gerações são novas rodadas; reenvios de transporte pertencem à execução original e têm tentativas separadas.
Não substitua a primeira resposta por uma tentativa mais favorável.

Defina JC1 e JP1 como avaliações primárias, e JC2 e JP2 como repetições de estabilidade, antes de iniciar a coleta.
JC2 não recebe JC1; JP2 não recebe JP1 nem os pareceres científicos.
Use uma resposta por chamada, sessões novas, códigos públicos diferentes e ordem de processamento alterada nas repetições.
JC1 habilita JP1; JC2 habilita JP2, sempre para a mesma resposta original, sem correções de conteúdo.
Um ramo não APTO gera registro de JP BLOQUEADO com notas N/A; não faça uma chamada para inventar pontuação.
O certificado enviado a JP contém somente versão, código público de destino, tema, rodada, passagem científica de origem e situação APTO.
O pesquisador mantém em privado a ligação com o parecer científico, os códigos e a execução original, conferindo que o corpo anonimizado permaneceu o mesmo.
Certificado é um registro de encaminhamento, não prova autônoma de verdade; uma incompatibilidade impede a avaliação.
Não envie C1-C3, notas de outros juízes, modelos, custos ou tempos a JP.
Se JC1/JC2 divergirem, preserve as duas decisões e as notas pedagógicas por ramo; sinalize a comparação afetada como provisória até revisão.
JT e JE podem ser apurados em paralelo aos juízos de conteúdo; somente a consolidação reúne as informações após bloquear os pareceres.
Não calcule concordância entre papéis diferentes: JC e JP medem aspectos distintos.
Compare JC1/JC2 entre si e JP1/JP2 entre si, com denominadores comparáveis.

São quatro painéis, sem nota geral que compense erro científico com clareza, rapidez ou preço.
Uma nota de 0 a 100 não é probabilidade de compreensão nem escala intervalar psicometricamente validada.
Preserve evidências, numeradores, denominadores e dados brutos; arredonde somente a apresentação para duas casas decimais.

## Efeito do agente e unidade de comparação

Trocar agente e LLM ao mesmo tempo compara sistemas completos; o desenho não separa causalmente o efeito de cada componente.
A ferramenta do agente pode mudar instruções de sistema, contexto, leitura das fontes, chamadas de ferramentas, revisões internas e número de chamadas ao LLM.
A [documentação da Anthropic sobre avaliações](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) explicita que a avaliação de um agente abrange modelo e ambiente de execução juntos.
O [OpenCode documenta](https://opencode.ai/docs/agents/) configurações de prompt, modelo, temperatura, permissões e limite de passos; portanto, o prompt digitado pelo pesquisador não descreve sozinho a condição experimental.
Não atribua vantagem à origem comum de agente e LLM nem estime uma porcentagem de efeito sem comparação controlada.
Integração do mesmo fornecedor pode ser uma hipótese explicativa, não uma conclusão deste estudo.

Registre sistema_id, agente/versão/modo, provedor, ID exato do modelo, roteamento, parâmetros, orçamento de raciocínio, limites de saída/passos, ferramentas e permissões.
Arquive as instruções visíveis, skills, arquivos de regras, memória, personalização e política de compactação/contexto, distinguindo desativado, indisponível e não informado.
Uma sessão nova não garante ausência de regras globais ou memória persistente.
Registre o mesmo ambiente também para JC e JP; mudar o agente do juiz pode alterar suas notas.
Configurações ocultas ficam como NÃO OBSERVÁVEL, não como presumidamente iguais.
Use sessões isoladas, o mesmo pacote de fontes e o mesmo pedido; impeça acesso dos geradores a gabaritos, pareceres, concorrentes e chave privada.
Não abra o agente na raiz deste projeto com acesso irrestrito: o kit contém materiais exclusivos dos avaliadores.
Cada geração usa apenas seu pacote e diretório isolado, sem material de execuções anteriores.
Não habilite ferramentas, skills ou intervenções humanas diferentes silenciosamente durante a coleta.
Alteração relevante exige nova condição identificada, sem misturar resultados no mesmo sistema_id.

Se o objetivo posterior for isolar o efeito do agente, mantenha o mesmo modelo/versão/provedor em dois agentes compatíveis, com fontes e orçamento controlados e repetições.
Um desenho cruzado de modelos e agentes permite investigar interação, mas depende de suporte real às combinações e de planejamento amostral próprio.
Essa extensão não está incluída automaticamente nas execuções planejadas do coletor.
Mesmos valores nominais de parâmetros não garantem implementações equivalentes.
O resultado atual permite comparar a utilidade das combinações observadas, não decretar o melhor LLM isolado.

## JC - Juiz científico

O juiz consulta os mesmos trechos identificados ou fontes autorizadas fornecidos aos geradores.
Catálogos, citações do candidato, memória do juiz e gabarito não substituem a leitura das fontes.
Registre fonte, edição quando disponível, seção ou página realmente observada, data e extensão do acesso.
O inventário de afirmações inclui mecanismos, exemplos, analogias, generalizações, esclarecimento das confusões, respostas comentadas e afirmações adicionais aos seis pontos obrigatórios.
Separe proposições que possam ser verificadas independentemente; não fragmente em palavras nem conte repetições da mesma afirmação como novas evidências.
Esse inventário exige interpretação e revisão, portanto suas proporções não são medidas automáticas infalíveis.

### C1 - Cobertura científica dos seis pontos

Para cada ponto K1 a K6 do pedido e do gabarito, use:

| Valor | Evidência necessária |
| --- | --- |
| 100 | Relação essencial solicitada presente, correta e suficiente no recorte; detalhes não exigidos não reduzem a nota. |
| 50 | Parte correta e verificável, mas falta uma relação essencial exigida, sem falsidade confirmada nesse ponto. |
| 0 | Ponto ausente ou com erro científico confirmado. |
| N/A | Ponto presente cuja correção não pode ser verificada com as fontes acessíveis. |

`C1 = (K1 + K2 + K3 + K4 + K5 + K6) / 6`.
Se algum K for N/A, C1 é N/A; publique os seis resultados conhecidos, sem reduzir o denominador.
Um K de 50 ou 0 implica CORRIGIR por omissão essencial ou erro, não aprovação por média.

### C2 - Sustentação factual

Para cada afirmação distinta A1 a An, registre 100 quando sustentada, 0 quando contradita e N/A quando não verificável.
`C2 = 100 × afirmações sustentadas / afirmações inventariadas`.
Calcule somente quando todas as afirmações do inventário tiverem decisão e houver pelo menos uma.
Se houver item não verificável ou nenhuma afirmação, C2 é N/A.
Mostre também número e gravidade dos erros; muitas afirmações corretas não compensam uma falsa.

### C3 - Integridade dos vínculos bibliográficos declarados

Inventarie cada vínculo distinto entre uma afirmação e a fonte que o candidato associou a ela.
Use 100 se a referência existir e sustentar a associação, 0 se o problema for confirmado e N/A se não puder conferir.
`C3 = 100 × vínculos válidos / vínculos declarados`.
Calcule somente quando todos os vínculos puderem ser verificados e houver pelo menos um.
Sem vínculos declarados, C3 é N/A, não zero: falta de citação é não conformidade formal, não prova de falsidade.
Itens soltos na lista de referências também devem ser verificados; fonte inventada ou associação falsa confirmada exige CORRIGIR.
Sem acesso suficiente a uma referência relevante declarada, registre PENDENTE, salvo erro já confirmado.

### Situação científica e impedimentos

- APTO: K1 a K6 = 100, todas as afirmações relevantes conferidas, nenhum erro científico ou bibliográfico confirmado e nenhuma pendência relevante.
- CORRIGIR: erro confirmado, omissão essencial, recusa, texto vazio ou truncado efetivamente fornecido.
- PENDENTE: fontes insuficientes, conflito não resolvido ou mensagem PENDENTE DE FONTES do gerador, sem erro já confirmado que determine CORRIGIR.

Prioridade: CORRIGIR > PENDENTE > APTO; mesmo em CORRIGIR, registre as verificações pendentes.
Não há nota científica única nem limite numérico que dispense esses impedimentos.
C1, C2 e C3 são diagnósticos independentes e podem ser publicados quando calculáveis, inclusive em CORRIGIR.
Uma ausência de resposta por falha operacional é registrada como AUSENTE no relatório, não é um quarto julgamento científico e não recebe notas.
Uma mensagem PENDENTE DE FONTES ou recusa sem explicação recebe C1 a C3 N/A, sem fingir avaliação de conteúdo inexistente.
Se faltarem pedido, gabarito ou fontes necessários, mantenha a avaliação PENDENTE e as medidas não verificáveis N/A.
Ausência de citação, isoladamente, não impede APTO se o juiz verificar o conteúdo e não houver referência falsa ou pendente.
APTO não é garantia de verdade absoluta nem revisão por especialista.

## JP - Juiz pedagógico

Somente respostas APTO em JC1 recebem JP1; somente APTO em JC2 recebem JP2.
O pesquisador envia um certificado mínimo de elegibilidade, sem notas C, inventários ou pareceres científicos.
O juiz recebe o pedido, as fontes comuns, o protocolo e uma cópia anonimizada da mesma resposta certificada, em sessão nova.
Se faltar certificado compatível com versão, código público, tema, rodada e passagem, registre BLOQUEADO e todas as notas M/P como N/A.
Se identificar possível erro científico, registre REVISÃO CIENTÍFICA SOLICITADA e M/P como N/A, sem recalcular C ou corrigir o texto.
Encaminhe a ocorrência à revisão especializada e preserve os julgamentos originais.
Outras avaliações pedagógicas incompletas recebem PENDENTE; uma avaliação com os 10 itens válidos recebe CONCLUÍDO.
Essas situações pedagógicas não substituem APTO/CORRIGIR/PENDENTE do juiz científico.
Público: graduando de saúde com noções de células, tecidos, órgãos, proteínas e nutrientes, ainda sem domínio do mecanismo solicitado.
Avalie o corpo didático, não o tamanho da lista de referências.

Cada uma das cinco métricas tem dois subcritérios, totalizando 10 itens: M1.1/M1.2, M2.1/M2.2, M3.1/M3.2, M4.1/M4.2 e M5.1/M5.2.
Dez itens é uma escolha operacional deste estudo, não uma quantidade validada pela literatura.
Para cada subcritério, use 0, 50 ou 100, com trecho de evidência ou indicação concreta da ausência:

- 100: o requisito é atendido em todas as ocorrências relevantes observadas.
- 50: o texto demonstra atendimento, mas há ocorrência relevante não atendida; mostre a parte atendida e a limitação.
- 0: o requisito está ausente ou o problema é predominante a ponto de impedir sua função; indique o impedimento.

Não invente valores intermediários, como 73, para um subcritério.
Os subcritérios são categorias ancoradas de atendimento, não medidas contínuas.
Se a evidência de um julgamento for insuficiente, registre N/A e pendência de avaliação, sem calcular a média com menos itens.

| Código | Métrica | Requisito observado |
| --- | --- | --- |
| M1.1 | Clareza linguística | Termos técnicos, siglas e expressões além do conhecimento prévio definido são explicados no primeiro uso; se não houver termos novos, o requisito está atendido. |
| M1.2 | Clareza linguística | As frases têm sujeitos e referentes identificáveis, sem ambiguidade relevante. |
| M2.1 | Organização e progressão | A sequência apresenta os componentes antes das relações que dependem deles e permite acompanhar as etapas do mecanismo. |
| M2.2 | Organização e progressão | A síntese final integra as ideias e responde ao objetivo, sem introduzir pré-requisito novo. |
| M3.1 | Foco e economia cognitiva | Cada trecho contribui para o recorte solicitado. |
| M3.2 | Foco e economia cognitiva | A explicação evita repetições sem função; síntese útil não é redundância inútil. |
| M4.1 | Explicação causal | O texto explica por que as etapas se conectam e produzem o resultado, além de apenas listar acontecimentos. |
| M4.2 | Explicação causal | Condições, regulação ou limites pertinentes ao pedido são conectados à conclusão. |
| M5.1 | Concretização e aplicação | Há uma situação concreta identificável e pertinente ao pedido. |
| M5.2 | Concretização e aplicação | Os elementos e o resultado do exemplo são explicados por sua relação com os conceitos apresentados. |

`Mj = (Mj.1 + Mj.2) / 2`.
`P = (M1 + M2 + M3 + M4 + M5) / 5`.
Em cada explicação, M só pode ser 0, 25, 50, 75 ou 100; o índice P varia em passos de 5 pontos.
Médias entre explicações podem ter outros valores, mas não criam resolução adicional na avaliação individual.
Essas resoluções decorrem das regras, não de uma alegação de precisão psicológica.
Exemplo exclusivamente aritmético: (100 + 50) / 2 resulta em M = 75.
Cada item tem peso igual; nenhuma métrica compensa erro científico.
M2 observa ordem e síntese; M4 observa relações causais e suas condições; M5 observa sua concretização no exemplo.
Ao usar o mesmo trecho em mais de um item, justifique separadamente a evidência pertinente a cada requisito.
M3 não mede carga cognitiva real; M5 não comprova transferência de aprendizagem.
Analogia é opcional; nem brevidade nem extensão recebem bônus automático.
Avalie se as relações essenciais foram desenvolvidas para estudo individual: rótulos de processos e listas sem explicação não demonstram, por si, M4.1 ou M5.2.
As confusões esclarecidas e a revisão comentada são partes do corpo didático, sem gerar métricas extras ou comprovar aprendizagem.
Revisitar um conceito para aplicá-lo no exemplo ou justificar uma resposta pode ter função pedagógica; M3.2 penaliza repetição sem função, não toda retomada.
A conformidade com a faixa de palavras e a estrutura pertence a JT; JP não atribui uma penalidade adicional automática por extensão.
Limites de analogias e generalizações continuam obrigatórios na conferência científica e no pedido de geração; a redução de itens não dispensa sua verificação.

## JT - Juiz tecnológico

Verifique o original antes de remover autoria e use os registros operacionais da execução.
Não receba notas científicas ou pedagógicas, custos ou a chave completa de modelos.
O foco é validar requisitos verificáveis da saída, não medir aprendizagem ou reavaliar as fontes.
Registre se cada verificação foi programática, por inspeção humana ou por LLM, com versão do verificador quando existente.
Este kit define os testes, mas não implementa um executor automatizado.
Inspeção por LLM não deve ser descrita como teste determinístico executado.
Sem rastros de ferramentas, o estudo avalia o output do sistema; não atribua notas de planejamento, navegação ou uso de ferramentas do agente.
Registre a ausência desses rastros como limitação, sem criar uma nova métrica fictícia.

### T1 - Conclusão técnica

Cada execução efetivamente iniciada recebe 100 se houver saída não vazia, término normal e ausência de erro técnico ou truncamento; recebe 0 em caso contrário.
Uma recusa ou PENDENTE DE FONTES entregue normalmente pode receber T1 = 100, mas continua sem aprovação científica.
`T1 agregado = 100 × execuções concluídas normalmente / execuções iniciadas`.
Se o resultado operacional for desconhecido, T1 agregado é N/A e a pendência permanece; não retire execuções do denominador.
Execuções planejadas ainda não iniciadas são faltantes, não falhas; reporte iniciadas/planejadas.

### T2 - Conformidade formal

Aplique as regras à resposta original, antes de remover a autoria.
Para uma explicação, cada requisito recebe 100 se atendido ou 0 se descumprido:

- F1: primeira linha não vazia é um título Markdown iniciado por `# `.
- F2: corpo didático com 800 a 1.200 palavras, inclusive os extremos, pela convenção de contagem abaixo.
- F3: as oito seções do pedido aparecem uma vez e na ordem definida, com conteúdo não vazio; `## Confusões a evitar` tem exatamente dois itens numerados, `## Confira seu entendimento` tem exatamente duas perguntas numeradas, cada uma com `Resposta comentada:` não vazia, e `## Síntese` tem exatamente três itens de lista.
- F4: seção final `## Fontes consultadas` contém pelo menos um identificador autorizado para o tema, título e localização de consulta declarados.
- F5: não há declaração de autoria do modelo/fornecedor nem imagem incorporada em Markdown ou HTML.

`T2 = (F1 + F2 + F3 + F4 + F5) / 5`, em passos de 20 pontos.
Qualquer item formal necessário N/A torna T2 N/A, inclusive no ramo FP; não reduza o denominador.
F3 verifica estrutura e presença formal, não a qualidade das justificativas nem sua correção, que pertencem a JP e JC.
As seções de F3 são `## Ideia central`, `## Conceitos necessários`, `## Mecanismo passo a passo`, `## Exemplo explicado`, `## Confusões a evitar`, `## Confira seu entendimento`, `## Síntese` e `## Fontes consultadas`.
Subtítulos de terceiro nível são permitidos dentro das seções e não contam como seções extras.
F4 verifica presença formal, não existência da obra ou sustentação da afirmação; isso pertence a C3.
F5 exige também inspeção humana de autoria explícita; não é prova de anonimato perfeito nem um teste só por palavras-chave.

No ramo PENDENTE DE FONTES, substitua F1 a F5 por FP1, FP2 e FP3: mensagem começa com esse marcador, identifica fontes/trechos faltantes e não entrega uma explicação como se tivesse sido verificada.
Nesse ramo, `T2 = (FP1 + FP2 + FP3) / 3`; publique o ramo e não misture suas médias com as de explicações sem discriminar as contagens.
Uma recusa sem explicação recebe T2 = 0, e falha técnica sem resposta também recebe T2 = 0, desde que a ocorrência esteja documentada.
Um registro não fornecido é N/A, não descumprimento observado.

Convenção de palavras: considere o texto anterior à primeira linha exatamente `## Fontes consultadas`.
Inclua título, subtítulos, exemplo, confusões, perguntas, respostas comentadas, síntese e identificadores de citação.
Conte sequências separadas por espaço ou quebra de linha que contenham ao menos uma letra ou número; marcadores isolados de Markdown não contam.
Não remova URLs inline, números ou citações para caber no limite.
Sem o delimitador de fontes, todo o texto entra na contagem e F4 = 0.
Fixe essa convenção em todas as execuções, inclusive nas que usam ferramentas diferentes.

Não faça média geral de T1/T2.
Em recusa sem explicação ou falha documentada sem saída, T2 = 0 e os itens formais não aplicados são N/A com o ramo identificado.
Registro indisponível, inclusive o original necessário, torna a medida afetada N/A; não trate falta de acesso como falha observada.
T1 agregado inclui todas as execuções iniciadas, mesmo cientificamente reprovadas.
A média de T2 exige todos os valores conhecidos do ramo informado; se houver faltantes, reporte cobertura e média parcial identificada, não média completa do lote.

## JE - Juiz de tempo e custo

Apure somente registros, sem reler a resposta para deduzir custo ou velocidade.
Receba a situação operacional documentada para distinguir conclusão normal, falha e registro desconhecido.
A classificação operacional pertence a JT; se houver conflito entre registros, mantenha a apuração afetada pendente até esclarecimento.
Compare modelo + plataforma + configuração + ferramentas + fontes; não atribua a latência somente ao modelo.
Não receba notas C/M/P para atribuir as notas E.
O custo por APTO é derivado pelo consolidador, depois de reunir os quatro pareceres.

### E1 a E3 - Medidas com metas pré-fixadas

| Código | Medida bruta | Parâmetros obrigatórios para normalizar |
| --- | --- | --- |
| E1 | Latência total em segundos, do envio à conclusão normal, incluindo ferramentas e fontes. | latencia_alvo_s e latencia_limite_s |
| E2 | Segundos até primeiro fragmento textual visível, excluindo eventos de controle, ferramentas e raciocínio oculto. | primeiro_texto_alvo_s e primeiro_texto_limite_s |
| E3 | Custo total de geração da execução em reais, incluindo tentativas e taxas distintas de ferramentas. | custo_alvo_brl e custo_limite_brl |

Para uma medida x em que menor é melhor, com `0 <= alvo < limite`:

`nota(x) = 100`, se `x <= alvo`.
`nota(x) = 0`, se `x >= limite`.
`nota(x) = 100 × (limite - x) / (limite - alvo)`, nos demais casos.

Fixe os mesmos parâmetros para todos os modelos antes da coleta definitiva, com justificativa de uso e orçamento.
Na presença de reenvios de transporte, o início é o primeiro envio da execução e o término é sua conclusão final; registre os intervalos e custos de todas as tentativas.
Deixe parâmetros ainda não escolhidos como N/A; não há valores universais de tempo ou custo que este kit possa inventar.
Sem medida, com parâmetros inválidos ou sem metas pré-fixadas, a nota correspondente é N/A e o dado bruto continua publicado quando disponível.
Não derive metas do melhor e do pior modelo após ver o resultado.
Se a execução não terminar normalmente, E1 a E3 normalizados são N/A; publique o custo incorrido e o tempo até falha, sem premiar uma interrupção rápida.
Na agregação, identifique valores condicionados a conclusões normais e mantenha T1 e todas as falhas ao lado.

### Consumo, custo e medidas derivadas

Tokens de entrada, saída, raciocínio e cache são registros, não notas de qualidade.
Guarde os campos brutos do provedor: alguns são subconjuntos de outros e não podem ser somados novamente.
Registre preços, unidades, data, moeda, conversão para reais e taxas usadas; uma reconstrução por tabela de preços é estimativa identificada, não cobrança observada.
Separe custos de geração, julgamento e pesquisa; E3 considera geração, enquanto o orçamento do estudo mostra os três.
Se algum custo de geração do recorte estiver desconhecido, custo total completo e custo por APTO são N/A; pode publicar subtotal identificado com sua cobertura.
`Custo por APTO = custo de todas as execuções e tentativas de geração do recorte / número de respostas APTO em JC1`.
Inclua gastos de CORRIGIR, PENDENTE e falhas; sem APTO, o resultado é indefinido.
Dupla avaliação da mesma resposta não duplica o denominador.

TTFT de token só deve ser declarado quando essa observação estiver disponível; fragmentos podem conter vários tokens.
TPOT e tokens por segundo são opcionais, com fórmula, intervalo e tokenizador declarados; saída faturada com raciocínio oculto não equivale a texto visível.
No chat manual, medidas visuais são aproximadas; tokens e custos não fornecidos ficam N/A.
Sem metas, publique os valores brutos de eficiência e E1 a E3 como N/A; não calcule média de eficiência com os itens disponíveis.

Não faça média geral de E1/E2/E3.
Uma recusa ou PENDENTE DE FONTES entregue normalmente pode ter E calculável; isso não indica êxito científico ou pedagógico.
Mantenha falhas, custos de tentativas e dados indisponíveis visíveis em toda agregação.

## Piloto e revisão humana

Comece com dois modelos e B01 em uma rodada PILOTO separada da coleta definitiva.
Teste JC1/JC2 e, nos ramos APTO, JP1/JP2; confira também os registros e cálculos de JT/JE.
Compare decisões científicas e itens pedagógicos dentro de cada papel, identificando ambiguidades e divergências.
Sem APTO, a rubrica pedagógica ainda não foi testada; obtenha material elegível antes de congelá-la.
Solicite revisão docente das fontes, gabaritos e critérios.
Recomenda-se uma amostra pré-definida de julgamentos humanos cegos que cubra temas e modelos na coleta, idealmente com dois revisores; registre desenho, resultados e indisponibilidade quando não realizada.
Revisar o gabarito não valida automaticamente o desempenho de JC ou JP.
Resolva ambiguidades operacionais antes de congelar o protocolo; se mudar critérios, versione e repita o piloto, preservando o anterior.
O piloto verifica aplicabilidade e estabilidade, não valida psicometricamente a rubrica nem comprova aprendizagem.

## Consolidação e elegibilidade

Desfaça os códigos somente após bloquear as avaliações de cada papel.
O resultado primário reúne JC1, JP1, JT e JE por execução; JC2/JP2 são análises de estabilidade, nunca substitutos escolhidos por nota maior.
Exija os 10 códigos pedagógicos esperados, cada um uma vez, e a correspondência entre certificado, resposta e avaliação científica.
Não compare versões distintas, registros duplicados ou itens desconhecidos como se fossem completos.
Reporte APTO/CORRIGIR/PENDENTE/AUSENTE e as situações de JP separadamente.
Ausência de JP por reprovação científica é bloqueio previsto, não falha do avaliador.

Em cada tema e rodada, classifique por P os APTO em JC1 com JP1 CONCLUÍDO e 10 subnotas válidas, mantendo empates.
Uma média global da rodada exige quatro APTO em JC1 e quatro P completos de JP1 por modelo, em lote completo.
Uma média pedagógica geral das cinco rodadas exige 20 APTO em JC1 e 20 P completos de JP1 por modelo.
Não faça ranking geral apenas com os sobreviventes; distribuições condicionadas aos APTO são diagnósticas e mostram n elegível/n previsto.
Se ninguém satisfizer a elegibilidade, não há vencedor global recomendável.
Desacordo científico ou alerta de JP que afete elegibilidade torna a recomendação provisória até revisão especializada.
Conserve os pareceres originais; registre adjudicação humana em arquivo próprio, sem permitir que o consolidador decida a verdade.
Não desempate pedagogia por tecnologia, tempo ou custo.
Ciência, tecnologia e eficiência permanecem em colunas próprias; o protocolo não define vencedor geral por soma ponderada.
Calcule custo por APTO com JC1, incluindo todas as tentativas e falhas do recorte, sem duplicar gerações por repetição dos juízes.

Na estabilidade científica, reporte pares JC1/JC2 efetivamente avaliados, concordância de situação e divergências.
Na estabilidade pedagógica, compare os 10 itens e a diferença P_JP2 - P_JP1 somente quando ambos os ramos forem APTO e tiverem JP concluído.
Reporte quantos casos ficaram fora de cada comparação e por quê.
Repetições dos juízes não são novas amostras de conteúdo nem prova de validade humana.

## Tabela única de resultados

A consolidação produz resultados-completos.csv: uma linha por execução, papel, passagem e item, incluindo notas, medidas brutas, evidências e motivos de N/A.
Inclua K1-K6, C1-C3, cada afirmação A e vínculo V inventariado, os 10 itens M, M1-M5/P, T1/T2, F1-F5 ou FP1-FP3, E1-E3 e os registros brutos de tempo, tokens e custo.
Para A/V, preserve a classificação semântica e os numeradores/denominadores além da codificação numérica.
Mesmo quando JP estiver bloqueado, mantenha suas linhas previstas com N/A e motivo, marcadas como NÃO EXECUTADO, sem atribuí-las a um juiz que não atuou.
Para execuções planejadas não iniciadas e falhas sem resposta, mantenha os itens fixos com N/A ou o zero previsto em JT; inventários A/V inexistentes não ganham afirmações fictícias.
Registre situações científicas, situações pedagógicas e situação operacional em linhas próprias, sem transformá-las em notas.
A tabela-resumo por execução inclui C1-C3, os 10 itens pedagógicos, M1-M5/P, T1/T2, E1-E3, tempos, tokens, reais, situações e cobertura.
As tabelas de estabilidade e agregados por modelo são derivadas e não substituem a tabela completa.
Todo resultado deve apontar para seu arquivo de evidência; o esquema detalhado está em [resultados-e-registros.md](resultados-e-registros.md).
N/A é publicável: a exigência de incluir todos os itens não autoriza inventar dados.

## Comparação pareada opcional

Pairwise pertence ao papel JP, não constitui quinto juiz nem substitui as notas individuais.
Use dois APTO em JC1 do mesmo tema e rodada, sem contestação científica pendente, em duas sessões com posições invertidas.
O juiz recebe certificados mínimos, textos, pedido e fontes; não recebe notas individuais, identidade ou dados operacionais.
Uma suspeita científica torna a comparação INVIÁVEL e segue à revisão, sem reclassificação por JP.
Depois de desfazer os códigos, vitória consistente exige a mesma resposta vencedora nas duas ordens; EMPATE nas duas é empate.
Qualquer outra combinação válida é INCONSISTENTE; preserve inviáveis, ausentes e inválidas separadamente.
Com quatro candidatos, quatro temas e cinco rodadas, todos os pares nas duas ordens representam até 240 chamadas adicionais.
Até 80 × 2 = 160 chamadas científicas e até 160 pedagógicas compõem a avaliação individual completa; JT/JE podem ser apurados sem LLM.
Custos de avaliação são separados do custo de geração E3.

## Base e limites

A pedagogia adapta princípios do [PEMAT](https://www.ahrq.gov/health-literacy/patient-education/pemat.html), de [Mayer](https://doi.org/10.1111/j.1365-2923.2010.03624.x) e do [Eberly Center](https://www.cmu.edu/teaching/principles/learning.html), sem aplicar uma escala validada para este público.
A verificação por afirmações se relaciona à abordagem do [FActScore](https://aclanthology.org/2023.emnlp-main.741/); este protocolo é uma adaptação local, não sua implementação ou validação no domínio de saúde.
A avaliação por IA e seus vieses são discutidos por [Zheng et al.](https://arxiv.org/abs/2306.05685).
JT se inspira nas instruções verificáveis do [IFEval](https://arxiv.org/abs/2311.07911), sem executar seu benchmark.
JE distingue medidas de inferência discutidas no [MLPerf](https://mlcommons.org/2025/09/small-llm-inference-5-1/), com metas locais, não certificação.
A separação de dimensões dialoga com o [HELM](https://crfm.stanford.edu/2022/11/17/helm.html); a atenção à variabilidade, com [Blackwell et al.](https://arxiv.org/abs/2410.03492).
Quatro papéis não validam automaticamente os juízes; fontes acessíveis, controles e revisão humana continuam necessários.
Sem estudantes avaliados, a conclusão é qualidade didática estimada por IA, não aprendizagem ou probabilidade de compreensão demonstrada.
