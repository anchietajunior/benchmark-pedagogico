# Planejamento da coleta - uso privado

Para o piloto inicial, use o [lote já preparado](../coleta/lote.md).
Use este modelo completo antes da coleta definitiva, em lote separado, fixando decisões antes de gerar respostas.
Este arquivo é o manifesto e o mapa privado dos sistemas; não o envie a JC ou JP.
O organizador aceita este manifesto com registros únicos de execução ou com os antigos resposta.md e ficha.md.

- versao_protocolo: 3.2
- fase: [PILOTO ou DEFINITIVA]
- diretorio_coleta: [diretório exclusivo deste lote; piloto usa ~/Documents/coletas]
- modo_entrega_planejado: [arquivo-direto-v1 ou manual-v1; registrar diferenças por execução]
- data_congelamento: [data]
- fontes_e_pedidos: [pasta com cópias exatas; indicar anexos e datas de acesso]
- desenho: [piloto: dois sistemas, B01, R01; definitiva proposta: quatro sistemas, quatro temas, R01-R05]
- ordem_execucoes: [lista com execução, sistema, tema e rodada; incluir também as ainda não iniciadas]
- timeout_e_reenvios: [limite e regra de reenvio de transporte, iguais quando possível]
- revisao_docente: [realizada, pendente ou indisponível, com registro]
- decisoes_piloto: [problemas encontrados, correções e decisão de iniciar a definitiva]

## Sistemas - repetir este bloco para cada combinação

- sistema_id: [S01]
- agente_nome_versao_modo: [nome, versão e modo exibidos]
- modelo_provedor_versao: [ID exato quando disponível; registrar desconhecido quando oculto]
- configuracoes: [raciocínio, temperatura, limites de saída/passos e demais controles visíveis]
- configuracoes_ocultas: [não observável quando a ferramenta não expuser; nunca presumir igualdade]
- ferramentas_fontes: [navegação/permissões e material autorizado]
- memoria_skills_regras: [o que está ativo, desativado ou não observável]
- contexto_isolado: [como impediu acesso a gabaritos, concorrentes e sessões anteriores]
- acesso_uso_custo: [onde a ferramenta mostra os dados, ou indisponível]

Agente + modelo + configuração diferentes exigem outro sistema_id.
Se a configuração mudar na coleta, registre nova condição em vez de misturar resultados.

## Metas de tempo e custo - opcionais

- latencia_alvo_s: N/A
- latencia_limite_s: N/A
- primeiro_texto_alvo_s: N/A
- primeiro_texto_limite_s: N/A
- custo_alvo_brl: N/A
- custo_limite_brl: N/A
- justificativa_e_data: [preencher se escolher metas, antes da coleta definitiva]
- cambio_brl_por_unidade_fonte_data: N/A

Sem metas prévias válidas, os valores brutos serão publicados, mas E1-E3 ficarão N/A.
Exija 0 <= alvo < limite e use as mesmas metas para todos os sistemas.

## Avaliadores - preencher antes do julgamento

- JC_configuracao: [agente, modelo, versão, parâmetros, ferramentas e fontes]
- JP_configuracao: [mesmos campos, em sessões separadas de JC]
- JT_metodo: [LLM, inspeção humana ou rotina identificada]
- JE_metodo: [LLM auxiliando a apuração, cálculo humano ou rotina identificada]
- passagens: JC1 e JP1 primárias; JC2 e JP2 para estabilidade
- ordem_avaliacoes: [ordem de processamento diferente na segunda passagem]
- revisao_humana_juizes: [plano, revisores, resultados ou indisponibilidade]
- pairwise: NÃO REALIZADO, salvo decisão registrada antes das avaliações

Guarde ambiguidades e divergências do piloto aqui ou em pareceres vinculados.
Não use uma resposta corrigida no lugar do original.
