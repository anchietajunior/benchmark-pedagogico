# Guia de execução - do Herdr ao relatório no navegador

Vamos comparar sistemas de IA explicando quatro temas de saúde.
Primeiro vem a correção científica; depois, a qualidade didática estimada.
Nas novas coletas, o executor é único: coletor isolado conectado ao OpenRouter.
As coletas antigas com Codex, Claude Code e OpenCode pertencem a outra condição e permanecem separadas.

O fluxo completo é: iniciar no Herdr, coletar pelo OpenRouter, julgar com códigos anônimos e abrir o HTML identificado.
Você acompanha tudo pelo terminal que iniciou o comando.

## 1. Abra o projeto no Herdr

Abra um terminal, chamado pane, dentro do Herdr.
Entre na pasta deste projeto; nesta máquina, o comando é:

```sh
cd ~/Documents/dev/unirios/bench
```

Se o projeto estiver em outro lugar, use o caminho da sua cópia.
Os comandos deste guia devem ser executados a partir dessa pasta.
Confira os programas necessários:

```sh
node --version
herdr --version
codex --version
```

É necessário Node.js 24 ou superior, Herdr ativo e Codex CLI instalado e autenticado.
Se o Codex ainda não estiver autenticado, execute `codex login` e conclua as instruções exibidas.
Não é necessário executar `npm install` nem instalar skills.
O fluxo configura `HERDR_ENV=1` nas próprias chamadas ao Herdr.

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
Se esta cópia já estiver preparada, preserve os arquivos locais e siga para a simulação.
O [workflow](workflow.md#1-prepare-uma-vez) detalha fontes, cotação e configuração do piloto.

## 3. Simule e inicie o fluxo completo

Primeiro confira a configuração sem chamadas pagas:

```sh
npm run executar -- --simular
```

O terminal informa quantas gerações e julgamentos estão previstos.
No piloto de seis modelos, um tema e uma rodada, são seis gerações OpenRouter, até 36 julgamentos e uma consolidação Codex.
A simulação não acessa a rede, não abre panes e não gera o HTML.
Ela também não confirma saldo, autenticação ou disponibilidade dos serviços.

Para iniciar de verdade:

```sh
npm run executar
```

O programa confere a conexão com o Herdr e as opções necessárias do Codex.
Quando aparecer `Digite EXECUTAR para começar:`, digite `EXECUTAR` e pressione Enter.
Essa confirmação autoriza as chamadas OpenRouter e Codex, que podem consumir créditos ou franquia da conta.

O avaliador padrão é `gpt-6-sol`, com esforço `medium`.
Para escolher outro modelo antes de começar, use esta variante no lugar do comando anterior:

```sh
npm run executar -- --modelo-juiz ID_DO_MODELO
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
| `CONSOLIDADOR: montando resultados.html...` | A sessão separada do consolidador recebeu o mapa dos modelos e está compondo o relatório. |
| `Resultados: /caminho/do/lote/consolidado/resultados.html` | O relatório está pronto para abrir. |

Uma linha de papel/código indica o item sendo tratado; ele também pode ser bloqueado ou recuperado de uma execução anterior, sem nova chamada.
Os julgamentos são processados em sequência.
Cada chamada nova abre um pane no Herdr sem tirar o foco do terminal principal.
O programa tenta fechar o pane criado depois de arquivar a conclusão, se ele estiver novamente livre no shell esperado.

O pane do juiz pode ficar sem texto: os eventos e a resposta são gravados em arquivos, não apresentados como uma conversa interativa.
Use as mensagens do terminal principal para acompanhar as etapas.
Uma sessão Codex pode levar vários minutos; o limite configurado é de 15 minutos por sessão, e não para o lote inteiro.

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
| `privado/fila-julgamento.json` | Situação atualizada após cada item tratado: aceito, pendente ou bloqueado. |
| `juizes/pareceres/PAPEL/CODIGO/` | Pedido e registro de envio; depois da conclusão, eventos, resultado e parecer aceito ou pendência. |
| `privado/consolidador/` | Pacote identificado e registros da composição do relatório. |

Para ver os eventos de uma sessão ainda em andamento, abra o `envio.json` da pasta daquele papel/código e copie o caminho do campo `workspace`.
No segundo terminal, use esse caminho:

```sh
tail -f "/caminho/do/workspace/eventos.jsonl"
```

Troque o caminho de exemplo pelo valor real de `workspace`, mantendo `/eventos.jsonl` ao final.
Se o arquivo ainda não existir, aguarde o início do processo e tente novamente.
Para encerrar somente essa visualização, pressione `Ctrl+C` no terminal do `tail`.
Esses arquivos são privados e servem para acompanhamento; não os encaminhe aos juízes.

## 5. Abra o HTML no navegador

Aguarde a linha `Resultados: .../consolidado/resultados.html` no terminal principal.
Ela fornece o caminho exato do arquivo gerado.
O programa informa esse caminho, mas não abre o navegador automaticamente.

No macOS, defina o caminho real do lote e abra o relatório no Safari:

```sh
DIRETORIO_DO_LOTE="/caminho/completo/do/lote"
open -a Safari "$DIRETORIO_DO_LOTE/consolidado/resultados.html"
```

Você também pode abrir o arquivo pelo menu de abertura do seu navegador preferido.
O relatório é um arquivo local independente e não precisa de servidor web.

No navegador, confira:

1. **Resultados por modelo e tema:** nome do modelo, quantidade prevista, APTO e cobertura da média pedagógica.
2. **Notas por execução:** código usado em JC1, nome do modelo, tema, rodada, notas, tempo e custo.
3. **Códigos utilizados em todos os julgamentos:** clique para expandir a correspondência de cada passagem com seu modelo.
4. **Leitura do consolidador e limitações:** observações, pendências e cuidados para interpretar os resultados.

Os juízes receberam somente seus códigos e materiais permitidos.
A sessão do consolidador recebeu o mapa código-modelo para produzir esse relatório identificado.
N/A significa ausência ou inaplicabilidade, nunca nota zero.
F5 e T2 do ramo explicação aguardam inspeção humana; E1-E3 ficam N/A enquanto não houver metas pré-fixadas.
Mesmo com HTML gerado, podem existir avaliações pendentes e resultados provisórios.

Os arquivos `resultados-completos.csv`, `resultados-resumo.csv` e `estabilidade.csv`, na mesma pasta, permitem conferir itens, evidências e passagens.

## 6. Se o processo for interrompido

Para retomar os julgamentos do mesmo lote, volte à pasta do projeto e execute:

```sh
npm run executar -- --retomar "/caminho/completo/do/lote"
```

Use o diretório do lote, não o caminho de `resultados.html`.
O próprio terminal também imprime um comando de retomada com o caminho preenchido.
A retomada não gera novas explicações e reutiliza os julgamentos já enviados ou aceitos.
Linhas de coleta que ficaram sem execução não são iniciadas por esse comando.
Uma chamada sem confirmação permanece vinculada ao envio original; um parecer inválido permanece pendente.

Se precisar interromper o coordenador, pressione `Ctrl+C` uma vez no terminal principal e aguarde a mensagem de saída.
Um juiz já iniciado pode continuar no seu pane até terminar ou atingir o limite de tempo.
Antes de retomar, espere o coordenador anterior encerrar.
Se aparecer uma mensagem de trava após encerramento abrupto, siga a orientação de [retomada e arquivos](referencias/pipeline-herdr.md#retomada-e-arquivos).

Se aparecer `Não foi possível concluir: ...`, leia o motivo e preserve o lote para investigação.
Quando houver apenas pendências registradas, o comando pode gerar o HTML e terminar com código de saída 2; confira o relatório.
O caminho da linha `Resultados:` continua sendo a referência para abrir o arquivo concluído.

## Temas do estudo

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

## Quem dá as notas

| Juiz | O que verifica | Resultado |
| --- | --- | --- |
| JC - Científico | Correção dos seis pontos e sustentação nas fontes lidas. | C1-C3 e APTO, CORRIGIR ou PENDENTE. |
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
Uma proposta definitiva com esses seis modelos × quatro temas × cinco rodadas teria 120 execuções, em outro lote; não é cálculo de poder estatístico nem configuração ativada automaticamente.
Antes dela, use o [planejamento completo](modelos/planejamento.md) para fixar condições, fontes, ordem, metas e revisão humana.
Critérios e fórmulas estão no [protocolo](referencias/protocolo-pontuacao.md).
