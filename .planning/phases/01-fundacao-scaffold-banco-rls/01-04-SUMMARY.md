---
phase: 01-fundacao-scaffold-banco-rls
plan: 04
subsystem: infra
tags: [vercel, ci, github-actions, deploy, spa-rewrite, gitflow]

# Dependency graph
requires:
  - phase: 01-fundacao-scaffold-banco-rls (plan 01-03)
    provides: "Angular 21 scaffold with the real dist/amigo-secreto/browser output path, ESLint rubric gate, package.json scripts"
  - phase: 01-fundacao-scaffold-banco-rls (plan 01-01)
    provides: "SUPABASE_URL and publishable key values consumed by generate-env.js and the Vercel/CI env vars"
provides:
  - "vercel.json with the mandatory SPA rewrite (deep links resolve, not 404) and the real outputDirectory"
  - "scripts/generate-env.js prebuild hook that writes environment.prod.ts from env vars and aborts the build if a secret/service-role key is passed by mistake"
  - ".github/workflows/ci.yml gate: lint (max-warnings=0), no-RxJS-state check, source-level secret grep, production build, bundle-level secret grep, NgModule-zero check, unit tests — on every PR into develop/main"
  - "Vercel project zmp2/amigo-secreto connected to GitHub, Production Branch = main, auto-deploying on every merge to main"
  - "Two merged PRs (#28 feature->develop, #29 develop->main) completing the Phase 1 Gitflow requirement"
  - "docs/deploy.md with real production evidence: deep link 200s, zero-secret bundle grep, deployment id/timestamp, PR links"
affects: [phase-02, phase-03, phase-04, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prebuild hook (npm lifecycle) writes src/environments/environment.prod.ts from process.env at build time; file is gitignored, never committed"
    - "CI secret gate runs twice: once with grep against src/ (source), once against dist/ (bundle) after build — catches both hardcoded leaks and build-time injection leaks"
    - "npm ci/install in this repo requires --legacy-peer-deps everywhere (vitest@4 peer graph bug in npm 10.9.2 arborist, not a real conflict) — CI workflow encodes this"

key-files:
  created:
    - vercel.json
    - scripts/generate-env.js
    - .github/workflows/ci.yml
    - docs/deploy.md
  modified:
    - package.json (added prebuild script)

key-decisions:
  - "Vercel Deployment Protection disabled deliberately for this academic project so the grader can open the production URL without a Vercel login, and so this verification could run unauthenticated curl checks"
  - "amigo-secreto.vercel.app is a namesake collision with an unrelated third-party Next.js app — documented in docs/deploy.md so nobody verifies against the wrong site; the real production URL is the per-deployment Vercel URL, since no stable alias was observed under the zmp2 scope"
  - "CI's npm test step changed to 'npm test -- --run' (Vitest non-watch mode) after a plain 'npm test' hung CI; the scaffold's single default app.spec.ts title assertion was also stale from ng new's generated title and needed updating to match the real app title"

requirements-completed: [DB-11, ENG-04, ENG-05, ENG-06]

# Metrics
duration: 25min (Task 1, autonomous) + checkpoint pause for Vercel OAuth setup + verification pass
completed: 2026-10-15
---

# Phase 01 Plan 04: Deploy Pipeline and Gitflow Closure Summary

**Vercel auto-deploy from `main` with a working SPA rewrite, a CI quality gate grepping secrets from both source and the built bundle, and the two merged PRs (feature->develop->main) that close Phase 1's Gitflow requirement — all verified against the real production URL, not just local dist/.**

## Performance

- **Duration:** ~25 min of autonomous Task 1 work (23:05-23:14 local) + human checkpoint (Vercel project connection, env vars, OAuth) + this verification/documentation pass (23:29 local)
- **Started:** 2026-10-14T23:05:05-03:00
- **Completed:** 2026-10-14T23:29:54-03:00 (code); evidence verified and docs/deploy.md committed same session
- **Tasks:** 2 (Task 1 autonomous; Task 2 checkpoint:human-verify, resolved)
- **Files modified:** 5 (vercel.json, scripts/generate-env.js, package.json, .github/workflows/ci.yml, docs/deploy.md)

## Accomplishments

- `vercel.json` ships the mandatory SPA rewrite (`/(.*)` → `/index.html`) with the literal real output path `dist/amigo-secreto/browser` — verified against a real local build.
- `scripts/generate-env.js` prebuild hook generates `environment.prod.ts` from env vars and hard-aborts the build (exit 1) if handed a secret/service-role-shaped key — a regex guard, not a convention.
- CI workflow (`.github/workflows/ci.yml`) gates every PR into `develop`/`main` with: ESLint (`--max-warnings=0`), a Signals-not-RxJS-state check, a source-level secret grep, a production build with injected env vars, a bundle-level secret grep, a zero-`*.module.ts` check, and unit tests.
- Vercel project (`zmp2/amigo-secreto`) connected to GitHub with Production Branch = `main`; confirmed the merge of PR #29 into `main` (commit `fd22ba2`) triggered a real Production deployment (GitHub deployment id `7082119882`, state `success`).
- Verified live against the real production URL (`https://amigo-secreto-45wxm00ln-zmp2.vercel.app`), not just the local `dist/`: home route 200, two different deep links (`/grupo/abc-123`, `/rota-inexistente`) both 200 with `<app-root` present (not a 404 page), and a grep against the actual served JS chunk (`main-GJECS65H.js`) confirming zero secret/service-role-shaped strings.
- Two real PRs merged, closing ENG-06/RA7-ID25/ID26: #28 (`gsd/phase-01-...` → `develop`) and #29 (`develop` → `main`). `git log origin/main --first-parent` shows only merge commits — no direct commits to `main` this phase.
- `docs/deploy.md` written in PT-BR with all 6 required evidence sections, documenting the real URL, the namesake-collision caveat for `amigo-secreto.vercel.app`, and the Deployment Protection decision.

## Task Commits

1. **Task 1: vercel.json, env generation, CI quality gate** - `3f6b68f` (feat)
2. **Task 1 fixup: CI test step + stale title assertion** - `862935c` (fix)
3. **Task 2 (checkpoint): docs/deploy.md evidence** - `10bb25e` (docs)

**PR merges (Gitflow, not plan-commits but part of this plan's deliverable):**
- PR #28 merged at `2026-10-15T02:16:09Z` (feature branch → develop)
- PR #29 merged at `2026-10-15T02:17:44Z` (develop → main, triggered the production deploy)

**Plan metadata:** this SUMMARY's own commit (docs: complete plan, see final_commit step)

## Files Created/Modified

- `vercel.json` - SPA rewrite + real output directory for Vercel builds
- `scripts/generate-env.js` - prebuild hook generating `environment.prod.ts` from env vars, with a secret-key regex guard that aborts the build
- `package.json` - added `prebuild` script (npm runs it automatically before `build`)
- `.github/workflows/ci.yml` - lint/build/secret-grep/NgModule/test gate on PRs to `develop`/`main`
- `docs/deploy.md` - real production evidence: URL, deep link 200s, bundle secret grep, Gitflow PR links, deployment id/timestamp, namesake-collision and Deployment Protection notes

## Decisions Made

- Disabled Vercel Deployment Protection deliberately: this is an academic deliverable where the grader must be able to open the production URL directly, and the project's actual privacy guarantee lives in Postgres RLS, not in a hosting-provider login wall — gating the URL behind Vercel auth would add no real security and would block grading.
- Documented the `amigo-secreto.vercel.app` alias as belonging to an unrelated third-party Next.js app (confirmed by fetching it and finding Next.js markup), so the authoritative URL recorded is the real per-deployment Vercel URL; no stable alias under the `zmp2` team scope was observed in this session, so none was invented.
- Left `npm ci --legacy-peer-deps` encoded in CI rather than trying to resolve the underlying vitest@4/npm 10.9.2 arborist peer-graph bug — consistent with the workaround already adopted in plan 01-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CI unit test step and a stale scaffold assertion both needed fixing**
- **Found during:** Task 1 (CI workflow validation)
- **Issue:** `npm test -- --run` (as written in the plan) initially needed confirmation it wouldn't hang CI under Vitest's default watch behavior, and the scaffold's generated `app.spec.ts` still asserted the `ng new` default app title rather than the real "UTF-Secret" title, which would fail CI's test step on every run.
- **Fix:** Confirmed/kept the non-watch `--run` flag for CI, and updated the stale title assertion in the default spec to match the actual app title.
- **Files modified:** `.github/workflows/ci.yml`, the scaffold's default spec file
- **Verification:** `npm test -- --run` completes (not hangs) and passes in CI
- **Committed in:** `862935c`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/correctness, bundled as one fixup commit covering two related stale-assertion/CI-flag issues)
**Impact on plan:** Necessary for CI to actually pass rather than hang or fail on a stale scaffold assertion. No scope creep — both fixes are directly inside this plan's own CI workflow and test scaffold.

## Issues Encountered

- Vercel Deployment Protection initially blocked the automated `curl`-based verification (home route, deep links, bundle grep) with an auth wall. Resolved by the user disabling Deployment Protection for the project — documented as a deliberate decision in `docs/deploy.md`, not as a bug.
- The conventional alias `amigo-secreto.vercel.app` turned out to be an unrelated third-party Next.js project occupying that subdomain globally, not this project. Discovered by curling it and finding Next.js-specific HTML markers. Resolved by documenting the real per-deployment production URL and the collision explicitly in `docs/deploy.md`, so nobody later "verifies" the wrong site.

## User Setup Required

None remaining — the one piece requiring a human (connecting the Vercel project to GitHub via OAuth, setting Production Branch = `main`, registering `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` in the Vercel dashboard, and disabling Deployment Protection) was completed during the Task 2 checkpoint, which this continuation verified against real evidence.

## Known Stubs

None introduced by this plan. `docs/deploy.md` explicitly notes (accurately, not as a defect) that neither the secret key nor the publishable key currently appears in the production bundle, because no application code yet instantiates the Supabase client — that is Phase 2+ work, not a stub left behind by this plan.

## Next Phase Readiness

- Phase 1's five ROADMAP criteria are now all evidenced: scaffold (01-03), kanban/MCP docs (01-02), DB schema + RLS two-user proof (01-01), and this plan's deploy pipeline + Gitflow closure.
- `develop` and `main` both exist on the remote with only merge commits on `main`; future phases should keep branching from `develop` per `CLAUDE.md`.
- CI gate is now live on every PR — Phase 2+ feature branches will be checked automatically (lint, secret grep, build, NgModule-zero, tests) before merging into `develop`.
- No blockers carried forward from this plan specifically. The pre-existing project-level blocker (RLS must stay verified with two real users before any frontend work, documented in STATE.md) is unaffected and still applies going into Phase 2.

---
*Phase: 01-fundacao-scaffold-banco-rls*
*Completed: 2026-10-15*

## Self-Check: PASSED

- FOUND: vercel.json
- FOUND: scripts/generate-env.js
- FOUND: .github/workflows/ci.yml
- FOUND: docs/deploy.md
- FOUND: package.json (prebuild script present)
- FOUND commit: 3f6b68f
- FOUND commit: 862935c
- FOUND commit: 10bb25e
- Live production evidence re-verified in this session (not just read from the task prompt): home 200, both deep links 200 with `<app-root` present, bundle grep 0 for secret/service-role pattern and 0 for publishable-key pattern, GitHub deployment `7082119882` state `success` at `2026-10-15T02:18:17Z` for commit `fd22ba2`, PR #28 and #29 confirmed merged via `gh pr list`.
