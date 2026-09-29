# Avaliação de explicações de IA

Use `npm run executar` para coletar pelo OpenRouter, julgar em sessões Codex isoladas no Herdr e produzir `consolidado/resultados.html`.
Os juízes recebem códigos anônimos; somente a sessão do consolidador recebe o mapa desses códigos para os nomes dos modelos.
O HTML mostra somente o ranking: posição, nome do modelo, pontuação de 0 a 100 e status.
Modelos sem avaliação pedagógica completa aparecem com pontuação 0 e status ERRO; APTO científico permanece obrigatório.
O coletor registra tempo, tokens e custo automaticamente.
Uma chamada por explicação, sem skills, histórico compartilhado ou ferramentas do modelo.
Os resultados vão para um lote novo em ~/Documents/coletas/openrouter/.

Comece pelo [guia de execução](guia.md): iniciar no Herdr, acompanhar as etapas e abrir o HTML no navegador.
O [workflow](workflow.md) detalha a preparação dos arquivos da coleta.
O fluxo completo exige Node.js 24 ou superior, Herdr ativo e Codex CLI autenticado; não há dependências npm para instalar.
O piloto já lista os seis modelos escolhidos e começa com B01, uma rodada.
Chave de API, cotação e trechos bibliográficos verificados precisam ser fornecidos antes de gerar conteúdo pago.

O comando prepara os materiais dos quatro papéis e só libera pedagogia após APTO científico validado.
Para conferir a configuração sem rede ou inferência, execute `npm run executar -- --simular`.
Para recuperar os pareceres já gravados e atualizar o HTML sem chamadas, execute `npm run executar -- --revalidar`.
O relatório abre no navegador após conclusão das etapas automáticas; use `--nao-abrir` para somente gravar os resultados.
Respostas incompletas não são enviadas aos juízes; pareceres sem conclusão válida são descartados das notas.
O processamento encerra com o ranking no HTML; os motivos dos descartes e os comprovantes permanecem arquivados.
CORRIGIR é uma decisão científica final desfavorável e mantém pedagogia bloqueada; PENDENTE de um parecer vira descarte, sem nota aproveitada.
Para apagar os lotes gerados e os temporários dos julgamentos antes de recomeçar, execute `npm run apagar`.
Esse comando preserva código, configuração, credenciais e fontes; a remoção dos resultados é definitiva.
`npm run coletar` continua disponível para fazer somente a coleta e seguir com organização manual.
O [guia técnico](referencias/coletor-openrouter.md) explica a configuração, as evidências e os limites de medição.
O [guia do fluxo completo](referencias/pipeline-herdr.md) explica isolamento, retomada e consolidação identificada.

## Pedidos manuais preservados

Os arquivos abaixo pertencem ao [fluxo manual anterior](workflow-manual.md).
O coletor usa o [metaprompt próprio para API](prompts/openrouter/gerar-explicacao.md), os mesmos pedidos temáticos e trechos locais comuns.
Não misture as duas condições experimentais.

- [gerar-explicacao-bio-01.md](prompts/gerar-explicacao-bio-01.md) - Biomedicina 01 - Hemostasia e coagulação.
- [gerar-explicacao-bio-02.md](prompts/gerar-explicacao-bio-02.md) - Biomedicina 02 - Resposta imune e memória.
- [gerar-explicacao-nut-01.md](prompts/gerar-explicacao-nut-01.md) - Nutrição 01 - Metabolismo energético.
- [gerar-explicacao-nut-02.md](prompts/gerar-explicacao-nut-02.md) - Nutrição 02 - Absorção e regulação do ferro.

Os quatro pedidos solicitam uma pequena aula de 800 a 1.200 palavras, com mecanismo explicado, exemplo desenvolvido, confusões esclarecidas e revisão comentada.
O [workflow](workflow.md) explica como conferir a coleta e preparar os juízes.

| Arquivo | Para que serve |
| --- | --- |
| [Guia](guia.md) | Entender os temas e os quatro juízes. |
| [Registro de execução](modelos/ficha-coleta.md) | Salvar os dados observados e a resposta original no mesmo arquivo privado. |
| [Preparar julgamento](prompts/preparar-julgamento.md) | Separar dados, anonimizar e montar os pedidos completos dos juízes, sem dar notas. |
| [Avaliação](avaliacao.md) | Executar os pedidos preparados e reunir os pareceres. |
| [Protocolo](referencias/protocolo-pontuacao.md) | Consultar critérios, fórmulas e limitações. |

Protocolo 3.2; aprofundamento dos pedidos revisado em 26 de setembro de 2026.
As fontes e os seis pontos científicos permanecem os mesmos; a extensão e a estrutura foram ampliadas, com F2/F3 atualizados.
Use um lote novo: coletas 3.1 preservam seus pedidos e regras originais, sem expansão ou reavaliação retroativa pelo formato atual.
Registre api-openrouter-v1, arquivo-direto-v1 ou manual-v1, pois a forma de execução muda contexto, tempo e custo.
Os registros separados de resposta.md e ficha.md continuam aceitos.
Não há resultados experimentais neste kit.

## Testes

```sh
npm test
```

Os testes usam respostas sintéticas e arquivos temporários; não chamam a API paga.
