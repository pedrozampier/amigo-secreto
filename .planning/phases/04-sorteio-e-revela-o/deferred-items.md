# Itens adiados — Fase 4

## Tabela de rastreabilidade de REQUIREMENTS.md desatualizada para DRAW-01..09

**Descoberto em:** 2026-10-15, durante a execução da plan 04-05 (fechamento da fase).

**Sintoma:** a seção "Resumo por requisito" / tabela de rastreabilidade em
`.planning/REQUIREMENTS.md` (por volta da linha 217-226) lista `DRAW-01` a `DRAW-09` como
"Pendente", embora os checkboxes correspondentes na lista de requisitos da Fase 4 (linhas
55-64) estejam todos marcados `[x]` desde as plans 04-01 a 04-04. Ou seja, os dois lugares
do mesmo arquivo divergem entre si para 9 dos 10 requisitos `DRAW-*`.

**Por que não foi corrigido nesta plan:** a plan 04-05 só declara `requirements: [DRAW-10]`
no seu frontmatter — `requirements mark-complete DRAW-10` corrigiu apenas essa linha. As
outras 9 linhas da tabela são responsabilidade das plans que efetivamente entregaram
aqueles requisitos (04-01 a 04-04), e corrigi-las aqui seria um fix fora do escopo desta
plan (nenhuma delas é tocada pelas tasks de 04-05). Registrado como item adiado em vez de
corrigido silenciosamente, por consistência com a regra de escopo do executor.

**Correção sugerida:** rodar `requirements mark-complete DRAW-01 DRAW-02 DRAW-03 DRAW-04
DRAW-05 DRAW-06 DRAW-07 DRAW-08 DRAW-09` (ou editar a tabela manualmente) na próxima
passagem de `/gsd:transition` da Fase 4, já que as evidências de entrega existem nos
SUMMARYs de 04-01/04-02/04-03/04-04.

**Status:** Não corrigido nesta plan. `DRAW-10` já está correto (`Completo`) em ambos os
lugares.

---

## Limpeza pendente de dados de teste em produção (verificação de DRAW-10)

**Descoberto em:** 2026-10-15, durante o smoke test real do checkpoint humano da plan
04-05.

**Sintoma:** a prova real de DRAW-10 (`docs/draw-privacy-verification.md`, Parte D) rodou
contra o banco de produção (`ccruvfblgdvnjxenezuh`), não um ambiente de teste isolado.
Ficaram no banco real:

- 1 grupo de teste: "Teste2" (`id = 9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`), `status =
  'closed'`, com 4 `participant` e 4 linhas de `draw` (um sorteio real e irreversível).
- 2 usuários de teste criados especificamente para esta verificação:
  `bruno-teste4@exemplo.com`, `carla-teste4@exemplo.com`.

**Por que não foi corrigido nesta plan:** o plan 04-05 não previa cleanup como uma das suas
tasks — a limpeza de dados de verificação é responsabilidade de quem executa o smoke test
manual, não do roteiro de documentação. Registrado explicitamente (não omitido) em
`docs/draw-privacy-verification.md` e em `.planning/STATE.md` (blocker) em vez de ser
assumido como concluído.

**Correção sugerida:** antes da banca final, remover o grupo "Teste2" (cascade apaga
`participant`/`draw` associados) e os 2 usuários de teste via Dashboard → Authentication →
Users, ou via SQL direto como `postgres` (bypassa RLS por propósito, mesmo padrão já usado
em `docs/db-rls-verification.md` Parte B).

**Status:** Não corrigido. Rastreado como blocker em `.planning/STATE.md`.
