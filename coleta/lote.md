# Lote de coleta - privado

Este é um modelo do kit; preencha os dois sistemas e salve em ~/Documents/coletas/lote.md antes do piloto.
Não sobrescreva um lote existente.
Este arquivo não vai para os geradores ou juízes de conteúdo.
As linhas abaixo são planejamento, não execuções já realizadas.

- versao_protocolo: 3.1
- formato_coleta: registro-unico-v1
- diretorio_coleta: ~/Documents/coletas
- modo_entrega_planejado: arquivo-direto-v1; registrar contingência manual-v1 por execução
- fase: PILOTO
- data_planejamento: [preencher antes da primeira execução]
- pedidos: prompts/gerar-explicacao-bio-01.md, integral; manter a versão usada e arquivar eventual ID informado separadamente
- fontes: endereços do pedido; se fornecer trechos, guardar o material comum e registrar em cada execução
- timeout_e_reenvios: [registrar a regra do piloto; preservar falhas e todas as tentativas]
- metas_E1_E2_E3: N/A - piloto sem metas de normalização; publicar medidas brutas disponíveis
- cambio: N/A - conversão exige fonte e data

## Sistemas - preencher uma vez

| ID | Agente/ferramenta, versão e modo | Modelo, versão e provedor exibidos |
| --- | --- | --- |
| S01 | [preencher] | [preencher] |
| S02 | [preencher] | [preencher] |

- S01_configuracao: [registrar controles visíveis, ferramentas/fontes, memória e regras; distinguir desativado de não observável]
- S02_configuracao: [mesmos campos; registrar limites, raciocínio e parâmetros quando disponíveis]
- isolamento: sessão nova por execução, somente pedido e fontes comuns; registrar exceções na execução
- configuracoes_ocultas: NÃO OBSERVÁVEL; não presumir igualdade entre sistemas

## Execuções previstas - nesta ordem

| Execução planejada | Sistema | Tema | Rodada | Arquivo coletado |
| --- | --- | --- | --- | --- |
| E001 | S01 | B01 | R01 | NÃO VINCULADO |
| E002 | S02 | B01 | R01 | NÃO VINCULADO |

Depois de cada geração, anote o nome exato do arquivo na linha correspondente, sem renomear o original.
O ID automático não substitui o planejamento nem cria outra observação; uma linha planejada recebe uma única primeira geração.
Não associe arquivos apenas pela ordem em que apareceram; confirme sistema, tema e rodada.

Arquivo ausente significa registro ausente, não falha automaticamente nem prova de que a execução não começou.
Novas execuções precisam de novas linhas antes de serem iniciadas; não substitua uma resposta por outra.
Para o estudo definitivo, use um diretório de lote separado e o modelo modelos/planejamento.md do kit.

## Avaliadores - preencher antes de enviar aos juízes

- JC_configuracao: NÃO INFORMADO - registrar agente, modelo/versão, parâmetros, ferramentas, memória e regras
- JP_configuracao: NÃO INFORMADO - mesmos campos, em sessões separadas
- JT_metodo: NÃO INFORMADO - LLM, inspeção humana ou rotina identificada
- JE_metodo: NÃO INFORMADO - LLM, cálculo humano ou rotina identificada
- passagens: JC1 e JP1 primárias; JC2 e JP2 para estabilidade
- pairwise: NÃO REALIZADO
- revisao_humana: PENDENTE - registrar plano e revisão efetivamente feita antes de conclusões definitivas
- decisoes_piloto: [registrar problemas e ajustes antes de congelar a coleta definitiva]
