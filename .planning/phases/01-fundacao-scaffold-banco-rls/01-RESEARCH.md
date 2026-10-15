# Phase 1: Fundação — Scaffold, Banco e RLS - Research

**Researched:** 2026-10-14
**Domain:** Angular 21/Tailwind 4/Spartan UI scaffold tooling, Supabase RLS two-user verification, ESLint rubric enforcement, Vercel deploy, MCP servers, GitHub Projects CLI
**Confidence:** HIGH for versions/commands (verified via `npm view` against the live registry + official docs); MEDIUM for a few CLI commands that official docs describe only partially (Spartan `init`, `gh project item-create`)

> **Scope note.** `.planning/research/ARCHITECTURE.md` and `.planning/research/STACK.md` already
> contain the SQL (tables, constraints, indices, `private.*` functions, all RLS policies) and the
> stack decision table with version rationale. This document does **not** repeat that SQL or
> re-litigate the Angular-version/Tailwind-version conflicts — those are closed decisions. This
> document closes the remaining gaps needed to write an executable plan: exact scaffold commands,
> exact ESLint rule set, exact two-user RLS test procedure, Vercel/MCP/GitHub Projects mechanics.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase (standalone research invoked ahead of `/gsd:discuss-phase`,
or discussion was skipped). There are no locked user decisions beyond what `docs/sdd.md`,
`docs/prd.md`, `CLAUDE.md`, and `.planning/research/*.md` already fix. Treat the following as
equivalent to locked decisions (already resolved, not open questions — see Project Constraints
section below for the authoritative list):

- Stack: Angular `^21.x` (LTS), Tailwind `^4.x`, Spartan UI `^1.7.x`, Supabase JS `^2.x`, Lucide
  Angular `^1.x`, date-fns `^3.x`, Zod `^3.x`, Vitest, Vercel.
- `draw.giver_id`/`receiver_id` → `participant.id`, never `user_id`/`profile.id`.
- RN5 (convite nominal por e-mail) reinterpreted as `UNIQUE (group_id, user_id)` — no invite table.
- Draw algorithm: Fisher-Yates + circular pairing (single Hamiltonian cycle).
- Coarse granularity (5 phases) — explicit user request for defensibility in the oral exam.

### Claude's Discretion

- Exact `ng new` / `ng add` flag choices not pinned by any doc (e.g., `--style`, whether to pass
  `--zoneless` explicitly) — Angular 21 defaults already satisfy the rubric, so discretion is
  "don't fight the default."
- Exact wording of ESLint config comments, exact order of installation steps, exact Kanban column
  names — anything not dictated by `docs/sdd.md` or the checklist.

### Deferred Ideas (OUT OF SCOPE)

None recorded for this phase specifically. Project-wide deferred items (V2-01..V2-04, invite
table, chat, draw history, social login, etc.) are in `.planning/REQUIREMENTS.md` §"Requisitos v2"
and §"Fora de Escopo" — not relevant to Phase 1's scaffold/DB/RLS/CI scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | Schema com as 4 tabelas conforme SDD §3 | SQL already in `ARCHITECTURE.md` §"Problemas no Modelo de Dados" + §"RLS — Políticas Concretas". This doc adds nothing new here — point the plan at ARCHITECTURE.md directly. |
| DB-02 | `UNIQUE (group_id, user_id)` em `participant` | `ARCHITECTURE.md` Problema 3 — exact SQL given. |
| DB-03 | `UNIQUE (group_id, giver_id)` + `UNIQUE (group_id, receiver_id)` em `draw` | `ARCHITECTURE.md` Problema 3 — exact SQL given. |
| DB-04 | `CHECK (giver_id <> receiver_id)` em `draw` | `ARCHITECTURE.md` Problema 3 — exact SQL given. |
| DB-05 | `private.my_group_ids()` / `private.my_participant_ids()` SECURITY DEFINER | `ARCHITECTURE.md` §"A fundação" — exact SQL given, including `revoke`/`grant`. |
| DB-06 | RLS habilitada nas 4 tabelas, sem `using (true)` | `ARCHITECTURE.md` §"Habilitar RLS" + this doc's §"Verification Queries" below (how to prove it). |
| DB-07 | Policy de `draw` só por `giver_id`, sem `admin_id` | `ARCHITECTURE.md` §"`draw` — a política crítica". |
| DB-08 | Nenhuma policy INSERT/UPDATE/DELETE em `draw` para `authenticated` | `ARCHITECTURE.md` §"`draw`" — confirmed by omission; this doc adds the verification query. |
| DB-09 | Índices nas colunas usadas pelas policies | `ARCHITECTURE.md` Problema 3 — exact `CREATE INDEX` statements given. |
| DB-10 | Validação manual com dois usuários distintos no SQL Editor | **New in this doc** — §"Two-User RLS Verification Procedure" below (exact SQL, exact test-user creation flow). |
| DB-11 | `service_role`/`sb_secret_` key nunca no bundle do cliente | **New in this doc** — §"Secret-Leak Verification" below (exact grep, key-naming decision). |
| UI-01 | Layout mobile-first a partir de 320px | Scaffold-level: Tailwind v4 mobile-first utilities are default (`sm:`/`md:` breakpoints are additive); no special scaffold step needed beyond having Tailwind wired. Verified in practice during Phase 3-5 UI work, but the base must compile from Phase 1. |
| UI-02 | Tailwind v4 + Spartan UI | **New in this doc** — §"Scaffold Command Sequence" below, with the exact CSS-first wiring, correcting a gap in STACK.md (see Flag 1). |
| ENG-01 | ESLint com as 5 regras da rubrica | **New in this doc** — §"ESLint Rule Set" below, including the `prefer-output-emitter-ref` finding not covered in PITFALLS.md. |
| ENG-04 | Build de produção sem erros/warnings de lint | Direct consequence of ENG-01's `--max-warnings=0` gate; no extra research needed. |
| ENG-05 | Deploy automatizado na Vercel com rewrite de SPA | **New in this doc** — §"Vercel Deploy" below (auto-detect behavior, env var injection at build time). |
| ENG-06 | Gitflow com PRs | Already governed by `CLAUDE.md` §"Git workflow" — no new research needed; this doc only notes the `gh` CLI mechanics that support it. |
| ENG-08 | Kanban no GitHub Projects via Issues | **New in this doc** — §"GitHub Projects via `gh` CLI" below. |
| ENG-10 | MCP servers documentados no SDD | **New in this doc** — §"MCP Servers" below (Supabase MCP + Figma MCP + bonus: official Angular CLI MCP). |

</phase_requirements>

## Summary

Phase 1 has two already-researched halves (database/RLS SQL in ARCHITECTURE.md, stack version
decisions in STACK.md) and one under-researched half: the actual sequence of commands that turns
an empty repo into a compiling Angular 21 + Tailwind 4 + Spartan UI project, the exact ESLint rule
names that mechanically enforce the rubric, and the exact procedures for the two success criteria
that are "prove it, don't just build it" (DB-10's two-user RLS test, and success-criterion-5's
secret-leak grep). This document fills those gaps with verified, copy-pasteable commands.

Two corrections to prior research surfaced during this pass, both favorable:

1. **`@angular-eslint/prefer-output-emitter-ref` exists** and directly targets `@Output()` —
   PITFALLS.md stated no lint rule covers `@Output()` beyond the indirect `prefer-signals`
   coverage of `@Input()`/`@ViewChild()`. This is wrong: the dedicated output rule exists in the
   same `eslint-plugin` package, confirmed against the official rule doc.
2. **`@angular-eslint` is versioned independently (currently `22.6.0`) with no hard peer range
   pinning it to a specific Angular major** (`eslint`, `typescript`, `@typescript-eslint/utils`
   are its only peers) — so running `ng add @angular-eslint/schematics` on an Angular `^21.x`
   project installs cleanly, no version pinning gymnastics needed.

**Primary recommendation:** scaffold with `ng new --style=css` targeting Angular's `v21-lts`
dist-tag explicitly (not `latest`, which resolves to v22 and is outside what STACK.md locked),
then layer Tailwind v4 (`ng add tailwindcss`) and Spartan UI (`npm i -D @spartan-ng/cli` →
`ng g @spartan-ng/cli:init` → `ng g @spartan-ng/cli:ui-theme` → per-component `ng g
@spartan-ng/cli:ui <name>`) before writing any feature code, then lock the ESLint rule set as
`error` (not `warn`) before the first commit that contains a component.

## Project Constraints (from CLAUDE.md)

Extracted directives the plan must honor mechanically, not just acknowledge:

- **Standalone components only, never `NgModule`** — enforced by `@angular-eslint/prefer-standalone`.
- **Signals only**: `signal()`, `computed()`, `effect()`, `model()` — no `BehaviorSubject` as state
  (not lint-enforceable per PITFALLS.md; enforce via `grep -rn "BehaviorSubject" src/app` in CI).
- **`inject()` only, never constructor DI** — enforced by `@angular-eslint/prefer-inject`.
- **`input()`/`output()` functions, never `@Input()`/`@Output()` decorators** — enforced by
  `@angular-eslint/prefer-signals` (covers `@Input()`, `@ViewChild()`, etc.) **and**
  `@angular-eslint/prefer-output-emitter-ref` (covers `@Output()` specifically — see ESLint
  section below, this is new relative to prior research).
- **New control flow (`@if`/`@switch`/`@for`), never `*ngIf`/`*ngFor`** — enforced by
  `@angular-eslint/template/prefer-control-flow`. `@for` without `track` is a compiler error
  (`NG5002`), not a lint matter.
- **`@defer` for at least one heavy component** — not a Phase 1 deliverable (no heavy components
  exist yet), but note it for Phase 3/4 planning.
- **Functional interceptors, Reactive Forms, `toSignal()`/`toObservable()`** — not Phase 1
  deliverables (no HTTP traffic or forms yet); Phase 1 only needs the scaffold capable of hosting
  them later (confirmed: `provideHttpClient`/`provideRouter` wiring happens in `app.config.ts`
  generated by `ng new`, no extra Phase 1 action needed beyond leaving them in place).
- **Mobile-first ≥320px, WCAG 2.1 AA** — Phase 1 only needs Tailwind correctly wired; auditing
  happens in Phase 5.
- **`.spec.ts` unit tests** — Phase 1 scaffold defaults to Vitest; no test content required yet
  (ENG-02/03 are Phase 4).
- **Never commit directly to `main`; branch from `develop`; PRs for integration; Conventional
  Commits; Kanban kept current** — governs how Phase 1's own work is committed, per
  `git.branching_strategy: "phase"` already configured in `.planning/config.json`.
- **Documentation/UI text in PT-BR, code identifiers in English** — applies to all file/variable
  naming from the first scaffold commit onward.
- **Do not add dependencies outside the SDD §2 table** — any package not in that table (e.g., if
  Spartan's installer pulls in an unlisted peer) must be reflected back into `docs/sdd.md` §2 in
  the same change, per the hard rule stated in both CLAUDE.md and the SDD itself.

---

## Standard Stack

No changes to the already-locked table in `STACK.md`/`docs/sdd.md` §2. Versions re-verified live
against the npm registry on 2026-10-14 (this session) for currency:

| Library | Verified version (npm, 2026-10-14) | Matches STACK.md? |
|---------|-------------------------------------|--------------------|
| `@angular/core` / `@angular/cli` | `v21-lts` dist-tag → `21.2.25` (NOT `latest`, which is `22.2.3`) | Yes — confirms the `^21.x` LTS pin is correctly *not* `latest` |
| `@angular/cdk` | `22.2.3` is `latest`; must match whichever `@angular/core` major is actually installed (21.x line) | Yes, with the caveat: when scaffolding, explicitly request the `21-lts`-aligned CDK, not npm's `latest` tag |
| `@spartan-ng/brain` | `1.7.0`; peers: `@angular/core >=21.0.0 <23.0.0`, `tailwindcss >=4.0.0`, `@angular/cdk >=21.0.0 <23.0.0`, `@angular/forms >=21.0.0 <23.0.0`, `clsx >=2.0.0`, `luxon >=3.0.0`, `tw-animate-css >=1.0.0`, `rxjs >=6.6.0` | Yes — full peer list now confirmed (STACK.md had only partial peer list) |
| `lucide-angular` | `1.0.0`; peers `@angular/core`/`@angular/common`: `13.x - 21.x` | Yes — confirms `--legacy-peer-deps` note is still accurate, and confirms staying on Angular 21 (not 22) avoids the warning entirely |
| `@supabase/supabase-js` | `2.117.3` | Yes |
| `@angular-eslint/eslint-plugin` + `eslint-plugin-template` | `22.6.0`; peers: `eslint ^9.0.0 || ^10.0.0`, `typescript *`, `@typescript-eslint/utils ^8.0.0` — **no Angular-core peer constraint** | **New data point**: confirms `ng add @angular-eslint/schematics` installs cleanly on an Angular `^21.x` project without version juggling |
| `@angular-eslint/schematics` | `22.6.0` | New data point, same as above |
| `vitest` | `5.0.4` | Yes |
| `date-fns` | `^3.x` pinned; registry `latest` is `4.4.0` — confirms STACK.md's explicit "don't migrate to 4" note is still correct and necessary (otherwise `npm install date-fns` with no version pin would grab v4) |
| `zod` | `^3.x` pinned; registry `latest` is `4.6.7` — same situation, confirms the explicit pin is load-bearing, not optional |
| `@angular/pwa` | `22.2.2` (tracks whichever CLI major is installed) | Not used in Phase 1 (PWA is Phase 5), noted for forward reference only |

**Installation command for the ESLint toolchain** (not previously specified at command level):

```bash
ng add @angular-eslint/schematics
```

This single schematic installs `@angular-eslint/eslint-plugin`, `@angular-eslint/eslint-plugin-template`, `@angular-eslint/template-parser`, `@angular-eslint/utils`, `typescript-eslint`, and `eslint`, and generates a flat-config `eslint.config.js` pre-wired with Angular's recommended rule sets. Confirmed current as of Angular 18+ (flat config is the only mode the schematic generates since ESLint 9 became the baseline).

---

## Scaffold Command Sequence

This is the highest-value gap this research closes. Exact, ordered, copy-pasteable.

### Step 1 — Angular 21 LTS, standalone, zoneless, Vitest

```bash
npx -y @angular/cli@21 new amigo-secreto \
  --routing \
  --style=css \
  --ssr=false \
  --skip-tests=false \
  --package-manager=npm
```

Notes, verified against `angular.dev/cli/new` (current docs) and the Angular 21 release notes:

- **`--standalone` defaults to `true`** — do not need to pass it; there is no flag to opt into
  `NgModule` on `ng new` in current Angular, only on `ng generate component --standalone=false`
  (which the ESLint `prefer-standalone` rule then catches if anyone ever does that later).
- **Zoneless is the default since Angular 21** — `provideZonelessChangeDetection()` is applied
  automatically; passing `--zoneless` explicitly is redundant but harmless. Do not pass
  `--zoneless=false`, as that would regress to zone.js and contradict the stack decision.
- **Vitest is the default test runner since Angular 21** — no flag needed; `ng new` wires it
  automatically. Confirmed by the Angular 21 release blog and the Ninja Squad/Angular Architects
  write-ups of the v21 release.
- **Pin the major explicitly (`@angular/cli@21`)**, not `@latest`: `npm view @angular/core
  dist-tags` (checked live this session) shows `latest` resolves to `22.2.3`, but
  `v21-lts` resolves to `21.2.25` — the version the stack decision actually locked, driven by
  Spartan's `<23.0.0` ceiling and `lucide-angular`'s `13.x - 21.x` peer ceiling. Using `@latest`
  here would silently scaffold Angular 22 and reopen Conflict 2 from STACK.md (the
  `lucide-angular` peer warning) for no benefit.
- `--style=css` is deliberate, not `--style=tailwind`: the Tailwind wiring happens in Step 2 via
  `ng add tailwindcss`, which is the officially documented path and matches what Spartan's CLI
  expects to find already in place. Using `--style=tailwind` at `ng new` time produces an
  equivalent result but has not been verified against Spartan's init script in combination — the
  two-step path (`ng new` plain CSS → `ng add tailwindcss` → `ng g @spartan-ng/cli:init`) is the
  one with a traceable official source for each step.
- `--ssr=false` — SSR is explicitly out of scope per `docs/prd.md` (web app, not required by the
  rubric; "aplicativo mobile nativo" is a non-goal but SSR isn't mentioned at all — treat absence
  as "not needed," confirmed by no checklist indicator requiring it).

### Step 2 — Tailwind CSS v4 (CSS-first, no `tailwind.config.js`)

```bash
cd amigo-secreto
ng add tailwindcss
```

Per the official `angular.dev/guide/tailwind` schematic (current docs only describe the v4
setup — there is no v3 page anymore, confirming STACK.md's Conflict 1 resolution): this generates
`.postcssrc.json` wiring the `@tailwindcss/postcss` plugin, and rewrites `src/styles.css` to:

```css
@import "tailwindcss";
```

No `tailwind.config.js` is created. Confirm after running: `test ! -f tailwind.config.js &&
echo "OK: no legacy config file"`.

### Step 3 — Spartan UI (Brain + Helm via CLI)

```bash
npm i -D @spartan-ng/cli
ng g @spartan-ng/cli:init
ng g @spartan-ng/cli:ui-theme
```

What each step does, per `spartan.ng/documentation/installation` and `spartan.ng/documentation/cli`
(official docs, confirmed current):

- `ng g @spartan-ng/cli:init` installs `@spartan-ng/brain` (npm dependency) and `@angular/cdk`
  (if not already present as a matching-version peer), and wires the Helm style layer into the
  project.
- `ng g @spartan-ng/cli:ui-theme` writes the theme CSS block. The **official current setup is
  more layered than STACK.md's simplified snippet** — the real generated `styles.css` uses
  explicit Tailwind v4 cascade layers, not a bare `@import "tailwindcss";` followed by a loose
  `@theme {}`:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@import "@spartan-ng/brain/hlm-tailwind-preset.css";
@import "tw-animate-css";

:root {
  /* oklch-based CSS variables: --background, --foreground, --primary,
     --secondary, --accent, --destructive, --border, --chart-*, etc. —
     generated by the ui-theme schematic, not hand-written */
}

.dark {
  /* dark-mode variable overrides, same variable names */
}
```

  **This is a correction to STACK.md's Tailwind v4 snippet**, which showed the simpler
  `@import "tailwindcss"; @import "@spartan-ng/brain/hlm-tailwind-preset.css"; @import
  "tw-animate-css"; @theme { ... }` form. Both forms are valid Tailwind v4 CSS — the layered form
  is what the **official Spartan CLI actually generates** today and should be treated as the
  source of truth over the hand-written STACK.md snippet, since it is schematic-generated and not
  hand-maintained. **Let the `ng g @spartan-ng/cli:ui-theme` schematic write this file; do not
  hand-author it from the STACK.md snippet.** Confidence: MEDIUM-HIGH (confirmed from the official
  installation page's code sample; the exact file Spartan's schematic emits for version 1.7.0
  specifically was not fetched byte-for-byte from the published source in this session, so treat
  the schematic's own output as authoritative over any manually transcribed snippet, including
  this one).
- Peer dependencies confirmed via `npm view @spartan-ng/brain@1.7.0 peerDependencies` (live
  registry query this session): `clsx >=2.0.0`, `rxjs >=6.6.0`, `luxon >=3.0.0`, `tailwindcss
  >=4.0.0`, `@angular/cdk >=21.0.0 <23.0.0`, `@angular/core >=21.0.0 <23.0.0`, `@angular/forms
  >=21.0.0 <23.0.0`, `tw-animate-css >=1.0.0`, `@angular/common >=21.0.0 <23.0.0`. All of
  `clsx`, `luxon`, `tw-animate-css` must be added to `docs/sdd.md` §2 in the same change that runs
  this install, per the "no undocumented dependency" hard rule.

### Step 4 — Add components as needed

```bash
ng g @spartan-ng/cli:ui button
ng g @spartan-ng/cli:ui card
ng g @spartan-ng/cli:ui dialog
ng g @spartan-ng/cli:ui input
ng g @spartan-ng/cli:ui form-field
```

Spartan's CLI copies component source into the repo (shadcn-style "you own the code") rather than
installing a compiled library — confirmed by official docs language ("copies the Helm code into
your codebase"). Pick the minimum set Phase 1 actually needs to prove `ng serve` renders
something (e.g., `button`, `card`) — defer the rest to the phases that use them, to avoid
importing dead code into the Phase 1 diff.

### Step 5 — Icons

```bash
npm install lucide-angular --legacy-peer-deps
```

Required because `lucide-angular@1.0.0` declares `@angular/core: "13.x - 21.x"` — confirmed live
this session via `npm view lucide-angular peerDependencies`. Since the stack is pinned to Angular
`^21.x` (not `latest`/22), this is the *only* peer mismatch in the whole install — everything else
resolves cleanly without `--legacy-peer-deps` or `--force`.

### Step 6 — Supabase client

```bash
npm install @supabase/supabase-js@^2
```

### Step 7 — Remaining pinned utilities

```bash
npm install date-fns@^3 zod@^3
```

Pin explicitly with `@^3` — confirmed live this session that unpinned `npm install date-fns zod`
would resolve to `date-fns@4.4.0` and `zod@4.6.7` respectively (both are the current `latest` on
the registry), which STACK.md already flagged as the wrong choice for this project (Zod 4 changes
the `message`→`error` customization API; `@spartan-ng/cli@1.7.0` itself depends on Zod 3
internally).

### Step 8 — ESLint with the rubric-enforcing rule set

```bash
ng add @angular-eslint/schematics
```

See full rule configuration in the next section — this schematic creates the `eslint.config.js`
skeleton that the plan then edits to add `prefer-output-emitter-ref` (not included by default)
and to elevate the five target rules to `"error"`.

### Step 9 — Supabase CLI (project-local, versioned with the repo)

```bash
npm install -D supabase
npx supabase login
npx supabase init
```

### Verification gate for this entire sequence

```bash
ng build                     # must succeed, zero errors
npx eslint src --max-warnings=0   # must succeed once rules are configured (Step 8 follow-up)
find src -iname "*.module.ts"     # must return nothing
test ! -f tailwind.config.js && echo "no legacy Tailwind config present"
```

---

## ESLint Rule Set — Exact Rules, Packages, and Flat-Config Shape

### Fully-qualified rule names and package membership

Verified against the official `angular-eslint/angular-eslint` repository rule docs (fetched
directly this session) and `npm view` peer/version data:

| Checklist need | Fully-qualified rule name | Package | Autofix | Confirmed exists at current version? |
|---|---|---|---|---|
| No `*ngIf`/`*ngFor`/`*ngSwitch` | `@angular-eslint/template/prefer-control-flow` | `@angular-eslint/eslint-plugin-template` | No | Yes |
| No `@Input()`/`@ViewChild()`/`@ViewChildren()`/`@ContentChild()`/`@ContentChildren()` | `@angular-eslint/prefer-signals` | `@angular-eslint/eslint-plugin` | Yes (`--fix`) | Yes. **Confirmed limitation**: does not detect `BehaviorSubject`/RxJS `Subject` used as state — that gap has no lint rule, enforce via CI grep. |
| No `@Output()` | `@angular-eslint/prefer-output-emitter-ref` | `@angular-eslint/eslint-plugin` | Not confirmed fixable | **Yes — confirmed this session.** This closes the gap PITFALLS.md flagged as "only indirectly covered." Fetched directly from the official rule doc: flags the `@Output()` decorator and recommends `output()`. |
| No constructor DI | `@angular-eslint/prefer-inject` | `@angular-eslint/eslint-plugin` | Not confirmed fixable | Yes |
| No `standalone: false` | `@angular-eslint/prefer-standalone` | `@angular-eslint/eslint-plugin` | Yes (`--fix`, but a known upstream issue requests disabling autofix for this specific rule — verify manually after any `--fix` run rather than trusting it blindly) | Yes |
| `model()` where an `input()`+`xChange` `output()` pair exists | `@angular-eslint/prefer-signal-model` | `@angular-eslint/eslint-plugin` | Yes (`--fix`) | Yes |
| Two-way binding syntax correctness | `@angular-eslint/template/banana-in-box` | `@angular-eslint/eslint-plugin-template` | N/A (syntax-only) | Yes |

**All six rules named by the checklist's five indicators plus the newly-confirmed `@Output()`
rule exist at the current published version (`22.6.0`) and are not deprecated.** No rule needs a
"closest real alternative" substitution — unlike the research-priorities prompt anticipated as a
possibility, every named rule is real and current.

### Exact flat-config (`eslint.config.js`) shape

`ng add @angular-eslint/schematics` generates a base flat config. The plan must extend it with
the rules above set to `"error"` (the schematic does not set these specific five/six rules to
error by default — it ships Angular's general recommended presets, which treat some of these as
`"suggestion"`/off). Target shape:

```js
// eslint.config.js (flat config, ESM — generated base + rubric additions)
// @ts-check
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/prefer-standalone": "error",
      "@angular-eslint/prefer-signals": "error",
      "@angular-eslint/prefer-inject": "error",
      "@angular-eslint/prefer-signal-model": "error",
      "@angular-eslint/prefer-output-emitter-ref": "error",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/prefer-control-flow": "error",
      "@angular-eslint/template/banana-in-box": "error",
    },
  },
);
```

**Known current tooling wrinkle (confirmed via a live GitHub issue dated October 2026, same
month as this project):** `@angular-eslint/schematics` may generate the flat config using
CommonJS `require()` even though `eslint.config.js` is conventionally ESM. If the generated file
uses `require(...)`, leave it as CommonJS (the snippet above matches that form) rather than
hand-converting to `import` syntax, unless `"type": "module"` is also added to `package.json` —
mixing the two without that field throws at lint time. Pick one form consistently and verify with
a successful `npx eslint src --max-warnings=0` run before committing.

### What remains unenforceable by lint (confirmed, not newly discovered — matches PITFALLS.md)

- `BehaviorSubject`/`Subject` as state instead of `signal()` — no rule exists for this
  (`prefer-signals`' own docs explicitly scope it to decorator-based queries, not RxJS subjects).
  Enforce via CI step: `grep -rn "BehaviorSubject\|new Subject" src/app && exit 1 || exit 0`.
- `effect()` used where `computed()` belongs — semantic judgment call, no rule. Code-review
  checklist item, not CI-enforceable.
- `[(ngModel)]` — no rule bans it outright; `banana-in-box` only fixes malformed syntax if someone
  tries to use it wrong. Mitigation already identified in PITFALLS.md: never import `FormsModule`,
  which makes `ngModel` fail to compile for lack of the directive.

### Verification command for success criterion 4

```bash
npx eslint src --max-warnings=0
```

Must fail (non-zero exit) when any of: `*ngIf`/`*ngFor` in a template, `@Input()`/`@Output()` in
a `.ts` file, a constructor parameter used for injection, or `standalone: false`. Each of those
four cases maps 1:1 to one of the rules in the table above being present and set to `"error"`.

---

## Two-User RLS Verification Procedure (DB-10)

This is the exact mechanism to satisfy success criterion 3 — "testando manualmente no SQL Editor
com dois usuários distintos... usuário B não lê/escreve linhas pertencentes a usuário A."

### Step 1 — Create two real test users via Supabase Auth (not `auth.users` direct INSERT)

Direct `INSERT INTO auth.users` is fragile (Supabase's Auth schema has triggers and encrypted
password handling that direct SQL bypasses incorrectly). Use the Auth API or Dashboard instead:

```bash
# Via Supabase CLI against a linked project, or via the Dashboard's
# Authentication → Users → "Add user" (email + password, mark "Auto Confirm User").
# Two users are enough to prove isolation:
#   test-admin@utfsecret.dev  (will create a group)
#   test-participant@utfsecret.dev  (will join that group)
```

Confirm "Confirm email" is disabled project-wide for this dev/demo project (per PITFALLS.md
Pitfall 9) so these test accounts can log in immediately without an email round-trip.

### Step 2 — Simulate each user's session inside the SQL Editor

The SQL Editor runs as the `postgres` superuser by default, which bypasses RLS entirely — a
naive `select * from draw` there proves nothing. The documented Supabase pattern to actually
impersonate a given `authenticated` user inside a transaction:

```sql
begin;

-- Switch to the `authenticated` role (RLS only applies to policies that
-- target this role, per the policies in ARCHITECTURE.md's `to authenticated` clauses).
set local role authenticated;

-- Fake the JWT claims the way PostgREST/Supabase would inject them for this user.
-- Replace with the real `id` from auth.users for test-admin / test-participant.
set local request.jwt.claims = '{"sub": "<user-A-uuid>", "role": "authenticated"}';

-- Now any query runs exactly as it would for user A through the API.
select * from public.draw;          -- should show ONLY rows where giver_id belongs to user A
select * from public.participant;   -- should show ONLY rows in groups user A belongs to
select * from public.group;         -- should show ONLY groups user A admins or participates in

rollback;  -- always rollback — this is a read-only probe, never commit test-session state
```

Repeat with `<user-B-uuid>` in a second transaction. The acceptance condition: **user B's
`select * from public.draw` must never return a row whose `giver_id` resolves to a `participant`
row owned by user A**, and vice versa.

**Attempt the write-side negative test too** (proves DB-08, not just DB-07):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "<user-A-uuid-who-is-group-admin>", "role": "authenticated"}';

-- This MUST fail with "new row violates row-level security policy" or
-- "permission denied for table draw" — there is no INSERT policy for authenticated at all.
insert into public.draw (group_id, giver_id, receiver_id)
values ('<some-group-id>', '<some-participant-id>', '<other-participant-id>');

rollback;
```

If this INSERT succeeds, DB-08 has failed and a policy exists that should not.

### Step 3 — Verification queries to prove DB-06 (RLS actually enabled) and absence of `using (true)`/recursion

```sql
-- DB-06: confirm RLS is enabled on all 4 tables (success criterion 2's literal query)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profile', 'group', 'participant', 'draw');
-- every row must show rowsecurity = true

-- Inspect every policy's actual USING/WITH CHECK expression — confirm none is
-- literally `true`, and none references `admin_id` on the `draw` table.
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Manually scan the `qual`/`with_check` columns for the literal string `true` as a standalone
condition (not e.g. `is_admin = true` inside a real predicate — read each one) and for any mention
of `admin_id` on a `draw` row. Neither of the SQL snippets in `ARCHITECTURE.md` contains either
pattern, but this query is the actual mechanical proof for the plan's verification step, not just
a visual code review.

### Step 4 — Confirm no 42P17 recursion

Recursion only surfaces at query time, not at `CREATE POLICY` time. The functional proof is simply
that Step 2's queries above all return successfully (no error) rather than throwing `ERROR:
infinite recursion detected in policy for relation "..."`. If any of them throws 42P17, the
specific table named in the error is the one whose policy still queries itself directly instead
of going through `private.my_group_ids()`/`private.my_participant_ids()`.

---

## Secret-Leak Verification (DB-11, success criterion 5)

### Supabase key naming — legacy vs. new scheme (verify which applies at project creation time)

Per `.planning/research/PITFALLS.md` (already researched, HIGH confidence, confirmed against
official Supabase migration docs): Supabase is deprecating `anon`/`service_role` key names during
2026 in favor of `sb_publishable_...` (client-safe, replaces `anon`) and `sb_secret_...`
(server-only, replaces `service_role`). Since this project's Supabase project is created in
October 2026, **check the actual dashboard at project-creation time** (Settings → API) to see
which key pair is issued, and name environment variables to match whichever pair actually exists
— do not assume one scheme without checking, since Supabase's rollout is project-by-project, not
a single global cutover date.

### Grep verification command (run against the production build output, not source)

```bash
# Build production bundle first
ng build

# Then grep the actual compiled output — this is what ships to the browser
grep -r "sb_secret_\|service_role" dist/ && echo "LEAK FOUND — BLOCK DEPLOY" || echo "clean"
```

This must be a CI gate (run on every PR, not just manually before submission) — exact mechanics
of wiring it into GitHub Actions or a Vercel build step belongs to the plan, not this research,
but the command itself is the artifact needed to write that step.

### Mechanical guarantee that the secret key is never reachable at the source level

```bash
grep -rn "service_role\|SERVICE_ROLE\|sb_secret_" src/ environments/ && echo "FOUND IN SOURCE — FIX BEFORE BUILD" || echo "clean"
```

Run this before the build-output grep above — catching it in source is cheaper than catching it
in `dist/`. The `service_role`/`sb_secret_` key must exist **only** as a Supabase Edge Function
environment variable (`supabase secrets set SUPABASE_SECRET_KEY=...` or the dashboard's Edge
Function secrets panel), never in `.env`, `environment.ts`, `environment.prod.ts`, or any file
that ends up in the Angular build.

---

## Vercel Deploy (ENG-05)

### Auto-detection — try before configuring manually

Current Vercel docs and multiple 2026-dated community write-ups (cross-verified, consistent)
confirm: Vercel auto-detects Angular projects created with the standard CLI and defaults to
**Build Command: `ng build`, Output Directory: `dist/<project-name>/browser`** when it recognizes
an Angular project (presence of `angular.json`). This is a stronger auto-detect claim than
STACK.md's "confiança MÉDIA-ALTA, vale testar o auto-detect primeiro" — multiple sources
independently describe this as working out of the box for a plain `ng new` + `ng build` project
with no SSR. **Recommendation: connect the repo to Vercel first, let it build without a
`vercel.json`, and only add `vercel.json` if the auto-detected output directory is wrong** (verify
by checking the Vercel deployment's build log for the detected output path).

### `vercel.json` fallback, if auto-detect misses

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/amigo-secreto/browser",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` block is **not optional** regardless of auto-detect accuracy — it is required for
any Angular SPA client-side routing to survive a direct deep-link request (`/join/<token>`, per
PITFALLS.md Pitfall 12), and Vercel's auto-detect does not infer this from `angular.json` alone
(confirmed: this is an Angular-Router-specific need, not something Vercel's static-site detector
can know about). **Always include the `rewrites` block even if everything else is auto-detected.**

### Environment variables reaching a client-side Angular build

Angular resolves `environment.ts`/`environment.prod.ts` at **build time**, not runtime — there is
no Angular-native mechanism to read `process.env` in the browser after the fact. The idiomatic
2026 approach (confirmed consistent across STACK.md, PITFALLS.md, and this session's search):

1. Set `SUPABASE_URL` and the publishable/anon key in Vercel's Project Settings → Environment
   Variables (scoped per environment: Production/Preview/Development).
2. Add a `prebuild` npm script that writes `src/environments/environment.prod.ts` from
   `process.env` before `ng build` runs:

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-env.js",
    "build": "ng build"
  }
}
```

```js
// scripts/generate-env.js
const fs = require('node:fs');

const content = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseAnonKey: '${process.env.SUPABASE_PUBLISHABLE_KEY}',
};
`;

fs.writeFileSync('src/environments/environment.prod.ts', content);
```

Vercel runs `npm run build` (or whatever `buildCommand` is configured), and npm's `prebuild`
lifecycle hook runs automatically before it — no extra Vercel configuration needed for this
script to fire. Never commit a populated `environment.prod.ts` — keep it out of git (via
`.gitignore`) and generated fresh on every build, in CI and locally alike (a `.env.example` +
local `generate-env.js` run documents the local-dev equivalent).

---

## MCP Servers (ENG-10)

### Supabase MCP server

Official, hosted, OAuth-based (no local process to run):

```bash
claude mcp add --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>&read_only=true"
```

- `project_ref` scopes the server to exactly one Supabase project — account-management tools
  (creating/deleting other projects) are disabled once scoped.
- `read_only=true` is the documented safety default Supabase itself recommends and should be the
  configuration documented in the SDD — it lets the agent inspect schema/RLS/logs without being
  able to run destructive migrations through the MCP channel. If migrations need to be applied
  via MCP during active development, toggle this off deliberately and document that choice, never
  leave write access on as the default for the delivered project.
- **Security caveat to document in the SDD verbatim**, since ENG-10 explicitly requires this:
  granting an agent read-write DB access via MCP means any prompt injection reaching that agent
  session (e.g., from fetched web content, a malicious PR description, or any untrusted text the
  agent reads) could attempt to issue SQL through the MCP connection. Scoping to one project +
  `read_only=true` is the mitigation, not a complete elimination of the risk — treat the MCP
  connection with the same suspicion as any other credential with blast radius, and never run it
  against a production Supabase project with write access enabled by default.

### Figma MCP server

Official, two install paths (desktop or remote); remote is simpler and matches a web-based course
project with no desktop Figma requirement:

```bash
claude mcp add --transport http figma "https://mcp.figma.com/mcp"
```

Authenticate to Figma when prompted. This is link-based in use: copy a Figma layer/frame link
from the "Dev Mode" selection and paste it into the agent's context to pull design tokens/specs —
matches the SDD §1's stated purpose ("Ler design tokens, cores, tipografia e hierarquia visual").

### Bonus finding: official Angular CLI MCP server (not currently in the SDD, worth adding)

```bash
npx @angular/cli mcp
```

This is built into the Angular CLI itself (no separate package) and exposes dev-server
start/stop, `list_projects`, `run_target` (build/test/lint), `search_documentation`, and a
`get_best_practices` tool. It supports `--read-only` and `--local-only` flags for safety. This is
not required by ENG-10 (which names Supabase/Figma specifically) but is directly relevant to a
project graded on correct modern-Angular-API usage, and costs nothing to document alongside the
other two. Recommendation: mention it in the SDD's MCP section as an optional addition, not a
hard requirement.

---

## GitHub Projects via `gh` CLI (ENG-08)

### Required scope

```bash
gh auth refresh -s project
gh auth status   # confirm the `project` scope now appears
```

### Create the board (Projects v2, scriptable, confirmed via official `gh` manual)

```bash
gh project create --owner "@me" --title "UTF-Secret Kanban"
```

Returns the new project's URL/number in the terminal; add `--format json` to script around it.

### Populate it from Issues (preferred over manual drag-and-drop, since ENG-08 asks for user
stories as Issues, not just free-floating cards)

```bash
# 1. Create an Issue per user story (from docs/prd.md §4)
gh issue create --title "Como administrador, quero criar um grupo" \
  --body "User story + acceptance criteria" --label "user-story"

# 2. Add that issue to the project board
gh project item-add <PROJECT_NUMBER> --owner "@me" --url "<issue-url-from-step-1>"
```

`gh project item-add` accepts `--format json` for scripting and is confirmed to accept an
Issue/PR URL directly — no need to go through `item-create` (which creates a draft item with no
backing Issue; since ENG-08 explicitly wants "User Stories geradas... como Issues," real Issues
via `gh issue create` + `gh project item-add` is the correct pairing, not draft items).

**Confidence note:** the exact flags for `gh project item-create` (draft-item creation without a
backing Issue) were not fully retrievable from the official manual page in this session — but
since the requirement is specifically "Issues em um Kanban," the `issue create` → `item-add` path
is both sufficient and more correct for this requirement than `item-create` would be, so this gap
does not block planning.

---

## Common Pitfalls

Already exhaustively covered in `.planning/research/PITFALLS.md` (14 pitfalls, HIGH confidence
for lint/RLS, MEDIUM for Vercel specifics) — this document does not duplicate that list. The
items from PITFALLS.md most load-bearing for Phase 1 specifically, by pitfall number: **1**
(old Angular syntax — now with the `prefer-output-emitter-ref` correction above), **2** (`NgModule`
reappearing), **4** (RLS recursion 42P17), **5** (`service_role` leaking), **9** (email
confirmation blocking demo accounts — resolve in the same Supabase setup session as DB-10's test
users), **12** (deep-link 404 on Vercel), **13** (`dist/<app>/browser` output path mismatch), **14**
(env vars not reaching the Vercel build).

One addition not in PITFALLS.md: **Spartan's `ui-theme` schematic output may differ from any
hand-written snippet in STACK.md** (see Scaffold Step 3 above) — treat the schematic's generated
file as authoritative, never overwrite it with a copy-pasted snippet from prior research.

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|---|---|---|---|
| Karma + Jasmine test runner | Vitest, default since Angular 21 | Angular 21 (Nov 2025) | `.spec.ts` syntax uses `vitest`'s `vi.fn()`/`vi.spyOn()`, not Jasmine's `spyOn()` |
| `tailwind.config.js` with `content: [...]` | CSS-first `@theme`/`@layer` blocks in `styles.css` | Tailwind v4 (2025) | No JS config file exists in this project at all |
| `provideZonelessChangeDetection()` called manually | Zoneless is the `ng new` default | Angular 21 | Don't copy older zoneless-migration tutorials that call the provider explicitly — harmless but redundant |
| `anon`/`service_role` Supabase key names | `sb_publishable_...`/`sb_secret_...` | Rolling out through 2026, project-by-project | Must check the actual project dashboard, not assume either scheme |
| `@angular-eslint` versions pinned tightly to Angular major | Independently versioned (`22.6.0`), peers only on `eslint`/`typescript`/`@typescript-eslint/utils` | Current as of this session's `npm view` | Installing `@angular-eslint` on an Angular `^21.x` project needs no special version pinning |

**Deprecated/outdated:** Karma (deprecated since 2023, still functions but is not the `ng new`
default and should not be chosen for a new project); `tailwind.config.js` for any project using
Spartan UI 1.7.x (hard-blocked by the `tailwindcss >=4.0.0` peer, which itself eliminated the
JS config file).

## Open Questions

1. **Exact byte-for-byte output of `ng g @spartan-ng/cli:ui-theme` for `@spartan-ng/brain@1.7.0`.**
   - What we know: the official installation page shows the general shape (CSS layers, oklch
     variables, dark-mode block).
   - What's unclear: the exact variable names and default color values the schematic writes,
     since those come from the schematic's own template file, not the prose documentation page.
   - Recommendation: run the schematic during Phase 1 execution and inspect the actual generated
     `styles.css` rather than pre-writing it from this research — treat this research's CSS
     snippet as "shape to expect," not "literal file to paste."

2. **Whether `ng new --style=css` then `ng add tailwindcss` behaves identically to
   `ng new --style=tailwind`** when followed by Spartan's `init` schematic.
   - What we know: both are documented, valid paths to a working Tailwind v4 setup individually.
   - What's unclear: whether Spartan's `init` schematic has been tested against projects scaffolded
     either way, or only against the `ng add tailwindcss` path.
   - Recommendation: use the two-step path (`--style=css` then `ng add tailwindcss`) as specified
     in this document, since it's the one with an independently traceable official source per step.

3. **Exact generated form of `eslint.config.js` from `ng add @angular-eslint/schematics` at
   version `22.6.0`** (CommonJS `require()` vs ESM `import`).
   - What we know: a live GitHub issue (October 2026) reports the schematic currently emits
     CommonJS-style `require()` in the flat config, which is non-standard but functional.
   - What's unclear: whether this is fixed by the time the plan executes, given the issue was
     filed the same month as this research.
   - Recommendation: inspect the actually-generated file after running the schematic in Phase 1
     execution, and match the rule-addition snippet's module syntax to whatever the schematic
     produced, rather than assuming either form in advance.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Entire scaffold | ✓ (assumed present; verify with `node -v`/`npm -v` before Step 1) | — | — |
| `npx`/`@angular/cli` | `ng new`, all `ng add`/`ng g` steps | ✓ (fetched via `npx` on demand, no global install required) | resolves to `21.2.25` via explicit `@21` pin | — |
| `gh` CLI | GitHub Projects/Issues automation | Not probed in this session — verify locally (`gh --version`) before relying on scripted Kanban setup | — | If absent, GitHub Projects UI (manual) is the fallback — slower but functionally equivalent for ENG-08 |
| `supabase` CLI | Edge Functions (Phase 4), but `supabase init`/`login` used in Phase 1 setup | Installed as project devDependency in Step 9, not assumed globally present | — | — |
| Vercel account + repo connection | ENG-05 | External account setup, not a local tool — not probed | — | None; this is a hard requirement, no fallback exists for "automated deploy on push to main" |

**Missing dependencies with no fallback:** none identified that would block Phase 1 execution —
all required tools are either bundled (`npx`), installed as part of the scaffold sequence itself,
or are account-based services (Vercel, GitHub, Supabase) assumed already provisioned per
`.planning/STATE.md`'s "Ready to plan" status.

**Missing dependencies with fallback:** `gh` CLI absence falls back to the GitHub Projects web UI
for Kanban setup (manual, not scripted) — functionally equivalent for the rubric's purposes but
loses the "scriptable" preference stated in the research priorities.

---

## Sources

### Primary (HIGH confidence)
- `npm view` against the live npm registry, 2026-10-14 (this session) — exact versions and peer
  dependencies for `@angular/core`, `@angular/cli`, `@angular/cdk`, `@angular-eslint/eslint-plugin`,
  `@angular-eslint/schematics`, `@spartan-ng/brain`, `lucide-angular`, `@supabase/supabase-js`,
  `vitest`, `date-fns`, `zod`, `@angular/pwa`.
- [angular.dev/cli/new](https://angular.dev/cli/new) — `ng new` flags and defaults, confirmed
  `--standalone` defaults to `true`.
- [GitHub: angular-eslint/eslint-plugin/docs/rules/prefer-output-emitter-ref.md](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/prefer-output-emitter-ref.md) — confirms this rule exists and targets `@Output()` directly.
- [spartan.ng/documentation/installation](https://spartan.ng/documentation/installation) and
  [spartan.ng/documentation/cli](https://spartan.ng/documentation/cli) — official install steps,
  CSS-layer wiring, confirms `init`/`ui-theme`/`ui` command names.
- [GitHub CLI manual — gh project create](https://cli.github.com/manual/gh_project_create) —
  exact flags for Projects v2 board creation.
- [Supabase MCP official server docs](https://mcpservers.org/servers/supabase-community/supabase-mcp) and cross-referenced setup guides — `project_ref`/`read_only` query-param scoping confirmed consistent across multiple independent 2026-dated sources.
- [Figma Dev Mode MCP server — remote install](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) — official remote server URL and auth flow.
- [angular.dev — Angular CLI MCP server](referenced via WebFetch this session) — confirms
  `npx @angular/cli mcp` as the official built-in MCP server with `--read-only`/`--local-only`.

### Secondary (MEDIUM confidence)
- [Ninja Squad — What's new in Angular 21.0](https://blog.ninja-squad.com/2025/11/20/what-is-new-angular-21.0) and [Angular Architects — What's new in Angular 21](https://www.angulararchitects.io/blog/whats-new-in-angular-21-signal-forms-zone-less-vitest-angular-aria-cli-with-mcp-server/) — cross-verified confirmation of zoneless-by-default and Vitest-by-default in v21, consistent with official release blog.
- [Vercel auto-detect behavior for Angular](cross-verified via WebSearch, multiple 2025/2026-dated community sources agreeing on `dist/<project>/browser` auto-detection) — no single official Vercel doc page was fetched verbatim for this specific claim, but convergence across independent sources raises this above LOW.
- [GitHub issue #3261 — `@angular-eslint/schematics` generates CommonJS `eslint.config.js`](https://github.com/angular-eslint/angular-eslint/issues/3261) — live, dated October 2026, same month as this research; treat as current but subject to being patched before/during execution.

### Tertiary (LOW confidence)
- Exact byte-for-byte content of the Spartan `ui-theme` schematic's generated CSS for version
  `1.7.0` specifically — inferred from the installation page's illustrative example, not fetched
  from the schematic's actual source template. Flagged explicitly in Open Questions above.

## Metadata

**Confidence breakdown:**
- Scaffold commands (Angular/Tailwind/Spartan): HIGH for Angular/Tailwind steps (official docs +
  live registry), MEDIUM-HIGH for Spartan's exact generated CSS (official shape confirmed, exact
  byte content not independently verified against the installed schematic).
- ESLint rule set: HIGH — every rule name and package confirmed directly against the official
  angular-eslint repository's rule documentation pages, live this session.
- Two-user RLS procedure: HIGH — `set local role`/`set local request.jwt.claims` is the documented
  Supabase pattern for simulating authenticated sessions in the SQL Editor; the policies being
  tested are already HIGH confidence per ARCHITECTURE.md.
- Vercel deploy: MEDIUM-HIGH — auto-detect behavior cross-verified across multiple sources but no
  single official Vercel page was fetched verbatim confirming the exact default output path string.
- MCP servers: HIGH for Supabase/Figma (official docs), MEDIUM for exact `gh project item-create`
  flag set (not fully retrieved, but the recommended path avoids needing it).

**Research date:** 2026-10-14
**Valid until:** ~30 days for the scaffold/ESLint/MCP sections (fast-moving ecosystem — Angular,
Spartan, and angular-eslint all ship frequently); ~60-90 days for the RLS verification procedure
and Vercel rewrite mechanics (stable, unlikely to change). Re-verify `npm view` outputs if
execution is delayed past early November 2026.

---
*Research for: UTF-Secret Phase 1 — Fundação (Scaffold, Banco e RLS)*
*Researched: 2026-10-14*
