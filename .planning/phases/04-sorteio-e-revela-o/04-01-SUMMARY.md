---
phase: 04-sorteio-e-revela-o
plan: 01
subsystem: api
tags: [deno, edge-function, supabase, vitest, draw-algorithm, fisher-yates]

# Dependency graph
requires:
  - phase: 01-fundacao-scaffold-banco-rls
    provides: schema de `group`/`participant`/`draw` com constraints draw_no_self_gift/draw_giver_unique/draw_receiver_unique e RLS sem policy de escrita para authenticated
provides:
  - "Módulo puro `shuffle`/`pairCircular` em src/app/core/draw-algorithm.ts, zero imports, duplicado byte a byte para o runtime Deno"
  - "Prova automatizada (ENG-02) de ausência de autossorteio e perfect matching para n=2..12"
  - "Edge Function run-draw completa: validação de admin, lock otimista, pareamento circular, insert, fechamento do grupo"
  - "supabase/config.toml mínimo, sem seções que induzam supabase db push"
affects: [04-02, 04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Algoritmo puro sem imports duplicado byte a byte entre src/app/core/ (Vitest/Node) e supabase/functions/ (Deno) — sem build step, sem monorepo"
    - "Lock otimista via UPDATE condicional (eq('status','open')) em vez de SELECT...FOR UPDATE ou mutex de aplicação"
    - "Edge Function devolve {code} estável (D-12), não {error} com mensagem livre"

key-files:
  created:
    - src/app/core/draw-algorithm.ts
    - src/app/core/draw-algorithm.spec.ts
    - supabase/functions/run-draw/draw-algorithm.ts
    - supabase/functions/run-draw/index.ts
    - supabase/config.toml
  modified: []

key-decisions:
  - "config.toml escrito à mão (CLI recusou gerar por cima de diretório já existente), seguindo exatamente o fallback do plan: só project_id e [functions.run-draw], sem [db]/[auth]/[api]"
  - "check:no-secrets validado com dist/ vazio: a falha observada com dist/ stale veio de código-fonte do próprio supabase-js (string 'service_role' interna ao SDK), não de um secret real; dist/ é gitignored e CI sempre builda fresh, então não é regressão desta task"

requirements-completed: [DRAW-02, DRAW-03, DRAW-05, DRAW-06, DRAW-07, ENG-02]

duration: 3min
completed: 2026-10-15
---

# Phase 04 Plan 01: Núcleo do Sorteio (Algoritmo + Edge Function) Summary

**Algoritmo de pareamento circular puro (Fisher-Yates + rotação) duplicado byte a byte entre Vitest e Deno, provado livre de autossorteio para n=2..12 em 200 execuções cada, e a Edge Function `run-draw` completa com validação de admin, lock otimista e fechamento do grupo.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-15T18:32:56Z
- **Completed:** 2026-10-15T18:35:45Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments
- `src/app/core/draw-algorithm.ts`: `shuffle` (Fisher-Yates, não muta entrada) e `pairCircular` (pareamento circular `p[i] -> p[(i+1)%n]`), zero imports, importável pelos dois runtimes
- `draw-algorithm.spec.ts`: 7 testes Vitest provando ENG-02 — ausência de autossorteio e perfect matching para n de 2 a 12, 200 execuções cada, mais os casos de borda (array vazio, n=2 com troca mútua)
- `supabase/functions/run-draw/index.ts`: Edge Function Deno completa — valida JWT do chamador, confirma que é o admin do grupo (DRAW-03), aplica lock otimista via UPDATE condicional (DRAW-06), conta participantes contra `min_participants`, executa `pairCircular` (DRAW-05), insere os pares com `service_role`, fecha o grupo (DRAW-07), e reverte o lock em caso de erro
- `supabase/config.toml` criado à mão com apenas `project_id` e `[functions.run-draw]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Módulo puro do algoritmo + specs de ENG-02** - `ee6ce6c` (feat)
2. **Task 2: Edge Function run-draw (Deno) + config.toml** - `105258a` (feat)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `src/app/core/draw-algorithm.ts` - algoritmo puro (shuffle + pairCircular), zero imports
- `src/app/core/draw-algorithm.spec.ts` - specs ENG-02 (ausência de autossorteio + perfect matching, n=2..12)
- `supabase/functions/run-draw/draw-algorithm.ts` - cópia byte-idêntica para o runtime Deno
- `supabase/functions/run-draw/index.ts` - Deno.serve handler completo da Edge Function
- `supabase/config.toml` - config mínima só da função run-draw

## Decisions Made
- `supabase/config.toml` escrito manualmente porque `npx supabase functions new run-draw` recusou sobrescrever o diretório já criado pela cópia do algoritmo (comportamento esperado, previsto no plan como fallback)
- `check:no-secrets` interpretado corretamente como gate de CI (que sempre builda fresh), não como verificação do `dist/` local da máquina do executor — ver Issues Encountered

## Deviations from Plan

None - plan executado exatamente como escrito. Nenhuma das Regras 1-4 foi acionada: nenhum bug encontrado, nenhuma funcionalidade crítica faltante, nenhum bloqueio, nenhuma mudança arquitetural.

**Nota sobre commit `105258a`:** por executar em paralelo com o agente do plan 04-02 (mesmo índice git compartilhado), o commit da Task 2 capturou também as alterações já staged por aquele agente em `docs/sdd.md` e `src/app/core/services/group.service.ts` (RPC `create_group`, migration 0006). Confirmado via `git diff dd8c2a5 105258a` e `git diff HEAD -- <arquivos>` (diff vazio) que nenhum conteúdo foi perdido ou duplicado — as mudanças do plan 04-02 estão integralmente commitadas, apenas sob o SHA deste commit em vez de um commit próprio daquele agente. Não é uma deviation de conteúdo do plan 04-01, é um efeito colateral benigno de paralelismo; registrado aqui para rastreabilidade.

## Issues Encountered
- Primeira tentativa de `npm run check:no-secrets` falhou contra um `dist/` local obsoleto (`grep` encontrou a string `service_role` dentro do próprio bundle do `@supabase/supabase-js`, que usa esse termo internamente em lógica de erro — não é um secret real). Diagnosticado comparando com `.github/workflows/ci.yml`: o gate real roda `npm run build` fresh logo antes do grep, e `dist/` é gitignored (não rastreado). Removido o `dist/` obsoleto e reexecutado com `dist/` vazio → saída limpa, código 0. Nenhuma correção de código foi necessária; não é uma regressão desta task.

## Next Phase Readiness
- O contrato `DrawPair { giver_id, receiver_id }` e as funções `shuffle`/`pairCircular` estão disponíveis em `src/app/core/draw-algorithm.ts` para o `DrawService` (plan 04-03) importar tipos/testar comportamento equivalente
- Os 5 códigos estáveis de erro (`NOT_ENOUGH_PARTICIPANTS`, `ALREADY_DRAWN`, `NOT_ADMIN`, `GROUP_NOT_FOUND`, `UNKNOWN_ERROR`) e o formato de resposta `{code}`/`{success, pairs}` estão fixados no `index.ts` para o plan 04-03 (que cria o mapa de tradução PT-BR) consumir
- Deploy da Edge Function é checkpoint humano do plan 04-05 (requer `supabase login`, não disponível nesta sessão) — não bloqueia o restante da Fase 4, que pode seguir com o contrato já definido

---
*Phase: 04-sorteio-e-revela-o*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 5 created files found on disk; both task commit hashes (`ee6ce6c`, `105258a`) found in git history.
