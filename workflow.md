# Coleta, julgamento e resultados

Você configura uma vez e depois executa `npm run executar` em qualquer terminal.
Para seguir desde a abertura do terminal até o HTML no navegador, use o [guia de execução](guia.md).
O coletor envia cada pedido diretamente ao OpenRouter, sem skills, memória, navegação ou acesso do modelo ao projeto.
São necessários Node.js 24 ou superior e Claude Code CLI instalado e autenticado; não precisa executar `npm install`.

Nesta máquina, o piloto B01 já está configurado: seis modelos, uma rodada, cotação, notas bibliográficas e o corpo textual original autorizado de B01-F3.
Se a chave já está no `.env`, vá direto ao passo 2; não precisa editar `openrouter.config.json` para esse teste.
As notas foram preparadas por IA e continuam com revisão humana pendente; o programa permite isso somente na fase PILOTO.
O texto original de F3 está identificado com origem, escopo, licença e hash; ele não comprova leitura das obras que o artigo cita.
O limite comum de saída é 32.768 tokens, com esforço `medium`; raciocínio e texto usam esse orçamento.
O teto maior reduz o risco observado de raciocínio consumir toda a saída, sem garantir conclusão de todos os provedores.
Uma nova cópia do projeto ainda exige a preparação abaixo, pois os arquivos locais não entram no Git.

## 1. Prepare uma vez

Na pasta deste projeto, execute:

```sh
npm run configurar
```

O comando cria arquivos locais sem sobrescrever o que já existir.
Preencha somente estes pontos:

- `.env`: sua `OPENROUTER_API_KEY`.
- `openrouter.config.json`: a cotação em `usd_brl`, com valor em reais por dólar, data e fonte.
- `fontes/openrouter/B01.md`: os trechos bibliográficos autorizados para os seis pontos de B01, com identificação da obra, seção/página e origem.
  Depois da conferência humana, marque `sources_reviewed: true` no tema B01 da configuração.

Os seis modelos escolhidos já estão configurados: Opus 5, Fable 5.1, GPT-6 Astra, DeepSeek V4.1 Flash, Muse Spark 1.3 e Gemini 3.8 Flash.
O piloto começa com B01 e uma rodada: seis explicações.
Use a [bibliografia por tema](referencias/bibliografia-por-tema.md) para preparar as fontes.
Os arquivos criados são modelos vazios, não fontes científicas já verificadas; não basta colar links ou marcar a conferência sem fornecer os trechos.
Não publique capítulos protegidos sem autorização.

## 2. Confira e execute

```sh
npm run executar -- --simular
npm run executar
```

`--simular` verifica a configuração local e mostra as quantidades sem rede ou inferência.
`executar` confere `claude --version` e inicia as chamadas sem pedir confirmação.
No piloto de seis explicações, há seis gerações OpenRouter, até 36 julgamentos e uma consolidação Claude.
O avaliador padrão é `claude-opus-5-5`, esforço `medium`; informe outro com `--modelo-juiz ID` e `--esforco-juiz NIVEL` antes de iniciar o lote.
As chamadas Claude usam a conta autenticada e podem consumir sua franquia/créditos.
Para conferir apenas o catálogo público, use `npm run conferir`; para somente coletar, use `npm run coletar`.
Use uma chave OpenRouter com limite de gastos definido na conta e sem BYOK, para evitar cobrança externa não contabilizada.

Cada geração usa somente o pedido e as fontes do tema.
A ordem é sorteada e registrada antes da primeira chamada.
O programa salva explicações, recusas e falhas; não pede versões melhores nem reenvia gerações automaticamente.
Tempos, tokens e custos vêm do programa e do serviço, nunca da autodeclaração do modelo.
Os juízes recebem códigos opacos em subprocessos `claude -p` novos, sem ferramentas nem configurações do usuário.
JC1 libera JP1 e JC2 libera JP2 somente com APTO consistente; JE aguarda a situação operacional de JT.
Somente a chamada separada do consolidador recebe a correspondência código-modelo e compõe o relatório identificado.

## 3. Abra o resultado

O terminal mostra a pasta criada dentro de `~/Documents/coletas/openrouter/`.
Cada comando de coleta cria um lote novo, sem tocar nas coletas antigas.
Durante o processamento, acompanhe as linhas de coleta, os papéis `JC1`, `JC2`, `JP1`, `JP2`, `JT`, `JE` e a mensagem `CONSOLIDADOR` no terminal principal.
O [guia](guia.md#4-acompanhe-o-andamento) mostra como consultar os registros durante a execução.

Ao aparecer `Resultados: .../consolidado/resultados.html`, copie o caminho do lote e, no macOS, abra o arquivo no Safari:

```sh
DIRETORIO_DO_LOTE="/caminho/completo/do/lote"
open -a Safari "$DIRETORIO_DO_LOTE/consolidado/resultados.html"
```

Substitua o caminho de exemplo pelo diretório mostrado no terminal.
O navegador abre automaticamente após conclusão das etapas automáticas; o HTML é local e não exige servidor.
Respostas incompletas são descartadas antes dos julgamentos; pareceres incompletos ou inválidos são descartados das notas.
O fluxo encerra com o ranking no HTML; modelos sem avaliação pedagógica completa aparecem com 0 e ERRO, e os motivos ficam em `consolidado/status-fluxo.json`.
CORRIGIR é uma decisão científica final desfavorável; APTO continua obrigatório para a pedagogia.

| Arquivo | O que fazer |
| --- | --- |
| `consolidado/resultados.html` | Abrir no navegador: ranking por pontuação geral, com status, acadêmico, tecnológico e custo por explicação. |
| `consolidado/resultados-completos.csv` | Consultar todos os itens, passagens, evidências e motivos de N/A. |
| `consolidado/estabilidade.csv` | Comparar as duas passagens de cada papel. |
| `RESUMO.md` | Conferir a coleta OpenRouter e suas pendências; não indica conclusão dos julgamentos. |
| `metricas.csv` | Abrir a tabela de tempo, tokens e custo em USD e reais. |
| `entrada/ID.md` | Ler a primeira explicação, com seu registro privado. |
| `PREPARAR-JULGAMENTO.md` | Usar somente se escolher a organização manual dos julgamentos. |

O comando usa os quatro papéis existentes em sessões separadas; o coletor OpenRouter não atribui notas.
Os cálculos e tabelas são montados a partir dos pareceres validados; o consolidador redige a leitura dos resultados sem alterar as notas.
Não envie a tabela identificada ou o cabeçalho privado diretamente aos juízes de conteúdo.

Se houver interrupção, retome o mesmo lote:

```sh
npm run executar -- --retomar "CAMINHO_DO_LOTE"
```

A retomada não gera novas explicações nem repete julgamentos já concluídos.
Parecer inválido permanece pendente; chamada que terminou sem parecer, por erro ou limite de uso, e chamada interrompida são refeitas com o mesmo pedido arquivado.
Veja [limites e recuperação](referencias/pipeline-claude.md), incluindo F5 e revisão humana.

Se houver telemetria pendente, copie o comando `npm run recuperar -- "CAMINHO_DO_LOTE"` mostrado em `RESUMO.md`.
Ele consulta os dados da geração existente, sem produzir outra explicação, e acrescenta comprovantes sem alterar o original.
Ausência continua pendente, nunca vira zero; tentativas incompletas permanecem no lote e na análise de falhas.

Para incluir os outros temas ou aumentar as rodadas, veja a [configuração do coletor](referencias/coletor-openrouter.md).
O [fluxo manual anterior](workflow-manual.md) continua disponível somente para a condição com agentes de programação.
