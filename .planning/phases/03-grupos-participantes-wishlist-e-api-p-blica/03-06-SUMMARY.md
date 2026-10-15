---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 06
subsystem: routing-guards-ui
tags: [angular-router, canactivatefn, signals, wishlist, rls]
requires:
  - GroupService.loadGroup/refreshParticipants/updateWishList/meuParticipante
  - admin.guard.ts (pattern imitated, not modified)
  - group.model.ts (Group, Participant)
provides:
  - src/app/core/guards/member.guard.ts (memberGuard CanActivateFn)
  - src/app/features/group/view/group-view.page.ts (GroupViewPage)
  - /group/:id route (participant screen)
affects:
  - src/app/features/group/group.routes.ts
  - src/app/features/dashboard/dashboard.page.html
  - docs/sdd.md
tech-stack:
  added: []
  patterns:
    - "RouterTestingHarness for guard specs that must prove real navigation, not just guard return value"
key-files:
  created:
    - src/app/core/guards/member.guard.ts
    - src/app/core/guards/member.guard.spec.ts
    - src/app/features/group/view/group-view.page.ts
    - src/app/features/group/view/group-view.page.html
  modified:
    - src/app/features/group/group.routes.ts
    - src/app/features/dashboard/dashboard.page.html
    - docs/sdd.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/03-grupos-participantes-wishlist-e-api-p-blica/deferred-items.md
decisions:
  - "memberGuard admits admin OR participant by checking group !== null (RLS already ORs both SELECT policies on group) — no extra query against participant, no admin_id comparison in executable code"
  - "GroupViewPage is a separate component from ManageGroupPage — two roles, two components, no @if (souAdmin()) scattered deciding what each sees"
  - "Admin-who-is-also-participant is admitted into /group/:id (no redirect to /manage) because that is where he edits his own wishlist; the screen shows him a link to /manage"
  - "/group/:id skips groupResolver: memberGuard already called loadGroup in the same navigation, populating GroupService.currentGroup — one query per navigation"
metrics:
  duration: 20min
  completed: 2026-10-15
---

# Phase 03 Plan 06: Participant group view (/group/:id) with wishlist, closing WISH-01/02 Summary

Added a `memberGuard` + `GroupViewPage` pair that gives non-admin participants their first
reachable route into a group — `/group/:id` — closing the only remaining gap from Phase 3's
manual verification: no non-admin participant had any screen to read or edit their own
wishlist.

## What Was Built

**`memberGuard`** (`src/app/core/guards/member.guard.ts`): a `CanActivateFn` that admits
any member — admin or participant — of a group and blocks strangers. It relies on the fact
that `group`'s two SELECT RLS policies (admin OR participant) are ORed by Postgres: if
`loadGroup(id)` returns a non-null row, the caller is necessarily a member of one kind or
the other, so the guard never needs a second query against `participant` and never compares
`admin_id`. The guard deliberately does not inject `AuthService` — the RLS result alone
decides.

**`member.guard.spec.ts`**: 6 tests, split into two blocks. Block A (4 tests) mirrors
`admin.guard.spec.ts`'s return-value assertions (admin → true, non-admin member → true,
`group: null` → UrlTree to `/dashboard`, missing `:id` → UrlTree to `/dashboard`). Block B
(2 tests) is new to this project: it uses `RouterTestingHarness` to actually navigate and
prove the Router *acted* on the guard's decision — not just that the guard returned a
`UrlTree`. This directly addresses a lesson from this phase's manual verification, where a
resolver's `UrlTree` was asserted-but-never-enforced and a non-admin reached a protected
screen in production.

**`GroupViewPage`** (`src/app/features/group/view/group-view.page.ts` +
`.page.html`): the participant's own screen at `/group/:id`. Shows group name, status
(`@switch`), the roster (`@for` + `track p.id`, reusing `ParticipantRow` with
`[podeRemover]="false"` so no removal controls render), and — only when
`meuParticipante()` resolves — a wishlist card with `model<string>()` +
`[(ngModel)]` and a save button wired to `GroupService.updateWishList`. The admin of the
group additionally sees a "Gerenciar grupo" link to `/group/:id/manage`; this is the only
`@if (souAdmin())` in the template, and it is a navigation affordance, not a hidden admin
control. The component follows the `effect()`-for-`input.required()` pattern established
in `manage-group.page.ts` and `join-group.page.ts` (reading the input in the constructor
would throw, since `input.required()` isn't populated yet).

**Routing**: `group.routes.ts` gained a `:id` child route (after `:id/manage`, not before —
order documents intent even though segment-count already disambiguates them),
`canActivate: [memberGuard]`, no `resolve` (the guard's own `loadGroup` call already
populated `GroupService.currentGroup`).

**Dashboard**: the "Grupos que participo" section's card is now wrapped in
`<a [routerLink]="['/group', grupo.id]">`, giving it a destination for the first time. The
"Grupos que administro" section is untouched — it still points to `/group/:id/manage`.

**`docs/sdd.md`** §5.1/§5.2: folder tree lists `member.guard.ts` and
`features/group/view/`; the route table has `/group/:id` ahead of `/group/:id/manage`; a
new paragraph documents the two-role split, the rejected alternative (loosening
`adminGuard` and hiding controls with `@if`), and why `memberGuard` skips both the
`participant` table and `groupResolver`.

## Gap Closure Context

This is a **gap closure plan**. The second gap identified in
`03-VERIFICATION.md` — the SDD paragraph incorrectly claiming `adminGuard` didn't exist —
had already been fixed in commits `b324e3a` / `8dcf70f`, outside this plan's scope. This
plan closes the first and only remaining gap: **WISH-01** and **WISH-02** had zero UI path
for a non-admin participant.

## Key Decision: Admin Who Is Also a Participant

`memberGuard` admits this user into `/group/:id` with no redirect to `/manage` — redirecting
would make `/group/:id` unreachable precisely for the group he administers, and it's the
screen where he edits his own wishlist. The component shows him, and only him, a link to
`/group/:id/manage`. Documented in both the component's JSDoc and `docs/sdd.md` §5.2.

## Bundle Budget

No change: `ng build` still reports **526.55 kB** initial (26.55 kB over the 500 kB budget),
same value as before this plan — the new lazy-loaded `group-view-page` chunk (4.49 kB) did
not affect the initial bundle, which is what the budget measures.

## Precedent for Phase 4

`member.guard.spec.ts` is the first spec in this project to test **real navigation**
(`RouterTestingHarness.create()` + `harness.navigateByUrl(url)`, asserting on the activated
component instance and `router.url`) instead of only a guard/resolver's return value. This
pattern should be reused for the `drawResultResolver` planned in Phase 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's literal Block-B assertion (`toBeNull()` with no `dashboard`
route registered) throws `NG04002: Cannot match any routes` instead of resolving to `null`**
- **Found during:** Task 1, writing `member.guard.spec.ts`
- **Issue:** The plan's `<behavior>` section specified navigating to `/group/g1` in a test
  route tree containing only `group/:id` and `dashboard`, expecting
  `harness.navigateByUrl('/group/g1')` to resolve to `null` for the blocked case. In
  practice, Angular's Router needs the redirect target (`/dashboard`) to be a registered
  route to complete the navigation at all; without it the navigation rejects with
  `NG04002`. Registering `dashboard` (as the plan's own route tree listed) makes the
  Router complete the navigation into `DummyDashboardComponent`, so the harness's return
  value for the blocked case is that component instance, not `null`.
- **Fix:** Kept the `dashboard` route registered (both components needed it to resolve at
  all) and asserted the *stronger* and still-faithful property: the activated component is
  `DummyDashboardComponent`, explicitly `not` an instance of `DummyGroupViewComponent`, and
  `router.url` ends in `/dashboard`. This still proves the Router acted on the redirect
  (the lesson this plan exists to encode) — it does not weaken the test, it corrects an
  assertion that was inconsistent with the harness's documented contract.
- **Files modified:** `src/app/core/guards/member.guard.spec.ts`
- **Commit:** d3c3fcc

### Worktree Environment Setup (not a plan deviation, required to execute)

This worktree's branch (`worktree-agent-a6ec2d61a69c461dc`) was based on the pre-Phase-3
commit history and had none of the Phase 3 planning artifacts or code. Before Task 1 could
start: merged `gsd/phase-03-grupos-participantes-wishlist-e-api-p-blica` into the worktree
branch (clean merge, commit `7f884eb`), ran `npm install --legacy-peer-deps` (no
`node_modules` existed in the worktree), and copied the gitignored
`src/environments/environment.ts` / `environment.prod.ts` from the main checkout (required
for `ng build`/`ng test` to resolve, contains no plan-relevant changes).

## Known Stubs

None. `GroupViewPage` wires every signal and button to real `GroupService` methods; no
hardcoded empty values or placeholder text.

## Self-Check: PASSED

- FOUND: src/app/core/guards/member.guard.ts
- FOUND: src/app/core/guards/member.guard.spec.ts
- FOUND: src/app/features/group/view/group-view.page.ts
- FOUND: src/app/features/group/view/group-view.page.html
- FOUND: commit d3c3fcc (test(03-06): add memberGuard with real-navigation spec)
- FOUND: commit 1cc95eb (feat(03-06): add GroupViewPage for participant route /group/:id)
- FOUND: commit e3cce4e (docs(03-06): dashboard links to /group/:id, sdd.md reflects new route)
