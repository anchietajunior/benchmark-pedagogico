# Avaliação: siga a fila preparada

Você não precisa preencher os metaprompts de cada juiz.
O [organizador](prompts/preparar-julgamento.md) monta os arquivos completos a partir da coleta e mantém a fila atualizada.

## 1. Abra a fila

Depois de preparar o lote, abra ~/Documents/coletas/privado/FILA.md.
Cada linha informa o arquivo a enviar, eventuais anexos e o caminho onde salvar o parecer.
Use somente as linhas PRONTO; os demais estados explicam o que falta.

Antes do julgamento, registre em ~/Documents/coletas/lote.md o agente, modelo e configuração dos juízes, ou o método de apuração de JT/JE.
Sem isso, o organizador deve sinalizar a pendência, não presumir qual avaliador será usado.

## 2. Envie um arquivo, salve um parecer

Para cada linha PRONTO:

1. Abra uma sessão nova no avaliador escolhido.
2. Copie o arquivo inteiro ou anexe-o pedindo que execute suas instruções, com os anexos indicados naquela linha.
3. Salve a resposta integral no caminho indicado em “Salvar parecer em”.

Não envie a pasta inteira dos juízes, a fila, o lote, o registro original privado ou outros pareceres.
Em agente com acesso a arquivos, abra apenas o pacote daquela chamada, fora do projeto privado.
A sessão que organizou as identidades não pode julgar.
Uma resposta por sessão evita que notas ou estilos de concorrentes influenciem a próxima avaliação.

Se faltar seção ou houver erro de identificação no parecer, preserve-o e deixe o organizador registrar a pendência.
Não complete notas por conta própria, não peça uma explicação melhor e não escolha o julgamento mais favorável.
Quando disponíveis, guarde configuração e comprovantes dos julgamentos separadamente dos dados de geração.

## 3. Atualize a fila com o mesmo metaprompt

Depois de salvar os pareceres disponíveis, envie novamente o [metaprompt organizador](prompts/preparar-julgamento.md), com acesso ao mesmo lote atualizado.
Não é preciso explicar outra vez a estrutura ou criar códigos.

| Parecer recebido | O organizador prepara |
| --- | --- |
| JC1 ou JC2 com APTO compatível | O JP correspondente, com certificado mínimo e sem notas científicas. |
| JC1 ou JC2 com CORRIGIR/PENDENTE | Registro de JP bloqueado, N/A e NÃO EXECUTADO; não há chamada pedagógica. |
| JT com situação operacional conferida | O pedido de JE, sem notas de conteúdo ou notas T. |
| Todos recebidos ou impedimentos documentados | O arquivo privado CONSOLIDAR.md. |

JC1/JP1 são primários; JC2/JP2 verificam estabilidade com outra ordem e códigos diferentes.
São quatro papéis, mas até seis pareceres por explicação neste desenho.
Sem resposta por falha, o registro científico é administrativo e não simula uma avaliação.
Desacordos científicos ou alertas pedagógicos ficam pendentes de revisão especializada.

## 4. Reúna a tabela final

Envie ~/Documents/coletas/privado/CONSOLIDAR.md e seus anexos apenas a uma sessão de consolidação.
Ela pode acessar o mapa privado, mas não dar novas notas.
Salve os arquivos produzidos em ~/Documents/coletas/consolidado/:

- resultados-completos.csv: todos os itens e evidências, incluindo passagens e N/A.
- resultados-resumo.csv: uma linha por execução com os quatro painéis.
- estabilidade.csv: comparação das duas passagens dentro de cada papel.
- relatorio.md: tabelas, cobertura, limitações, orçamento e pendências.

Confira por amostragem a correspondência entre resposta, código e parecer, além da preservação de N/A.
O piloto não sustenta um vencedor global de quatro temas.
Para uma apresentação HTML posterior, use o [metaprompt de ranking](prompts/ranquear-resultados.md) sobre os resultados conferidos.

Os critérios continuam no [protocolo 3.1](referencias/protocolo-pontuacao.md).
O organizador cuida do encaminhamento; a correção científica e a revisão humana não são substituídas por ele.
