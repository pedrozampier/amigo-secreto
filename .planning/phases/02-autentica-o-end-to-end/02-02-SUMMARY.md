---
phase: 02-autentica-o-end-to-end
plan: 02
subsystem: ui
tags: [spartan-ui, angular, tailwind, reactive-forms, hlm]

# Dependency graph
requires:
  - phase: 01-fundacao-scaffold-banco-rls
    provides: "libs/ui/{button,card,utils} Spartan primitives, components.json non-interactive config, tsconfig.json path alias pattern"
provides:
  - "libs/ui/input/ with HlmInput directive, importable via @spartan-ng/helm/input"
  - "libs/ui/label/ with HlmLabel directive, importable via @spartan-ng/helm/label"
  - "docs/sdd.md §2.1 record of which Spartan primitives exist locally and why field/separator were skipped"
affects: [02-04-login-register-forms]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Spartan UI primitives generated on-demand via ng g @spartan-ng/cli:ui <name>, never hand-written or npm-installed"]

key-files:
  created:
    - libs/ui/input/src/index.ts
    - libs/ui/input/src/lib/hlm-input.ts
    - libs/ui/label/src/index.ts
    - libs/ui/label/src/lib/hlm-label.ts
  modified:
    - tsconfig.json
    - docs/sdd.md

key-decisions:
  - "Generated only input and label, not field — field pulls separator + @ng-icons/core + @ng-icons/lucide peers absent from docs/sdd.md §2"

patterns-established:
  - "Spartan primitive style tokens (spartan-input, spartan-label) must be verified as substituted with real Tailwind classes immediately after generation — grep for the literal token name"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 10min
completed: 2026-10-15
---

# Phase 2 Plan 2: Spartan Input and Label Primitives Summary

**Generated HlmInput and HlmLabel Spartan UI directives via the CLI generator, added their tsconfig path aliases, and documented the local-codegen nature of the change in docs/sdd.md §2.1 — zero new npm dependencies.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-15 (exact start not recorded at session boundary)
- **Completed:** 2026-10-15T03:24:01Z
- **Tasks:** 2 completed
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- `libs/ui/input/src/lib/hlm-input.ts` exports `HlmInput` (`[hlmInput]` selector) with Tailwind classes correctly substituted for the `spartan-input` style token
- `libs/ui/label/src/lib/hlm-label.ts` exports `HlmLabel` (`[hlmLabel]` selector) with Tailwind classes correctly substituted for the `spartan-label` style token
- Both importable via the same `@spartan-ng/helm/<name>` alias pattern already used by `button`/`card`/`utils`
- `docs/sdd.md` §2.1 now documents which Spartan primitives exist locally and the deliberate exclusion of `field`/`separator`

## Task Commits

Each task was committed atomically:

1. **Task 1: Gerar as primitivas Spartan input e label e confirmar a substituição de estilo** - `505067b` (feat)
2. **Task 2: Registrar as primitivas geradas em docs/sdd.md §2.1** - `b262825` (docs)

**Plan metadata:** (this commit, see below)

## Files Created/Modified
- `libs/ui/input/src/lib/hlm-input.ts` - `HlmInput` directive, hosts `BrnInput` + `BrnFieldControlDescribedBy`, Tailwind classes inline via `classes()`
- `libs/ui/input/src/index.ts` - barrel export + `HlmInputImports`
- `libs/ui/label/src/lib/hlm-label.ts` - `HlmLabel` directive, hosts `BrnLabel`, Tailwind classes inline via `classes()`
- `libs/ui/label/src/index.ts` - barrel export + `HlmLabelImports`
- `tsconfig.json` - added `@spartan-ng/helm/input` and `@spartan-ng/helm/label` path aliases (the 3 pre-existing aliases for `button`/`utils`/`card` left intact)
- `docs/sdd.md` - new §2.1 paragraph recording the generated primitives and the `field` exclusion rationale

## Decisions Made
- Generated `input` and `label` only, not `field` — `field` depends on `separator` and pulls `@ng-icons/core` + `@ng-icons/lucide` peers, none of which are in the locked stack table (`docs/sdd.md` §2). A label + input + plain `<p>` error message satisfies checklist ID23 without expanding the dependency tree.
- Followed the plan's generation order (`input` then `label`) one command at a time rather than batching, to isolate any interactive-prompt failure to a single primitive if `components.json` had been misconfigured — it wasn't, so both ran non-interactively.

## Deviations from Plan

None - plan executed exactly as written. Both `ng g @spartan-ng/cli:ui` invocations ran non-interactively (per the pre-existing `components.json`), the style-token substitution was confirmed empty on the first grep (no manual Tailwind-class patching was needed), and `package.json` stayed byte-for-byte unchanged throughout.

One incidental side effect outside the plan's `files_modified` list: the generator also touched `tsconfig.app.json` (its `include` array), but `git diff tsconfig.app.json` showed zero net changes after both generations — the file already included `libs/ui/**/src/**/*.ts`. Not committed since there was no diff.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `HlmInput` and `HlmLabel` are ready for the login/register Reactive Forms in plan 02-04 — they can be imported today via `@spartan-ng/helm/input` and `@spartan-ng/helm/label`.
- No blockers. This plan deliberately touched only `libs/ui/` and `tsconfig.json`/`docs/sdd.md`, files no other Phase 2 plan modifies, so it is safe as an isolated parallel unit.
- Concurrent plan execution was observed in the working tree (untracked `auth.service.ts`, `supabase-client.service.ts`, `auth-error-messages.ts` from a sibling plan) — not touched or committed by this plan, as expected for parallel GSD execution.

---
*Phase: 02-autentica-o-end-to-end*
*Completed: 2026-10-15*

## Self-Check: PASSED

All created files found on disk (`libs/ui/input/src/index.ts`, `libs/ui/input/src/lib/hlm-input.ts`,
`libs/ui/label/src/index.ts`, `libs/ui/label/src/lib/hlm-label.ts`). Both task commit hashes
(`505067b`, `b262825`) found in `git log --oneline --all`.
