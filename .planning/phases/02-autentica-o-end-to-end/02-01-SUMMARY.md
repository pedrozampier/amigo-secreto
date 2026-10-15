---
phase: 02-autentica-o-end-to-end
plan: 01
subsystem: auth
tags: [supabase, signals, inject, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-fundacao-scaffold-banco-rls
    provides: Supabase project with profile/group/participant/draw schema, RLS policies, handle_new_user trigger, Angular 21 scaffold with environment.ts
provides:
  - "SupabaseClientService: injectable Supabase client wrapper (providedIn root), mockable in Vitest"
  - "AuthService: single written session signal with status/user/isAuthenticated/displayName/email all derived via computed()"
  - "AuthService.initialize(): awaitable getSession() resolution for F5 session restore, to be wired into provideAppInitializer"
  - "AuthService.signUp/signIn/signOut: PT-BR translated error results"
  - "auth-error-messages.ts: PT-BR translation map for known Supabase Auth error strings with generic fallback"
affects: [02-02, 02-03, 02-04, authGuard, login/register pages, authenticated layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single written signal + computed() derivations for all reactive state (no parallel signals)"
    - "Supabase client wrapped in an injectable service, never a global export, for inject() + Vitest mockability"
    - "onAuthStateChange subscribed exactly once, inside the owning service constructor"
    - "Auth API error messages translated through a pure function with exact-match then startsWith fallback"

key-files:
  created:
    - src/app/core/services/supabase-client.service.ts
    - src/app/core/auth-error-messages.ts
    - src/app/core/services/auth.service.ts
    - src/app/core/services/auth.service.spec.ts
  modified: []

key-decisions:
  - "D-04 enforced: AuthService has exactly one signal<Session|null> write surface; status/user/isAuthenticated/displayName/email are 5 computed() derivations"
  - "D-05 enforced: Supabase client lives behind SupabaseClientService.client, never an exported const, so it can be swapped with a TestBed provider in specs"
  - "D-13 covered by an explicit test (Test 4) asserting signUp() calls client.auth.signUp with options.data.display_name exactly, protecting the handle_new_user trigger contract"
  - "D-17 implemented as a standalone pure function (translateAuthError) in core/, not a service or pipe, since no DI or template binding is needed yet"

patterns-established:
  - "AuthService public API surface for this phase: session, status, user, isAuthenticated, displayName, email, initialize(), signUp(), signIn(), signOut()"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-06]

# Metrics
duration: 25min
completed: 2026-10-15
---

# Phase 2 Plan 1: Auth Core (SupabaseClientService + AuthService) Summary

**AuthService with one written session signal and 5 computed() derivations, backed by an injectable SupabaseClientService and a PT-BR Supabase Auth error translator, verified by 6 Vitest specs against a mocked client.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-15T03:00:00Z (approx, continuation of phase 02 execution session)
- **Completed:** 2026-10-15T03:24:51Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- `SupabaseClientService` wraps `createClient` behind `inject()`, using `environment.supabasePublishableKey` (not the nonexistent `supabaseAnonKey` from the research docs), eliminating any global `export const supabase`
- `AuthService` exposes a reactive session state built from exactly one written signal (`_session`), with `status`, `user`, `isAuthenticated`, `displayName`, and `email` all derived via `computed()` — satisfying RA3-ID9's single-source-of-truth requirement
- `initialize()` is an awaitable method calling `getSession()`, ready to be invoked from `provideAppInitializer` in plan 02-02/02-03 to eliminate the F5 login-flash (D-01)
- `onAuthStateChange` is subscribed exactly once, in the `AuthService` constructor, keeping the signal in sync with login/logout/token refresh (D-02)
- `signUp()` sends `options.data.display_name`, the exact key the `handle_new_user` trigger reads via `raw_user_meta_data ->> 'display_name'` — protected by a dedicated test (D-13)
- `auth-error-messages.ts` translates known Supabase Auth error strings to PT-BR with a generic fallback, consumed by `signIn`/`signUp`/`signOut`
- Full TDD cycle (RED → GREEN) for `AuthService`: 6 tests covering loading/unauthenticated/authenticated status transitions, `displayName` derivation, `signUp` payload shape, PT-BR error translation, and single subscription registration

## Task Commits

Each task was committed atomically:

1. **Task 1: SupabaseClientService injetável e mapa PT-BR de erros do Auth** - `812794a` (feat)
2. **Task 2 RED: failing AuthService spec** - `40001af` (test)
2. **Task 2 GREEN: AuthService implementation** - `708be5b` (feat)

_No REFACTOR commit — implementation matched the plan's prescribed code exactly; nothing to clean up._

## Files Created/Modified
- `src/app/core/services/supabase-client.service.ts` - Injectable Supabase client (`providedIn: 'root'`), exposes `.client`
- `src/app/core/auth-error-messages.ts` - `translateAuthError()` + `GENERIC_AUTH_ERROR`, PT-BR map of known Supabase Auth error strings
- `src/app/core/services/auth.service.ts` - Session signal, 5 computed derivations, `initialize()`, `signUp()`, `signIn()`, `signOut()`
- `src/app/core/services/auth.service.spec.ts` - 6 Vitest specs against a mocked `SupabaseClientService`

## Decisions Made
No new decisions — this plan executed the decisions already recorded in `02-CONTEXT.md` (D-01 through D-07, D-13, D-17) exactly as specified. The one implementation note worth recording: Angular 21's new `@angular/build:unit-test` Vitest runner does not accept a `--run` CLI flag (unlike plain `vitest`); the equivalent is `ng test --watch=false --include=<glob>`. The plan's own verify command (`npm test -- --run <path>`) would fail on this exact repo — documented here as a deviation since the next plan's verify steps should use `--watch=false --include=` instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected test invocation flag for Angular 21's Vitest builder**
- **Found during:** Task 2 (running the plan's prescribed `npm test -- --run src/app/core/services/auth.service.spec.ts` verify command)
- **Issue:** `ng test` (via `@angular/build:unit-test`) rejects the `--run` argument with `Error: Unknown argument: run` — this plan and the overall `<verification>` block's step 5 assume a raw Vitest CLI passthrough that doesn't apply to this Angular 21 builder
- **Fix:** Used `npx ng test --watch=false --include=src/app/core/services/auth.service.spec.ts` to run the single spec non-interactively; confirmed RED (compile error, service didn't exist) then GREEN (6/6 passed) this way. Full suite (`npx ng test --watch=false`, no `--include`) was also run and passed (8/8 across the repo).
- **Files modified:** None (test-runner invocation only, no source change)
- **Verification:** Both the targeted spec and the full suite pass with the corrected invocation
- **Committed in:** N/A (verification step only, not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking — tooling invocation only)
**Impact on plan:** No scope creep; no source files affected. Future plans/phases in this project should use `ng test --watch=false --include=<glob>` rather than `npm test -- --run <glob>` when targeting a specific spec file.

## Issues Encountered
None beyond the test-runner flag noted above.

## User Setup Required

None - no external service configuration required. `SUPABASE_URL`/`supabasePublishableKey` were already configured in Phase 1.

## Next Phase Readiness

- `AuthService` and `SupabaseClientService` are ready to be consumed by: `app.config.ts` (`provideAppInitializer` calling `AuthService.initialize()`, D-01), the functional `authGuard` (D-09, D-21), the `/login` and `/register` Reactive Forms (D-11 through D-18), and the authenticated layout's logout button (D-19).
- No blockers. The two other in-flight plans in this phase (02-02: Spartan input/label primitives, 02-03: auth page stubs/guard/routes) were observed running concurrently via their own commits on this branch; this plan's files (`core/services/*`, `core/auth-error-messages.ts`) do not overlap with theirs.
- Note for the next plan: confirm the `authGuard`'s synchronous `if` check against `authService.isAuthenticated()`/`status()` relies on `initialize()` having already resolved via `provideAppInitializer` before the first navigation — that wiring is NOT part of this plan and still needs to be added to `app.config.ts`.

---
*Phase: 02-autentica-o-end-to-end*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 4 created files found on disk; all 3 task commit hashes (`812794a`, `40001af`, `708be5b`) found in git history.
