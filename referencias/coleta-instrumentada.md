# Coleta de tempo e tokens fora do modelo

Pesquisa e proposta verificadas em 26/09/2026.
Esta proposta registra a abordagem anterior com três agentes; a implementação nova e separada está em [coletor OpenRouter](coletor-openrouter.md).
O coletor descrito aqui ainda não foi implementado; este documento não substitui silenciosamente o protocolo 3.1 nem os metaprompts atuais.
O escopo solicitado passa a considerar Codex, Claude Code e OpenCode, cada um com modelo e configuração identificados.

## Diagnóstico das coletas existentes

Os dois arquivos examinados em `~/Documents/coletas/entrada/` contêm `N/A` para tempo, tokens e custo.
Os metaprompts delegam ao gerador a transcrição de medidas que podem não estar disponíveis dentro de sua conversa.
Além disso, o arquivo é produzido antes do encerramento da execução, portanto não pode comprovar sozinho seus totais finais.
A correção é medir pelo programa que executa o agente, e não pedir ao modelo que calcule seu próprio consumo.

Foi possível localizar registros técnicos ligados aos IDs dos arquivos, sem alterar os originais nem executar novas gerações.
Estes são dados retrospectivos dos registros locais, não uma medição nova de ponta a ponta pelo futuro coletor.

| Registro | Origem | Intervalo registrado | Tokens totais informados |
| --- | --- | --- | --- |
| `E20719061425036459924.md` | Codex, uma tarefa concluída | 48,950 s | 301.969 |
| `E54566125267978699484.md` | OpenCode, uma mensagem do usuário e 11 mensagens do assistente | 104,254 s | 462.461 |

No Codex, o intervalo é de `task_started` em `2026-09-26T16:59:31.602Z` até `task_complete` em `2026-09-26T17:00:20.552Z`.
No OpenCode, é de `message.time.created = 1790441816329` da mensagem do usuário até `message.time.completed = 1790441920583` da última mensagem do assistente.
Esses limites não comprovam o instante de envio na interface nem a primeira exibição de texto ao usuário.
Por isso, não devem preencher automaticamente E1/E2 com uma definição diferente daquela efetivamente observada.

O registro do Codex identifica `gpt-6-luna`, origem `vscode` e versão `0.157.1`.
O registro do OpenCode identifica `opencode/muse-spark-1.3-contributor-free` e versão `1.18.30`.
Identificações do modelo escritas na explicação não substituem esses metadados técnicos.

| Campo nativo | Codex | OpenCode |
| --- | --- | --- |
| Entrada | 299.387 | 48.642 |
| Leitura de cache | 254.208 | 403.419 |
| Saída | 2.582 | 6.924 |
| Raciocínio | 367 | 3.476 |
| Escrita de cache | 0 | 0 |

Não some mecanicamente as linhas desta tabela: os campos não têm a mesma decomposição nos dois registros.
No Codex, o total informado é entrada + saída; cache e raciocínio não são parcelas adicionais desse total.
Nas mensagens observadas do OpenCode, o total informado corresponde a entrada + leitura de cache + saída + raciocínio, com escrita de cache igual a zero.
Essa igualdade observada não autoriza presumir a mesma semântica para todo provedor do OpenCode.
O total do Codex é o último acumulado da tarefa, não a soma dos acumulados intermediários.
O total do OpenCode foi somado uma única vez por mensagem do assistente, sem somar novamente os eventos `step-finish`.
Foi conferido que cada uma das 11 mensagens do assistente possui exatamente um `step-finish`, com o mesmo total de tokens informado.
Os números abrangem o trabalho registrado na sessão, incluindo contexto repetido e chamadas intermediárias, não só as palavras da explicação.
Não houve conciliação com faturamento nem comprovação de cobertura de eventuais chamadas não registradas.
O campo de custo observado do OpenCode é zero, mas isso, isoladamente, não comprova a cobrança efetiva nem um custo equivalente de API.

## Fluxo proposto para o pesquisador

1. Abra um lançador local e escolha Codex, Claude Code ou OpenCode.
2. Escolha B01, B02, N01 ou N02 e inicie a coleta.
3. Receba o caminho do registro e a confirmação `COLETA COMPLETA`, ou uma falha de coleta explícita.

Modelos, versões, configurações, permissões e política de custo serão definidos uma vez por perfil, antes do lote.
O lançador usará os CLIs instalados, mantendo uma sessão nova por execução e o mesmo material científico disponível para todos.
Não será uma chamada direta a uma API substituindo o agente estudado.
Uma configuração CLI é uma condição experimental própria; resultados de interfaces diferentes não serão misturados como se fossem a mesma configuração.

## Responsabilidades do coletor

- Gerar o ID e registrar a execução planejada antes de iniciar o processo.
- Arquivar exatamente o pedido, anexos, versão do agente, modelo solicitado e modelo efetivamente observado.
- Medir a duração com relógio monotônico externo, com início e fim previamente definidos e iguais para os três agentes.
- Guardar os eventos originais de uso e o identificador da sessão em área privada.
- Extrair entrada, saída, cache e raciocínio sem estimar por caracteres, palavras ou declaração do modelo.
- Agregar todas as chamadas pertencentes à execução, respeitando contadores acumulados, IDs de mensagem e campos sobrepostos.
- Manter separadas conclusão da geração, encerramento do processo e gravação final dos artefatos.
- Extrair a primeira explicação sem solicitar outra versão; o coletor, não o modelo, grava os dados operacionais finais.
- Produzir um arquivo compatível com a entrada dos juízes e comprovantes técnicos vinculados pelo mesmo ID.
- Aplicar permissões mínimas, não contornar aprovações e não copiar credenciais para os comprovantes.

Durante a migração, retirar dos pedidos instrumentados a responsabilidade de o próprio agente salvar a coleta e calcular métricas.
Preservar o conteúdo científico e as exigências pedagógicas dos quatro pedidos.
O pesquisador não precisará preencher manualmente fichas de tempo ou tokens.

## Regra obrigatória de completude

Uma execução só poderá ser marcada `COLETA COMPLETA` com explicação vinculada, duração medida, campos obrigatórios de tokens válidos e evidência técnica rastreável.
A completude de coleta não significa aprovação científica ou pedagógica.
Ausência de campo, schema incompatível, truncamento, interrupção ou falta de cobertura bloquearão a liberação como completa.
Um zero explícito exige interpretação pelo adaptador; ausência de informação nunca será convertida para zero.
Essa é uma garantia de aceitação do sistema, não a promessa de que um provedor sempre devolverá telemetria mesmo após queda ou interrupção.

Uma falha de instrumentação será preservada, separada de falha do agente e de reprovação da explicação.
O lote será interrompido para corrigir a coleta, sem repetir silenciosamente até obter um resultado conveniente.
Todas as tentativas continuarão no inventário e nos denominadores aplicáveis.
Uma repetição autorizada terá vínculo explícito com a tentativa anterior e não apagará seu tempo ou consumo conhecido.
Não produzir um ranking tecnológico de cobertura completa enquanto existirem lacunas no recorte exigido.

## Custo em reais

Tokens medidos e valor efetivamente cobrado são informações diferentes.
Registrar separadamente cobrança comprovada e custo de referência estimado por tabela de preços, sem chamar a estimativa de desembolso.
Para o custo de referência, fixar tarifas, unidades, fonte, data, moeda e regra de câmbio antes do lote.
Contabilizar cache, raciocínio, chamadas intermediárias e taxas de ferramentas conforme a semântica de cada provedor, sem dupla contagem.
Assinatura mensal não será dividida arbitrariamente pelo número de respostas para representar custo marginal.
Se um valor em reais for obrigatório para toda coleta completa, a disponibilidade dos insumos desse cálculo também será uma condição de liberação.

## Evidência técnica e validação antes de usar

O Codex documenta `codex exec --json`, com eventos JSONL e uso em `turn.completed`, e `--output-last-message` para guardar a resposta final. [Documentação oficial](https://learn.chatgpt.com/docs/non-interactive-mode).
O CLI local `codex 0.157.0` confirmou essas opções em `exec --help`; isso não é um teste de geração completa.
Também foram verificadas as versões instaladas Claude Code `2.1.283` e OpenCode `1.18.30`.

O Claude Code oferece `--output-format json` ou `stream-json`, com resultado final e dados de uso; os custos apresentados são estimativas do cliente, não comprovantes de pagamento. [Execução programática](https://code.claude.com/docs/en/headless).
Seu resultado distingue `usage` do agente principal e `modelUsage` agregado; resultados de sessões retomadas podem incluir gasto anterior. [Contabilização oficial](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
O OpenCode 1.18.30 oferece `run --format json`, mas seu stream principal não basta para contabilizar automaticamente sessões filhas. [Implementação da versão](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/cli/cmd/run.ts).
Sua normalização pode transformar uso ou preços ausentes em zero; a validação precisa ir além de conferir se o campo existe. [Normalização de uso](https://github.com/anomalyco/opencode/blob/v1.18.30/packages/opencode/src/session/session.ts).
O levantamento técnico complementar e suas fontes estão em [Telemetria de Claude Code e OpenCode](telemetria-claude-opencode.md).

Antes de substituir o fluxo atual, validar os adaptadores com registros de referência e um piloto de cada configuração exata.
Testar eventos duplicados, múltiplas chamadas, cache, raciocínio, uso ausente, falha de transporte, cancelamento, saída incompleta e incompatibilidade de versão.
Verificar se subagentes, compactação, auxiliares e tentativas estão cobertos; desativar recursos opcionais não mensuráveis ou bloquear a configuração para o lote.
Testar a recusa de sobrescrita e a preservação do original quando a coleta falhar.
O tempo até primeiro texto visível será uma medida separada: eventos entregues em blocos não comprovam tempo até primeiro token.
O modo instrumentado precisará ser documentado nos prompts, no planejamento, no organizador e no juiz de tempo e custo antes da coleta definitiva.
