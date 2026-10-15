---
phase: 01-fundacao-scaffold-banco-rls
verified: 2026-10-15T02:40:00Z
status: passed
score: 20/20 must-haves verified (across 4 plans)
human_verification:
  - test: "Visual check of the live deployed scaffold page on a real mobile device/viewport at 320px"
    expected: "Single Spartan UI card + button render legibly, no horizontal scroll, matching the mobile-first claim of UI-01"
    why_human: "UI-01 is a visual/responsive-layout judgment; grep/build checks confirm Tailwind utility classes exist but can't confirm actual rendered appearance across breakpoints"
  - test: "Open https://amigo-secreto-45wxm00ln-zmp2.vercel.app and confirm the Vercel Deployment Protection screen does not appear for an anonymous/unauthenticated visitor (e.g. the course evaluator)"
    expected: "Page loads directly without a Vercel login wall"
    why_human: "docs/deploy.md documents this was deliberately disabled, and curl returned 200, but curl doesn't execute JS/cookies the way a protection gate might; a human browser check is the definitive confirmation for the grading context"
---

# Phase 1: fundacao-scaffold-banco-rls Verification Report

**Phase Goal:** Existe uma base técnica completa e comprovadamente segura sobre a qual toda
feature subsequente é construída — banco com privacidade garantida por RLS (não por UI), e
um pipeline de qualidade que torna a rubrica mecanicamente verificável desde o primeiro commit.

**Verified:** 2026-10-15T02:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | As 4 tabelas `profile`, `group`, `participant`, `draw` existem no Postgres com RLS habilitada | ✓ VERIFIED | `supabase/migrations/0001_schema.sql` defines all 4 tables with constraints/indexes; `0003_rls_policies.sql` enables RLS on all 4 (`alter table ... enable row level security`); live-DB evidence in `docs/db-rls-verification.md` Part F shows `rowsecurity = true` for all 4 |
| 2 | Usuário B não lê nenhuma linha de `draw` cujo `giver_id` pertença ao usuário A | ✓ VERIFIED | `docs/db-rls-verification.md` Part D: real two-user impersonation test, `draw_count = 0` for user B against user A's drawn pair. Policy text matches migration file exactly |
| 3 | Admin do grupo não consegue INSERT em `draw` | ✓ VERIFIED | `docs/db-rls-verification.md` Part E: live INSERT attempt as admin returns `42501: new row violates row-level security policy`; migration file confirms zero write policies exist for `draw` |
| 4 | Nenhuma policy usa `using (true)`; nenhuma policy de `draw` menciona `admin_id` | ✓ VERIFIED | `grep -rn "using(true)"` across `supabase/` → zero matches; `admin_id` appears only in `group`/`participant` policies, never in the single `draw` SELECT policy |
| 5 | Nenhuma query dispara `42P17` (recursão) | ✓ VERIFIED | `private.my_group_ids()`/`private.my_participant_ids()` are `SECURITY DEFINER`, `set search_path = ''`, in non-public `private` schema; `docs/db-rls-verification.md` Part G confirms no 42P17 observed in any of the live test queries |
| 6 | Scaffold Angular ^21.x standalone + Tailwind ^4.x + Spartan UI compila e roda, zero `NgModule` | ✓ VERIFIED | `npm run build` (with dummy env vars) succeeds, 0 errors/warnings; `find src -iname "*.module.ts"` and `grep -rl NgModule src/` both return zero; `@angular/core ^21.2.0`, `tailwindcss ^4.3.3`, `@spartan-ng/brain ^1.7.0` confirmed in `package.json`; `HlmCard`/`HlmButton` genuinely imported and rendered in `app.html` |
| 7 | `npx eslint src --max-warnings=0` passa no código real e falha demonstravelmente em cada sintaxe proibida | ✓ VERIFIED | Ran lint on real `src/` → exit clean, 0 problems. Independently reproduced 2 of the 5 documented negative probes (`*ngIf`, `@Output()`) live — both failed with the exact rule names documented in `docs/eslint-negative-test.md`; probe files cleaned up, repo left clean |
| 8 | Pipeline de qualidade (CI) gateia PRs real e automaticamente | ✓ VERIFIED | `.github/workflows/ci.yml` runs lint, no-RxJS-state check, source secret grep, build, bundle secret grep, no-NgModule check, unit tests; `gh run list` shows 5 real CI runs including one genuine failure before the fix, all final merges green |
| 9 | Deploy automático a partir de `main`, deep links funcionam, sem secret no bundle | ✓ VERIFIED | Live curl against `https://amigo-secreto-45wxm00ln-zmp2.vercel.app`: home 200, `/grupo/abc-123` 200, `/rota-inexistente` 200, all contain `<app-root`; live grep of `main-GJECS65H.js` for `service_role`/`sb_secret_` → 0 matches. Matches `docs/deploy.md` exactly |
| 10 | Gitflow real: `main`+`develop` existem, `main` só recebe merge de PR | ✓ VERIFIED | `git ls-remote --heads origin` shows both branches; `git log origin/main --first-parent` shows only merge commits; `gh pr list --state merged` confirms PR #28 (feature→develop) and #29 (develop→main) both merged |
| 11 | Kanban populado com Issues reais rastreadas a requisitos, desde o início | ✓ VERIFIED | Live GraphQL query against GitHub Projects v2 board #3 confirms 11 real Issues, titles matching `docs/kanban.md` table exactly |
| 12 | SDD documenta os 3 servidores MCP com caveat de segurança do `read_only` | ✓ VERIFIED | `docs/sdd.md` §1.1–1.3 documents Supabase MCP (`read_only=true` + prompt-injection caveat), Figma MCP, Angular CLI MCP |

**Score:** 12/12 truths verified (12 observable truths derived/consolidated from must_haves across all 4 plans' frontmatter)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0001_schema.sql` | DDL 4 tables + constraints + indexes + trigger | ✓ VERIFIED | Contains `create table public.draw`, all DB-02/03/04/09 constraints/indexes present |
| `supabase/migrations/0002_private_helpers.sql` | `private` schema + 2 SECURITY DEFINER helpers | ✓ VERIFIED | Contains `security definer`, `set search_path = ''`, correct `revoke`/`grant` |
| `supabase/migrations/0003_rls_policies.sql` | RLS enabled 4 tables + all policies | ✓ VERIFIED | Contains `giver_id in (select private.my_participant_ids())`; verified wired (Level 3) and traced to live-DB behavior (Level 4) via `docs/db-rls-verification.md` |
| `docs/db-rls-verification.md` | Executed two-user RLS test evidence | ✓ VERIFIED | Contains `42P17`, internally consistent, specific real outputs, honest about uncaptured items — not fabricated-looking |
| `docs/kanban.md` | Board link + Issues table | ✓ VERIFIED | Contains real `github.com/users/pedrozampier/projects/3` URL; live-queried and matches |
| `docs/sdd.md` §1 | MCP servers documented with `read_only=true` caveat | ✓ VERIFIED | Contains `read_only=true` + full security caveat paragraph |
| `eslint.config.js` | 7 rubric rules as `error` | ✓ VERIFIED | Contains `prefer-output-emitter-ref` plus `prefer-standalone`, `prefer-signals`, `prefer-inject`, `prefer-signal-model`, `template/prefer-control-flow`, `template/banana-in-box` — all 7 present, all `error` |
| `src/styles.css` | Tailwind v4 CSS-first + Spartan theme | ✓ VERIFIED | Contains `@import 'tailwindcss/...'` layers + `@import '@spartan-ng/brain/hlm-tailwind-preset.css'`; CSS compiles into 28.9kB production bundle |
| `docs/eslint-negative-test.md` | Executed evidence lint rejects each forbidden syntax | ✓ VERIFIED | Contains `exit code`; independently reproduced 2/5 probes live, matched exactly |
| `src/environments/environment.example.ts` | Committed template, no real secrets | ✓ VERIFIED | Contains `supabaseUrl` placeholder, no real values |
| `vercel.json` | Output dir + SPA rewrite | ✓ VERIFIED | Contains `rewrites` with `/(.*) -> /index.html`; confirmed live via curl deep-link 200s |
| `scripts/generate-env.js` | Generates `environment.prod.ts` from env vars at build | ✓ VERIFIED | Contains `process.env.SUPABASE_URL`; also contains an abort guard rejecting `service_role`/`sb_secret_` values — exceeds the stated requirement |
| `.github/workflows/ci.yml` | PR gate: lint + build + secret grep | ✓ VERIFIED | Contains `max-warnings=0`; confirmed via real `gh run list` history (5 runs, one genuine failure-then-fix, rest green) |
| `docs/deploy.md` | ENG-05 + DB-11 evidence against real bundle | ✓ VERIFIED | Contains `https://`; every claim in the doc independently reproduced live by this verification (curl, grep, gh pr list, git log) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `0003_rls_policies.sql` | `private.my_participant_ids()` | SELECT policy on `draw` | ✓ WIRED | `giver_id in (select private.my_participant_ids())` — exact string present |
| `0002_private_helpers.sql` | `public.participant` | SECURITY DEFINER with empty search_path | ✓ WIRED | Both helper functions use `set search_path = ''` and schema-qualify `public.participant` |
| `eslint.config.js` | `@angular-eslint/eslint-plugin` | rules with severity error | ✓ WIRED | All `prefer-*` rules present as `'error'`; live lint run + 2 live negative probes confirm the rules actually fire |
| `src/styles.css` | `@spartan-ng/brain` | Tailwind preset import | ✓ WIRED | Import present AND consumed — `app.ts`/`app.html` genuinely import and render `HlmCard`/`HlmButton` (not just a dangling CSS import) |
| `.github/workflows/ci.yml` | `dist/` | secret grep on build output | ✓ WIRED | Grep step runs after `npm run build` in the same job, confirmed green in real CI run history |
| `vercel.json` | `index.html` | SPA rewrite for deep links | ✓ WIRED | Confirmed live: both a parameterized deep link and a nonexistent route return 200 with `<app-root` in production |
| `docs/kanban.md` | GitHub Projects board | Issue URLs added to board | ✓ WIRED | Live GraphQL query confirms 11 items actually attached to project #3, not just mentioned in the doc |

### Data-Flow Trace (Level 4)

Phase 1 is foundation/scaffold work — no feature renders dynamic application data yet (by design; `src/app/features/` is still a `.gitkeep` placeholder). The one dynamic-looking artifact, `app.ts`'s `titulo` signal, is a static placeholder string (`'UTF-Secret'`), which is appropriate for a scaffold-verification page and not a stub masking missing wiring. The one genuine "data flow" of this phase — RLS policy → live Postgres behavior — was traced in Level 3 above via `docs/db-rls-verification.md` and independently confirmed live for the deploy/bundle/Gitflow claims. No hollow-prop or disconnected-source patterns found.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `app.ts` | `titulo` signal | Hardcoded literal `'UTF-Secret'` | N/A — intentional static scaffold label, not a feature that should be dynamic in this phase | ✓ ACCEPTABLE (not a stub in context) |
| RLS SELECT policy on `draw` | `giver_id` | Live Postgres, traced via `private.my_participant_ids()` | Yes — confirmed against a real two-user impersonation test, not a static/empty return | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build succeeds, no errors/warnings | `SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... npm run build` | Bundle generated, 261KB raw / 68KB transfer, no errors | ✓ PASS |
| Lint passes on real code | `npx eslint src --max-warnings=0` | Exit clean, 0 problems | ✓ PASS |
| Lint fails on `*ngIf` probe | Introduce `<div *ngIf="true">`, re-lint | `prefer-control-flow` error fired, matches documented evidence | ✓ PASS |
| Lint fails on `@Output()` probe | Introduce `@Output() mudou = new EventEmitter<string>()`, re-lint | `prefer-output-emitter-ref` error fired, matches documented evidence | ✓ PASS |
| Unit tests pass | `npm test --passWithNoTests` (same invocation as CI) | `app.spec.ts`: 2/2 tests passed | ✓ PASS |
| No `NgModule`/`*.module.ts` in `src/` | `find`/`grep` | Zero matches | ✓ PASS |
| Production URL live and deep links don't 404 | `curl` against the 3 documented URLs | All 200, `<app-root` present | ✓ PASS |
| No secret key in production bundle | `curl` bundle + `grep -ciE "service_role\|sb_secret_"` | 0 matches | ✓ PASS |
| GitHub Projects board has the 11 claimed Issues | `gh api graphql` against project #3 | 11 items, titles match `docs/kanban.md` exactly | ✓ PASS |
| Gitflow: `main` only receives PR merges | `git log origin/main --first-parent` + `gh pr list --state merged` | Only merge commits; PR #28/#29 confirmed merged | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DB-01 | 01-01 | Schema com as 4 tabelas | ✓ SATISFIED | `0001_schema.sql` |
| DB-02 | 01-01 | `UNIQUE (group_id, user_id)` em `participant` | ✓ SATISFIED | `participant_group_user_unique` constraint |
| DB-03 | 01-01 | `UNIQUE` em `giver_id`/`receiver_id` (perfect matching) | ✓ SATISFIED | `draw_giver_unique`, `draw_receiver_unique` |
| DB-04 | 01-01 | `CHECK (giver_id <> receiver_id)` | ✓ SATISFIED | `draw_no_self_gift` constraint |
| DB-05 | 01-01 | Helpers `SECURITY DEFINER` em schema `private` | ✓ SATISFIED | `0002_private_helpers.sql` |
| DB-06 | 01-01 | RLS habilitada nas 4 tabelas, sem `using(true)` | ✓ SATISFIED | `0003_rls_policies.sql` + live Part F |
| DB-07 | 01-01 | Policy de `draw` só por `giver_id`, sem exceção admin | ✓ SATISFIED | Single SELECT policy, grep confirms no `admin_id` in it |
| DB-08 | 01-01 | Zero policy de escrita em `draw` | ✓ SATISFIED | Confirmed by migration content + live `42501` INSERT-rejection test |
| DB-09 | 01-01 | Índices em colunas usadas por policies | ✓ SATISFIED | 5 `create index` statements on exactly the named columns |
| DB-10 | 01-01 | Validação manual com dois usuários | ✓ SATISFIED | `docs/db-rls-verification.md`, assessed as internally consistent, not fabricated |
| DB-11 | 01-03/01-04 | Secret key nunca no bundle cliente | ✓ SATISFIED | `generate-env.js` abort guard + CI grep (both source and bundle) + live production bundle grep (0 matches) |
| UI-01 | 01-03 | Layout mobile-first a partir de 320px | ? NEEDS HUMAN | Tailwind mobile-first utility classes present in the one scaffold page; full responsive judgment deferred to human (see Human Verification) |
| UI-02 | 01-03 | Tailwind v4 + Spartan UI | ✓ SATISFIED | `HlmCard`/`HlmButton` genuinely rendered, CSS compiles |
| ENG-01 | 01-03 | ESLint com as regras que tornam a rubrica verificável | ✓ SATISFIED | All 7 rules present as `error`, live-reproduced 2 negative probes |
| ENG-04 | 01-03/01-04 | Build de produção sem erro/warning de lint | ✓ SATISFIED | Live build + live lint both clean |
| ENG-05 | 01-04 | Deploy automatizado via Vercel a partir de `main` | ✓ SATISFIED | Live GitHub Deployments confirmation + CI run history |
| ENG-06 | 01-02/01-04 | Gitflow com PRs | ✓ SATISFIED | Live `git ls-remote`/`gh pr list` confirmation |
| ENG-08 | 01-02 | Kanban com Issues das user stories | ✓ SATISFIED | Live GraphQL confirmation, 11/11 Issues |
| ENG-10 | 01-02 | MCP servers documentados no SDD | ✓ SATISFIED | `docs/sdd.md` §1.1–1.3, all 3 servers + security caveat |

All 19 requirement IDs assigned to Phase 1 in the ROADMAP's requirement-coverage table (DB-01..11, UI-01/02, ENG-01, ENG-04, ENG-05, ENG-06, ENG-08, ENG-10) are claimed by exactly one of the 4 plans' `requirements:` frontmatter, with no orphans and no duplicates across plans.

**Documentation sync issue found (not a code gap):** `.planning/REQUIREMENTS.md`'s main checklist (lines 29–104) correctly marks all 19 Phase 1 requirement IDs as `[x]`, but the "Rastreabilidade" tracking table further down the same file (lines ~191–244) still lists every one of them with status `Pendente`. This is a stale-tracking-table artifact, not a functional gap — informational only.

### Anti-Patterns Found

None. Scanned `src/`, `supabase/`, `scripts/`, `.github/` for `TODO|FIXME|XXX|HACK|PLACEHOLDER` and "not yet implemented"/"coming soon" style phrases — zero matches. The only placeholder-shaped files are `.gitkeep` markers in `src/app/{core/*,features,shared/*}`, which is the correct, intentional state for a scaffold phase that has not yet built features (Phase 2+ scope).

### Human Verification Required

### 1. Mobile-first visual check (UI-01)

**Test:** Open the production URL on a real device or browser responsive mode at 320px width.
**Expected:** The single Spartan UI card and button render without horizontal scroll or clipped text.
**Why human:** UI-01 is a visual/responsive judgment. The Tailwind utility classes present (`min-h-dvh`, `max-w-md`, `p-4`, `flex-col`) are consistent with mobile-first design, and the production CSS bundle compiles, but actual rendered appearance across breakpoints requires a visual check that only becomes meaningful once real feature pages exist (Phase 3+). Not a blocker for this phase's scaffold-only scope.

### 2. Deployment Protection off-check from an unauthenticated browser

**Test:** Open `https://amigo-secreto-45wxm00ln-zmp2.vercel.app` from an incognito/anonymous browser session (ideally from a different network than the developer's).
**Expected:** Page loads directly, no Vercel login/authentication wall.
**Why human:** `docs/deploy.md` documents that Deployment Protection was deliberately disabled, and `curl` (no cookies, no JS) returned 200 with real app content — strong evidence it's genuinely off — but a definitive check for the grading context (will the evaluator's browser see a login wall?) is best confirmed by an actual browser session.

### Gaps Summary

No gaps found. All 4 plans' must-haves were independently re-verified against the live codebase, not just read from SUMMARY claims:

- The two DB/RLS criteria that could not be re-executed here (live two-user SQL test) were assessed for internal consistency against `docs/db-rls-verification.md` — the policy listing in that document matches the committed migration SQL verbatim, outputs are specific (not vague), and the document is honest about what wasn't captured. No signs of fabrication.
- The two criteria that are locally verifiable (build, lint, and the ESLint negative test) were independently re-run, not just trusted: production build succeeded, lint passed cleanly on real code, and 2 of the 5 documented negative probes (`*ngIf`, `@Output()`) were independently reproduced live with identical results to the documented evidence.
- The deploy/Gitflow/Kanban/CI claims in `docs/deploy.md` and `docs/kanban.md` were all independently re-verified live (curl against the production URL and bundle, `gh pr list`, `git log`/`git ls-remote`, and a live GraphQL query against the GitHub Projects board) — every single claim matched exactly.
- One minor documentation-sync issue was found (stale "Pendente" status in `REQUIREMENTS.md`'s tracking table despite the main checklist correctly showing `[x]`) — flagged as informational, not a functional gap, since it doesn't affect code or grading evidence.
- Two items are routed to human verification because they are inherently visual/browser-session judgments (mobile-first rendering, Deployment Protection from a real browser) rather than automated-check failures.

---

*Verified: 2026-10-15T02:40:00Z*
*Verifier: Claude (gsd-verifier)*
