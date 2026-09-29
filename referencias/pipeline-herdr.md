# Fluxo completo pelo Herdr

`npm run executar` encadeia a coleta OpenRouter existente, os julgamentos Codex e o relatório `consolidado/resultados.html`.
O [guia de execução](../guia.md) ensina a iniciar o comando, acompanhar o processamento e abrir o relatório no navegador.
O comando usa o pane atual do Herdr como origem explícita e define `HERDR_ENV=1` apenas nos subprocessos da integração.
Não altera o ambiente global do shell, credenciais ou configuração pessoal do Herdr.
Não cria branches ou worktrees.

## Execução e simulação

```sh
npm run executar -- --simular
npm run executar
npm run executar -- --modelo-juiz gpt-6-sol --esforco-juiz medium
npm run executar -- --retomar
npm run executar -- --retomar "CAMINHO_DO_LOTE"
npm run executar -- --revalidar
```

O modo de simulação é estritamente local, sem catálogo remoto, panes ou modelos.
O modo `--revalidar` usa somente arquivos existentes, dispensa runtime Herdr e credenciais e não inicia chamadas; sem caminho, seleciona o lote mais recente.
Ao concluir, o programa informa as contagens de pendências e bloqueios e abre o HTML no navegador padrão; `--nao-abrir` desativa a abertura.
`--retomar` sem caminho seleciona o lote compatível mais recente pela data de criação em `output_dir`, inclusive quando já concluído, e informa o caminho antes da confirmação.
Se não houver lote, o comando encerra sem iniciar coleta; para conferir a seleção sem chamadas, use `--retomar --simular`.
A execução real exige Codex CLI autenticado e as opções `--ignore-user-config`, `--ignore-rules`, `--ephemeral` e `--output-schema`.
Herdr e opções do Codex são conferidos antes das gerações OpenRouter.
A confirmação `EXECUTAR` autoriza geração, julgamentos elegíveis e consolidação; `--confirmar` permite autorização explícita em automações.
Com seis explicações, o máximo é seis gerações OpenRouter e 37 sessões Codex: seis passagens por explicação e um consolidador.
Não se executa JP nos ramos sem APTO correspondente.
O modelo padrão dos avaliadores é `gpt-6-sol`, esforço `medium`, com timeout de 15 minutos por sessão.
A configuração e a versão do Codex são congeladas antes do primeiro julgamento e preservadas na retomada.

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
O código recebido por JC1 aparece ao lado do nome do modelo na tabela por execução do HTML.
A seção de correspondência contém os códigos de todos os papéis.
O nome mostrado é o ID exato do modelo solicitado, conforme o manifesto, sem inferir uma identidade comercial a partir do estilo.
O pesquisador autorizou a identificação apenas no relatório consolidado; os juízes continuam sem acesso ao mapa.

O programa preserva literalmente a resposta.
Uma suspeita de autoria explícita bloqueia as chamadas que receberiam esse conteúdo; não há remoção automática que possa alterar a explicação.
Essa triagem usa identificadores conhecidos e palavras de autoria, pode bloquear texto legítimo e não garante anonimato estilístico ou detecção de toda identidade possível.
O lote permanece pendente para revisão quando não é possível fornecer um pacote limpo.

## Isolamento das sessões

Cada chamada inicia um novo `codex exec` em `~/Documents/tmp/bench-juiz-...`, com pedido, schema, configuração, identificação anônima da tarefa e executor.
O processo não reutiliza conversas nem o daemon compartilhado e ignora configurações pessoais e regras de execução.
O catálogo de skills do host, instruções AGENTS, memória, plugins, apps, hooks, shell, navegador, busca, imagens e subagentes são desativados pelos controles da CLI.
O executor filtra o ambiente do processo, sem encaminhar a chave OpenRouter, variáveis dos panes ou chaves API de inferência.
A autenticação é a existente no Codex, sem copiar segredos para o lote.
Os parâmetros seguem a [referência oficial de configuração](https://learn.chatgpt.com/docs/config-file/config-reference) e o [modo não interativo](https://learn.chatgpt.com/docs/non-interactive-mode).

As fontes acessíveis ao juiz são os trechos congelados; URLs não significam navegação ou leitura integral.
Eventos com uso de ferramentas ou término incompatível impedem a aceitação do parecer.
Os dois avisos conhecidos sobre `skip_host_skill_discovery` experimental e Code Mode indisponível são aceitos apenas antes do início do turno.
Eles ficam preservados em `eventos.jsonl` sem repetição no terminal; novos workers também desativam o aviso de recursos experimentais pela configuração do Codex.
Code Mode e seu host continuam desativados nas sessões isoladas, que recebem o material do julgamento diretamente e não usam ferramentas.
Outros eventos de erro interrompem o julgamento com a mensagem registrada, sem reenviar a chamada.
Configuração, diretório neutro e auditoria de eventos limitam o contexto; não constituem uma máquina virtual ou prova de comportamento interno do serviço.
Os testes usam transportes sintéticos e registros de um piloto já executado pelo operador, sem novas chamadas pagas.

O Herdr abre um pane sem mudar o foco do usuário.
O pane mostra papel, código anônimo, modelo julgador, diretório e tempo decorrido a cada 15 segundos, além da conclusão ou falha.
O executor grava eventos, resultado estruturado, erros e conclusão em arquivos privados.
O registro de conclusão é publicado por renomeação após a gravação completa, evitando leitura de JSON parcial.
Após arquivar, tenta fechar somente o pane criado, se ele estiver novamente no shell do diretório esperado.
Essa verificação usa os caminhos reais, incluindo a equivalência entre `/var` e `/private/var` no macOS, mesmo quando o resultado foi rejeitado.
Uma interrupção do coordenador pode deixar o processo no pane até terminar ou atingir timeout.
Não feche outros panes para recuperar o lote.

## Validação e elegibilidade

Os pareceres preservam texto integral e itens estruturados.
O programa verifica papel, código, tema, rodada, itens únicos, escalas, motivos de N/A e cálculos científicos/pedagógicos.
O contrato de saída explicita os IDs e os valores de classificação exigidos em cada papel.
Novos schemas restringem identidade, papel e IDs permitidos antes da geração do parecer; pedidos já enviados mantêm seu schema original.
Inventários aceitam `A01`/`V01` como grafias de `A1`/`V1`, mas rejeitam a presença das duas grafias do mesmo item.
As classificações ignoram maiúsculas e minúsculas; em vínculos, `pendente` corresponde a N/A e `inválido` a problema confirmado, mantendo a conferência da nota.
Um item sem nota nem valor conhecido pode justificar a ausência somente em `reason_na`; notas e medidas conhecidas continuam exigindo evidência.
JE pode detalhar tokens totais, cache e raciocínio em itens opcionais, sempre conferidos contra os comprovantes e sem soma duplicada.
APTO exige K1-K6 iguais a 100, inventário de afirmações não vazio e sem itens não verificados/errados, vínculos válidos e nenhum impedimento declarado.
Isso verifica consistência do parecer, não verdade científica.
Um parecer inconsistente fica preservado em `pendente.json`, sem reenvio para obter nota melhor.
Na retomada, julgamentos já enviados reutilizam o pedido e o schema arquivados, mesmo após uma atualização do contrato.
Ao executar a retomada ou a revalidação local, pareceres aceitos e pendentes são conferidos novamente sem repetir as chamadas.
`revalidacoes/` preserva decisões imutáveis com o hash do resultado original; `revalidado.json` aponta para a decisão atual.
Cada CSV identifica a decisão imutável usada; arquivos `aceito.json`, `pendente.json` e saídas brutas continuam preservados.
Um parecer inconsistente pode fornecer itens individualmente válidos, mas nunca APTO ou elegibilidade pedagógica.
Duplicatas equivalentes e cálculos dependentes de itens inválidos ficam excluídos dos valores conhecidos.
JSON íntegro na mensagem final pode recuperar uma saída estruturada ausente ou malformada, somente após conferir conclusão e isolamento dos eventos.
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
Uma sessão nova do consolidador recebe então o mapa privado e compõe título, resumo, observações e limitações de `resultados.html`.
Um renderizador local monta o HTML com esses textos e com as tabelas provenientes dos registros validados.
O consolidador não pode alterar notas nas tabelas, códigos ou nomes durante a composição do relatório.
Mudanças após a revalidação produzem uma revisão local identificada, sem nova chamada ao consolidador; o conjunto anterior de HTML e CSV fica arquivado em `consolidado/revisoes/`.
Se a sessão do consolidador falhar ou o comando for local, o renderizador gera uma síntese local identificada e conserva as tabelas e pendências.
O HTML é independente, responsivo, sem scripts, dependências externas ou conteúdo de modelo executável; todos os textos são escapados.

O relatório inclui resultados por modelo/tema, notas por execução e os códigos usados em todas as passagens.
O HTML também mostra as fontes incorporadas, referências do gabarito sem material e o uso de notas ou paráfrases.
Os CSV detalhados continuam disponíveis e preservam inventários, evidências, ausências e bloqueios.
Desacordos JC1/JC2 e alertas JP ficam provisórios; não se escolhe a passagem mais favorável.
Média condicional dos APTO não vira ranking global.
Uma média global por rodada só existe com os quatro temas, APTO e P completos sem contestação científica.
O programa não calcula significância nem demonstra aprendizagem humana.

## Retomada e arquivos

`privado/julgamento.json` congela configuração, kit dos juízes, insumos, mapa e métricas no começo dos julgamentos.
`privado/fila-julgamento.json` registra chamadas aceitas, bloqueadas ou pendentes.
`juizes/pareceres/PAPEL/CODIGO/` preserva pedido, schema, envio, eventos, saída e parecer aceito ou rejeitado.
`privado/consolidador/` contém o pacote identificado e os comprovantes da sessão de consolidação.
`consolidado/` contém HTML, CSV, relatório e orçamento de julgamentos.
`privado/cobertura-fontes.json` identifica fontes incorporadas e referências do gabarito sem material correspondente.
Antes de novas gerações, o terminal mostra essa cobertura e informa quando o pacote contém notas de leitura ou paráfrases.
Referência cadastrada não equivale a acesso à obra completa; a ausência de uma fonte do gabarito, isoladamente, não invalida outra fonte fornecida que sustente o conceito.
Esses arquivos ficam no lote privado; não devem ser anexados aos juízes.

O envio é registrado antes de disparar o processo no Herdr.
Uma queda após o envio nunca autoriza reenviar a mesma chamada automaticamente.
A retomada consulta o resultado da sessão já criada; falta de confirmação permanece pendente.
Resultados aceitos são reutilizados, e mudança de insumos ou de configuração exige uma revisão explícita, sem sobrescrever originais.
Uma trava impede dois coordenadores no mesmo lote e é liberada ao encerrar normalmente ou receber a interrupção tratada.
Depois de encerramento abrupto, confira o PID registrado e remova somente `privado/julgamento.lock` se o coordenador já não existir, antes de retomar.
O programa não remove essa trava automaticamente nem adivinha se outro coordenador ainda está ativo.

As métricas usadas pelos juízes são um retrato do início dos julgamentos.
Uma conciliação OpenRouter posterior preserva o retrato; não modifica silenciosamente o parecer JE ou a consolidação já enviada.
Para esse caso, mantenha as novas evidências e registre uma revisão identificada do julgamento afetado.
A retomada de julgamento não inicia gerações ausentes e não preenche chamadas interrompidas com resultados presumidos.
