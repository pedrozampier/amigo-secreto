---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 04
subsystem: ui
tags: [angular, router, reactive-forms, signals, standalone, spartan-ui]

requires:
  - phase: 03-grupos-participantes-wishlist-e-api-p-blica
    provides: "GroupService (createGroup/refreshDashboard/administered/participated) e groupResolver funcional, da plan 03-03"
provides:
  - "Árvore de rotas /group/* aninhada sob GroupLayoutPage com router-outlet próprio"
  - "/join/:token como rota flat dentro do layout autenticado"
  - "CreateGroupPage: Reactive Form validado 3-60 caracteres + link de convite copiável"
  - "Dashboard com duas seções separadas (administrados/participados) via @for+track+@empty"
  - "Esqueletos estruturais de ManageGroupPage e JoinGroupPage prontos para a plan 03-05"
affects: [03-05]

tech-stack:
  added: []
  patterns:
    - "Rotas filhas aninhadas (RA5-ID17): GroupLayoutPage com <router-outlet> próprio, guard herdado do layout autenticado pai, nunca reaplicado"
    - "Esqueleto estrutural pré-criado para loadComponent resolver estaticamente em tsc (mesmo padrão da plan 02-03)"
    - "Reactive Form espelhando CHECK do banco (minLength/maxLength = char_length do schema)"
    - "Link de convite via window.location.origin em runtime, nunca appUrl em environment.ts"
    - "Dashboard como consumidor puro de signals do service (sem cópia local), com @for+track+@empty"

key-files:
  created:
    - src/app/features/group/group.routes.ts
    - src/app/features/group/group-layout/group-layout.page.ts
    - src/app/features/group/group-layout/group-layout.page.html
    - src/app/features/group/create/create-group.page.ts
    - src/app/features/group/create/create-group.page.html
    - src/app/features/group/manage/manage-group.page.ts
    - src/app/features/group/manage/manage-group.page.html
    - src/app/features/group/join/join-group.page.ts
    - src/app/features/group/join/join-group.page.html
  modified:
    - src/app/app.routes.ts
    - src/app/features/dashboard/dashboard.page.ts
    - src/app/features/dashboard/dashboard.page.html

key-decisions:
  - "ManageGroupPage e JoinGroupPage criados como esqueletos estruturais nesta plan (não na 03-05) porque tsc resolve loadComponent estaticamente; sem eles a árvore de rotas de group.routes.ts não compilaria"
  - "Cards de 'grupos que participo' no dashboard não linkam para /group/:id/manage — o groupResolver redirecionaria o não-admin de volta ao /dashboard, e oferecer um link que sempre rebate é péssima UX"

requirements-completed: [GRP-01, GRP-02, GRP-03, GRP-09]

duration: 12min
completed: 2026-10-15
---

# Phase 03 Plan 04: Árvore de Rotas, Criar Grupo e Dashboard Summary

**Rotas filhas aninhadas sob GroupLayoutPage (/group/create, /group/:id/manage, /join/:token flat), CreateGroupPage com Reactive Form validado + link de convite copiável, e dashboard reescrito com duas seções @for+track separadas para grupos administrados/participados.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-15T13:08:30Z
- **Completed:** 2026-10-15T13:12:30Z
- **Tasks:** 3
- **Files modified:** 12 (9 created, 3 modified)

## Accomplishments
- Árvore de rotas `/group/*` aninhada: `GroupLayoutPage` fornece `<router-outlet>` próprio para `create` e `:id/manage`, com o `authGuard` herdado uma única vez do layout autenticado pai (RA5-ID17)
- `/join/:token` cadastrada como rota flat dentro do mesmo layout autenticado (não sob `/group`, pois quem abre o convite ainda não é membro)
- `CreateGroupPage`: Reactive Form com `minLength(3)`/`maxLength(60)` espelhando o `CHECK` do banco, submit desabilitado enquanto inválido (RA5-ID23), e exibição do link `<origin>/join/<invite_token>` com cópia em um clique via `navigator.clipboard.writeText`
- Dashboard reescrito com duas seções `@for`+`track`+`@empty` distintas ("Grupos que administro" / "Grupos que participo"), preservando o card de saudação e o bloco `@defer` do contador de Natal (plan 03-02)
- Esqueletos estruturais de `ManageGroupPage`/`JoinGroupPage` criados (corpo vem na plan 03-05)

## Task Commits

1. **Task 1: Árvore de rotas aninhadas, GroupLayoutPage e esqueletos de manage/join** - `6af4f8c` (feat)
2. **Task 2: CreateGroupPage — Reactive Form validado e link de convite copiável** - `5f6895e` (feat)
3. **Task 3: Dashboard com as duas seções separadas de GRP-09** - `e90b869` (feat)

## Files Created/Modified
- `src/app/features/group/group.routes.ts` - rotas filhas `create` e `:id/manage` sob `GroupLayoutPage`, com `resolve: { group: groupResolver }` na rota de manage
- `src/app/features/group/group-layout/group-layout.page.ts/.html` - layout com `<router-outlet>` e link de volta ao dashboard
- `src/app/features/group/create/create-group.page.ts/.html` - Reactive Form + estado "grupo criado" com link de convite
- `src/app/features/group/manage/manage-group.page.ts/.html` - esqueleto com `input.required<string>()` para `id`
- `src/app/features/group/join/join-group.page.ts/.html` - esqueleto com `input.required<string>()` para `token`
- `src/app/app.routes.ts` - acrescenta `path: 'group'` (`loadChildren`) e `path: 'join/:token'` ao array `children` do layout autenticado
- `src/app/features/dashboard/dashboard.page.ts/.html` - consome `administered`/`participated`/`refreshDashboard` do `GroupService`, duas seções separadas, botão "Criar grupo"

## Decisions Made
- Esqueletos de `manage`/`join` entregues nesta plan (não na 03-05) por necessidade estrutural: `tsc` resolve `loadComponent` estaticamente, então sem os arquivos a árvore de rotas falharia com TS2307 — mesma lição da plan 02-03.
- Cards de grupos participados no dashboard são apenas informativos (sem link para `/manage`), porque o `groupResolver` redirecionaria qualquer não-admin de volta ao dashboard — um link que sempre rebate seria péssima UX.

## Deviations from Plan

None - plan executada exatamente como escrita.

## Issues Encountered

O grep de verificação `grep -c "canActivate" src/app/features/group/group.routes.ts` retorna 1 em vez de 0, mas é um falso positivo: a única ocorrência é dentro do comentário explicativo ("Sem `canActivate` aqui..."), não código. O arquivo não possui nenhuma propriedade `canActivate` real — confirmado por inspeção manual. Mesmo padrão de falso positivo já documentado em STATE.md para a plan 03-01.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- `ManageGroupPage` e `JoinGroupPage` estão navegáveis com esqueleto mínimo, prontos para a plan 03-05 preencher GRP-04/05/06/07/08 e WISH-01/02/03
- GRP-01, GRP-02, GRP-03 e GRP-09 são agora verificáveis ponta a ponta (tela funcionando, não apenas o service) e foram marcados `[x]` em REQUIREMENTS.md
- GRP-04/05/06/07/08 e WISH-01/02/03 permanecem sem marcar — dependem das telas da plan 03-05
- Nenhum bloqueio identificado

---
*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 12 files created/modified confirmed present on disk. All 3 task commits (`6af4f8c`, `5f6895e`, `e90b869`) confirmed in git log.
