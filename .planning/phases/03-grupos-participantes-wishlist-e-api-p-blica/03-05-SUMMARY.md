---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 05
subsystem: ui
tags: [angular, signals, input, output, model, standalone, reactive-forms, supabase-rpc]

# Dependency graph
requires:
  - phase: 03-grupos-participantes-wishlist-e-api-p-blica
    provides: "GroupService (RPC join/preview, participant CRUD, wishlist update), group.model.ts contracts, join-error-messages.ts, groupResolver, ManageGroupPage/JoinGroupPage skeletons with input.required<string>()"
provides:
  - "ParticipantRow standalone component using input()/output() functions with inline two-step removal confirmation (no Spartan dialog primitive)"
  - "ManageGroupPage: admin invite-link (copy), participant list (@for+track), removal flow, and the logged-in user's own wishlist via model()+[(ngModel)]"
  - "JoinGroupPage: token preview + explicit confirm-to-join flow with PT-BR error messages for invalid/closed/already-member"
  - "docs/sdd.md §5.1/§5.2/§5.3/§2.1 reconciled with the real nested route tree, groupResolver admin check, HolidayService, and folder layout on disk"
  - "REQUIREMENTS.md: V2-02 expanded with D-17 wish_list column-scoping gap; 16 Phase 3 requirements marked complete"
affects: [04-sorteio-edge-function, 05-pwa-acessibilidade-entrega]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline two-step confirmation (signal holding pending id) instead of a dialog primitive, to avoid pulling @ng-icons as an undeclared peer"
    - "model() + FormsModule/[(ngModel)] for a standalone textarea control that is not part of a Reactive Form, seeded once from a signal via effect() with a private seeded flag"

key-files:
  created:
    - src/app/features/group/manage/participant-row.ts
    - src/app/features/group/manage/participant-row.html
  modified:
    - src/app/features/group/manage/manage-group.page.ts
    - src/app/features/group/manage/manage-group.page.html
    - src/app/features/group/join/join-group.page.ts
    - src/app/features/group/join/join-group.page.html
    - docs/sdd.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Participant removal confirmation implemented as inline two-step UI (no Spartan `dialog` primitive), per the plan's explicit decision to avoid the @ng-icons peer dependency"
  - "JoinGroupPage never auto-joins on load; it shows a preview and requires an explicit confirm click (D-02), and navigates to /dashboard (not /group/:id/manage) after joining since a new member is never the admin"

requirements-completed: [GRP-03, GRP-04, GRP-05, GRP-06, GRP-07, GRP-08, WISH-01, WISH-02, WISH-03]

# Metrics
duration: 25min
completed: 2026-10-15
---

# Phase 3 Plan 5: Manage Group, Join Group & SDD Reconciliation Summary

**ParticipantRow (input()/output()) + ManageGroupPage (list, removal, wishlist via model()) + JoinGroupPage (token preview/confirm) close out Phase 3's Supabase-facing UI, with docs/sdd.md and REQUIREMENTS.md reconciled to match.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-15T13:14:40Z
- **Completed:** 2026-10-15T13:20:38Z
- **Tasks:** 3 of 4 (Task 4 is a blocking human-verify checkpoint — see below)
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments

- `ParticipantRow` demonstrates RA4-ID13 (`input()`/`output()` as functions, never decorators) with a real removal flow, including a two-step inline confirmation requiring zero new dependencies
- `ManageGroupPage` wires the admin's invite-link (copy-to-clipboard, GRP-03), the participant list with `@for`+`track` (ID6) and per-row removal, and the logged-in user's own wishlist textarea with `model()` + `[(ngModel)]` (ID11) — seeded once from the fetched participant row via an `effect()` guarded by a `semeado` flag so it never overwrites in-progress typing on refetch
- `JoinGroupPage` loads a token preview and requires an explicit confirm click before joining (D-02), surfacing the three PT-BR messages from `join-error-messages.ts` for invalid token, already-member, and closed-group outcomes (GRP-07, GRP-08), and correctly routes a brand-new member to `/dashboard` rather than the admin-only `/manage` route
- `docs/sdd.md` §5.1 (folder layout), §5.2 (nested route table + the `adminGuard`-does-not-exist explanation), §5.3 (core services table), and §2.1 (no new Spartan primitive this phase, `dialog` deliberately avoided) all now match the code on disk, closing D-07
- `REQUIREMENTS.md` V2-02 expanded with the D-17 gap (the `wish_list`-only restriction lives in application code, not a DB trigger); GRP-04..08 and WISH-01..03 checkboxes and the 16-row Phase 3 traceability table entries flipped from Pendente to Completo

## Task Commits

Each task was committed atomically:

1. **Task 1: ParticipantRow + ManageGroupPage (list, removal, wishlist)** - `787605e` (feat)
2. **Task 2: JoinGroupPage (preview + confirm)** - `7fc02de` (feat)
3. **Task 3: docs/sdd.md + REQUIREMENTS.md reconciliation** - `8b54f9b` (docs)

Task 4 (checkpoint) is pending human browser/SQL verification — see "Checkpoint Status" below. No plan-metadata commit yet; it will be created after the checkpoint is approved.

## Files Created/Modified

- `src/app/features/group/manage/participant-row.ts` - Standalone row component: `input.required<Participant>()`, `input(false)` x2, `output<string>()` x2 + `output<void>()`
- `src/app/features/group/manage/participant-row.html` - Name + remove button, two-step inline confirm (`Sim`/`Não`), `[attr.aria-label]`
- `src/app/features/group/manage/manage-group.page.ts` - Replaces the 03-04 skeleton body: admin link, participants signal, removal handlers, `model<string>('')` wishlist seeded via `effect()`, `salvarWishList()`/`copiarLink()`
- `src/app/features/group/manage/manage-group.page.html` - Three cards: group header + invite link (admin-only), participant list (`@for`+`track`+`@empty`), own-wishlist textarea (shown only if `meuParticipante()`)
- `src/app/features/group/join/join-group.page.ts` - Replaces the 03-04 skeleton body: `carregarPreview()`, `confirmar()`, navigates to `/dashboard` on success
- `src/app/features/group/join/join-group.page.html` - Four-state card: loading / preview+confirm / error / always-visible "ir para o painel" link
- `docs/sdd.md` - §5.1/§5.2/§5.3/§2.1 rewritten to match the real route tree, resolver-based admin check, folder layout, and the dialog-avoidance decision
- `.planning/REQUIREMENTS.md` - V2-02 expanded; 16 Phase 3 requirement checkboxes and traceability rows marked complete

## Decisions Made

- **No Spartan `dialog` primitive for removal confirmation.** Generating it would pull `@ng-icons/core` + `@ng-icons/lucide` as peers, absent from `docs/sdd.md` §2 — the same reasoning Phase 2 used to skip `field`. Implemented as an inline two-step confirmation driven by a `removendoId` signal in the parent and `confirmando`/`podeRemover` inputs on the child instead.
- **`JoinGroupPage` never auto-joins.** Confirming is an explicit, separate click from loading the preview, so an accidental page refresh on `/join/:token` can never trigger an unintended join.
- **Post-join redirect is `/dashboard`, not `/group/:id/manage`.** A user who just joined via invite is never the group's admin, and `groupResolver` would immediately bounce them back to `/dashboard` — redirecting there directly avoids a pointless round-trip.

## Deviations from Plan

None - plan executed as written for Tasks 1-3. No Rule 1/2/3 auto-fixes were needed; all contracts (`GroupService`, `group.model.ts`, `join-error-messages.ts`) matched the plan's `<interfaces>` block exactly, and the 03-04 skeletons' `input.required<string>()` signatures were preserved unchanged.

## Issues Encountered

- `npm run check:no-secrets` fails against `dist/`, but the match is a false positive already documented in `.planning/phases/02-autentica-o-end-to-end/deferred-items.md`: `@supabase/auth-js`'s own vendored code contains the literal string `"sb_secret_"` as part of its key-prefix-detection helper (`e.startsWith("sb_secret_")`), not an actual leaked credential. Confirmed via direct `grep` that `src/` has zero matches and `environment.ts` only contains the publishable key. Pre-existing since Phase 01 (`3f6b68f`), untouched by this plan's file scope — not re-documented here, just re-confirmed still present and still a false positive.
- All other automated gates (`ng build`, `eslint --max-warnings=0`, `check:no-rxjs-state`, `ng test --watch=false`) pass clean (25/25 specs).

## User Setup Required

None - no external service configuration required.

## Checkpoint Status

**Task 4 is a blocking `checkpoint:human-verify` and has NOT been executed by this agent.** Per the plan's `autonomous: false` declaration and the execution harness's checkpoint protocol, this agent stops here and returns the structured checkpoint below for the orchestrator/user. The automated gates required before presenting the browser checklist have already been run and reported in "Issues Encountered" above.

## Next Phase Readiness

- Code-wise, Phase 3's entire Supabase-facing UI trail (dashboard, create, manage, join) is now implemented and passes every automated gate.
- Functional verification with two real browser sessions + a Supabase SQL Editor step (GRP-08) is outstanding — see the checkpoint returned to the orchestrator. Phase 3 should not be marked fully complete in STATE.md/ROADMAP.md until that checkpoint is approved.
- Phase 4 (Sorteio / Edge Function) can begin planning in parallel, since nothing in its scope depends on this checkpoint's outcome, but should not merge ahead of Phase 3's final approval per the project's gitflow rules.

---
*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Completed: 2026-10-15 (Tasks 1-3; Task 4 checkpoint pending)*

## Self-Check: PASSED

All 8 files-created/modified claims verified present on disk. All 3 task commit hashes
(`787605e`, `7fc02de`, `8b54f9b`) verified present in `git log`.
