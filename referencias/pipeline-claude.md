# Fluxo completo com juízes Claude

`npm run executar` encadeia a coleta OpenRouter existente, os julgamentos por `claude -p` e o relatório `consolidado/resultados.html`.
O [guia de execução](../guia.md) ensina a iniciar o comando, acompanhar o processamento e abrir o relatório no navegador.
Os juízes e o consolidador são subprocessos `claude -p` iniciados diretamente pelo coordenador (`coletor/claude-judge.mjs`).
O comando pode ser executado em qualquer terminal.
Não altera o ambiente global do shell, credenciais ou configuração pessoal do Claude Code.
Não cria branches ou worktrees.

## Execução e simulação

```sh
npm run executar -- --simular
npm run executar
npm run executar -- --modelo-juiz claude-opus-5-5 --esforco-juiz medium
npm run executar -- --retomar
npm run executar -- --retomar "CAMINHO_DO_LOTE"
npm run executar -- --revalidar
```

O modo de simulação é estritamente local, sem catálogo remoto, rede ou modelos.
O modo `--revalidar` usa somente arquivos existentes, dispensa credenciais e verificação do Claude Code e não inicia chamadas; sem caminho, seleciona o lote mais recente.
Ao concluir as etapas automáticas, o programa abre o HTML no navegador padrão; `--nao-abrir` desativa a abertura.
Resposta incompleta é descartada antes dos juízes; parecer sem conclusão válida é descartado das notas.
O fluxo encerra com o ranking no HTML, que abre no navegador; modelos sem avaliação completa aparecem com 0 e ERRO.
Use `--revalidar` para aplicar a política aos arquivos existentes sem chamadas.
`--retomar` sem caminho seleciona o lote compatível mais recente pela data de criação em `output_dir`, inclusive quando já concluído, e informa o caminho antes da confirmação.
Se não houver lote, o comando encerra sem iniciar coleta; para conferir a seleção sem chamadas, use `--retomar --simular`.
A execução real exige Node.js 24 ou superior e Claude Code CLI instalado e autenticado; o login existente é reaproveitado.
Antes das gerações OpenRouter, o programa confere `claude --version`.
A confirmação `EXECUTAR` autoriza geração, julgamentos elegíveis e consolidação; `--confirmar` permite autorização explícita em automações.
Com seis explicações, o máximo é seis gerações OpenRouter e 37 chamadas Claude: seis passagens por explicação e um consolidador.
Não se executa JP nos ramos sem APTO correspondente.
O modelo padrão dos avaliadores é `claude-opus-5-5`, esforço `medium`, com timeout de 15 minutos por chamada.
Modelo e esforço aceitam `--modelo-juiz ID` e `--esforco-juiz NIVEL` (`low`, `medium`, `high`, `xhigh` ou `max`) antes do início do lote.
A configuração e a versão do Claude Code são congeladas em `privado/julgamento.json` antes do primeiro julgamento; a retomada preserva a configuração e recusa continuar se a versão mudou.

## Quem recebe as identidades

| Destino | Material recebido |
| --- | --- |
| JC1 e JC2 | Código próprio, pedido e fontes efetivos, gabarito do tema, resposta e protocolo; sem nomes ou mapa. |
| JP1 e JP2 | Outro código, mesma resposta/pedido/fontes e certificado mínimo APTO; sem gabarito, parecer JC ou notas anteriores. |
| JT | Código, execução, pedido, original e situação operacional mínima; sem cadastro do modelo ou notas dos demais papéis. |
| JE | Código, execução, situação de JT e medidas de recursos; sem resposta ou notas de conteúdo. |
| Consolidador | Mapa dos códigos para os modelos, pareceres validados, resultados e cobertura. |

Cada passagem usa um código `Q...` distinto, sem modelo, sistema ou posição codificados no nome.
JC2/JP2 usam ordem inversa da passagem primária, sobre a ordem sorteada da coleta.
Os códigos de todas as passagens permanecem nos CSV e no mapa privado do consolidador.
O HTML apresenta posição, nome do modelo, pontuação geral, status, acadêmico (P), tecnológico (T2 parcial F1-F4) e custo de geração por explicação.
O nome mostrado é o ID exato do modelo solicitado, conforme o manifesto, sem inferir uma identidade comercial a partir do estilo.
O pesquisador autorizou a identificação apenas no relatório consolidado; os juízes continuam sem acesso ao mapa.

O programa preserva literalmente a resposta.
Uma suspeita de autoria explícita bloqueia as chamadas que receberiam esse conteúdo; não há remoção automática que possa alterar a explicação.
Essa triagem usa identificadores conhecidos e palavras de autoria, pode bloquear texto legítimo e não garante anonimato estilístico ou detecção de toda identidade possível.
Essa resposta é descartada dos julgamentos quando não é possível fornecer um pacote limpo; os comprovantes permanecem disponíveis para revisão.

## Isolamento das chamadas

Cada chamada inicia um novo `claude -p` no diretório da tarefa (`juizes/pareceres/PAPEL/CODIGO/` ou `privado/consolidador/`), com o pedido enviado por stdin.
Todas as chamadas usam as opções abaixo:

- `--system-prompt` com um prompt curto e neutro de juiz, no lugar do prompt padrão de agente de programação do Claude Code.
- `--setting-sources ""`, sem configurações de usuário, projeto ou locais, portanto sem CLAUDE.md, hooks, plugins, skills ou memória.
- `--tools ""`, sem ferramentas; resta apenas o mecanismo interno de saída estruturada.
- `--strict-mcp-config`, sem servidores MCP.
- `--disable-slash-commands` e `--no-session-persistence`, sem comandos, conversas reutilizadas ou sessão gravada.
- `--output-format json` e `--json-schema` com o schema do papel.

O ambiente do subprocesso é uma lista de permissões: `PATH`, `HOME`, `USER`, `LOGNAME`, `LANG`, `LC_ALL`, `TMPDIR`, `CLAUDE_CONFIG_DIR`, `SSL_CERT_FILE` e `SSL_CERT_DIR`.
A chave OpenRouter, `ANTHROPIC_API_KEY` e as variáveis de uma sessão Claude Code chamadora não são encaminhadas.
A autenticação é a existente no Claude Code, sem copiar segredos para o lote.

As fontes acessíveis ao juiz são os trechos congelados; URLs não significam navegação ou leitura integral.
Sem ferramentas, o juiz recebe o material do julgamento diretamente no pedido.
Configuração, diretório neutro e ausência de ferramentas limitam o contexto; não constituem uma máquina virtual ou prova de comportamento interno do serviço.
O juiz padrão, Opus 5.5, não é candidato, mas S01 `anthropic/claude-opus-5` e S02 `anthropic/claude-fable-5.1` são da mesma família.
Os juízes veem apenas códigos anônimos, mas um viés de autopreferência por estilo reconhecível é possível e exige revisão humana.
Os testes usam transportes sintéticos e registros de um piloto já executado pelo operador, sem novas chamadas pagas.

Dentro de cada papel (JC1, depois JC2, JP1, JP2, JT e JE), as execuções são julgadas em paralelo.
Os papéis seguem essa ordem porque JP depende do JC APTO correspondente e JE depende de JT; JC2/JP2 continuam despachados em ordem inversa.
O progresso aparece no terminal principal como `PAPEL: CODIGO: aguardando o Claude (modelo, esforço ...)` e depois `PAPEL: CODIGO - SITUAÇÃO[: motivo]`.
Uma interrupção do coordenador (Ctrl+C) encerra os subprocessos junto com ele.

## Validação e elegibilidade

Os pareceres preservam texto integral e itens estruturados.
O programa verifica papel, código, tema, rodada, itens únicos, escalas, motivos de N/A e cálculos científicos/pedagógicos.
O contrato de saída explicita os IDs e os valores de classificação exigidos em cada papel.
Novos schemas restringem identidade, papel e IDs permitidos antes da geração do parecer; pedidos já enviados mantêm seu schema original.
Inventários aceitam `A01`/`V01` como grafias de `A1`/`V1`, mas rejeitam a presença das duas grafias do mesmo item.
As classificações ignoram maiúsculas e minúsculas; em vínculos, `pendente` corresponde a N/A e `inválido` a problema confirmado, mantendo a conferência da nota.
Um item sem nota nem valor conhecido pode justificar a ausência somente em `reason_na`; notas e medidas conhecidas continuam exigindo evidência.
Inventários A/V classificados NÃO VERIFICÁVEL também podem justificar falta de evidência em `reason_na`, mantendo nota N/A e sem liberar APTO.
JE pode detalhar tokens totais, cache e raciocínio em itens opcionais, sempre conferidos contra os comprovantes e sem soma duplicada.
APTO exige K1-K6 iguais a 100, ao menos uma afirmação SUSTENTADA, nenhuma CONTRADITA, todo vínculo bibliográfico V verificado como VÁLIDO e nenhum impedimento declarado.
Afirmações periféricas NÃO VERIFICÁVEIS (nota nula, `reason_na` preenchido) não invalidam um APTO decidido pelo juiz e mantêm C2 como N/A.
Um vínculo V não verificável continua impedindo APTO.
Isso verifica consistência do parecer, não verdade científica.
Um parecer inconsistente fica preservado em `pendente.json`, sem reenvio para obter nota melhor.
Na retomada, chamadas já iniciadas reutilizam o pedido e o schema arquivados, mesmo após uma atualização do contrato.
Ao executar a retomada ou a revalidação local, pareceres aceitos e pendentes são conferidos novamente sem repetir as chamadas.
`revalidacoes/` preserva decisões imutáveis com o hash do resultado original; `revalidado.json` aponta para a decisão atual.
Cada CSV identifica a decisão imutável usada; arquivos `aceito.json`, `pendente.json` e saídas brutas continuam preservados.
A auditoria de um parecer inconsistente pode identificar itens individualmente válidos; eles permanecem no registro de revalidação e não são aproveitados nas notas.
O descarte exclui o parecer inteiro da análise de notas, incluindo duplicatas equivalentes e cálculos afetados.
Um resultado parcial, de outra versão ou com identidade incompatível não pode substituir um julgamento completo.
O certificado JP tem apenas os seis campos do protocolo; notas e identificadores de origem ficam no registro privado.

F5 exige inspeção humana conforme o protocolo vigente.
Como essa inspeção ainda não ocorreu, F5 e T2 do ramo explicação ficam N/A neste fluxo automático; F1-F4 e T1 podem permanecer conhecidos.
Não há metas de tempo/custo pré-fixadas no coletor, portanto E1-E3 continuam N/A.
Medidas brutas conhecidas permanecem disponíveis, e custo de julgamentos não entra no custo da geração.
Os CSV distinguem notas de LLM, medidas do coletor, apuração programática de T1 e registros administrativos.
Falha de JT/JE não apaga as medidas instrumentadas; ausência de custo confirmado continua N/A.

## Consolidação identificada

O código reúne as notas aceitas, mantém todas as execuções planejadas e calcula cobertura, agregados condicionais e estabilidade.
Uma chamada nova do consolidador recebe então o mapa privado, o ranking calculado e os resultados detalhados; sua síntese fica arquivada para auditoria.
Essa chamada só é iniciada depois de processar cada etapa ou registrar seu descarte; se nenhuma resposta for elegível, a síntese é local.
JC pode terminar em APTO ou CORRIGIR; PENDENTE ou parecer inválido é descartado integralmente das notas, sem manter itens isolados como resultados.
JP exige APTO da passagem correspondente; seu parecer também precisa de conclusão válida para fornecer notas.
JT/JE devem declarar CONCLUÍDO após apurar os itens disponíveis; valores N/A justificados não provam o dado, e status PENDENTE descarta o parecer.
CORRIGIR continua registrado como resultado científico desfavorável, sem iniciar uma substituição automática do texto.
Um renderizador local monta o HTML com uma única tabela de ranking, sem inserir a narrativa do consolidador.
Abaixo da tabela, `coletor/html-criteria.mjs` fornece os critérios de cada juiz, resumidos do protocolo 3.2, com os seis pontos de cada tema lidos do gabarito congelado no lote e o câmbio de `batch.json`.
As colunas por dimensão usam a média das execuções previstas do modelo e ficam N/A se faltar o dado em alguma delas; não recebem o 0 de apresentação da pontuação geral.
O tecnológico é T2 parcial: média de F1-F4, sem F5, que exige revisão humana; o T2 oficial continua N/A nos CSV.
O custo vem do `metricas.json` conciliado mais recente de cada execução, em reais pelo câmbio do lote, e é medida, não nota; rode `npm run recuperar` antes se a telemetria estiver pendente.
O ranking usa a média de P primário de todas as execuções previstas por modelo, exigindo JC1 APTO, JP1 CONCLUÍDO e ausência de contestação científica em cada execução.
Sem todas as notas P válidas, o modelo aparece com pontuação 0 e status ERRO; nos demais casos, o status é CONCLUÍDO.
Esse zero é uma regra de apresentação; as notas ausentes continuam N/A nos CSV, e uma nota P válida de zero continua CONCLUÍDO.
As pontuações são arredondadas a duas casas decimais, ordenadas em ordem decrescente e recebem a mesma posição quando empatadas.
O consolidador não pode alterar notas, nomes ou posições durante a composição do relatório.
Mudanças após a revalidação produzem uma revisão local identificada, sem nova chamada ao consolidador; o conjunto anterior de HTML e CSV fica arquivado em `consolidado/revisoes/`.
Se a chamada do consolidador falhar ou o comando for local, o renderizador conserva o ranking calculado e arquiva uma síntese local.
O HTML é independente, responsivo, sem scripts, dependências externas ou conteúdo de modelo executável; todos os textos são escapados.

Os CSV e pareceres incluem resultados por modelo/tema, notas por execução, códigos das passagens, material científico e motivos das decisões.
`consolidado/status-fluxo.json` registra descartes, cobertura e medições ausentes, separando encerramento automático de revisão humana.
Os CSV detalhados continuam disponíveis e preservam inventários, evidências, ausências e bloqueios.
Desacordos JC1/JC2 e alertas JP ficam provisórios; não se escolhe a passagem mais favorável.
O ranking desta atividade exige cobertura completa das execuções previstas; não usa a média apenas dos APTO sobreviventes.
Uma média global por rodada só existe com B01 e B02, APTO e P completos sem contestação científica.
O programa não calcula significância nem demonstra aprendizagem humana.

## Retomada e arquivos

`privado/julgamento.json` congela configuração, kit dos juízes, insumos, mapa e métricas no começo dos julgamentos.
`privado/fila-julgamento.json` registra chamadas aceitas, bloqueadas ou descartadas.
`juizes/pareceres/PAPEL/CODIGO/` preserva `pedido.md`, `schema.json`, `envio.json` (hash do pedido), `saida.json` (JSON bruto do Claude Code, com `structured_output`, `usage` e `total_cost_usd`), `stderr.log`, `concluido.json` (código de saída, sinal, timeout, erro, início e fim) e o parecer aceito ou rejeitado (`aceito.json`, `pendente.json`, `parecer.md`, `revalidacoes/`, `revalidado.json`).
`privado/consolidador/` contém o pacote identificado e os comprovantes da chamada de consolidação.
`consolidado/` contém HTML, CSV, relatório e orçamento de julgamentos.
`consolidado/orcamento-julgamentos.csv` lê tokens de `usage` em `saida.json` (entrada = input + criação de cache + leitura de cache; cache = leitura de cache; saída = output) e usa `avaliador_config_id` `CLAUDE-01`.
`custo_brl` permanece N/A: `total_cost_usd` é a estimativa a preço de tabela do Claude Code, e uma assinatura não prova cobrança marginal.
`privado/cobertura-fontes.json` identifica fontes incorporadas e referências do gabarito sem material correspondente.
Antes de novas gerações, o terminal mostra essa cobertura e informa quando o pacote contém notas de leitura ou paráfrases.
Referência cadastrada não equivale a acesso à obra completa; a ausência de uma fonte do gabarito, isoladamente, não invalida outra fonte fornecida que sustente o conceito.
Esses arquivos ficam no lote privado; não devem ser anexados aos juízes.

O `envio.json` é gravado antes de iniciar o subprocesso.
Uma chamada com `concluido.json` nunca é repetida; seu resultado arquivado é revalidado.
Uma chamada interrompida antes de terminar (`envio.json` sem `concluido.json`, por exemplo após Ctrl+C) é executada de novo com o mesmo `pedido.md` e `schema.json` arquivados, porque o subprocesso termina junto com o coordenador e não existe resultado.
Uma chamada que terminou sem parecer (erro do Claude, limite de uso, timeout ou ausência de saída estruturada) é descartada das notas nesta execução e refeita na retomada.
A tentativa anterior é movida para `tentativas/DATA/` com envio, pedido, schema, saída, diagnóstico e conclusão; `orcamento-julgamentos.csv` conta somente a tentativa atual.
Um parecer recebido e inválido nunca é reenviado, para não escolher o julgamento mais favorável.
Resultados aceitos são reutilizados, e mudança de insumos ou de configuração exige uma revisão explícita, sem sobrescrever originais.
Uma trava impede dois coordenadores no mesmo lote e é liberada ao encerrar normalmente ou receber a interrupção tratada.
Depois de encerramento abrupto, confira o PID registrado e remova somente `privado/julgamento.lock` se o coordenador já não existir, antes de retomar.
O programa não remove essa trava automaticamente nem adivinha se outro coordenador ainda está ativo.

As métricas usadas pelos juízes são um retrato do início dos julgamentos.
Uma conciliação OpenRouter posterior preserva o retrato; não modifica silenciosamente o parecer JE ou a consolidação já enviada.
Para esse caso, mantenha as novas evidências e registre uma revisão identificada do julgamento afetado.
A retomada de julgamento não inicia gerações ausentes e não preenche chamadas interrompidas com resultados presumidos.
