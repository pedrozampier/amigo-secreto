---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 02
subsystem: api
tags: [httpclient, interceptor, toSignal, rxjs-interop, defer, brasilapi, date-fns, vitest]

# Dependency graph
requires:
  - phase: 02-autentica-o-end-to-end
    provides: app.config.ts baseline with provideAppInitializer/provideRouter, AuthService pattern (inject() + computed signals), dashboard.page.ts/html shell
provides:
  - "provideHttpClient(withInterceptors([errorInterceptor])) registered in app.config.ts — first and only HttpClient wiring in the project"
  - "errorInterceptor: functional HttpInterceptorFn normalizing HTTP failures into HttpFalha and re-throwing (RA6-ID22)"
  - "diasAteNatal() pure function (date-fns differenceInCalendarDays) with 5-case spec, isolated from network for testability"
  - "HolidayService: GET to BrasilAPI feriados endpoint bridged to Signals via toSignal(), three-state model (undefined/null/value)"
  - "ChristmasCountdownCard rendered inside @defer (on viewport) with @placeholder on the dashboard"
affects: [03-04-dashboard-rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Functional HttpInterceptorFn normalizes errors into a project-defined shape (HttpFalha) and re-throws rather than swallowing, so callers decide UI state"
    - "toSignal() with explicit initialValue: undefined to distinguish loading from error (null) from success (value) without a separate loading signal"
    - "Pure calculation functions (diasAteNatal) kept outside services specifically so business logic has network-free specs"
    - "@defer (on viewport) + @placeholder defers both the component bundle and its triggering HTTP call together"

key-files:
  created:
    - src/app/core/dias-ate-natal.ts
    - src/app/core/dias-ate-natal.spec.ts
    - src/app/core/interceptors/error.interceptor.ts
    - src/app/core/services/holiday.service.ts
    - src/app/features/dashboard/christmas-countdown.card.ts
    - src/app/features/dashboard/christmas-countdown.card.html
  modified:
    - src/app/app.config.ts
    - src/app/features/dashboard/dashboard.page.ts
    - src/app/features/dashboard/dashboard.page.html

key-decisions:
  - "HolidayService exposes diasAteONatal and natal as raw signals (no () call) on the class fields of ChristmasCountdownCard, avoiding the frozen-value bug of calling a signal once at field-initialization time"
  - "Year for the countdown comes from the API response's own date field, not from a local new Date(), so the public GET stays load-bearing rather than decorative (D-14)"
  - "Reworded a code comment in holiday.service.ts to avoid literally containing the string 'httpResource' while still documenting why that Angular 21 API was not used, satisfying both the acceptance-criteria grep and the documentation intent"

requirements-completed: [API-01, API-02, API-03, API-04]

# Metrics
duration: 3min
completed: 2026-10-15
---

# Phase 03 Plan 02: BrasilAPI Christmas Countdown Summary

**Dashboard Christmas countdown card driven by a real BrasilAPI GET, bridged through a functional error interceptor and `toSignal()`, loaded inside `@defer (on viewport)`.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-15T12:24:23Z
- **Completed:** 2026-10-15T12:27:18Z
- **Tasks:** 2
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments
- First and only `HttpClient` wiring in the project (`provideHttpClient(withInterceptors([errorInterceptor]))`), scoped deliberately to BrasilAPI traffic since `supabase-js` uses its own `fetch` and never passes through interceptors
- First functional interceptor in the codebase: `errorInterceptor` normalizes HTTP failures into `HttpFalha` and re-throws so the service decides the UI state
- `diasAteNatal()` pure function with 5 spec cases (including day-of Natal, time-of-day boundary, Natal already passed, and a cross-year computation), fully network-free
- `HolidayService` GETs `https://brasilapi.com.br/api/feriados/v1/{ano}` and bridges the Observable to a Signal via `toSignal()`, with a three-state model (`undefined`/`null`/value) that lets a failed request degrade to a discrete PT-BR error message without breaking the rest of the dashboard
- `ChristmasCountdownCard` rendered inside `@defer (on viewport)` with an animated `@placeholder`, so the component bundle and its triggering HTTP call are both deferred until scroll

## Task Commits

Each task was committed atomically:

1. **Task 1: provideHttpClient + errorInterceptor + diasAteNatal with spec** - `0685ba8` (feat)
2. **Task 2: HolidayService with toSignal() and Christmas countdown card** - `a875340` (feat)

**Plan metadata:** (final commit, see below)

## Files Created/Modified
- `src/app/core/dias-ate-natal.ts` - Pure day-count function using `differenceInCalendarDays`
- `src/app/core/dias-ate-natal.spec.ts` - 5 vitest cases covering the behavior spec
- `src/app/core/interceptors/error.interceptor.ts` - First real file in `interceptors/`; functional `errorInterceptor` normalizing/re-throwing HTTP errors
- `src/app/core/services/holiday.service.ts` - `HolidayService` with `toSignal()`-bridged GET to BrasilAPI and derived `natal`/`diasAteONatal` computeds
- `src/app/features/dashboard/christmas-countdown.card.ts` - Standalone card component consuming `HolidayService` signals directly
- `src/app/features/dashboard/christmas-countdown.card.html` - Three-state template (`@if`/`@else if`) with `DatePipe` formatting the holiday date
- `src/app/app.config.ts` - Added `provideHttpClient(withInterceptors([errorInterceptor]))`, preserving existing `provideRouter`/`provideAppInitializer` order
- `src/app/features/dashboard/dashboard.page.ts` - Added `ChristmasCountdownCard` to the `imports` array
- `src/app/features/dashboard/dashboard.page.html` - Appended `@defer (on viewport)` block with `@placeholder`, without touching the existing placeholder card markup

## Decisions Made
- Exposed `dias`/`natal` as the service's own signal references on the card (no trailing `()`), per the plan's explicit correction, to keep them reactive instead of freezing a one-time read
- Kept the countdown year sourced from the API response rather than `new Date()`, so an unreachable API produces a genuine error state instead of a silently-computed local fallback
- Reworded one doc comment in `holiday.service.ts` to avoid the literal substring `httpResource` (it previously appeared only in prose explaining why that Angular 21 API wasn't used), so the acceptance-criteria grep check (`NÃO contém httpResource`) passes exactly as specified while preserving the explanation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Doc comment unintentionally matched a negative acceptance-criteria grep**
- **Found during:** Task 2 verification
- **Issue:** The plan's own example code for `holiday.service.ts` included a comment mentioning `httpResource()` by name to explain why it wasn't used — but the plan's acceptance criteria required the file to NOT contain that literal string
- **Fix:** Reworded the comment to describe the Angular 21 resource API without using the literal identifier, preserving the documentation intent
- **Files modified:** src/app/core/services/holiday.service.ts
- **Verification:** `grep -n "httpResource" src/app/core/services/holiday.service.ts` now exits 1 (no match); eslint, build, and `check:no-rxjs-state` all still pass
- **Committed in:** a875340 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Cosmetic fix to satisfy a literal grep check from the plan itself; no behavior or architecture change.

## Issues Encountered
None beyond the deviation above.

## User Setup Required

None - no external service configuration required. The BrasilAPI endpoint is public and requires no auth or API key.

## Next Phase Readiness
- `errorInterceptor` and the `HttpClient` provider are now available for any future `HttpClient` traffic, though per the architecture notes Supabase traffic will never pass through them
- Plan 03-04 (dashboard rewrite) must keep the `@defer` block and `<app-christmas-countdown />` intact when it reworks the rest of `dashboard.page.html`/`.ts`
- No blockers for subsequent Phase 03 plans — this plan touched no Supabase-track files besides the new block in `dashboard.page.html`

---
*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 9 created/modified files verified present on disk; both task commits (`0685ba8`, `a875340`) verified present in git history.
