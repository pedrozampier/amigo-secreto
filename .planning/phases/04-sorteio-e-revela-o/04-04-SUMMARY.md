---
phase: 04-sorteio-e-revela-o
plan: 04
subsystem: ui
tags: [angular, signals, supabase-postgrest, defer, resolver, guard, vitest]

# Dependency graph
requires:
  - phase: 04-03
    provides: "DrawService.runDraw() já existente e padrão de injeção do SupabaseClientService, estendido (não recriado) com getMyResult()"
  - phase: 04-01
    provides: "schema public.draw com FKs giver_id/receiver_id para participant, confirmado via CLI linkada (draw_giver_id_fkey, draw_receiver_id_fkey, draw_group_id_fkey)"
provides:
  - "Draw/DrawResult contracts em group.model.ts"
  - "DrawService.getMyResult(groupId) — join FK-nomeado numa única query (D-07)"
  - "drawResultResolver — resolver funcional com discriminated union ready/not-drawn/missing (D-08, ID18)"
  - "memberGuard generalizado para aceitar :groupId além de :id, reusável em qualquer rota de grupo"
  - "DrawResultPage em /draw/:groupId/result — cartão fechado clicável via @defer (on interaction) (DRAW-08/09, ID8)"
affects: [04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@defer (on interaction) cujo @placeholder É o próprio elemento clicável, sem @if/signal externo controlando visibilidade — único jeito do conteúdo genuinamente não existir no DOM antes da interação"
    - "Guard de rota aceitando múltiplos nomes de param via ?? (route.paramMap.get('id') ?? route.paramMap.get('groupId')) para reuso entre rotas que nomeiam o mesmo recurso de formas diferentes"
    - "Resolver checando um status anterior (group.status !== 'closed') antes de uma segunda query, para dar a mensagem certa sem query desnecessária"

key-files:
  created:
    - src/app/core/resolvers/draw-result.resolver.ts
    - src/app/core/resolvers/draw-result.resolver.spec.ts
    - src/app/features/draw/result/draw-result.page.ts
    - src/app/features/draw/result/draw-result.page.html
  modified:
    - src/app/core/models/group.model.ts
    - src/app/core/services/draw.service.ts
    - src/app/core/guards/member.guard.ts
    - src/app/core/guards/member.guard.spec.ts
    - src/app/app.routes.ts
    - docs/sdd.md

key-decisions:
  - "FK name draw_receiver_id_fkey/draw_giver_id_fkey confirmado rodando uma query real contra o projeto Supabase linkado (via npx supabase db query --linked) antes de escrever a query supabase-js, em vez de assumir o nome padrão do Postgres"
  - "docs/sdd.md §4 tinha um contrato MyDrawResult sem o campo id; o código real usa DrawResult com id (necessário para track/debug) — SDD atualizado na mesma mudança em vez de deixar a divergência implícita"
  - "resultadoPronto() como computed() no componente, não checagem repetida de status==='ready' no template, para evitar qualquer tentação de as any no narrowing do discriminated union dentro do @defer"

requirements-completed: [DRAW-08, DRAW-09]

# Metrics
duration: 5min
completed: 2026-10-15
---

# Phase 04 Plan 04: Tela de Revelação do Par (@defer + resolver + guard generalizado) Summary

**Rota `/draw/:groupId/result` com um cartão fechado que só revela nome e wishlist de quem foi tirado depois de um clique genuíno — `@defer (on interaction)` cujo `@placeholder` é o próprio botão clicável, carregado por um resolver funcional com três estados em PT-BR, protegido por um `memberGuard` agora reusável entre `:id` e `:groupId`.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-15T18:47:27Z
- **Completed:** 2026-10-15T18:52:17Z
- **Tasks:** 4
- **Files modified:** 4 created, 6 modified

## Accomplishments
- `Draw`/`DrawResult` contracts em `group.model.ts`, e `DrawService.getMyResult(groupId)` buscando o par do usuário numa única query com join FK-nomeado (`participant!draw_receiver_id_fkey`), sem tocar em `runDraw()` existente
- `drawResultResolver`: discriminated union `ready`/`not-drawn`/`missing`, checando `group.status` antes de consultar `draw` para nunca disparar uma query inútil nem mostrar um erro genérico quando o sorteio simplesmente não aconteceu ainda
- `memberGuard` generalizado (TDD RED→GREEN) para ler `route.paramMap.get('id') ?? route.paramMap.get('groupId')` — os 6 testes pré-existentes de `:id` continuam verdes, e 2 novos provam `:groupId` (chamada direta + `RouterTestingHarness` navegando `/draw/g1/result`)
- `DrawResultPage`: um único bloco `@defer (on interaction)` cujo `@placeholder` é o botão "Revelar meu amigo secreto" — o nome e a wishlist revelados genuinamente não existem no DOM antes do clique, sem nenhum `@if`/signal externo decidindo visibilidade
- Rota `/draw/:groupId/result` registrada em `app.routes.ts`, fora de `/group` (path diferente), com `canActivate: [memberGuard]` + `resolve: { resultado: drawResultResolver }`
- `docs/sdd.md`: tabela de rotas §5.2 atualizada (guard+resolver, não mais "Fase 4" pendente); contrato `DrawResult`/`MyDrawResult` em §4 alinhado ao nome e campos reais do código; linha do `DrawService` em §5.3 atualizada

## Task Commits

Each task was committed atomically:

1. **Task 1: Contrato Draw/DrawResult + DrawService.getMyResult()** - `48426bd` (feat)
2. **Task 2: drawResultResolver funcional + spec** - `cd03e11` (feat)
3. **Task 3: memberGuard aceita :groupId** - `9844bd8` (test, RED) + `154143c` (feat, GREEN)
4. **Task 4: DrawResultPage com @defer (on interaction) + rota + SDD** - `57ff32e` (feat)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `src/app/core/models/group.model.ts` - `Draw`/`DrawResult` interfaces (DRAW-08/09)
- `src/app/core/services/draw.service.ts` - `getMyResult(groupId)` com join FK-nomeado, ao lado do `runDraw()` da plan 04-03
- `src/app/core/resolvers/draw-result.resolver.ts` - `drawResultResolver`, discriminated union `DrawResultState`
- `src/app/core/resolvers/draw-result.resolver.spec.ts` - 5 testes (ready/not-drawn/missing + 2 UrlTree degenerados)
- `src/app/core/guards/member.guard.ts` - leitura de param generalizada (`id` ou `groupId`)
- `src/app/core/guards/member.guard.spec.ts` - 2 testes novos (chamada direta + RouterTestingHarness) ao lado dos 6 pré-existentes
- `src/app/features/draw/result/draw-result.page.ts` - `DrawResultPage`, `groupId`/`resultado` via `input.required()`, `resultadoPronto` computed para narrowing seguro
- `src/app/features/draw/result/draw-result.page.html` - `@switch` dos 3 estados + `@defer (on interaction)` genuíno
- `src/app/app.routes.ts` - rota `draw/:groupId/result` com `memberGuard` + `drawResultResolver`
- `docs/sdd.md` - tabela de rotas §5.2, contrato `DrawResult` §4, linha do `DrawService` §5.3

## Decisions Made
- O nome real das FKs de `draw` (`draw_giver_id_fkey`, `draw_receiver_id_fkey`, `draw_group_id_fkey`) foi confirmado rodando `select conname from pg_constraint where conrelid = 'public.draw'::regclass and contype = 'f'` contra o projeto Supabase linkado via `npx supabase db query --linked`, em vez de assumir o nome padrão gerado pelo Postgres — bateu com a suposição do plan, mas a confirmação evita um erro de PostgREST em runtime que só apareceria fora do build.
- `docs/sdd.md` §4 tinha `MyDrawResult` sem o campo `id`; o código escrito (seguindo o plan) usa `DrawResult` com `id`. Em vez de reescrever o contrato real para bater com um SDD desatualizado, o SDD foi corrigido na mesma mudança (regra do CLAUDE.md: "se o código precisa divergir da spec, atualizar o documento na mesma mudança"), com uma nota explícita sobre a divergência mínima.
- `resultadoPronto = computed(() => r.status === 'ready' ? r.result : null)` no componente em vez de repetir `resultado().status === 'ready' ? resultado().result... : ''` dentro da interpolação do template — mais legível e evita qualquer tentação de recorrer a um cast de tipo não-seguro para o narrowing do discriminated union dentro do `@defer`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Template com erro de build TS2532 (Object is possibly undefined) em `resultadoPronto()?.receiver.display_name`/`.wish_list`**
- **Found during:** Task 4, `npx ng build`
- **Issue:** O plan previa opcionalmente um `computed()` com a forma `resultadoPronto()?.receiver.display_name` (sem `?.` antes de `receiver`), mas o compilador de templates do Angular (strict template checking) rejeitou essa leitura como "Object is possibly 'undefined'" mesmo com o optional chaining anterior, porque `receiver` continua sendo lido de forma não-opcional depois do `?.` no operando anterior.
- **Fix:** Adicionado um segundo `?.` em cada leitura (`resultadoPronto()?.receiver?.display_name` e `resultadoPronto()?.receiver?.wish_list`), mantendo o fallback `||` para a wishlist vazia. Nenhuma lógica mudou — é puramente uma correção de encadeamento de optional chaining para satisfazer o strict mode do compilador de templates.
- **Files modified:** `src/app/features/draw/result/draw-result.page.html`
- **Verification:** `npx ng build` (exit 0), `npx eslint src --max-warnings=0` (exit 0), suite completa `npx ng test --watch=false` (59/59 passando)
- **Committed in:** `57ff32e` (Task 4)

---

**Total deviations:** 1 auto-fixed (1 bug/blocking de build)
**Impact on plan:** Nenhum impacto de escopo — correção mecânica de optional chaining exigida pelo compilador estrito, sem mudança de comportamento ou de contrato.

## Issues Encountered
None adicionais além do deviation documentado acima.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- A Fase 4 core value (sorteio real + revelação privada) está estruturalmente completa: `runDraw()` (04-03) + `getMyResult()`/`drawResultResolver`/`DrawResultPage` (04-04) cobrem ponta a ponta o fluxo de um participante.
- `memberGuard` generalizado é reaproveitável por qualquer rota futura de grupo que precise nomear o param de forma diferente de `id`.
- Pendente para a plan 04-05 (ou verificação humana): smoke test end-to-end com duas contas reais (admin + participante) confirmando que o DOM não contém nome/wishlist antes do clique (DevTools Elements) e que o link "Ver meu amigo secreto" de `manage-group.page.html` (plan 04-03) realmente navega para esta rota nova sem 404.

---
*Phase: 04-sorteio-e-revela-o*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 10 referenced files found on disk (4 created, 6 modified, plus this SUMMARY); all 5 task commit hashes (`48426bd`, `cd03e11`, `9844bd8`, `154143c`, `57ff32e`) found in git history.
