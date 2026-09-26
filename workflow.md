# Coleta manual: copiar, gerar e salvar

Seu objetivo nesta etapa é guardar a explicação e os dados da execução.
As notas serão atribuídas depois.
Comece com dois sistemas e o assunto B01, em um piloto separado.

## 1. Prepare uma vez

Copie o [modelo de planejamento](modelos/planejamento.md) para coleta/piloto/planejamento.md.
Preencha quais agentes/modelos serão usados e a ordem das execuções.
Se ainda não escolheu metas de tempo e custo, deixe N/A.

Crie uma pasta para cada execução:

```text
coleta/piloto/
  planejamento.md
  pedidos/
    B01.md
  E001/
    resposta.md
    ficha.md
    comprovantes/    (somente se houver prints ou logs)
  E002/
    resposta.md
    ficha.md
```

E001 e E002 são IDs de execuções, não nomes de modelos.
Na coleta definitiva, use coleta/definitiva/ e mantenha o piloto separado.
Não sobrescreva arquivos de execuções anteriores.

## 2. Copie o pedido pronto

Escolha um arquivo e copie todo o conteúdo:

| Código | Pedido pronto |
| --- | --- |
| B01 | [Hemostasia e coagulação](pacotes/B01.md) |
| B02 | [Resposta imune e memória](pacotes/B02.md) |
| N01 | [Metabolismo energético](pacotes/N01.md) |
| N02 | [Regulação do ferro](pacotes/N02.md) |

Salve uma cópia exata em pedidos/B01.md, por exemplo.
Use essa mesma cópia para todos os sistemas que responderão ao tema.
Os pacotes incluem links para fontes, não os capítulos completos.
Confirme no piloto que os agentes conseguem abri-los.
Se precisar anexar trechos, identifique as fontes, salve-os em pedidos/ e forneça os mesmos trechos a todos.
Anote na ficha qualquer material adicional enviado.

## 3. Abra uma conversa nova e envie

Abra uma sessão nova no agente/modelo escolhido.
Se estiver usando um agente com acesso a arquivos, dê acesso somente ao pedido e às fontes desse tema.
Não abra a pasta inteira do projeto: ela contém gabaritos e resultados de avaliação.
Desative memória e personalização quando possível; registre o que não puder controlar.

Copie o [modelo de ficha](modelos/ficha-coleta.md) para E001/ficha.md.
Preencha identificação e sistema antes de enviar.
Cole o pedido completo no chat.

Inicie o cronômetro ao enviar.
Pare quando a resposta terminar por completo, incluindo fontes e ferramentas.
Anote a duração em segundos na ficha.
Se conseguir medir o primeiro texto visível, registre esse tempo também; caso contrário, N/A.

## 4. Salve a primeira resposta

Copie a resposta inteira para E001/resposta.md, preferindo a opção de copiar Markdown da ferramenta.
Inclua título, explicação, síntese e fontes exatamente como recebidos.
Não melhore, corte ou corrija o texto.
Não inclua barras da interface ou outras mensagens da conversa.
Não peça uma segunda versão para substituir a primeira.

Se a saída for PENDENTE DE FONTES, recusa ou texto truncado, salve assim mesmo.
Se não houve saída, registre a falha na ficha e não crie uma explicação vazia.
Se a ferramenta realmente devolveu um texto vazio, preserve essa ocorrência e identifique-a na ficha.

## 5. Preencha os dados observados

Use a ficha pronta; você não precisa calcular notas nem converter moedas agora.

| Dado | De onde copiar | Se não estiver disponível |
| --- | --- | --- |
| Tempo total | Cronômetro ou registro da ferramenta. | N/A e motivo. |
| Primeiro texto | Observação cronometrada, se feita. | N/A. |
| Tokens de entrada e saída | Painel de uso ou log referente à execução. | N/A; não estimar por palavras. |
| Custo e moeda | Cobrança ou painel da execução, com origem registrada. | N/A; não usar a assinatura mensal. |
| Conclusão ou falha | O que você observou na ferramenta. | Desconhecido, com motivo. |

Salve o comprovante disponível em E001/comprovantes/ e indique o arquivo na ficha.
Um número escrito pelo próprio modelo não é comprovante de consumo ou cobrança.
Se só houver valores parciais, anote que são parciais.
O custo completo inclui chamadas internas, ferramentas e reenvios; não some novamente parcelas já incluídas no total.
Campos de cache e raciocínio devem ser copiados como aparecem, sem soma automática.
Se houver apenas tokens totais, guarde esse valor nos dados extras da ficha e deixe entrada/saída N/A.
Uma estimativa por tarifa exige tabela, data e cálculo; pode ser feita depois por JE.
Sem esses dados, o custo continua N/A.

## 6. Confira e repita

Antes de encerrar a execução, confira:

- [ ] O pedido enviado está salvo.
- [ ] A resposta está preservada, ou a ausência está documentada.
- [ ] A ficha identifica tema, rodada, sistema, data e situação.
- [ ] Cada medida tem origem ou N/A com motivo.
- [ ] Prints/logs disponíveis estão vinculados à ficha.

Repita com o segundo sistema em E002, usando a mesma rodada e o mesmo pedido.
Mude apenas a execução e o sistema na ficha.
Intervenções e tentativas extras devem ser registradas, nunca apagadas.
Uma nova geração é uma nova execução/rodada conforme o planejamento; reenvios de transporte ficam registrados na execução original.

**A coleta desta execução terminou aqui.**
Você não precisa calcular C, M, T ou E, anonimizar tudo ou gerar o ranking neste momento.

## Depois: encaminhe para avaliação

Quando as respostas estiverem salvas, siga [avaliacao.md](avaliacao.md).
Você preparará cópias sem autoria para ciência/pedagogia e enviará os registros operacionais somente aos outros papéis.
Os juízes devolverão pareceres; a consolidação montará as tabelas.

Antes da coleta definitiva, teste também os juízes no piloto, resolva as ambiguidades e congele o planejamento.
Se o piloto não produzir APTO, a parte pedagógica ainda precisa ser testada.
Não altere fontes, prompts ou configurações no meio da coleta sem identificar uma nova condição.
