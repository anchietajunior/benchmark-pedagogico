# Coleta em três etapas

Os pedidos já instruem o agente a salvar em ~/Documents/coletas.
Com acesso local, você não precisa copiar a explicação para um arquivo.

## 1. Copie o pedido e informe o ID

Uma vez, preencha o [modelo de lote](coleta/lote.md) e salve em ~/Documents/coletas/lote.md.
O piloto já prevê E001 e E002: uma resposta de cada sistema sobre B01.
Sistema significa agente + modelo + configuração; registre os nomes exibidos e controles disponíveis.

| Curso | Pedido completo para copiar |
| --- | --- |
| Biomedicina | [B01 - Hemostasia e coagulação](pacotes/B01.md) |
| Biomedicina | [B02 - Resposta imune e memória](pacotes/B02.md) |
| Nutrição | [N01 - Metabolismo energético](pacotes/N01.md) |
| Nutrição | [N02 - Regulação do ferro](pacotes/N02.md) |

No pedido escolhido, preencha somente execucao_id: E001, E002 ou outro ID previsto no lote.
Abra uma conversa nova, cole o pedido inteiro e cronometre do envio até a confirmação final, incluindo ferramentas e gravação.
Envie somente o pedido e as fontes comuns; o gerador não deve acessar o lote, outras coletas ou materiais dos juízes.
Use as mesmas instruções para todos, variando apenas o ID; registre configurações que não conseguir controlar.
Os pedidos têm links, não capítulos completos: confirme o acesso no piloto.

## 2. Confira o arquivo salvo

O agente deverá criar a pasta se necessário, salvar o registro e confirmar o caminho.
Ele não poderá sobrescrever uma execução existente.

```text
~/Documents/coletas/
  lote.md                 cadastro e execuções previstas
  entrada/
    E001.md               cabeçalho privado + resposta original
    E002.md               cabeçalho privado + resposta original
  comprovantes/           prints ou logs, se houver; use E001 no nome
```

Abra o arquivo confirmado e complete no cabeçalho o término observado, a duração cronometrada e os dados disponíveis na ferramenta.
O agente pode copiar medidas comprovadas por logs; números escritos por ele sem evidência continuam não verificados.
Tokens e custo indisponíveis ficam N/A; não use mensalidade como custo por resposta.
Não altere o corpo depois do marcador da resposta original, nem substitua a primeira tentativa.
Salve também recusas, PENDENTE DE FONTES e saídas truncadas; documente falhas sem saída.
Guarde prints/logs em comprovantes/, sem credenciais, e indique o arquivo no cabeçalho.

Se o agente não tiver acesso local ou a gravação falhar, use o [registro manual](modelos/ficha-coleta.md) e salve a mesma saída no destino.
Registre o modo manual de contingência; não o misture silenciosamente com a entrega direta nas comparações de tempo/custo.

## 3. Peça à IA para preparar a avaliação

Em uma sessão de organização, copie o [metaprompt Preparar julgamento](prompts/preparar-julgamento.md).
Ele já aponta para ~/Documents/coletas; dê ao organizador acesso a essa pasta e ao kit deste projeto.
Em chat sem acesso local, anexe o kit e a coleta, em ZIP se suportado, sem .git/ e sem credenciais.
Essa sessão conhece identidades e não pode atuar como juiz.

O organizador preparará os pacotes em ~/Documents/coletas/juizes/enviar/ e a fila em ~/Documents/coletas/privado/FILA.md.
A fila dirá qual arquivo enviar a cada juiz e onde salvar o parecer.
Sem ferramentas de arquivos, o organizador entregará os conteúdos para você salvar, sem alegar que criou a pasta.

A coleta termina aqui; para as notas, siga a fila e o [roteiro de avaliação](avaliacao.md).
Ciência e tecnologia podem começar; pedagogia aguarda APTO científico e tempo/custo aguarda a situação operacional conferida.
Teste também os juízes no piloto; sem APTO científico, a etapa pedagógica continua não testada.
Antes da coleta definitiva, use um lote separado e congele pedidos, fontes, configuração e modo de entrega.
