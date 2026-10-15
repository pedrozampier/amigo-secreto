# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**UTF-Secret** — an online Secret Santa ("Amigo Secreto") system. Final project for an
academic course on front-end development with frameworks and components
(*Desenvolvimento de Aplicações Front-End com Frameworks e Componentes*).

Core privacy rule that drives the whole design: **the group admin never sees the drawn
pairs.** Each participant can read only their own result, enforced at the database level
via Supabase RLS — not merely hidden in the UI.

## Current state

**The repository contains specification documents only — no application code yet.**
There is no `package.json`, no `src/`, no Angular workspace. The Angular app has to be
scaffolded before any feature work can begin.

- `docs/prd.md` — Product Requirements Document: scope, actors, user stories, business rules, non-goals.
- `docs/sdd.md` — Software Design Document: stack with pinned versions, ER diagram (Mermaid), TypeScript contracts, folder scaffolding, route map, RLS policies, draw algorithm.
- `docs/checklist.md` — the **grading rubric** (RA1–RA8, IDs 1–32). Untracked; see below.
- `README.md` — currently just a title; per rubric ID29 it must eventually consolidate the PRD (ER diagram + design system).

The PRD and SDD are the source of truth. When implementing, read the relevant section
first and follow it rather than inventing a parallel design. If the code must diverge
from a spec, update the spec document in the same change.

## The rubric is a hard constraint

`docs/checklist.md` lists the competencies this project is graded on. It is not a
suggestion list — several items mandate *specific* modern Angular APIs, so the obvious
or older way of writing something is often the wrong answer here. In particular:

- **Standalone components only** — never `NgModule` (ID3).
- **Signals** as the single source of state: `signal()`, `computed()`, `effect()`,
  and `model()` for two-way binding (ID9–ID12).
- **`inject()`** for dependency injection, never constructor injection (ID14).
- **`input()` / `output()` functions** for parent↔child communication, not the
  `@Input()` / `@Output()` decorators (ID13).
- **New control flow**: `@if`, `@switch`, `@for` — and `@for` *always* needs `track`
  (ID5, ID6). No `*ngIf` / `*ngFor`.
- **`@defer`** (Deferrable Views) for at least one heavy component (ID8).
- **Routing** via `provideRouter` with `withComponentInputBinding`, route params
  consumed as component inputs, nested child routes, functional guards and resolvers
  (ID15–ID18).
- **Functional interceptors** for auth token injection and centralized error handling (ID22).
- **Reactive Forms** with validation messages and a submit button disabled while invalid (ID23).
- **`toSignal()` / `toObservable()`** to bridge RxJS and Signals (ID24).
- **PWA**: `manifest.webmanifest` with icons, theme colors, splash screen, standalone
  display mode, plus a sensible offline visual state (ID3/RA1).
- **Mobile-first** responsive layout, working from 320px up; WCAG 2.1 AA.
- **Unit tests** (`.spec.ts`) targeting the business rules (ID32).

When there's a choice between two working implementations, pick the one that
demonstrates a rubric item.

## Stack (fixed — see `docs/sdd.md` §2)

Angular 17+ (standalone + signals) · Supabase JS ^2.x (PostgreSQL + Auth + RLS) ·
Tailwind CSS ^3.x · Spartan UI (HLM) · Lucide Angular · date-fns ^3.x · Zod ^3.x ·
Vercel for deploy.

**Do not add dependencies outside this list.** The SDD states it explicitly: no external
dependency may be installed without being reflected in that table first.

## Architecture to build toward

Folder layout, the full route table with guards, and the three core singleton services
(`AuthService`, `GroupService`, `DrawService`) are specified in `docs/sdd.md` §5. Follow
that structure: `core/` (services, guards, interceptors), `features/` (one folder per
page), `shared/` (reusable components, pipes).

Data model: `profile`, `group`, `participant`, `draw`. TypeScript interfaces are already
written out in `docs/sdd.md` §4 — reuse them verbatim as the contract.

## Business rules that must be enforced, not assumed

From `docs/prd.md` §5:

1. Minimum **3 participants** to run a draw.
2. The draw is **irreversible** and can run **only once** per group.
3. Nobody draws themselves.
4. The **admin has no access** to the pairs (RLS on `draw`: a participant reads only the
   row where they are `giver_id`; the admin gets no special grant).
5. Invite links are **single-use per e-mail**.
6. After the draw, nobody new can join.
7. Wish lists are optional and editable until the group closes.

Group status is a state machine: `open → drawing → closed`.

The draw itself runs in a **Supabase Edge Function**, never on the client, so pairs are
never exposed to the browser that triggered it (Fisher-Yates shuffle → circular pairing
→ single transaction insert → set `status = 'closed'`). See `docs/sdd.md` §7.

## Git workflow

Simplified Gitflow, and it is itself graded (ID25–ID27): `main` and `develop` branches,
integration through **Pull Requests**. History shows feature work merging into `develop`,
then `develop` → `main` via PR.

Work on `develop` or a branch off it — not directly on `main`. Commit messages follow
Conventional Commits (`docs:`, `feat:`, `fix:`), as in the existing history.

## Language

Documentation and user-facing UI text are in **Brazilian Portuguese**. Code identifiers,
database entities, and commit messages are in **English** — `docs/sdd.md` §3.1 holds the
PT-BR → EN mapping (Grupo → `group`, Participante → `participant`, Sorteio → `draw`).
Keep that split.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**UTF-Secret — Sistema de Amigo Secreto Online**

**Core Value:** O sorteio é privado de verdade — garantido pelo banco de dados (RLS), não pela interface —
e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

**Decided and locked** (resolved 2026-10-14 — do not re-open these as open questions;
`docs/sdd.md` §2 and §2.1 are the source of truth):

| Camada | Tecnologia | Versão |
|:-------|:-----------|:-------|
| Core | Angular (Standalone + Signals, zoneless) | **^21.x (LTS)** |
| BaaS & Auth | Supabase JS | ^2.x |
| Estilização | Tailwind CSS (CSS-first, sem `tailwind.config.js`) | **^4.x** |
| UI Components | Spartan UI (HLM) | ^1.7.x |
| UI Primitives | Angular CDK (peer do Spartan) | ^21.x |
| Ícones | Lucide Angular | ^1.x |
| Utilitários | date-fns | ^3.x |
| Validação | Zod | ^3.x |
| Testes | Vitest (padrão do Angular 21+, substitui Karma) | — |
| Deploy | Vercel | — |

**Why these versions** (the two deviations from SDD v1.0.0 were deliberate):

- **Angular ^21.x, not 17 and not 22.** The rubric (ID31) asks for "Angular 20+", and
  `@spartan-ng/brain@1.7.0` declares `@angular/core >=21.0.0 <23.0.0`. v21 is the newest
  LTS satisfying both, and it also stays inside `lucide-angular`'s declared peer range
  (`13.x - 21.x`), so no `--legacy-peer-deps` is needed. v21+ scaffolds zoneless + Vitest.
- **Tailwind ^4.x, not ^3.x.** `@spartan-ng/brain@1.7.0` requires `tailwindcss >=4.0.0`.
  Pinning v3 makes Spartan uninstallable (`ERESOLVE`). The rubric's ID4 only asks for "a
  modern CSS framework", so the bump costs nothing in grading. Consequence: there is **no
  `tailwind.config.js`** — use `@import "tailwindcss";` plus a `@theme {}` block in
  `styles.css`, and the `@tailwindcss/postcss` PostCSS plugin.
- **Spartan also peer-depends on `luxon`.** It coexists fine with `date-fns`; luxon serves
  Spartan's internal date components, `date-fns` is the application's date library.

**Do not add dependencies outside this table** without updating `docs/sdd.md` §2 first —
the SDD states this as a hard rule.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Full design in `.planning/research/ARCHITECTURE.md` (copy-pasteable SQL + Edge Function).
The load-bearing decisions:

**Privacy is enforced in the database, never in the UI.** The `draw` table's only SELECT
policy is `giver_id in (select private.my_participant_ids())`. No policy references
`admin_id`. There is **no INSERT/UPDATE/DELETE policy for `authenticated` at all** — the
sole writer is the Edge Function holding the `service_role` key, which never reaches a
browser. If you are ever tempted to add "or the admin can see it" to that policy, you have
destroyed the point of the project.

**RLS recursion is the main footgun.** A policy on `participant` that `SELECT`s
`participant` throws `42P17 infinite recursion detected in policy`. The fix is
`SECURITY DEFINER` helper functions (`private.my_group_ids()`,
`private.my_participant_ids()`) in a **`private` schema** (never `public`, or they become
callable through the Data API) with `set search_path = ''` and schema-qualified names.
Write these before any `CREATE POLICY`.

**The draw** runs in a Supabase Edge Function: Fisher-Yates shuffle → circular pairing
(`p[i]` gives to `p[(i+1) % n]`) → single multi-row INSERT → `status = 'closed'`.
No self-assignment is *structurally* guaranteed, not probabilistic: in a permutation,
`p[i] != p[(i+1) mod n]` always. Note for the oral defense: a single Hamiltonian cycle is
a strict subset of derangements — it cannot produce mutual pairs (A↔B) — which is desirable
here but is not a uniformly random derangement.

**Double-draw prevention** is an atomic conditional update — `UPDATE group SET
status='drawing' WHERE status='open'`, abort if zero rows affected — plus
`UNIQUE (group_id, giver_id)`. Not a disabled button.

**`supabase-js` never passes through Angular's `HttpClient`** — it uses its own `fetch`.
So functional interceptors (ID22) cannot apply to Supabase traffic, and they don't need to
(the client attaches the JWT itself). The BrasilAPI holidays call is the only `HttpClient`
traffic in the project, which makes it the one legitimate place for interceptors.

**Known technical debt** (documented, not a bug): the Edge Function's pair-INSERT and the
`status='closed'` UPDATE are not atomic with each other. The remedy is a transactional
plpgsql RPC; acceptable for the MVP, tracked as V2-01 in `.planning/REQUIREMENTS.md`.

**State management:** plain Signals in services. No NgRx — four entities and one algorithm
do not justify a store library.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
