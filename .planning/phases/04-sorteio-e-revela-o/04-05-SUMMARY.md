---
phase: 04-sorteio-e-revela-o
plan: 05
subsystem: database
tags: [supabase, edge-function, rls, deno, deploy, documentation]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Edge Function run-draw completa (algoritmo + validações), nunca deployada"
  - phase: 04-02
    provides: "Migration 0006 (D-01) — admin participa do próprio sorteio via RPC create_group"
  - phase: 04-04
    provides: "Tela de revelação /draw/:groupId/result, resolver e memberGuard generalizado"
provides:
  - "docs/draw-privacy-verification.md — roteiro versionado de DRAW-10/D-13, executado com evidência real contra o projeto Supabase de produção"
  - "ROADMAP.md critério de aceite 5 da Fase 4 corrigido para a asserção dupla pós-D-01"
  - "Edge Function run-draw deployada e ACTIVE no projeto real (ccruvfblgdvnjxenezuh)"
  - "podeVerResultadoDoSorteio() + link de revelação para participantes não-admin em /group/:id (gap descoberto durante a verificação, corrigido via quick task 261015-mbk)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verificação de RLS por impersonação de role/claims via `npx supabase db query --linked`, sem depender de duas sessões manuais no SQL Editor"

key-files:
  created:
    - docs/draw-privacy-verification.md
  modified:
    - .planning/ROADMAP.md

key-decisions:
  - "Asserção de DRAW-10 verificada pelo caminho SQL (impersonação de role/claims) em vez do snippet literal de DevTools/fetch — exercita a mesma policy de RLS pelo caminho do banco; o snippet de DevTools permanece documentado no roteiro para quem quiser repetir via navegador"
  - "Execução real rodou contra o banco de produção (não um ambiente de teste isolado) — registrado como ressalva explícita no documento, não omitido; limpeza das linhas de teste (grupo Teste2, 2 usuários de teste) fica pendente"

requirements-completed: [DRAW-10]

# Metrics
duration: 19min
completed: 2026-10-15
---

# Phase 04 Plan 05: Fechamento da Fase — Prova de DRAW-10, Deploy Real do run-draw Summary

**Roteiro versionado `docs/draw-privacy-verification.md` provando com dados reais (não apenas leitura de código) que o admin, agora participante do próprio sorteio, lê exatamente 1 de N linhas de `draw` e 0 linhas do par de qualquer outro participante — mais o deploy real da Edge Function `run-draw` no projeto Supabase de produção.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-10-15T18:55:03Z
- **Completed:** 2026-10-15T19:14:15Z
- **Tasks:** 2
- **Files modified:** 1 created, 1 modified

## Accomplishments
- `docs/draw-privacy-verification.md` criado no mesmo formato de `docs/db-rls-verification.md`, citando a policy crítica de `draw` verbatim e a prova herdada da Fase 1 (Parte D daquele documento)
- Critério de aceite 5 do `ROADMAP.md` (Fase 4) reescrito: a redação original assumia um admin não-participante ("o resultado vem vazio"); a nova redação reflete a asserção dupla pós-D-01 (lê 1 de N linhas próprias, 0 linhas de outro)
- Edge Function `run-draw` deployada com sucesso no projeto real (`ccruvfblgdvnjxenezuh`) via `npx supabase functions deploy run-draw --use-api`, usando o token já salvo em `~/.config/supabase-token` (CLI já autenticada de sessão anterior, conforme memória do projeto) — `npx supabase functions list` confirma `status: "ACTIVE"`, `verify_jwt: true`, `version: 1`
- DRAW-10 provado com um sorteio genuíno: grupo "Teste2" (`9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`), 4 participantes (admin incluída, pós-D-01), sorteado via UI real. Impersonando a admin: `count(*) from draw where group_id = <grupo>` = **1**; `count(*) from draw where giver_id = <Bruno>` = **0**. Verificação de UI completa nos dois papéis (admin e não-admin revelando o próprio par em `/draw/:groupId/result`)
- Todos os 15 placeholders `[pendente]` do documento preenchidos com evidência real, ou com nota honesta explicando por que uma variante de método (SQL em vez do snippet literal de DevTools) foi usada

## Task Commits

Each task was committed atomically:

1. **Task 1: docs/draw-privacy-verification.md + correção do ROADMAP.md** - `d35b5fc` (docs)
2. **Task 2: Deploy real da Edge Function run-draw + evidência real de DRAW-10** - `6d62eab` (feat)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `docs/draw-privacy-verification.md` - roteiro versionado de DRAW-10/D-13; Parte A (snippet DevTools/fetch), Parte B (SQL equivalente, executado de verdade com evidência real), Parte C (prova herdada da Fase 1, citada), Parte D (checklist de execução, com nota sobre o gap de UI descoberto e corrigido, e ressalva de ambiente de produção)
- `.planning/ROADMAP.md` - critério de aceite 5 da Fase 4 reescrito para a asserção dupla pós-D-01

## Decisions Made
- A asserção de DRAW-10 foi comprovada via SQL impersonado (`npx supabase db query --linked` com `set local role authenticated` + `request.jwt.claims`) em vez do snippet de `fetch` no console do DevTools — ambos exercitam a mesma policy de RLS (`giver_id in (select private.my_participant_ids())`); o snippet de DevTools permanece documentado no roteiro para quem quiser reexecutar via navegador real
- A ressalva de que a verificação rodou contra o banco de produção (não um ambiente isolado) foi registrada explicitamente no documento, nunca omitida — assim como a pendência de limpeza das linhas de teste e a irreversibilidade do grupo usado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gap de UI: nenhum link para `/draw/:groupId/result` acessível a participantes não-admin**
- **Found during:** Task 2, smoke test real executado pelo coordenador/usuário (passo 5 do checkpoint)
- **Issue:** `manage-group.page.html` (plan 04-03) tinha o único link para a tela de revelação, atrás de uma checagem de admin. Um participante não-admin, mesmo com o grupo `closed` e um resultado real em `draw`, não tinha como navegar até `/draw/:groupId/result` pela UI — a rota e o resolver (plan 04-04) funcionavam, mas eram inalcançáveis por quem não era admin.
- **Fix:** Corrigido fora desta sessão, via quick task separada `261015-mbk` (branch/commits próprios): novo predicado puro exportado `podeVerResultadoDoSorteio(status, temParticipante)` + `computed()` em `group-view.page.ts`, 5 specs novos (`group-view-reveal-link.spec.ts`), e um botão "Ver meu amigo secreto" em `group-view.page.html`, condicionado a `status === 'closed' && meuParticipante() !== null`.
- **Files modified:** `src/app/features/group/view/group-view.page.ts`, `src/app/features/group/view/group-view.page.html`, `src/app/features/group/view/group-view-reveal-link.spec.ts` (fora desta sessão de execução, commits `ec415fa`/`f481d18`/`217aa9e`/`4781636`)
- **Verification:** suite completa 64/64, `eslint --max-warnings=0` e `ng build` limpos (reportado pelo executor da quick task); confirmado como pré-condição necessária para o smoke test end-to-end desta plan passar nos dois papéis (admin e não-admin)
- **Committed in:** `ec415fa`, `f481d18`, `217aa9e`, `4781636` (commits pré-existentes de uma quick task paralela, não desta plan — documentados aqui por serem a correção que desbloqueou a verificação do checkpoint humano desta plan)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug de UI que bloqueava a verificação end-to-end, corrigido antes do checkpoint humano ser aprovado)
**Impact on plan:** Nenhuma mudança de escopo desta plan — a correção já estava commitada (fora desta sessão) quando o checkpoint foi retomado; documentada aqui porque é o contexto necessário para entender por que o smoke test passou nos dois papéis.

## Issues Encountered
- O snippet literal de DevTools da Parte A do roteiro não foi colado manualmente num console de navegador nesta rodada — a verificação real da asserção dupla usou o caminho SQL equivalente (Parte B), que exercita a mesma policy de RLS. Registrado explicitamente no documento como uma troca de método, não como pendência fabricada.
- A execução rodou contra o banco de produção, não um ambiente de teste isolado — as linhas de teste (grupo "Teste2", usuários `bruno-teste4@exemplo.com`/`carla-teste4@exemplo.com`) ficam com limpeza pendente. Registrado honestamente no documento e aqui, não tratado como concluído.
- O grupo "Teste2" usado na verificação está `closed` de forma irreversível — não é reexecutável; qualquer repetição futura deste roteiro precisa de um grupo novo.

## User Setup Required

None adicional nesta sessão — o deploy foi completado via CLI usando um token já existente (`~/.config/supabase-token`, documentado em memória do projeto desde sessão anterior). O smoke test de UI (passo 5 do checkpoint) foi executado por uma pessoa com acesso a contas reais, conforme exigido pelo plan; resultado reportado de volta ao executor: "deployed — the smoke test passed on both sides."

## Next Phase Readiness
- A Fase 4 (Sorteio e Revelação) está completa: todos os requisitos DRAW-01..10 e ENG-02/03 cobertos por código, teste ou documentação versionada e executada com evidência real.
- `run-draw` está operacional no projeto real; `DrawService.runDraw()` (plan 04-03) chama uma função que de fato existe no servidor.
- Pendências não-bloqueantes registradas (não impedem a Fase 5): limpeza das linhas de teste de produção (grupo "Teste2" e 2 usuários de teste), e a dívida técnica já conhecida V2-01 (atomicidade insert-pares/fechamento de grupo na Edge Function).
- Nenhum bloqueio para a Fase 5 (PWA, Acessibilidade e Entrega).

---
*Phase: 04-sorteio-e-revela-o*
*Completed: 2026-10-15*

## Self-Check: PASSED

- FOUND: `docs/draw-privacy-verification.md`
- FOUND: commit `d35b5fc` (Task 1)
- FOUND: commit `6d62eab` (Task 2)
- FOUND: `run-draw` listed as `ACTIVE` via `npx supabase functions list` against the real project (`ccruvfblgdvnjxenezuh`)
- FOUND: ROADMAP.md criterion 5 text updated (`exatamente 1 linha` present, old text absent)
