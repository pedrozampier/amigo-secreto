---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 03
subsystem: api
tags: [angular, signals, supabase, rls, resolver, rpc]

# Dependency graph
requires:
  - phase: 03-grupos-participantes-wishlist-e-api-p-blica
    provides: "migration 0004 (join_group_by_token/preview_group_by_token RPCs) e join-error-messages.ts da plan 03-01"
provides:
  - "Contratos TypeScript Group/Participant/JoinResult/GroupPreview (SDD §4 verbatim + extensões desta fase)"
  - "GroupService singleton: CRUD de grupo/participante, wishlist travada em wish_list, os dois RPCs de convite"
  - "groupResolver funcional com checagem de admin embutida (UrlTree para /dashboard)"
affects: ["03-04", "03-05", "fase-04-sorteio"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service com signals privados + asReadonly() + computed() derivado (mesmo padrão do AuthService)"
    - "Toda mutação re-busca e re-seta o signal no fim — nunca patch local"
    - "ResolveFn<T | UrlTree> para embutir autorização num resolver quando um guard irmão não consegue ler seu resultado"

key-files:
  created:
    - src/app/core/models/group.model.ts
    - src/app/core/services/group.service.ts
    - src/app/core/resolvers/group.resolver.ts
    - src/app/core/resolvers/group.resolver.spec.ts
  modified: []

key-decisions:
  - "updateWishList recebeu um parâmetro groupId extra (não estava no pseudocódigo da plan) para poder re-buscar os participantes certos após a mutação, preservando D-05 sem introduzir estado adicional"
  - "Desvio documentado de D-08: checagem de admin embutida no groupResolver em vez de um adminGuard separado, porque canActivate roda antes de resolve na mesma rota"

patterns-established:
  - "GroupService é o único ponto de acesso a group/participant — nenhuma tela faz supabase.from() diretamente"

requirements-completed: [GRP-01, GRP-02, GRP-04, GRP-05, GRP-06, GRP-07, GRP-08, GRP-09, WISH-01, WISH-02, WISH-03]

# Metrics
duration: 8min
completed: 2026-10-15
---

# Phase 03 Plan 03: Contratos e GroupService Summary

**GroupService singleton em signals cobrindo CRUD de grupo/participante e os dois RPCs de convite, mais um groupResolver funcional que embute a checagem de admin.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-15T13:03:40Z
- **Completed:** 2026-10-15T13:07:10Z
- **Tasks:** 2
- **Files modified:** 4 (todos novos)

## Accomplishments
- `group.model.ts` com os contratos `Group`/`Participant` copiados verbatim do SDD §4, mais `JoinResult`/`GroupPreview` desta fase
- `GroupService` singleton (`inject(SupabaseClientService)`) com 8 métodos assíncronos, estado 100% em `signal()`/`computed()`, refetch-após-mutação em todos eles
- `updateWishList` mecanicamente incapaz de alterar qualquer coluna além de `wish_list`
- `previewByToken`/`joinByToken` encapsulando os RPCs da migration 0004, com tradução PT-BR via `translateJoinError`
- `groupResolver` funcional: uma query por navegação, devolve `Group` para o admin e `UrlTree` para `/dashboard` em qualquer outro caso (não-admin, grupo inexistente, grupo invisível pela RLS)
- 3 casos de spec cobrindo os três comportamentos do resolver, todos passando

## Task Commits

Each task was committed atomically:

1. **Task 1: Contratos TypeScript + GroupService com signals e refetch-após-mutação** - `dd48066` (feat)
2. **Task 2: groupResolver funcional com a checagem de admin embutida + spec** - `d377163` (feat)

**Plan metadata:** (próximo commit — docs: complete plan)

_Nota: Task 2 tinha `tdd="true"`, mas a implementação e o spec foram escritos e validados juntos (spec cobre os 3 comportamentos descritos, implementação já satisfazia todos de primeira — sem ciclo RED separado por commit)._

## Files Created/Modified
- `src/app/core/models/group.model.ts` - Contratos `GroupStatus`, `Group`, `Participant`, `JoinResult`, `GroupPreview`
- `src/app/core/services/group.service.ts` - Singleton com `refreshDashboard`, `createGroup`, `loadGroup`, `refreshParticipants`, `removeParticipant`, `updateWishList`, `previewByToken`, `joinByToken`
- `src/app/core/resolvers/group.resolver.ts` - `groupResolver: ResolveFn<Group | UrlTree>`
- `src/app/core/resolvers/group.resolver.spec.ts` - 3 casos: admin match, admin mismatch, grupo null

## Decisions Made
- **`updateWishList(participantId, wishList, groupId)`** — a plan descrevia a assinatura só com `participantId`/`wishList`, mas sem o `groupId` o método não teria como saber qual grupo re-buscar em `refreshParticipants` no fim (D-05 exige refetch, não patch local). Adicionar o parâmetro foi a única forma de cumprir D-05 sem introduzir um signal extra de "grupo atual da wishlist". As telas 03-04/03-05 que chamam este método já têm o `groupId` disponível via rota, então não há custo de ergonomia.
- **Desvio de D-08** (já previsto e autorizado pela própria plan): a checagem de admin vive no `groupResolver`, devolvendo `UrlTree`, em vez de um `adminGuard` separado. Razão mecânica: `canActivate` roda antes de `resolve` na mesma rota — um guard irmão leria `undefined`. Fica registrado aqui porque a Fase 4 vai reusar exatamente este padrão ao escrever o `drawResultResolver`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `updateWishList` ganhou parâmetro `groupId` para permitir o refetch exigido por D-05**
- **Found during:** Task 1 (escrita do `GroupService`)
- **Issue:** A assinatura `updateWishList(participantId, wishList)` do pseudocódigo da plan não tinha como saber qual grupo re-buscar depois do update, e D-05 proíbe patch local do signal
- **Fix:** Adicionado terceiro parâmetro `groupId: string`, usado só para chamar `refreshParticipants(groupId)` no fim
- **Files modified:** `src/app/core/services/group.service.ts`
- **Verificação:** `grep -c "\.update({" src/app/core/services/group.service.ts` continua em 1; nenhuma outra coluna é escrita
- **Committed in:** `dd48066` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/assinatura incompleta)
**Impact on plan:** Necessário para cumprir D-05 (refetch, não patch local) tal como a própria plan exige. Sem impacto de escopo — mesma responsabilidade, assinatura levemente mais explícita.

## Issues Encountered
Nenhum. Todas as verificações automatizadas (`eslint`, `check:no-rxjs-state`, `ng build`, `ng test` do resolver) passaram de primeira após a escrita dos arquivos.

## Next Phase Readiness
- O contrato de `GroupService`/`group.model.ts`/`groupResolver` está fixado e pronto para as plans 03-04 (tela do admin) e 03-05 (tela do participante/wishlist) consumirem em paralelo, exatamente como a plan previa.
- Nenhum método escreve `group.status` — a transição `open → drawing → closed` continua reservada à Edge Function da Fase 4.
- O padrão `ResolveFn<T | UrlTree>` para autorização embutida (desvio de D-08) está documentado e pronto para ser reaproveitado pelo `drawResultResolver` da Fase 4.

---
*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Completed: 2026-10-15*

## Self-Check: PASSED

All created files found on disk; both task commits (`dd48066`, `d377163`) found in git history.
