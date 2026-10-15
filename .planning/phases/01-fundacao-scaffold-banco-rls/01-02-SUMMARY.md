---
phase: 01-fundacao-scaffold-banco-rls
plan: 02
subsystem: infra
tags: [github-projects, gh-cli, mcp, eslint, kanban, gitflow]

# Dependency graph
requires: []
provides:
  - "Public GitHub Projects v2 board (number 3) with 11 real Issues, one per PRD §4 user story, each tagged with traceable requirement IDs"
  - "Verified Gitflow evidence: origin/main only receives PR merges, origin/develop exists"
  - "SDD §1 fully documenting the 3 configured MCP servers (Supabase, Figma, Angular CLI) with real commands and the prompt-injection security caveat"
  - "Corrected PITFALLS.md: @angular-eslint/prefer-output-emitter-ref documented as the dedicated @Output() lint rule"
affects: [all-subsequent-phases-commits, phase-02-auth, phase-03-grupos, phase-04-sorteio]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Issues created via `gh issue create` + added to board via `gh project item-add` (not draft items) so ENG-08 evidence is real Issues, not board-only drafts"]

key-files:
  created: [docs/kanban.md]
  modified: [docs/sdd.md, .planning/research/PITFALLS.md]

key-decisions:
  - "Reused pre-existing Issues #1-11 (already matching the 11 PRD user stories, with acceptance criteria) instead of keeping the 11 duplicate Issues (#17-27) created before the duplication was noticed; duplicates closed as not-planned"
  - "Project scope for Supabase MCP documented as read_only=true with project_ref scoping, matching the security default from research"

requirements-completed: [ENG-06, ENG-08, ENG-10]

# Metrics
duration: 25min
completed: 2026-10-15
---

# Phase 01 Plan 02: Kanban, Gitflow Evidence, and MCP Documentation Summary

**Public GitHub Projects board populated with 11 real Issues traced to PRD user stories, SDD §1 filled with real MCP commands (Supabase read-only + Figma + Angular CLI), and a stale PITFALLS.md lint claim corrected.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-15T01:28:00Z
- **Completed:** 2026-10-15T01:36:27Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created a public GitHub Projects v2 board ("UTF-Secret Kanban", number 3) and populated it with the 11 PRD §4 user stories as real Issues (not draft items), each labeled and carrying a "Requisitos rastreados" line for traceability
- Verified Gitflow state end-to-end (`origin/main` history is entirely merge commits from PRs plus the initial linear history; `origin/develop` already existed) and recorded the evidence in `docs/kanban.md`
- Replaced SDD §1's placeholder bullets with real, executable MCP setup commands for Supabase (scoped `project_ref` + `read_only=true`, with the prompt-injection caveat spelled out), Figma, and the optional Angular CLI MCP
- Corrected a factually wrong claim in PITFALLS.md: `@angular-eslint/prefer-output-emitter-ref` is a real, non-deprecated rule that targets `@Output()` directly — it is not merely covered indirectly by `prefer-signals`

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify Gitflow and create Kanban with one Issue per user story** - `fcef7d4` (docs)
2. **Task 2: Document MCP servers in SDD §1 and fix PITFALLS.md** - `2c10212` (docs)

_No separate plan-metadata commit required by this agent — STATE.md/ROADMAP.md updates follow below._

## Files Created/Modified
- `docs/kanban.md` - Board URL, Issues table (11 rows, number/title/labels/requirements/phase), Gitflow evidence section, method section
- `docs/sdd.md` - §1 rewritten with Supabase MCP / Figma MCP / Angular CLI MCP subsections, real commands, security caveat
- `.planning/research/PITFALLS.md` - Added `prefer-output-emitter-ref` row to the rule table, added it to the recommended `rules` config block, added a dated correction note

## Decisions Made
- Kept Gitflow verification read-only (no merge/PR opened in this task, per plan instructions — that happens at phase close)
- Did not alter SDD §2 (stack table) — explicitly out of scope for this plan, owned by plan 01-03
- Left two pre-existing out-of-scope Issues (#12 "Dashboard central de grupos", #16 "US13 - Ver contagem de dias até o Natal") alone — they carry the `user-story` label but are not part of the 11 PRD stories and were not added to the board by this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate Issues created before noticing pre-existing equivalents**
- **Found during:** Task 1 (Kanban creation)
- **Issue:** The plan's Step 4 script created 11 new Issues (#17-27) for the PRD user stories. After creation, verification revealed Issues #1-11 already existed in the repo (prior work, not visible in STATE.md) with the same 11 stories and richer acceptance-criteria bodies, under a different label scheme (`autenticação`/`gestão-de-grupos`/`participação` instead of `auth`/`grupo`/`sorteio`/`wishlist`). Leaving both sets would have produced a duplicated, confusing backlog for the grading evidence.
- **Fix:** Closed the 11 newly created duplicates (#17-27) as "not planned" with an explanatory comment, removed them from the project board items, then updated the original Issues (#1-11) in place — appended a "Requisitos rastreados" line to each body and added the plan's label scheme (`auth`/`grupo`/`sorteio`/`wishlist`) alongside the existing labels — and added #1-11 to the board instead.
- **Files modified:** docs/kanban.md (documents the correction explicitly in its own section)
- **Verification:** `gh project item-list 3 --owner "@me" --format json --jq '.items | length'` returns exactly `11`; `gh issue list --label user-story --state open --json body --jq '[.[] | select(.body | test("Requisitos rastreados"))] | length'` returns `11`
- **Committed in:** `fcef7d4` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — duplicate-issue cleanup)
**Impact on plan:** Necessary correctness fix to avoid a duplicated, confusing Kanban backlog being presented as ENG-08 evidence. No scope creep — final board still contains exactly the 11 required user-story Issues.

## Issues Encountered
- `gh issue list --label user-story --limit 50 --json number --jq 'length'` returns `13` (not `11`) because two pre-existing Issues (#12, #16) outside the 11 PRD stories also carry the `user-story` label from earlier, unrelated prep work. This does not fail the acceptance criteria (which requires "at least 11"), and `docs/kanban.md` documents it explicitly so the discrepancy is not mistaken for an error later.

## User Setup Required

None - no external service configuration required. `gh` CLI was already authenticated with the `project` scope.

## Next Phase Readiness
- Board and Issues #1-11 are live and referenceable by commit messages in plans 01-03/01-04 and all subsequent phases (`Refs #N`)
- SDD §1 is complete and will not need revisiting unless MCP server configuration changes
- PITFALLS.md ESLint guidance for Phase 1's scaffold task (01-03) is now accurate — `prefer-output-emitter-ref` should be included in the generated `eslint.config.js`

---
*Phase: 01-fundacao-scaffold-banco-rls*
*Completed: 2026-10-15*

## Self-Check: PASSED

- FOUND: docs/kanban.md
- FOUND: docs/sdd.md
- FOUND: .planning/research/PITFALLS.md
- FOUND: .planning/phases/01-fundacao-scaffold-banco-rls/01-02-SUMMARY.md
- FOUND commit: fcef7d4
- FOUND commit: 2c10212
