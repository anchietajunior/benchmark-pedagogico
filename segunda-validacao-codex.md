# Segunda validação com o Codex

Instruções para o agente Codex que roda na máquina do pesquisador.
O objetivo é reproduzir o julgamento científico (JC) e o pedagógico cego (JP) de um lote já julgado pelo Claude, com um juiz de outra família, e devolver os resultados ao pesquisador.

## O que você deve e não deve fazer

- Execute somente o comando `npm run validar`; ele chama o Codex isolado para cada parecer.
- Não julgue as respostas você mesmo, não escreva notas à mão e não edite pareceres, prompts, protocolo ou código.
- Não altere nada em `juizes/pareceres/`, `consolidado/resultados*` nem `privado/`: são os pareceres do juiz principal.
- Não faça commit nem push dos dados do lote; `coleta/`, `fontes/openrouter/` e `openrouter.config.json` ficam fora do git.
- Se um passo falhar, pare e relate a saída ao pesquisador em vez de contornar o erro.

## Pré-requisitos

1. Node.js 24 ou superior: `node --version`.
2. Codex CLI autenticado: `codex --version` e `codex login status`.
3. Repositório atualizado: `git pull origin main`.
4. Lote extraído na raiz do repositório. O pesquisador recebe um arquivo como `lote-piloto-2026-09-29.tar.gz`; extraia com:

   ```sh
   tar -xzf CAMINHO/lote-piloto-2026-09-29.tar.gz
   ```

   Depois disso devem existir `openrouter.config.json`, `fontes/openrouter/` e a pasta do lote em `coleta/privado/openrouter/`.
5. Confira o nome do lote:

   ```sh
   ls coleta/privado/openrouter/
   ```

   Nos passos abaixo, `LOTE` é esse caminho completo, por exemplo `coleta/privado/openrouter/piloto-2026-09-29T21-08-29.230Z-1c8e783d-e401-4be5-8f33-7dd31c13d981`.

## Permissões do agente

`npm run validar` abre um processo `codex exec` por parecer, que precisa de rede para falar com a OpenAI e grava arquivos dentro de `LOTE`.
Se o seu sandbox bloquear rede ou escrita, peça ao pesquisador para aprovar a execução do comando com acesso de rede, ou para rodá-lo ele mesmo no terminal; não altere o comando para contornar o bloqueio.

## Execução

1. Simule, sem chamadas ao modelo:

   ```sh
   npm run validar -- --retomar "LOTE" --modelo-juiz gpt-6.1-sol --esforco-juiz medium --simular
   ```

   A saída deve mostrar o lote, o juiz `gpt-6.1-sol`, família `openai` e os papéis `JC1, JP1`.
   Se o pesquisador indicar outro nome de modelo no Codex, use-o em `--modelo-juiz`.

2. Execute:

   ```sh
   npm run validar -- --retomar "LOTE" --modelo-juiz gpt-6.1-sol --esforco-juiz medium
   ```

   - São 20 chamadas: JC1 e JP1 de 10 respostas. As respostas de `openai/gpt-6-astra` são puladas por serem da mesma família do juiz.
   - Cada chamada pode levar vários minutos. Para poupar o limite de uso do plano, acrescente `--paralelo 1`.
   - Mensagens `JC1: Q... - APTO`, `CORRIGIR` ou `PENDENTE` e `JP1: Q... - CONCLUÍDO` indicam pareceres válidos; a situação PENDENTE do JC é uma decisão científica, não uma falha.
   - Linhas terminadas em `PENDENTE: <motivo>` sem parecer indicam falha de chamada ou de validação.

3. Se o comando terminar com pareceres pendentes ou for interrompido (limite de uso, rede, Ctrl+C), rode exatamente o mesmo comando outra vez.
   Pareceres aceitos não são refeitos; tentativas falhas ficam em `tentativas/` dentro da pasta da tarefa.

4. Ao final, o comando imprime a concordância entre os juízes, a nota de cada modelo por juiz e a do painel, e os caminhos:
   - `LOTE/consolidado/segunda-validacao.html`
   - `LOTE/consolidado/segunda-validacao.csv`
   - `LOTE/juizes/segunda-validacao/gpt-6.1-sol/`

## Devolução ao pesquisador

Empacote somente os resultados da segunda validação:

```sh
tar -czf segunda-validacao-gpt-6.1-sol.tar.gz -C "LOTE" juizes/segunda-validacao consolidado/segunda-validacao.html consolidado/segunda-validacao.csv
```

Entregue ao pesquisador:

1. O arquivo `segunda-validacao-gpt-6.1-sol.tar.gz`, que ele enviará à sessão do Claude.
2. Um resumo em texto com:
   - a linha de concordância (`|ΔP|` e `|ΔS|` médios);
   - a linha de cada modelo (`geral / segundo juiz / painel`);
   - quantos pareceres ficaram pendentes, se algum.

## Se algo falhar

Não tente corrigir código, schema ou prompts. Entregue ao pesquisador:

1. A saída completa do terminal.
2. Os diagnósticos da primeira tarefa que falhou:

   ```sh
   tar -czf diagnostico-validacao.tar.gz -C "LOTE" juizes/segunda-validacao
   ```

   A pasta de cada tarefa contém `eventos.jsonl` (eventos do Codex), `stderr.log`, `concluido.json` e, quando houver, `pendente.json` com o motivo da recusa.

Falhas prováveis e o que relatar:

| Sintoma | Causa provável |
| --- | --- |
| `codex: command not found` ou erro de autenticação | Codex não instalado ou sem login |
| Erro sobre `--output-schema` ou schema inválido | O Codex recusou parte do schema JSON do parecer |
| `O julgamento usou ferramentas ou eventos não previstos` | O juiz tentou usar uma ferramenta; o parecer foi recusado por isolamento |
| `Codex não concluiu o turno` com limite de uso | Limite do plano; aguarde e rode o mesmo comando |
| `modelo` inexistente | Nome do modelo diferente no Codex; confirme com o pesquisador |
