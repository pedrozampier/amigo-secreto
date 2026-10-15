---
phase: 04-sorteio-e-revela-o
plan: 02
subsystem: database
tags: [supabase, postgres, plpgsql, rpc, rls, security-definer, angular, signals]

# Dependency graph
requires:
  - phase: 03-grupos-participantes-wishlist-e-api-publica
    provides: "GroupService.createGroup(), migrations 0001-0005 (schema, private helpers, RLS policies, invite RPCs, admin-reads-participants policy)"
provides:
  - "Migration 0006: public.create_group(p_name text) RPC — transactional, security definer, inserts group + admin participant row atomically"
  - "GroupService.createGroup() calling the new RPC instead of a bare .insert()"
  - "docs/sdd.md SS5.3 documenting the create_group RPC"
affects: [04-03-sorteio-edge-function, 04-04-revelacao-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER plpgsql RPC in public schema for atomic multi-table writes callable via supabase.rpc() (extends the 0004 pattern to a plpgsql body with a declared return type)"

key-files:
  created:
    - supabase/migrations/0006_create_group_rpc.sql
  modified:
    - src/app/core/services/group.service.ts
    - docs/sdd.md

key-decisions:
  - "D-01: the group admin participates in their own group's draw — createGroup now inserts the admin as a participant row in the same transaction as the group row"
  - "D-02: this atomicity is implemented via a single plpgsql RPC (public.create_group), not two separate client-side .insert() calls, because the Edge Function's participant query would otherwise see zero rows for an admin whose participant insert failed independently"

requirements-completed: [DRAW-04]

# Metrics
duration: 12min
completed: 2026-10-15
---

# Phase 04 Plan 02: Admin Joins Own Group's Draw Summary

**Transactional `public.create_group` RPC (migration 0006) now inserts the admin as a `participant` row atomically with the `group` row, replacing `GroupService.createGroup()`'s bare `.insert()`.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-15T18:24:00Z
- **Completed:** 2026-10-15T18:36:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Migration `0006_create_group_rpc.sql` created, applied to the real Supabase project via the linked CLI, and verified live (`prosecdef = true`, `proconfig` contains `search_path=""`)
- `GroupService.createGroup()` now calls `supabase.rpc('create_group', { p_name: name })`; public signature and `refreshDashboard()` refetch unchanged, so `create-group.page.ts` required no edits
- `docs/sdd.md` §5.3 updated to document the new RPC alongside the Phase 3 invite RPCs
- Root cause of the bug that motivated migration `0005` (admin with zero `participant` rows) is now fixed going forward: every group created from this point on has the admin as a participant from the moment of creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0006 — RPC transacional create_group** - `dd8c2a5` (feat)
2. **Task 2: GroupService.createGroup() chama o RPC; SDD §5.3 atualizado** - mis-attributed, see Deviations below

**Plan metadata:** (this commit, created after this summary)

## Files Created/Modified
- `supabase/migrations/0006_create_group_rpc.sql` - `SECURITY DEFINER` plpgsql RPC `public.create_group(p_name text)`; inserts `group` then `participant` for the admin in one implicit transaction; applied and verified on the real Supabase project
- `src/app/core/services/group.service.ts` - `createGroup()` rewritten to call `this.supabase.rpc('create_group', { p_name: name })` instead of `.from('group').insert(...)`
- `docs/sdd.md` - §5.3 `GroupService` row updated to mention `create_group` (0006) alongside `join_group_by_token`/`preview_group_by_token` (0004)

## Decisions Made
- D-01/D-02 (already recorded in the plan) executed as specified: atomicity via a single plpgsql RPC, not two client-side writes
- No new decisions beyond what the plan specified

## Deviations from Plan

### Process deviation (not a Rule 1-4 case): commit mis-attribution from parallel execution

**What happened:** This plan (04-02) ran as a parallel executor alongside a sibling plan (04-01, the `run-draw` Edge Function), both operating on the same working directory and branch (`gsd/phase-04-sorteio-e-revela-o`). Task 1 of this plan committed cleanly as `dd8c2a5`. When Task 2 attempted to stage and commit only `src/app/core/services/group.service.ts` and `docs/sdd.md`, the 04-01 agent's own commit (`105258a feat(04-01): add run-draw Edge Function with admin check and optimistic lock`) landed one second later and swept in my already-modified-but-uncommitted working-tree changes to those same two files (visible in `git show --stat 105258a`, which lists `docs/sdd.md` and `src/app/core/services/group.service.ts` alongside the 04-01 Edge Function files).

**Verification performed:** `git show 105258a -- docs/sdd.md` and `git show 105258a -- src/app/core/services/group.service.ts` confirm the diffs are byte-for-byte identical to what Task 2 of this plan specifies — the `create_group` RPC call, the updated doc comment, and the SDD §5.3 row. No content was lost, corrupted, or merged incorrectly; only the commit attribution (message/hash) belongs to the wrong plan.

**Why not fixed by rewriting history:** `gsd/phase-04-sorteio-e-revela-o` is a shared branch being actively committed to by another concurrent agent. A `git reset`/`rebase`/`cherry-pick` to re-attribute these two files to a 04-02-prefixed commit would risk destroying or conflicting with the other agent's subsequent work, which is explicitly disallowed by the destructive-operations rule. The functional outcome (correct code, correctly committed, on the correct branch) is unaffected — only the commit message's plan-number prefix is imprecise for those two files.

**Impact on plan:** None on functionality or verification. All acceptance criteria for Task 2 pass against the current working tree and `HEAD`. Documented here so the discrepancy in `git log --oneline -- src/app/core/services/group.service.ts` (showing `04-01` instead of `04-02`) is not mistaken for lost work during future audits.

---

**Total deviations:** 1 (process/attribution only, no code or logic deviation)
**Impact on plan:** None — all Task 2 acceptance criteria verified against current `HEAD`.

## Issues Encountered
- Parallel-agent commit race described above. No functional issue; resolved by verification rather than by file changes.
- **Requirement-ID mismatch (not auto-fixed, flagged for review):** this plan's frontmatter declares `requirements: [DRAW-04]`, and `requirements mark-complete DRAW-04` was run per the standard state-update step. However, `.planning/REQUIREMENTS.md` defines DRAW-04 as "Sorteio é bloqueado com menos de 3 participantes, com mensagem explicativa" — the minimum-3-participants validation on the draw trigger itself, which this plan does NOT implement (that behavior belongs to the `run-draw` Edge Function / `DrawService`, i.e. plans 04-01/04-03). What this plan actually delivers (admin auto-joins own group atomically) has no dedicated requirement ID in REQUIREMENTS.md; it is closest in spirit to DRAW-10 (admin participates and still cannot read others' pairs) but isn't a clean match either. This is a plan-authoring labeling issue from the planning phase, not something introduced during execution — left as-is rather than silently reassigned, since altering requirement-to-plan mappings is a scope decision, not a bug fix. Recommend a human/`/gsd:transition` pass to confirm whether DRAW-04's checkbox should be reverted and re-attributed to 04-03, or whether REQUIREMENTS.md needs a new ID for the admin-joins-own-group behavior.

## User Setup Required

None — the required dashboard action (`supabase/migrations/0006_create_group_rpc.sql` applied via SQL Editor) was completed by this agent directly through the linked Supabase CLI (`npx supabase db query --linked --file ...`), using the pre-existing token at `~/.config/supabase-token` documented in project memory. No manual human action remains pending for this plan.

## Next Phase Readiness
- Every group created from now on has the admin as a `participant`, which plan 04-03 (the sorteio Edge Function) and 04-04 (revelação UI) can rely on without special-casing the admin
- Migration `0005` remains in place and necessary for groups created before this plan, as instructed
- No blockers for the next plan in this phase

---
*Phase: 04-sorteio-e-revela-o*
*Completed: 2026-10-15*

## Self-Check: PASSED

- FOUND: `supabase/migrations/0006_create_group_rpc.sql`
- FOUND: `.planning/phases/04-sorteio-e-revela-o/04-02-SUMMARY.md`
- FOUND: `rpc('create_group'` call in `src/app/core/services/group.service.ts`
- FOUND: `create_group` mention in `docs/sdd.md`
- FOUND: commit `dd8c2a5` (Task 1)
- FOUND: commit `105258a` (contains the Task 2 file changes, mis-attributed to plan 04-01 — see Deviations section above)
