# Guia de execução - do terminal ao relatório no navegador

Vamos comparar sistemas de IA explicando dois temas de saúde, B01 e B02.
Primeiro vem a correção científica; depois, a qualidade didática estimada.
Nas novas coletas, o executor é único: coletor isolado conectado ao OpenRouter.
As coletas antigas com Codex, Claude Code e OpenCode pertencem a outra condição e permanecem separadas.

O fluxo completo é: abrir um terminal, coletar pelo OpenRouter, julgar com códigos anônimos e abrir o HTML identificado.
Você acompanha tudo pelo terminal que iniciou o comando.

## 1. Abra o projeto em um terminal

Abra um terminal na pasta do projeto.
Entre na pasta deste projeto; nesta máquina, o comando é:

```sh
cd ~/Documents/dev/unirios/bench
```

Se o projeto estiver em outro lugar, use o caminho da sua cópia.
Os comandos deste guia devem ser executados a partir dessa pasta.
Confira os programas necessários:

```sh
node --version
claude --version
```

É necessário Node.js 24 ou superior e Claude Code CLI instalado e autenticado; o login existente do Claude Code é reaproveitado.
Se ainda não estiver autenticado, execute `claude` uma vez e siga as instruções de login.
Não é necessário executar `npm install` nem instalar skills.

## 2. Prepare a coleta uma vez

```sh
npm run configurar
```

O comando cria os arquivos locais que faltarem e preserva os existentes.
Confira estes três pontos antes da primeira execução:

| Arquivo | O que preencher |
| --- | --- |
| `.env` | Sua chave em `OPENROUTER_API_KEY`. |
| `openrouter.config.json` | Modelos, temas, rodadas e cotação em reais por dólar, com data e fonte. |
| `fontes/openrouter/B01.md` | Material bibliográfico autorizado e identificado para o tema do piloto. |

Depois de conferir as fontes, marque `sources_reviewed: true` no tema correspondente da configuração.
No PILOTO, a opção `pilot_sources_prepared: true` admite notas preparadas por IA ainda sem revisão humana; isso não as torna fontes verificadas.
Os arquivos-modelo criados por `configurar` precisam ser preenchidos.
Links e paráfrases curtas podem deixar afirmações sem sustentação e impedir APTO.
Forneça texto original autorizado que cubra os conceitos do pedido, com obra, seção, origem e licença.
Identifique cada inclusão com um título como `## Texto original incorporado - B01-F3`; isso declara o escopo, sem substituir a conferência do conteúdo.
Nesta máquina, B01 inclui as notas anteriores e o corpo textual original de F3, preservado com hash e licença; a revisão humana continua pendente.
O limite comum de saída passou para 32.768 tokens, mantendo esforço `medium`, porque o raciocínio também consome esse limite.
Esse teto não aumenta a extensão solicitada da aula; pode aumentar o consumo real e não garante ausência de truncamento ou indisponibilidade do provedor.
Se esta cópia já estiver preparada, preserve os arquivos locais e siga para a simulação.
O [workflow](workflow.md#1-prepare-uma-vez) detalha fontes, cotação e configuração do piloto.

## 3. Simule e inicie o fluxo completo

Primeiro confira a configuração sem chamadas pagas:

```sh
npm run executar -- --simular
```

O terminal informa quantas gerações e julgamentos estão previstos.
No piloto de seis modelos, um tema e uma rodada, são seis gerações OpenRouter, até 36 julgamentos e uma consolidação Claude.
A simulação não acessa a rede, não chama modelos e não gera o HTML.
Ela também não confirma saldo, autenticação ou disponibilidade dos serviços.

Para iniciar de verdade:

```sh
npm run executar
```

O programa confere `claude --version` antes das gerações OpenRouter.
Quando aparecer `Digite EXECUTAR para começar:`, digite `EXECUTAR` e pressione Enter.
Essa confirmação autoriza as chamadas OpenRouter e Claude, que podem consumir créditos ou franquia da conta.

O avaliador padrão é `claude-opus-5-5`, com esforço `medium` (`low`, `medium`, `high`, `xhigh` ou `max`).
Para escolher outro modelo ou esforço antes de começar, use esta variante no lugar do comando anterior:

```sh
npm run executar -- --modelo-juiz ID_DO_MODELO --esforco-juiz NIVEL
```

Deixe o terminal principal aberto durante o processamento.
Cada execução sem `--retomar` cria um lote novo e pode fazer novas chamadas pagas.

## 4. Acompanhe o andamento

Observe as mensagens no terminal principal.
Os caminhos e códigos da tabela abaixo são exemplos do formato, não resultados de uma coleta realizada.

| Mensagem no terminal | O que está acontecendo |
| --- | --- |
| `Lote: /caminho/do/lote` | A pasta foi criada; copie esse caminho para localizar os arquivos. |
| `1/6: S01, B01, rodada 1` | O coletor iniciou a tentativa indicada; os arquivos dessa geração serão salvos no lote. |
| `Lote para retomada: /caminho/do/lote` | A etapa de coleta terminou ou foi interrompida; esse é o diretório a usar na retomada. |
| `JC1: Q...` e `JC2: Q...` | O coordenador está tratando as duas passagens científicas. |
| `JP1: Q...` e `JP2: Q...` | Está tratando pedagogia; só há chamada ao juiz quando a passagem científica correspondente tem APTO válido. |
| `JT: Q...` e `JE: Q...` | Está tratando formato/conclusão operacional e, depois, tempo/custo. |
| `CONSOLIDADOR: montando resultados.html...` | A chamada separada do consolidador recebeu o mapa dos modelos e está compondo o relatório. |
| `Resultados: /caminho/do/lote/consolidado/resultados.html` | O relatório está pronto para abrir. |
| `Fluxo encerrado com descartes` | O lote foi processado; respostas incompletas e pareceres não concluídos foram excluídos das notas, com motivos registrados. |

Uma linha de papel/código indica o item sendo tratado; ele também pode ser bloqueado ou recuperado de uma execução anterior, sem nova chamada.
Dentro de cada papel, as execuções são julgadas em paralelo; os papéis seguem a ordem JC1, JC2, JP1, JP2, JT e JE.
Cada chamada é um subprocesso `claude -p` iniciado pelo próprio programa, no diretório da tarefa dentro do lote.

O terminal principal mostra `PAPEL: CODIGO: aguardando o Claude (modelo, esforço ...)` ao iniciar e `PAPEL: CODIGO - SITUAÇÃO[: motivo]` após a validação, incluindo bloqueios e pendências.
Uma chamada pode levar vários minutos; o limite configurado é de 15 minutos por chamada, e não para o lote inteiro.

Se quiser inspecionar os arquivos durante a execução, abra um segundo terminal e guarde o caminho real do lote:

```sh
DIRETORIO_DO_LOTE="/caminho/completo/do/lote"
open "$DIRETORIO_DO_LOTE"
```

Substitua `/caminho/completo/do/lote` pelo caminho mostrado no terminal, sem o prefixo `Lote:`.
No macOS, `open` acima abre a pasta no Finder.
Essa variável fica disponível somente no terminal em que você a definiu.

| Local no lote | O que você pode acompanhar |
| --- | --- |
| `entrada/` e `metricas.csv` | Explicações e métricas das tentativas já registradas. |
| `RESUMO.md` | Situação da coleta OpenRouter; não é a confirmação de que todos os julgamentos terminaram. |
| `privado/fila-julgamento.json` | Situação atualizada após cada item tratado: aceito, descartado ou bloqueado. |
| `juizes/pareceres/PAPEL/CODIGO/` | Pedido e registro de envio; depois da conclusão, `saida.json`, `stderr.log`, `concluido.json` e parecer aceito ou pendência. |
| `privado/consolidador/` | Pacote identificado e registros da composição do relatório. |
| `consolidado/status-fluxo.json` | Contagens de respostas completas, descartes e medições ausentes, com motivos por modelo e etapa. |

Durante uma chamada, a pasta do papel/código contém `pedido.md`, `schema.json` e `envio.json`; `saida.json`, `stderr.log` e `concluido.json` aparecem quando ela termina.
Esses arquivos são privados e servem para acompanhamento; não os encaminhe aos juízes.

## 5. Abra o HTML no navegador

Aguarde a linha `Resultados: .../consolidado/resultados.html` no terminal principal.
Ela fornece o caminho exato do arquivo gerado.
O programa abre o relatório no navegador padrão após informar que o fluxo foi concluído.
Use `--nao-abrir` quando quiser somente gerar o arquivo.
Respostas com erro, timeout, truncamento ou texto vazio são descartadas antes de iniciar os juízes, mesmo quando há um trecho de texto disponível.
Recusa, PENDENTE DE FONTES e autoria que comprometa o anonimato também impedem o envio dessa resposta aos juízes.
Parecer sem decisão final ou que falhe na validação recebe DESCARTADO e não fornece notas ao relatório.
O processamento encerra com resultados válidos e descartes documentados; essa conclusão não significa que todos os modelos obtiveram notas.
Se todas as respostas forem descartadas, todos os modelos aparecem no ranking com 0 e ERRO; o HTML é montado localmente, sem chamada ao consolidador.
Para aplicar essas regras aos arquivos existentes e abrir o relatório sem chamadas:

```sh
npm run executar -- --revalidar
```

CORRIGIR é uma decisão científica final desfavorável, com motivos registrados; a pedagogia correspondente permanece bloqueada.
Ciência PENDENTE indica uma verificação não concluída; esse parecer é descartado das notas.
Medições ausentes ficam N/A e são excluídas das comparações correspondentes, sem impedir o julgamento de um texto completo.
Uma nova rodada não é iniciada automaticamente e não substitui uma resposta original rejeitada.

No macOS, defina o caminho real do lote e abra o relatório no Safari:

```sh
DIRETORIO_DO_LOTE="/caminho/completo/do/lote"
open -a Safari "$DIRETORIO_DO_LOTE/consolidado/resultados.html"
```

Você também pode abrir o arquivo pelo menu de abertura do seu navegador preferido.
O relatório é um arquivo local independente e não precisa de servidor web.

O HTML contém uma tabela de ranking, ordenada da maior pontuação geral para a menor:

| Coluna | Significado |
| --- | --- |
| Posição | Colocação pela pontuação; valores iguais empatam. |
| Modelo | Nome exato do modelo solicitado na coleta. |
| Pontuação geral | P pedagógico primário, de 0 a 100; se houver várias execuções previstas, a média de todas elas. |
| Status | CONCLUÍDO quando todas as execuções têm P válido, JC1 APTO, JP1 CONCLUÍDO e nenhuma contestação científica; ERRO nos demais casos. |
| Acadêmico | Índice pedagógico P do JP1, o mesmo da pontuação geral; N/A quando faltar. |
| Tecnológico | T2 parcial: média de F1 (título), F2 (800 a 1.200 palavras), F3 (seções) e F4 (fontes); F5 exige revisão humana e fica de fora. |
| Custo por explicação | Custo de geração informado pelo OpenRouter, em reais pelo câmbio do lote; medida, não nota. Rode `npm run recuperar` antes se a telemetria estiver pendente. |

Sem uma avaliação pedagógica completa, a linha do modelo recebe 0 e ERRO.
Abaixo da tabela, a seção Como as respostas foram avaliadas mostra o que cada juiz verificou: os seis pontos científicos do tema, as métricas pedagógicas, os requisitos formais e a origem do custo.
Uma nota P válida de zero aparece como 0 e CONCLUÍDO.
As pontuações são arredondadas a duas casas decimais antes da ordenação.
Uma execução sem nota válida impede calcular a média do modelo apenas com as execuções restantes.
JC2/JP2 verificam estabilidade; o ranking não escolhe a passagem com maior nota.
Ausência de tempo ou custo não impede usar um P válido.

Os juízes receberam somente seus códigos e materiais permitidos.
A sessão do consolidador recebeu o mapa código-modelo para produzir esse relatório identificado.
Nos CSV e pareceres, N/A continua indicando ausência ou inaplicabilidade.
O zero de uma linha ERRO é uma regra de apresentação do ranking, não uma nota científica ou pedagógica atribuída pelo juiz.
F5 e T2 do ramo explicação aguardam inspeção humana; E1-E3 ficam N/A enquanto não houver metas pré-fixadas.
Concluir as etapas automáticas não substitui a revisão humana prevista no protocolo.

Os arquivos `resultados-completos.csv`, `resultados-resumo.csv` e `estabilidade.csv`, na mesma pasta, permitem conferir itens, evidências e passagens.

## 6. Se o processo for interrompido

Para retomar o lote mais recente, volte à pasta do projeto e execute:

```sh
npm run executar -- --retomar
```

O comando escolhe o lote pela data de criação em `output_dir` e mostra o caminho antes da confirmação.
Para escolher um lote específico, informe o caminho:

```sh
npm run executar -- --retomar "/caminho/completo/do/lote"
```

Use o diretório do lote, não o caminho de `resultados.html`.
O próprio terminal também imprime um comando de retomada com o caminho preenchido.
A retomada não gera novas explicações e reutiliza os julgamentos já concluídos ou aceitos.
Linhas de coleta que ficaram sem execução não são iniciadas por esse comando.
Uma chamada que terminou sem parecer (erro do Claude, limite de uso, timeout ou sem saída estruturada) tem o julgamento descartado nesta execução e é refeita ao retomar; a tentativa anterior fica em `tentativas/`.
Um parecer recebido e inválido não é reenviado.
Uma chamada interrompida antes de terminar, por exemplo com `Ctrl+C`, é executada de novo com o mesmo pedido arquivado.
A retomada revalida os pareceres arquivados com as regras corrigidas e conserva o original.
Pareceres incompletos ou inconsistentes são descartados por inteiro das notas; os originais e as decisões de validação continuam arquivados.
Pareceres parciais nunca liberam pedagogia nem ranking, nem fornecem notas isoladas ao resultado.

Para recuperar apenas os arquivos existentes, sem rede ou chamadas de modelos:

```sh
npm run executar -- --revalidar
```

O comando usa o lote mais recente; acrescente `--retomar "/caminho/do/lote"` para escolher outro.
Ele não pede confirmação de chamadas porque só realiza operações locais; ao encerrar o processamento, abre o HTML com o ranking atualizado.
Relatórios anteriores ficam em `consolidado/revisoes/`, e cada decisão de revalidação fica em um arquivo imutável em `revalidacoes/` junto ao parecer original.
`revalidado.json` aponta para a decisão atual, e os CSV identificam o arquivo imutável usado em cada revisão.
Julgamentos que nunca foram realizados continuam identificados como ausentes ou bloqueados; esse modo não cria novas avaliações.
Tempos, tokens e custos conhecidos nos registros são publicados mesmo quando JT ou JE forem descartados, com a origem identificada no CSV.

Se precisar interromper o coordenador, pressione `Ctrl+C` uma vez no terminal principal e aguarde a mensagem de saída.
Os subprocessos dos juízes terminam junto com o coordenador.
Antes de retomar, espere o coordenador anterior encerrar.
Se aparecer uma mensagem de trava após encerramento abrupto, siga a orientação de [retomada e arquivos](referencias/pipeline-claude.md#retomada-e-arquivos).

Se aparecer `Não foi possível concluir: ...`, leia o motivo e preserve o lote para investigação.
Uma falha individual de juiz é registrada e o fluxo continua para os demais modelos e para a geração do HTML.
Quando houver exclusões, o terminal informa `Fluxo encerrado com descartes`, detalha os motivos e mostra `Resultados:` com o caminho do HTML.
Descartes registrados são situações finais e não exigem uma nova tentativa; o HTML apresenta os modelos sem avaliação completa com 0 e ERRO, e os registros detalhados preservam N/A e os motivos.
Revalidar recupera erros do validador, mas não cria texto faltante, não muda CORRIGIR para APTO nem refaz a ciência com uma bibliografia nova.

Quando a geração de um modelo falhar sem texto, por exemplo com HTTP 529 ou 429 do provedor, é possível refazer só esse sistema no mesmo lote:

```sh
npm run refazer -- "/caminho/completo/do/lote" S01
npm run executar -- --retomar "/caminho/completo/do/lote"
```

O primeiro comando usa o modelo que estiver cadastrado para o sistema em `openrouter.config.json`, que pode ser o mesmo ou outro.
O pedido, as fontes e os parâmetros são os congelados no lote; somente a geração desse sistema é cobrada.
O comando recusa sistemas que já tenham resposta com texto, para não trocar um modelo depois de ver a resposta.
A tentativa anterior fica preservada em `comprovantes/`, e a substituição fica registrada em `batch.json`, no campo `replacements`, e em `lote.md`.
A retomada julga somente a nova execução e reutiliza os pareceres dos demais modelos.

## 7. Apagar os resultados e recomeçar

Na pasta do projeto, execute:

```sh
npm run apagar
```

O comando remove todos os lotes reconhecidos na pasta `output_dir` de `openrouter.config.json`, incluindo explicações, comprovantes, avaliações e HTML.
Código, `.env`, `openrouter.config.json`, fontes e arquivos alheios ao fluxo são preservados.
A remoção é definitiva e não exige uma confirmação adicional.

Se houver uma coleta ou um coordenador ainda ativo, pressione `Ctrl+C` no terminal principal e espere a mensagem de saída antes de executar a limpeza.
O comando recusa apagar enquanto um processo do fluxo estiver ativo ou uma trava de lote tiver um PID vivo.
`executar`, `coletar`, `recuperar` e `apagar` reservam a pasta de saída com `.operacao.lock`, impedindo operações simultâneas.
A trava é removida na saída normal; após encerramento abrupto, confira se o PID registrado realmente encerrou antes de remover esse arquivo.
Depois da limpeza, inicie um lote novo:

```sh
npm run executar
```

`npm run apagar` não faz chamadas aos modelos; a nova execução de `npm run executar` faz novas chamadas após sua confirmação.

## Temas do estudo

| Curso | Tema |
| --- | --- |
| Biomedicina | B01 - Hemostasia e coagulação. |
| Biomedicina | B02 - Resposta imune e memória. |

## Material de estudo esperado

Cada explicação deve ter de 800 a 1.200 palavras, além da lista final de fontes.
O texto desenvolve os seis pontos do tema, explica as conexões do mecanismo, acompanha um exemplo e esclarece duas confusões conceituais.
Duas perguntas com respostas comentadas ajudam a revisar o raciocínio; a síntese final reúne três ideias principais.
O objetivo é uma pequena aula para estudo individual, com linguagem simples e profundidade delimitada, sem ampliar o assunto para além do recorte.
Quantidade de palavras não demonstra aprendizagem; os juízes continuam avaliando correção e qualidade didática estimada.

## Quem dá as notas

| Juiz | O que verifica | Resultado |
| --- | --- | --- |
| JC - Científico | Correção dos seis pontos e sustentação nas fontes lidas. | C1-C3 e APTO ou CORRIGIR; PENDENTE é descartado das notas. |
| JP - Pedagógico | Clareza, organização, foco, causalidade e exemplos, somente após APTO. | Cinco dimensões e índice P, a partir de 10 itens. |
| JT - Tecnológico | Conclusão da geração e cumprimento do formato. | T1 e T2. |
| JE - Tempo e custo | Duração, consumo e gasto documentados. | Valores brutos e E1-E3, quando calculáveis. |

Cada papel recebe apenas seus materiais e trabalha em sessão separada.
Ciência e pedagogia têm duas passagens para verificar estabilidade, com códigos diferentes.
O programa organiza os pacotes; o consolidador reúne os quatro painéis sem produzir uma nota geral.
O comando `npm run coletar` e o [roteiro de avaliação manual](avaliacao.md) continuam disponíveis para quem escolher organizar e encaminhar os julgamentos manualmente.

## Limites que permanecem

- Sem alunos participantes, as notas não comprovam aprendizagem ou probabilidade de compreensão.
- O executor comum reduz diferenças locais, mas modelo, provedor e configurações internas continuam compondo a condição observada.
- O fluxo bloqueia conteúdo com suspeita de autoria explícita, preserva o original e não garante que o estilo seja irreconhecível.
- Telemetria incompleta fica PENDENTE; sem metas prévias de tempo/custo, publicam-se valores brutos, não notas E inventadas.
- Boa escrita, rapidez e preço não compensam erro científico; desacordos exigem revisão especializada.

Comece com o piloto de seis modelos sobre B01, uma rodada.
Uma proposta definitiva com esses seis modelos × dois temas × cinco rodadas teria 60 execuções, em outro lote; não é cálculo de poder estatístico nem configuração ativada automaticamente.
Antes dela, use o [planejamento completo](modelos/planejamento.md) para fixar condições, fontes, ordem, metas e revisão humana.
Critérios e fórmulas estão no [protocolo](referencias/protocolo-pontuacao.md).
