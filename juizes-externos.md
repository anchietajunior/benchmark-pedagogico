# Juízes externos: Codex e Grok

Instruções para o pesquisador e para os agentes Codex e Grok que julgam, na máquina do pesquisador, um lote já julgado pelo Claude.
Cada juiz aplica o protocolo 3.4 às mesmas respostas, uma resposta por sessão; ao final, `npm run kit -- painel` monta uma tabela por juiz e a pontuação do painel.

## Regras para o agente julgador

- Cada tarefa é uma pasta `tarefas/NN-PAPEL/` com `pedido.md` e `schema.json`. Responda uma tarefa por sessão nova.
- Leia somente o `pedido.md` da pasta da tarefa. Não abra outras tarefas, outras pastas do lote, `kit.json`, `batch.json` nem pareceres de outros juízes.
- Não use web, ferramentas de busca nem memória de outras sessões.
- Grave somente o objeto JSON do parecer em `parecer.json`, na pasta da tarefa. Sem texto antes ou depois.
- JC1 (científico): situação APTO, CORRIGIR ou PENDENTE conforme o protocolo. PENDENTE é decisão válida.
- JP1 (pedagógico cego): situação sempre CONCLUÍDO, com os 10 itens pontuados e M1 a M5 e P calculados. BLOQUEADO, PENDENTE e REVISÃO CIENTÍFICA SOLICITADA são recusados.
- Não altere `pedido.md`, `schema.json`, código, prompts, protocolo nem pareceres do Claude.

## 1. Preparar o lote

Na raiz do repositório:

```sh
git pull origin main
tar -xzf lote-piloto-2026-09-29.tar.gz   # se o lote ainda não estiver extraído
ls coleta/privado/openrouter/
```

Nos comandos abaixo, `LOTE` é o caminho da pasta do lote, por exemplo `coleta/privado/openrouter/piloto-2026-09-29T21-08-29.230Z-1c8e783d-e401-4be5-8f33-7dd31c13d981`.
Se `--retomar` for omitido, os comandos usam o lote mais recente.

## 2. Criar um kit por juiz

```sh
npm run kit -- preparar --juiz gpt-6.1-sol --retomar "LOTE"
npm run kit -- preparar --juiz grok-5 --retomar "LOTE"
```

Use em `--juiz` o nome exato do modelo em cada CLI. A família é inferida pelo nome (`gpt-*` → openai, `grok-*` → xai); se não for, informe `--familia`.
O kit do GPT pula as respostas de `openai/gpt-6-astra` (mesma família): 20 tarefas. O do Grok julga as 12 respostas: 24 tarefas.
As tarefas ficam em `LOTE/juizes/kits/<juiz>/tarefas/`, numeradas em ordem embaralhada.

## 3. Responder as tarefas

Uma sessão nova por tarefa. A mesma instrução serve para os dois agentes:

> Leia o arquivo pedido.md desta pasta e siga-o integralmente. Não abra nenhum outro arquivo. Grave somente o objeto JSON do parecer em parecer.json nesta pasta.

### Codex

Uma chamada `codex exec` por tarefa, que já é uma sessão nova e isolada:

```sh
for d in "LOTE"/juizes/kits/gpt-6.1-sol/tarefas/*/; do
  [ -f "$d/parecer.json" ] && continue
  codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write -C "$d" \
    -m gpt-6.1-sol -c 'model_reasoning_effort="medium"' -c 'web_search="disabled"' \
    "Leia o arquivo pedido.md desta pasta e siga-o integralmente. Não abra nenhum outro arquivo. Grave somente o objeto JSON do parecer em parecer.json nesta pasta."
done
```

### Grok

Use o Grok CLI da mesma forma: uma sessão nova por pasta de tarefa, aberta dentro da pasta, com a mesma instrução e esforço de raciocínio médio, sem busca web.
Se o CLI tiver modo não interativo, adapte o laço acima trocando a chamada do `codex exec` pela do Grok.

## 4. Conferir até todas serem aceitas

```sh
npm run kit -- conferir --juiz gpt-6.1-sol --retomar "LOTE"
npm run kit -- conferir --juiz grok-5 --retomar "LOTE"
```

Cada tarefa aparece como ACEITO, RECUSADO (com o motivo) ou FALTANDO.
Para cada RECUSADO, apague o `parecer.json` daquela pasta e refaça a tarefa em sessão nova, acrescentando à instrução:

> O parecer anterior foi recusado pelo validador: MOTIVO. Corrija isso e entregue um novo parecer completo.

Repita até `N/N pareceres aceitos` para os dois juízes. Não edite o JSON à mão para passar no validador.

## 5. Montar o painel

```sh
npm run kit -- painel --retomar "LOTE"
```

Gera `LOTE/consolidado/painel.html` e `painel.csv`:

- uma tabela por juiz (Claude, GPT, Grok) com Geral, P, S e afirmações confirmadas;
- a pontuação do painel: média dos juízes de família diferente da do modelo avaliado.

Somente o Claude tem a verificação externa JX; nos outros juízes, afirmações não verificáveis descontam 2 pontos em S.

## 6. Devolver ao pesquisador

```sh
tar -czf juizes-externos.tar.gz -C "LOTE" juizes/kits consolidado/painel.html consolidado/painel.csv
```

Envie `juizes-externos.tar.gz` à sessão do Claude, junto com a saída dos comandos `conferir` e `painel`.
