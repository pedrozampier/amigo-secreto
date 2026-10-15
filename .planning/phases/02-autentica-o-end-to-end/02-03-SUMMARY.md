---
phase: 02-autentica-o-end-to-end
plan: 03
subsystem: routing
tags: [angular-router, guards, signals, effect, spartan-ui, vitest]

# Dependency graph
requires:
  - phase: 02-autentica-o-end-to-end
    plan: 01
    provides: "AuthService with session/status/isAuthenticated/displayName/email signals, initialize()"
  - phase: 02-autentica-o-end-to-end
    plan: 02
    provides: "HlmInput/HlmLabel Spartan primitives (not yet consumed — reserved for plan 02-04 forms)"
provides:
  - "authGuard: synchronous functional CanActivateFn returning true or a UrlTree to /login?returnUrl=..."
  - "provideAppInitializer wired to AuthService.initialize() in app.config.ts, eliminating the F5 login flash"
  - "Full nested route tree: public /login, /register, guarded parent layout route with /dashboard as a child"
  - "AuthenticatedLayoutPage: header with displayName + Sair button + its own router-outlet, reactive effect() logout-on-session-loss"
  - "DashboardPage placeholder reading AuthService.displayName()/email() directly"
  - "LoginPage/RegisterPage stub components making every loadComponent in the tree resolvable by tsc, to be replaced wholesale by plan 02-04"
affects: [02-04-login-register-forms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard applied exactly once on the parent layout route; all child routes inherit protection without re-declaring canActivate"
    - "provideAppInitializer returning the AuthService.initialize() promise directly (not void, not .then()) so Angular awaits it before first navigation"
    - "effect() inside a component constructor as a session-loss watchdog, complementing (not replacing) the navigation-time guard"
    - "Page components expose service computed() signals directly as protected readonly fields — no local signal copies of derived auth state"

key-files:
  created:
    - src/app/core/guards/auth.guard.ts
    - src/app/core/guards/auth.guard.spec.ts
    - src/app/features/auth/login/login.page.ts
    - src/app/features/auth/register/register.page.ts
    - src/app/features/shell/authenticated-layout.page.ts
    - src/app/features/shell/authenticated-layout.page.html
    - src/app/features/dashboard/dashboard.page.ts
    - src/app/features/dashboard/dashboard.page.html
  modified:
    - src/app/app.config.ts
    - src/app/app.routes.ts
    - src/app/app.html
    - src/app/app.ts
    - src/app/app.spec.ts

key-decisions:
  - "D-01/D-08/D-09/D-21 enforced exactly as specified: provideAppInitializer before first navigation, withComponentInputBinding, createUrlTree (not navigate()+false), returnUrl preserved"
  - "D-19 enforced: authGuard appears exactly once in app.routes.ts, on the parent layout route; logout lives only in the layout header, never duplicated in DashboardPage"
  - "D-22 enforced: dashboard is a minimal placeholder reading computed signals directly, no group lists anticipated ahead of Phase 3"
  - "Login/register page stubs are a structural requirement (not optional): tsc resolves loadComponent statically, so the route tree cannot type-check without them — verified empirically (TS2307 without, 0 errors with)"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 20min
completed: 2026-10-15
---

# Phase 2 Plan 3: Authenticated Navigation Skeleton Summary

**Functional authGuard with returnUrl preservation, provideAppInitializer eliminating the F5 login flash, a nested route tree with a single guarded parent layout, and an authenticated header with reactive logout — verified by 11 passing Vitest specs across 3 files.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-15
- **Tasks:** 3 completed
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments

- `authGuard` is a synchronous `CanActivateFn` that returns `true` when `AuthService.isAuthenticated()` is true, or a `UrlTree` to `/login` with `returnUrl` preserved as a query param otherwise — covered by 3 Vitest specs against a mocked `AuthService` and a real `Router` from `TestBed`
- `app.config.ts` now has `provideRouter(routes, withComponentInputBinding())` (RA5-ID15) and `provideAppInitializer(() => inject(AuthService).initialize())` (D-01), so the app never navigates before the session is resolved — eliminating the F5 `/login` flash and keeping the guard trivially synchronous
- `app.routes.ts` has a full nested tree: public `/login` and `/register`, an empty-path parent layout route carrying `canActivate: [authGuard]` exactly once with `/dashboard` as its only child, and a wildcard redirect to `/dashboard` (RA5-ID17)
- `app.html` is reduced to a single `<router-outlet />`; `app.ts` and `app.spec.ts` no longer reference the discarded demo landing (`titulo` signal, Spartan card/button imports, `<h1>` assertion)
- `AuthenticatedLayoutPage` renders a header (app name + displayName + Sair button) with its own `<router-outlet>`, and a constructor `effect()` (RA3-ID12) that navigates to `/login` if the session drops while the layout stays mounted — a safety net beyond the navigation-time guard
- `DashboardPage` is a minimal placeholder reading `displayName()`/`email()` directly from `AuthService`'s `computed()` signals (RA3-ID9), with no local state copy
- `LoginPage`/`RegisterPage` stub components exist so every `loadComponent` in the tree resolves statically under `tsc` — required structurally, not optional; verified empirically that `tsc` exits 2 without them and 0 with them

## Task Commits

Each task was committed atomically:

1. **Task 1: authGuard funcional síncrono com returnUrl, e app.config.ts com provideAppInitializer** - `8488bb9` (feat)
2. **Task 2: Árvore de rotas com layout autenticado aninhado e redução do app.html a shell** - `eea0b4d` (feat)
3. **Task 3: Layout autenticado com header e logout, e dashboard placeholder lendo o signal** - `c6bb80c` (feat)

## Files Created/Modified

- `src/app/core/guards/auth.guard.ts` - synchronous `CanActivateFn`, `createUrlTree` to `/login` with `returnUrl`
- `src/app/core/guards/auth.guard.spec.ts` - 3 Vitest specs (true path, UrlTree path, returnUrl preservation)
- `src/app/app.config.ts` - added `withComponentInputBinding()` and `provideAppInitializer(...)`, kept `provideBrowserGlobalErrorListeners()`
- `src/app/app.routes.ts` - public `/login`/`/register`, guarded parent layout route with `/dashboard` child, empty-path and wildcard redirects
- `src/app/features/auth/login/login.page.ts` - `LoginPage` stub (replaced wholesale in plan 02-04)
- `src/app/features/auth/register/register.page.ts` - `RegisterPage` stub (replaced wholesale in plan 02-04)
- `src/app/app.html` - reduced to `<router-outlet />`
- `src/app/app.ts` - dropped unused Spartan imports and the `titulo` signal
- `src/app/app.spec.ts` - replaced the `<h1>`-based test with a shell-shape assertion, added `provideRouter([])` to `TestBed`
- `src/app/features/shell/authenticated-layout.page.ts` - header + logout + `effect()` session watchdog
- `src/app/features/shell/authenticated-layout.page.html` - header markup, `@if` for `displayName()`, `Sair`/`Saindo...` button
- `src/app/features/dashboard/dashboard.page.ts` - placeholder reading `AuthService.displayName()`/`email()`
- `src/app/features/dashboard/dashboard.page.html` - greeting card, no duplicated logout button

## Decisions Made

No new decisions — this plan executed D-01, D-08, D-09, D-19, D-20, D-21, D-22 exactly as recorded in `02-CONTEXT.md`. One sequencing note worth recording for future plan authors: this plan's own Task 2 `<verify>` block runs `npx tsc -p tsconfig.app.json --noEmit` and expects exit 0, but Task 2 only creates the `login`/`register` stubs — the route tree also references `features/shell/authenticated-layout.page` and `features/dashboard/dashboard.page`, which are Task 3's output. Running Task 2's verify command in isolation (before Task 3 exists) fails with `TS2307` on those two files. This is an artifact of task ordering within a single plan, not a defect in the shipped code: all three tasks were executed in sequence within this run, and the full `tsc`/`lint`/test verification was run once Task 3's files existed, exactly as the plan's own closing `<verification>` block (applicable after all tasks) prescribes. No source code was affected; documented here so a future split of this plan across multiple agents knows Task 2 is not independently green until Task 3 lands.

## Deviations from Plan

None — plan executed exactly as written. All prescribed file contents (guard, app.config.ts, app.routes.ts, stubs, app.html/app.ts/app.spec.ts, authenticated layout, dashboard) were created verbatim as specified in the plan's `<action>` blocks.

## Issues Encountered

- Confirmed the carry-over tooling note from plan 02-01: `ng test`'s Vitest builder rejects `--run`; used `npx ng test --watch=false --include=<glob>` for the targeted guard spec and `npx ng test --watch=false` for the full suite (11/11 passed across 3 files: `auth.service.spec.ts`, `auth.guard.spec.ts`, `app.spec.ts`).
- The Task 2 vs. Task 3 `tsc` sequencing noted above under "Decisions Made" — no code impact, process note only.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02-04 can now write the real `LoginPage`/`RegisterPage` Reactive Forms directly over the existing stub files (same path, same exported class name, same selector) — no route tree changes needed.
- `HlmInput`/`HlmLabel` from plan 02-02 are not yet consumed; they are reserved for 02-04's form fields.
- `npm run build` was deliberately not run as a gate for this plan — `scripts/generate-env.js`'s `prebuild` requires `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` env vars not guaranteed in this local environment. It is a gate for plan 02-04, where the real components replace the stubs.
- No blockers for 02-04.

---
*Phase: 02-autentica-o-end-to-end*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 8 created files found on disk; all 3 task commit hashes (`8488bb9`, `eea0b4d`, `c6bb80c`) found in git history.
