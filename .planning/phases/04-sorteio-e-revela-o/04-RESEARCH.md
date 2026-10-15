# Phase 4: Sorteio e Revelação - Research

**Researched:** 2026-10-15
**Domain:** Supabase Edge Functions (Deno) + Angular 21 zoneless/signals frontend — sorteio irreversível e revelação privada
**Confidence:** HIGH (Edge Function API shapes verified against current official docs; algorithm math is HIGH per ARCHITECTURE.md; test strategy and RPC decision are MEDIUM — first-time patterns in this repo)

## Summary

Phase 4 has two load-bearing pieces of new infrastructure that don't exist in this repo yet: `supabase/functions/` (and no `supabase/config.toml`) and a new migration `0006` implementing D-01/D-02 (admin participates, atomic `create_group` RPC). Everything else — guards, resolvers, error-message maps, inline two-step confirmation, refetch-after-mutation signals — is pattern-reuse from Phases 2-3, already fully proven in this codebase.

The single biggest risk is **not** the draw algorithm (it's mathematically settled per `ARCHITECTURE.md`) — it's two mechanical gaps: (1) `GroupService.createGroup()` currently does a bare `.insert()` into `group` only, so **the admin has zero `participant` row today**, which CONTEXT.md's D-01/D-02 fixes with a new transactional RPC; and (2) the Supabase CLI in this project is linked (`project-ref=ccruvfblgdvnjxenezuh`) but has **no `config.toml`** and **migrations 0001-0005 were applied by hand, not registered with the CLI's migration history table** — so `supabase db push` would almost certainly conflict or attempt to redo already-applied migrations. The new `0006` migration must be applied manually (SQL Editor) exactly like 0001-0005, and the Edge Function can be deployed independently of migration state via `supabase functions deploy run-draw --use-api` (this flag deploys without Docker and without touching `config.toml`'s function declarations in older CLI schemas — it is the lowest-friction path given the current environment).

The draw algorithm itself is a pure, side-effect-free Fisher-Yates + circular-pairing function that should be extracted into a plain `.ts` module (no Deno-specific APIs) so Vitest can import and unit-test it directly — this is the only way to satisfy ENG-02 without running Deno inside the test suite. The Edge Function's `index.ts` imports this same pure module. The "second invocation rejected" requirement (ENG-03) is a database-level optimistic lock, not pure logic — it is better covered by a `DrawService` unit test with a mocked Supabase client (the D-20 Phase-3 precedent: "test only where there's a real rule, skip mocking supabase-js for CRUD" does not apply here because the lock *is* the rule under test) or a manual two-tab UAT step, not a Deno integration test.

**Primary recommendation:** Extract `shuffle`/`pairCircular` into `supabase/functions/run-draw/draw-algorithm.ts` as a dependency-free pure module, duplicate (not symlink — Deno and Node have incompatible module resolution) the identical file at `src/app/core/draw-algorithm.ts` for Vitest, and keep both files byte-for-byte identical with a comment pointing at each other; cover the lock-rejection behavior with a `DrawService.spec.ts` using a mocked `SupabaseClientService`, exactly like `auth.service.spec.ts` already does.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The admin participates in the draw of their own group and is inserted as `participant` at group-creation time. Rejected: admin joining via own `/join/:token` (fragile manual step) and admin as pure organizer (needs 4 test accounts, admin screen never shows a reveal).
- **D-02:** Insertion is done by a transactional plpgsql RPC `create_group` in a new migration (next free number is `0006`): inserts `group` + admin's `participant` in a single `BEGIN/COMMIT`, returns the created group. `GroupService.createGroup()` calls this RPC instead of a direct `.insert()`. Follow the same precautions as existing functions: `SECURITY DEFINER`, `set search_path = ''`, schema-qualified names. **Migration 0005 must NOT be removed** — it remains necessary for groups created before this phase.
- **D-03:** The minimum of 3 (DRAW-04 / RN1) is `count(participant) >= group.min_participants`, counting the admin. No special case for the admin in the Edge Function.
- **D-04:** The admin cannot remove themselves from their own group. This is a **UI-only** limitation (hide the remove button on the admin's own row via `participant-row`'s existing `podeRemover` input) — registered explicitly as a known limitation (V2-02 item c), **not implemented at the database/policy level** this phase.
- **D-05:** The reveal lives in its own route `/draw/:groupId/result`, exactly as reserved in `docs/sdd.md` §5.2 and the `features/draw/result/` folder. `/group/:id` gains a "Ver meu amigo secreto" button when the group is `closed`.
- **D-06:** The reveal is a `signal` `revelado` + `@defer (on interaction)` with `@placeholder` rendering the closed card. The deferred block contains the heavy content (name of who was drawn + their wishlist). This is the ID8 demonstration for this phase (the dashboard's BrasilAPI card already used `@defer (on viewport)` for Phase 3's ID8). Rejected: real CSS 3D flip animation (conflicts with `@defer` — the back face would need to exist in the DOM to rotate, and complicates `prefers-reduced-motion` handling deferred to Phase 5).
- **D-07:** The pair + name + wishlist of who was drawn come from a **single query with an embedded join**, with the FK **explicitly named** (there are two FKs from `draw` to `participant` — `giver_id` and `receiver_id` — so bare `participant(...)` is ambiguous and supabase-js rejects it). Form: `.from('draw').select('id, receiver:participant!draw_receiver_id_fkey(display_name, wish_list)')`.
- **D-08:** The route uses a functional `drawResultResolver` (loads the pair — ID18) **+** the existing `memberGuard` (bars non-members, redirects to `/dashboard`). States handled **in the page, in PT-BR, not as errors**: group not yet `closed` → "O sorteio ainda não aconteceu" + link back to the group; `closed` but no `draw` row (impossible after perfect matching, but defensive) → generic message.
- **D-09:** The draw button lives in `/group/:id/manage` and uses **inline two-step confirmation**, same pattern `participant-row` already uses for removal: click → "Tem certeza? Esta ação é irreversível" + Confirm/Cancel, controlled by a `signal`. Zero new Spartan primitive (`dialog` was deliberately avoided in Phase 3 due to missing `@ng-icons` peers).
- **D-10:** With fewer than 3 participants, the button is **visible and disabled, with explanatory text beside it**: "Faltam N participantes para sortear (mínimo 3)", where `N` comes from a `computed()` over the participant list. The Edge Function **revalidates regardless** — the UI is convenience, the rule lives server-side.
- **D-11:** After a successful draw, the management screen **refetches** (refresh pattern from Phase 3's D-05): the `@switch` on status moves to "Status: fechado", the invite link disappears, and "Ver meu amigo secreto" appears pointing to `/draw/:groupId/result`.
- **D-12:** The Edge Function returns **stable English codes** — `NOT_ENOUGH_PARTICIPANTS`, `ALREADY_DRAWN`, `NOT_ADMIN`, `GROUP_NOT_FOUND` — and Angular translates in a new `draw-error-messages.ts` with generic fallback, in the exact pattern of `src/app/core/join-error-messages.ts`. **Implementation trap:** `supabase.functions.invoke()` returns, for non-2xx status, a `FunctionsHttpError` whose body is **only accessible via `await error.context.json()`**. Reading only `error.message` loses the `code` and makes the whole translation map useless.
- **D-13:** DRAW-10 is proven by a versioned `docs/draw-privacy-verification.md`, in the same format as `docs/db-rls-verification.md` from Phase 1, plus an item in `04-HUMAN-UAT.md`. **Important textual correction:** because D-01 makes the admin a participant, `select('*').from('draw')` as admin does **not** come back empty — it comes back with exactly 1 row (their own) out of N. The correct assertion is a double one: (a) the admin reads 1 of N rows, and (b) a `select` filtered by another participant's `giver_id` comes back **empty**. This is a *stronger* proof than "comes back empty," and the roadmap's success criterion 5 text was written assuming a non-participant admin — rewrite it accordingly, don't follow it literally.

### Claude's Discretion

- **Test strategy for ENG-02/ENG-03 (ID32).** The algorithm runs in Deno inside the Edge Function; Angular's Vitest cannot import that file. Some form of making the algorithm testable is required — the natural option is extracting the pure function (`shuffle` + `pairCircular`, taking/returning arrays of ids) into an importable module for both sides, but duplicating the algorithm or testing via Deno are also valid. Must be covered: (a) absence of self-assignment (`p[i] !== p[(i+1) % n]` for all `i`), (b) perfect matching (every participant appears exactly once as `giver` and exactly once as `receiver`), (c) rejection of the second invocation. Item (c) is database logic (the optimistic lock), not pure logic — decide whether it's a unit test of the lock function, a `DrawService` test with a mocked client, or a manual two-tab UAT step. `ng test --watch=false --include=<glob>` runs a single spec; `--run` is rejected by the builder.
- **Deploy and secrets for the Edge Function.** Current state: Supabase CLI is in `devDependencies` (`supabase@^2.121.0`) and the project is **linked** (`supabase/.temp/project-ref` = `ccruvfblgdvnjxenezuh`), but there is **no `supabase/config.toml`** and **no `supabase/functions/`** — this phase creates both. Decide manual deploy via `supabase functions deploy run-draw` vs. CI, and how `SERVICE_ROLE_KEY` is configured. The `SERVICE_ROLE_KEY` never enters `src/` or `dist/` — gates `npm run check:no-secrets` and two CI steps fail the build on `service_role`/`sb_secret_`/`SERVICE_ROLE` in either. Inside the Edge Function it comes from `Deno.env.get(...)`, auto-injected by Supabase. No new dependency without updating `docs/sdd.md` §2 first; the Edge Function imports `jsr:@supabase/supabase-js@2` in Deno, which does not go through `package.json`.
- Exact file/component names in `features/draw/result/`, and where the error-message map lives (`core/draw-error-messages.ts` following the pattern, or elsewhere).
- Return signature of the `create_group` RPC (json, composite type, `setof group`) — as long as D-02's atomicity is preserved.
- Fine visual composition of the reveal card: spacing, button variant, which Lucide icons, `@placeholder` text.
- Whether `DrawService` is a new service in `core/services/` or methods added to `GroupService` — though `ARCHITECTURE.md` (~line 588) and `docs/sdd.md` §5.3 anticipate a separate `DrawService`.
- Plan/wave organization and how many PRs the phase generates.

### Deferred Ideas (OUT OF SCOPE)

- **V2-01** — transactional plpgsql RPC wrapping the pairs INSERT + the Edge Function's `status='closed'` UPDATE. Known, already-registered technical debt; the non-atomic window between steps 6 and 7 is acceptable for the MVP. **Document in the phase, do not fix.** Note: D-02 creates a transactional RPC for group *creation* — do not confuse with this one, about *closing*.
- **V2-02** — defense-in-depth triggers: (a) `BEFORE UPDATE` validating `group.status` transitions; (b) `BEFORE UPDATE` on `participant` restricting edits to `wish_list`; and now also (c) preventing admin removal from `participant` at the DB level (D-04, today only locked in the UI).
- **DELETE policy on `draw`** / undoing the draw — RN2 defines the draw as irreversible; the absence of a write policy on `draw` is the core-value mechanism. Out of scope by design.
- Notifying participants that the draw happened (email/push) — explicitly out of scope in `REQUIREMENTS.md`.
- Blocking wishlist edits after group closure (RN7) — not in DRAW-01..10; a `/gsd:quick` or Phase 5 item if considered a gap.
- Dashboard badge for already-drawn groups — backlog, no indicator requires it.
- Real CSS 3D flip animation — rejected in D-06.
- Removing migration `0005` — tempting after D-01, but wrong: groups created before this phase still lack the admin's row.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAW-01 | Admin triggers the draw from the group management screen | D-09 inline confirmation pattern (reuse `participant-row` precedent); button lives in `manage-group.page.html` |
| DRAW-02 | Draw runs in Supabase Edge Function, never on the client | `supabase/functions/run-draw/index.ts` per ARCHITECTURE.md reference impl; `DrawService.runDraw()` calls `supabase.functions.invoke('run-draw', { body: { groupId } })` |
| DRAW-03 | Edge Function validates the caller is the group's `admin_id` | Reference impl: `userClient.auth.getUser()` with forwarded `Authorization` header, then compare `group.admin_id` |
| DRAW-04 | Draw blocked with fewer than 3 participants, explanatory message | D-10 computed() counter in UI; Edge Function re-validates against `group.min_participants` (D-03: counts admin, no special case) |
| DRAW-05 | Fisher-Yates + circular pairing, structurally guaranteeing zero self-assignment | Pure function extracted to a dependency-free `.ts` module, duplicated for Deno (Edge Function) and Vitest (`src/app`); math proof in ARCHITECTURE.md ~line 282 |
| DRAW-06 | Second invocation rejected by optimistic lock (`UPDATE ... WHERE status='open'`, abort if 0 rows) | Reference impl step 2; Postgres MVCC serializes concurrent UPDATEs — no `SELECT ... FOR UPDATE` needed |
| DRAW-07 | Group transitions to `status='closed'` at the end of the draw | Reference impl step 7; D-11 refetch-after-mutation reflects this in the UI |
| DRAW-08 | Participant reveals their own pair with a deliberate action (signal-controlled flip card) | D-06: `revelado` signal + `@defer (on interaction)` |
| DRAW-09 | Participant sees the wishlist of who they drew | D-07 single joined query; RLS on `participant` ("ver colegas do grupo") already grants this, not a special `draw` policy |
| DRAW-10 | Admin cannot read others' pairs — verifiable in practice, not just UI | D-13 `docs/draw-privacy-verification.md`; existing `draw` RLS policy (0003) unchanged — do NOT add any admin exception |
| ENG-02 | Unit tests (`.spec.ts`) covering the draw algorithm: no self-assignment, perfect matching | Pure-function extraction + Vitest spec, see Testing Strategy section |
| ENG-03 | Test covering rejection of the second draw invocation | `DrawService.spec.ts` with mocked Supabase client simulating `locked.length === 0`, OR manual two-tab UAT — Claude's Discretion, see Testing Strategy section |

## Project Constraints (from CLAUDE.md)

- Angular ^21.x standalone + signals, zoneless; Vitest (never Karma); Tailwind ^4.x CSS-first (no `tailwind.config.js`); Spartan UI ^1.7.x; Supabase JS ^2.x. **No dependency outside the locked table** without updating `docs/sdd.md` §2 first.
- Mandatory modern Angular APIs for rubric credit: `inject()` (never constructor DI), `input()`/`output()` functions (never `@Input()`/`@Output()`), `@if`/`@switch`/`@for` with `track` (never `*ngIf`/`*ngFor`), `@defer` for at least one heavy component, signals/`computed()`/`effect()`/`model()`, functional guards+resolvers, `provideRouter` with `withComponentInputBinding`, functional interceptors (only legitimately applicable to the BrasilAPI `HttpClient` traffic — **not** to `supabase-js`, which uses its own `fetch`), Reactive Forms with validation + disabled submit, `toSignal()`/`toObservable()`.
- Privacy enforced in the DB: `draw` has exactly one SELECT policy (`giver_id in (select private.my_participant_ids())`); **no** INSERT/UPDATE/DELETE policy for `authenticated` on `draw`; the sole writer is the Edge Function with `service_role`.
- Draw algorithm: Fisher-Yates → circular pairing `p[i] → p[(i+1) % n]` → single multi-row INSERT → `status='closed'`. Double-draw prevention = atomic conditional `UPDATE ... SET status='drawing' WHERE status='open'`, abort if 0 rows, plus `UNIQUE (group_id, giver_id)` / `UNIQUE (group_id, receiver_id)` constraints already in `0001_schema.sql`.
- UI text in PT-BR; code identifiers/entities/commits in English.
- Never commit to `main` directly; branch from `develop` (this session is already on `gsd/phase-04-sorteio-e-revela-o`); integrate via PRs; Conventional Commits.
- `npm install` requires `--legacy-peer-deps` in this project (arborist bug with vitest@4's peer graph) — also required in CI.
- `ng test --watch=false --include=<glob>` targets a single spec; `--run` is rejected by the Vitest builder.

## Standard Stack

### Core (already installed, no changes needed)

| Library | Version (installed) | Purpose | Notes |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.117.3 (latest npm: 2.118.0, verified 2026-10-15) | `DrawService.runDraw()` via `.functions.invoke()`; the joined draw-result query | No bump needed — already within the `^2.x` range and current |
| Deno runtime (Supabase-managed) | Supabase-hosted, no local pin | Executes `supabase/functions/run-draw/index.ts` | Not an npm dependency; imported via `jsr:@supabase/supabase-js@2` inside the function file |
| `supabase` CLI | ^2.121.0 (devDependency, verified current) | `functions new`, `functions deploy`, (optionally) `functions serve` | Already pinned; no SDD update needed |

### Supporting / New for this phase

| Item | Where | Purpose | When to Use |
|------|-------|---------|-------------|
| `supabase/functions/run-draw/index.ts` | New file | The Edge Function itself | Created this phase — no scaffold exists yet |
| `supabase/functions/run-draw/draw-algorithm.ts` | New file | Pure `shuffle`/`pairCircular` functions, zero Deno-specific imports | Imported by `index.ts`; duplicated (not shared via symlink) into `src/app/core/draw-algorithm.ts` for Vitest |
| `supabase/config.toml` | New file | CLI function/project config | Minimal — only needed if `functions deploy --use-api` requires it; verify empirically before assuming required content |
| Migration `0006_create_group_rpc.sql` | New file | D-02's `create_group` RPC | Follows the `0002`/`0004` pattern: `SECURITY DEFINER`, `set search_path = ''`, schema-qualified names |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Duplicated pure algorithm file (Deno + Vitest) | A build step that compiles one shared `.ts` into both runtimes | Overkill for 20 lines of code; adds a build dependency with no indicator payoff. Duplication with a cross-referencing comment is simpler and defensible in an oral exam. |
| `--use-api` deploy (no Docker) | `supabase start` + Docker-based local function dev | Docker IS available locally in this environment (`docker --version` → 27.3.1), so `supabase functions serve` for local dev is a real option — but deploy itself is faster and avoids a Docker dependency in CI if that's ever added. Recommend `--use-api` for deploy regardless of whether local serve uses Docker. |
| New `dialog` Spartan primitive for draw confirmation | Inline two-step confirmation (D-09, locked) | Already decided — `dialog` pulls `@ng-icons` peers absent from SDD §2. |

**No new npm dependency required for this phase.** The Edge Function's `jsr:@supabase/supabase-js@2` import is a Deno/JSR import, not an npm one, and does not touch `package.json` — but it should still be mentioned in `docs/sdd.md` §1 or a function-level comment for completeness, per the "no undocumented dependency" rule's spirit.

**Version verification performed:**
```
npm view @supabase/supabase-js version   → 2.118.0 (installed: ^2.117.3, within range, current)
npx supabase --version                    → 2.121.0 (matches package.json devDependency)
docker --version                          → Docker version 27.3.1 (available locally)
```

## Architecture Patterns

### Recommended file layout (additions only — existing tree per `docs/sdd.md` §5.1 stays)

```
supabase/
├── config.toml                          # NEW — minimal, created this phase
├── functions/
│   └── run-draw/
│       ├── index.ts                     # NEW — Deno.serve handler, orchestration
│       └── draw-algorithm.ts            # NEW — pure shuffle+pairCircular (no Deno APIs)
├── migrations/
│   ├── 0001_schema.sql ... 0005_admin_reads_participants.sql   # UNTOUCHED
│   └── 0006_create_group_rpc.sql        # NEW — D-02's create_group RPC

src/app/
├── core/
│   ├── draw-algorithm.ts                # NEW — byte-identical duplicate of the Deno file, for Vitest
│   ├── draw-error-messages.ts           # NEW — D-12's PT-BR map, pattern of join-error-messages.ts
│   ├── models/group.model.ts            # MODIFIED — add Draw + DrawResult contracts (SDD §4 gap)
│   ├── resolvers/
│   │   └── draw-result.resolver.ts      # NEW — D-08
│   └── services/
│       └── draw.service.ts              # NEW — functions.invoke() + joined query
├── features/
│   └── draw/
│       └── result/
│           ├── draw-result.page.ts      # NEW
│           └── draw-result.page.html    # NEW
└── features/group/manage/
    ├── manage-group.page.ts             # MODIFIED — draw button, counter, refetch
    └── manage-group.page.html           # MODIFIED

docs/
└── draw-privacy-verification.md         # NEW — D-13, format of db-rls-verification.md
```

### Pattern 1: Pure algorithm module, duplicated across runtimes

**What:** A dependency-free TypeScript module exporting `shuffle<T>(arr: T[]): T[]` and `pairCircular(ids: string[]): { giver_id: string; receiver_id: string }[]`, with no imports from `@supabase/supabase-js`, `Deno`, or Angular. Byte-identical copies live at `supabase/functions/run-draw/draw-algorithm.ts` (imported by the Edge Function) and `src/app/core/draw-algorithm.ts` (imported by Vitest specs).

**When to use:** Any time logic must be verifiably tested outside the runtime it executes in (Deno here).

**Example (from ARCHITECTURE.md's reference implementation, factored into a pure function):**
```typescript
// supabase/functions/run-draw/draw-algorithm.ts
// MIRROR: src/app/core/draw-algorithm.ts must stay byte-identical to this file.
// Reason: Deno (Edge Function runtime) and Vitest (Angular test runtime) cannot
// share a single imported module across the jsr:/npm: boundary without a build
// step this project doesn't have. ENG-02 requires the algorithm be unit-testable
// from Vitest; this duplication is the deliberately simple fix.

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DrawPair {
  giver_id: string;
  receiver_id: string;
}

/** Structural guarantee against self-assignment: for a permutation p and n>=2,
 *  p[i] !== p[(i+1) % n] always, because all elements of p are distinct. */
export function pairCircular(participantIds: readonly string[]): DrawPair[] {
  const ids = shuffle(participantIds);
  return ids.map((giverId, i) => ({
    giver_id: giverId,
    receiver_id: ids[(i + 1) % ids.length],
  }));
}
```

### Pattern 2: Edge Function admin validation + optimistic lock (reference, do not deviate)

**What:** Verified caller identity via a user-scoped client reading the `Authorization` header, then a `service_role`-scoped client for the privileged read/write. The lock is a single conditional `UPDATE`.

**Source:** `.planning/research/ARCHITECTURE.md` lines ~298-405 (already the canonical reference per CONTEXT.md).

```typescript
// supabase/functions/run-draw/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { pairCircular } from './draw-algorithm.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const { groupId } = await req.json();

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json({ code: 'NOT_ADMIN' }, 401);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: group } = await adminClient
    .from('group')
    .select('id, admin_id, status, min_participants')
    .eq('id', groupId)
    .single();

  if (!group) return json({ code: 'GROUP_NOT_FOUND' }, 404);
  if (group.admin_id !== userData.user.id) return json({ code: 'NOT_ADMIN' }, 403);

  const { data: locked } = await adminClient
    .from('group')
    .update({ status: 'drawing' })
    .eq('id', groupId)
    .eq('status', 'open')
    .select('id');

  if (!locked || locked.length === 0) return json({ code: 'ALREADY_DRAWN' }, 409);

  try {
    const { data: participants } = await adminClient
      .from('participant')
      .select('id')
      .eq('group_id', groupId);

    if (!participants || participants.length < group.min_participants) {
      // rollback happens in catch below via throw
      throw { code: 'NOT_ENOUGH_PARTICIPANTS' };
    }

    const pairs = pairCircular(participants.map((p) => p.id)).map((pair) => ({
      group_id: groupId,
      ...pair,
    }));

    const { error: insertErr } = await adminClient.from('draw').insert(pairs);
    if (insertErr) throw insertErr;

    const { error: closeErr } = await adminClient
      .from('group')
      .update({ status: 'closed' })
      .eq('id', groupId);
    if (closeErr) throw closeErr;

    return json({ success: true, pairs: pairs.length }, 200);
  } catch (err) {
    await adminClient.from('group').update({ status: 'open' }).eq('id', groupId).eq('status', 'drawing');
    const code = (err as { code?: string })?.code ?? 'UNKNOWN_ERROR';
    return json({ code }, code === 'NOT_ENOUGH_PARTICIPANTS' ? 409 : 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
```

**Deviation from the ARCHITECTURE.md reference:** the reference returns `{ error: string }`; this version returns `{ code: 'STABLE_CODE' }` to match D-12 exactly (stable English codes, translated client-side). This is an intentional refinement, not a divergence that needs reconciling — ARCHITECTURE.md predates CONTEXT.md's D-12 decision.

### Pattern 3: Client-side error translation with `FunctionsHttpError`

**What:** `supabase.functions.invoke()` throws distinguishable error types; only `FunctionsHttpError` carries a JSON body with the stable `code`.

**Source:** [Supabase Docs — Functions Error Handling](https://supabase.com/docs/guides/functions/error-handling) (verified 2026-10-15, HIGH confidence — official docs)

```typescript
// core/services/draw.service.ts
import { FunctionsHttpError } from '@supabase/supabase-js';
import { translateDrawError, GENERIC_DRAW_ERROR } from '../draw-error-messages';

async runDraw(groupId: string): Promise<{ error: string | null }> {
  const { error } = await this.supabase.functions.invoke('run-draw', {
    body: { groupId },
  });
  if (!error) {
    return { error: null };
  }
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json(); // { code: 'ALREADY_DRAWN', ... }
    return { error: translateDrawError(body?.code) };
  }
  // FunctionsRelayError / FunctionsFetchError — network-level, no code to translate
  return { error: GENERIC_DRAW_ERROR };
}
```

**Trap documented in CONTEXT.md D-12, confirmed against official docs:** reading only `error.message` on a `FunctionsHttpError` does NOT give you the `code` — you must `await error.context.json()`. `error.context` is the raw `Response` object from the function's non-2xx reply.

### Pattern 4: `@defer (on interaction)` reveal card

**What:** A signal gates a `@defer` block whose trigger is a click, so the heavy content (receiver name + wishlist) is genuinely not rendered until the user acts — distinct from the dashboard's `@defer (on viewport)`, already spent on `ChristmasCountdownCard` for Phase 3's ID8.

```html
<!-- draw-result.page.html -->
@if (!revelado()) {
  <div hlmCard class="w-full">
    <div hlmCardContent class="flex flex-col items-center gap-3 py-8">
      <p class="text-sm text-muted-foreground">Seu amigo secreto está pronto.</p>
      <button hlmBtn type="button" (click)="revelado.set(true)">
        Revelar meu amigo secreto
      </button>
    </div>
  </div>
} @else {
  @defer (on interaction) {
    <div hlmCard class="w-full">
      <div hlmCardHeader>
        <h2 hlmCardTitle>Você tirou {{ resultado()?.receiver.display_name }}</h2>
      </div>
      <div hlmCardContent>
        <p class="text-sm text-muted-foreground">
          {{ resultado()?.receiver.wish_list || 'Esta pessoa ainda não cadastrou uma lista de desejos.' }}
        </p>
      </div>
    </div>
  } @placeholder {
    <div class="h-28 animate-pulse rounded-lg border bg-muted/40"></div>
  }
}
```

**Caveat worth flagging during planning:** `@defer (on interaction)` by default binds to the *placeholder* content's own interaction (click/keydown on the placeholder block itself), not an arbitrary external signal. Structuring it as `@if (!revelado())␣...␣@else { @defer (on interaction) {...} @placeholder {...} }` — i.e., using the signal to swap between a "closed card with its own button" and a "`@defer` block whose placeholder is itself clickable" — satisfies Angular's actual trigger semantics while still being "deliberate action" (DRAW-08) and "content not rendered before the click" (D-06's ID8 argument). Verify this nesting compiles before committing to the exact markup; the simpler and safer alternative is putting the `@defer (on interaction)` placeholder itself AS the closed-card button (single block, no outer `@if`), which is both less code and a more literal `@defer` demonstration.

### Anti-Patterns to Avoid

- **Adding an `admin_id` exception to the `draw` SELECT policy.** This is explicitly called out as fatal in `0003_rls_policies.sql`'s own comment and in ARCHITECTURE.md's Anti-Pattern 2. Do not touch this policy in this phase under any circumstance.
- **Reverting `GroupService.createGroup()` to a bare `.insert()`.** This is the exact bug D-01/D-02 fixes; "simplifying" it back reopens the issue that motivated migration `0005`.
- **Trying to route `supabase.functions.invoke()` through an `HttpInterceptorFn`.** `supabase-js` uses its own `fetch`, not Angular's `HttpClient` — interceptors cannot see this traffic, confirmed in `ARCHITECTURE.md`'s Anti-Pattern 3 and CLAUDE.md.
- **Testing the lock-rejection by mocking two concurrent `fetch` calls against a live Edge Function in Vitest.** This turns a unit test into a flaky integration test requiring network and real Postgres timing. Mock at the `DrawService`/Supabase-client boundary instead, or move it to manual UAT.
- **Using `symlink` or a monorepo-style shared package to avoid duplicating the pure algorithm file.** Deno's `jsr:`/`npm:` import resolution and Angular's TypeScript/Vite resolution are not compatible without introducing a build step this project doesn't have and gains nothing from. Byte-identical duplication with a cross-referencing comment is the right level of engineering for a 2-function, ~20-line module in an academic MVP.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying who's calling the Edge Function | Custom JWT decoding/verification in Deno | `createClient(url, anonKey, { global: { headers: { Authorization } } }).auth.getUser()` | `supabase-js` already validates the JWT signature and expiry against the project's auth config; hand-rolled decoding risks accepting an expired or tampered token |
| Preventing concurrent double-draw | Explicit application-level mutex / Redis lock / `SELECT ... FOR UPDATE` | Conditional `UPDATE ... WHERE status = 'open'` + checking affected row count | Postgres MVCC already serializes concurrent UPDATEs to the same row atomically; this is simpler, requires no extra infrastructure, and is the ARCHITECTURE.md-verified approach |
| CORS preflight handling | Hand-written per-method OPTIONS branching logic from scratch | The `corsHeaders` object pattern + early `OPTIONS` return (shown in Pattern 2 above) | Official, minimal, and avoids subtly wrong preflight responses that block the browser's actual request |
| Error-shape parsing from Edge Function | Assuming `error.message` carries the JSON body | `error instanceof FunctionsHttpError` then `await error.context.json()` | Confirmed from official docs (2026) — `error.message` is a generic string, the actual body is only on `.context` |

**Key insight:** every piece of "custom infrastructure" this phase might be tempted to build (locking, JWT validation, CORS) already has a thin, officially-documented primitive that is strictly simpler than a hand-rolled version — resist adding abstraction here, the win in an academic deliverable is showing the primitive used correctly, not building around it.

## Common Pitfalls

### Pitfall 1: `supabase db push` against unregistered migration history
**What goes wrong:** Running `supabase db push` (or any migration-sync command) could attempt to redo migrations 0001-0005 that were applied by hand in the SQL Editor and are not recorded in `supabase_migrations.schema_migrations` on the remote project (per STATE.md's own note and `docs/db-rls-verification.md`'s documented process debt).
**Why it happens:** The CLI's migration tracking is a local concept (a table in the remote DB) that was never populated because migrations were pasted manually.
**How to avoid:** Apply migration `0006` manually via the SQL Editor, exactly like 0001-0005. Do not run `supabase db push` without first running `supabase migration list` to see what the CLI *thinks* is applied, and treating any mismatch as expected, not a bug to fix mid-phase.
**Warning signs:** Any CLI output mentioning "pending migrations" that includes 0001-0005, or a request to confirm re-applying already-live schema changes.

### Pitfall 2: Deploying the Edge Function with no `config.toml` present
**What goes wrong:** `supabase functions deploy run-draw` may behave unpredictably (or the CLI may insist on scaffolding `config.toml`) if the config file genuinely doesn't exist, since function declarations and `verify_jwt` settings are conventionally stored there in current CLI schemas.
**Why it happens:** No `supabase init` was ever run in this repo — only `supabase link` (confirmed: `supabase/.temp/` exists, `supabase/config.toml` does not).
**How to avoid:** Run `supabase functions new run-draw` first (scaffolds the directory and may also create/update `config.toml`), inspect what it generates, and only hand-write `config.toml` content if the CLI doesn't produce a usable default. Keep `verify_jwt` at its default (`true`) — the function *should* require a valid JWT, since it reads the `Authorization` header to identify the caller as the admin.
**Warning signs:** `supabase functions deploy` erroring about a missing or malformed `config.toml`, or deploying successfully but the function accepting unauthenticated requests.

### Pitfall 3: Losing the `code` field by reading `error.message`
**What goes wrong:** `functions.invoke()` on a non-2xx response gives a generic `FunctionsHttpError` message like `"Edge Function returned a non-2xx status code"` — none of D-12's stable codes (`NOT_ADMIN`, `ALREADY_DRAWN`, etc.) are in that string.
**Why it happens:** `supabase-js` deliberately keeps `.message` generic and puts the actual response body on `.context` (a `Response` object) for the caller to parse explicitly.
**How to avoid:** Always branch on `error instanceof FunctionsHttpError` and `await error.context.json()` before trying to read a `code`. See Pattern 3 above.
**Warning signs:** `draw-error-messages.ts`'s translation function always falling through to the generic fallback message in manual testing, even for known error codes.

### Pitfall 4: `draw` RLS "feels broken" when the admin reads their own row
**What goes wrong:** After D-01, testing as the admin and seeing `select('*').from('draw')` return 1 row (not 0) might look like a regression of DRAW-10 to someone unfamiliar with the CONTEXT.md discussion.
**Why it happens:** The ROADMAP's success criterion 5 was worded assuming a non-participant admin (pre-D-01). D-13 explicitly flags this and redefines the correct assertion as a pair: own row visible, others' rows empty.
**How to avoid:** When writing `docs/draw-privacy-verification.md`, write the double assertion explicitly (admin reads exactly 1 of N rows; a query filtered by another participant's `giver_id` returns 0 rows) — do not "fix" the UI or policy to try to make the admin's own-row read come back empty, that would be wrong.
**Warning signs:** Any instinct to add a `WHERE giver_id != (select auth.uid())` filter somewhere to "hide" the admin's own pair — that's solving a non-problem.

### Pitfall 5: `@defer (on interaction)` trigger semantics
**What goes wrong:** `@defer (on interaction)` without an explicit trigger element reference binds to clicks/keydowns on its own `@placeholder` block. If the reveal is structured as a signal toggling between two separate `@if`/`@else` blocks where the *second* block is the `@defer`, the defer's own placeholder (not the "Revelar" button in the first block) is what Angular expects to be clicked — these need to be designed as the same interactive surface, or the defer needs an explicit `on interaction(triggerRef)` binding to a `#triggerRef` template reference variable outside the deferred block.
**Why it happens:** `@defer (on interaction)` is commonly demoed with the trigger being the placeholder itself, which is a simpler structure than "signal toggles state, then separately a defer loads."
**How to avoid:** Prefer making the `@placeholder` content ITSELF the clickable "Revelar meu amigo secreto" card/button — single `@defer` block, no outer `@if`/`signal` needed at all for the *gating*, though a `revelado` signal can still exist for other reactive purposes (e.g., disabling a "hide again" affordance). Verify in a quick local build before finalizing the template structure.
**Warning signs:** Clicking the visible "Revelar" button does nothing, or the deferred content loads immediately on page load regardless of interaction.

## Code Examples

### Edge Function error-code response shape (D-12 compliant)
```typescript
// Already shown in full in Pattern 2 above — the `json({ code: ... }, status)` helper
// is the single place that shapes every error response. Never return `{ error: "..." }`
// with a PT-BR string from inside the function.
```

### Draw-result joined query (D-07)
```typescript
// core/services/draw.service.ts
async getMyResult(groupId: string): Promise<{ result: DrawResult | null; error: string | null }> {
  const { data, error } = await this.supabase
    .from('draw')
    .select('id, receiver:participant!draw_receiver_id_fkey(display_name, wish_list)')
    .eq('group_id', groupId)
    .maybeSingle();
  if (error) {
    return { result: null, error: 'Não foi possível carregar seu resultado.' };
  }
  return { result: (data as DrawResult | null), error: null };
}
```
Note: `.eq('group_id', groupId)` is redundant with RLS (the policy already scopes to the caller's own `giver_id`), but kept explicit for clarity and to support `.maybeSingle()` returning cleanly when the user has no row in that specific group (vs. potentially matching a row in a different group if they're in several — defensive, matches the project's existing style of redundant-but-explicit filters, e.g. `updateWishList`'s `.eq('id', participantId)`).

### `create_group` RPC skeleton (D-02)
```sql
-- 0006_create_group_rpc.sql
-- D-01/D-02: atomically creates a group AND inserts its admin as a participant,
-- so the admin is never left without a `participant` row (the bug that motivated
-- 0005_admin_reads_participants.sql). DO NOT remove 0005 — it still protects
-- groups created before this migration.

create or replace function public.create_group(p_name text)
returns public.group
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group   public.group;
  v_profile public.profile;
begin
  select * into v_profile from public.profile where id = (select auth.uid());

  insert into public.group (name, admin_id)
  values (p_name, (select auth.uid()))
  returning * into v_group;

  insert into public.participant (group_id, user_id, display_name)
  values (v_group.id, (select auth.uid()), v_profile.display_name);

  return v_group;
end;
$$;

revoke execute on function public.create_group(text) from public;
grant execute on function public.create_group(text) to authenticated;
```
Note: plpgsql functions run in an implicit transaction per call — if the second `insert` fails, the first is rolled back automatically, satisfying D-02's atomicity requirement without an explicit `BEGIN/COMMIT` (consistent with how `join_group_by_token` in `0004` already relies on this).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `supabase functions deploy` requires Docker | `supabase functions deploy --use-api` bundles server-side, no Docker | CLI 2.13.3+ (2026, confirmed current in 2.121.0) | Lower-friction deploy path for this phase; `supabase functions serve` for local dev still needs Docker, which IS available locally (`docker 27.3.1`) |
| Hand-written `corsHeaders` per function | Still valid; newer `supabase-js` versions (2.95.0+) also expose `corsHeaders` importable from the SDK itself (`npm:@supabase/supabase-js@^2/cors`) | 2.95.0+ | Either approach works; the hand-written `_shared/cors.ts` pattern is simpler for a single-function project and avoids an extra import path to verify |
| `error.message` assumed to carry Edge Function error body | Official docs confirm `error.message` is generic; body is on `error.context` (a `Response`), requiring `await error.context.json()` | Documented as of current official docs (verified 2026-10-15) | Directly informs D-12's implementation — this is not a new finding, CONTEXT.md already names it correctly |

**Not deprecated, still current as verified:** `jsr:@supabase/supabase-js@2` import syntax inside Deno Edge Functions, `Deno.env.get('SUPABASE_URL'|'SUPABASE_SERVICE_ROLE_KEY'|'SUPABASE_ANON_KEY')` auto-injection (no manual secret-setting needed for these three), `Deno.serve()` as the function entrypoint.

## Open Questions

1. **Does `supabase functions deploy --use-api` work cleanly with zero `config.toml` and no prior `supabase functions new` scaffold in this specific CLI version (2.121.0)?**
   - What we know: `--use-api` is documented as available since 2.13.3 and avoids Docker; `config.toml` is where function-level settings (like `verify_jwt`) conventionally live, but the CLI reference also exposes `--no-verify-jwt` as a direct flag, suggesting config.toml may not be strictly mandatory for a basic deploy.
   - What's unclear: Whether the very first deploy in a repo with no `config.toml` at all auto-creates a minimal one, prompts interactively, or errors outright.
   - Recommendation: Run `supabase functions new run-draw` first (low-risk, local-only scaffold command) and inspect its output before attempting any deploy; treat the first real deploy attempt as a planning-time spike/task, not an assumption baked into the plan.

2. **Exact nesting of `@defer (on interaction)` with a gating signal for the reveal card (Pitfall 5).**
   - What we know: `@defer (on interaction)` without parameters binds to its own placeholder's interaction events.
   - What's unclear: Whether CONTEXT.md's D-06 intends a signal `revelado` as the *sole* gate (in which case the simpler single-`@defer`-block structure in Pattern 4's caveat is correct and the signal becomes almost vestigial) or whether the signal is meant to persist reveal state across re-renders in a way the `@defer` trigger alone wouldn't provide.
   - Recommendation: Default to the single-`@defer`-block structure (placeholder = clickable closed card) unless the planner identifies a concrete reason the `revelado` signal must exist independently; if it does, verify the two-block nesting compiles via a local `ng serve` smoke check before committing it to a task's definition of done.

3. **Whether `ENG-03` (second-invocation rejection) needs an automated Vitest test at all, or is sufficiently covered by UAT.**
   - What we know: CONTEXT.md explicitly delegates this to the planner, citing Phase 3's D-20 precedent ("test only where there's a real rule, skip mocking supabase-js for CRUD").
   - What's unclear: Whether the roadmap's success criterion 3 ("Testes `.spec.ts` comprovam automaticamente... rejeição da segunda invocação") is read as requiring an automated spec specifically, which would override the D-20 precedent for this one case since the roadmap text says "testes .spec.ts" explicitly for all three sub-claims in that criterion.
   - Recommendation: Treat the roadmap's criterion 3 wording as binding — write a `DrawService.spec.ts` test that mocks the Supabase client's response to a second-invocation scenario (e.g., mock `.update(...).eq(...).eq(...).select()` resolving with `data: []`) and asserts `DrawService` surfaces the `ALREADY_DRAWN`-translated message — rather than relying solely on manual UAT, to avoid a literal-reading gap against the roadmap text.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Edge Function scaffold/deploy, migration application | ✓ | 2.121.0 (devDependency, matches global `npx supabase --version`) | — |
| Docker | `supabase functions serve` (local function dev) | ✓ | 27.3.1 | Not needed for deploy (`--use-api` avoids it); only needed if local `functions serve` is used during development |
| Supabase CLI auth (`SUPABASE_ACCESS_TOKEN` / `supabase login`) | `supabase functions deploy`, any CLI command touching the remote project | ✗ (not set in this shell session) | — | Must run `supabase login` or export `SUPABASE_ACCESS_TOKEN` before the deploy task executes — this is an execution-time precondition, not a planning blocker, but the plan should include an explicit step/check for it |
| Project link (`project-ref`) | All CLI operations against the real project | ✓ | `ccruvfblgdvnjxenezuh` (in `supabase/.temp/project-ref`) | — |
| `supabase/config.toml` | Possibly required by `functions deploy` | ✗ | — | Created this phase via `supabase functions new run-draw` or hand-written minimal file; see Open Question 1 |

**Missing dependencies with no fallback:**
- Supabase CLI authentication (access token) must be established before any `supabase functions deploy` or `supabase migration ...` command can run against the real remote project. This is an environment/session precondition, not something the plan can code around — flag it as a manual precondition for whichever execution step performs the actual deploy.

**Missing dependencies with fallback:**
- `config.toml` absence — fallback is letting `supabase functions new` generate it, or hand-writing a minimal version if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (Angular 21's default builder, already configured — no `vitest.config.ts` found as a separate file; configuration is via `@angular/build`'s `unit-test` builder in `angular.json`) |
| Config file | Managed by Angular CLI's test builder (no standalone `vitest.config.ts` in this repo as of Phase 3) |
| Quick run command | `ng test --watch=false --include=src/app/core/draw-algorithm.spec.ts` (single spec; `--run` is rejected by this project's builder, per STATE.md Phase 2 finding) |
| Full suite command | `npm test` (maps to `ng test`, used as-is in CI per `.github/workflows/ci.yml`'s `npm test --passWithNoTests` step) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENG-02 (a) | No self-assignment: `p[i] !== p[(i+1) % n]` for all generated pairs, across many runs/sizes | unit | `ng test --watch=false --include=src/app/core/draw-algorithm.spec.ts` | ❌ Wave 0 |
| ENG-02 (b) | Perfect matching: every id appears exactly once as giver and exactly once as receiver | unit | same file as above | ❌ Wave 0 |
| ENG-03 | Second invocation rejected (lock behavior) | unit (mocked client) | `ng test --watch=false --include=src/app/core/services/draw.service.spec.ts` | ❌ Wave 0 |
| DRAW-12 error mapping | `translateDrawError` maps each stable code + unknown/null fallback | unit | `ng test --watch=false --include=src/app/core/draw-error-messages.spec.ts` | ❌ Wave 0 (mirrors existing `join-error-messages.spec.ts`) |
| DRAW-08 drawResultResolver states | Resolver returns result / redirects per group status | unit | `ng test --watch=false --include=src/app/core/resolvers/draw-result.resolver.spec.ts` | ❌ Wave 0 (mirrors `group.resolver.spec.ts`) |
| DRAW-10 | Admin cannot read others' `draw` rows (RLS proof) | manual/documented | N/A — `docs/draw-privacy-verification.md` walkthrough | ❌ Wave 0 (doc, not code) |

### Sampling Rate
- **Per task commit:** `ng test --watch=false --include=<glob for the file just touched>`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus the manual `docs/draw-privacy-verification.md` steps executed and recorded (D-13), plus `04-HUMAN-UAT.md` double-tab click test for DRAW-06/success-criterion-2.

### Wave 0 Gaps
- [ ] `src/app/core/draw-algorithm.ts` — pure module, must exist before its spec can be written
- [ ] `src/app/core/draw-algorithm.spec.ts` — covers ENG-02 (a) and (b)
- [ ] `src/app/core/draw-error-messages.ts` + `.spec.ts` — covers D-12's translation map
- [ ] `src/app/core/services/draw.service.ts` + `.spec.ts` — covers ENG-03's lock-rejection behavior via mocked client, and D-07's joined-query shape
- [ ] `src/app/core/resolvers/draw-result.resolver.ts` + `.spec.ts` — covers D-08's three states
- [ ] No existing test framework gaps otherwise — Vitest, `TestBed`, and the mock-the-Supabase-client pattern are all already established from Phases 2-3 (`auth.service.spec.ts`, `group.resolver.spec.ts`, `admin.guard.spec.ts`)

## Sources

### Primary (HIGH confidence)
- [Supabase Docs — Functions Error Handling](https://supabase.com/docs/guides/functions/error-handling) — `FunctionsHttpError`/`FunctionsRelayError`/`FunctionsFetchError` distinction, `error.context.json()` pattern (fetched 2026-10-15)
- [Supabase CLI Reference — functions deploy](https://supabase.com/docs/reference/cli/supabase-functions-deploy) — full flag list including `--use-api`, `--no-verify-jwt`, `--project-ref` optionality (fetched 2026-10-15)
- [Supabase Docs — Deploy to Production (Functions)](https://supabase.com/docs/guides/functions/deploy) — `config.toml`'s role for per-function JWT settings (fetched 2026-10-15)
- [Supabase Docs — CORS for Edge Functions](https://supabase.com/docs/guides/functions/cors) — `corsHeaders` pattern, both SDK-import and hand-written variants (fetched 2026-10-15)
- `.planning/research/ARCHITECTURE.md` (this repo) — Edge Function reference implementation, math proof of zero self-assignment, RLS policy rationale — already HIGH confidence per its own header
- `supabase/migrations/0001-0005*.sql` (this repo) — read directly; ground truth for current schema/RLS/RPC state
- `npm view @supabase/supabase-js version` → 2.118.0 (verified against registry 2026-10-15; installed `^2.117.3` is current and within range)
- `npx supabase --version` / `docker --version` (verified locally in this environment, 2026-10-15)

### Secondary (MEDIUM confidence)
- [X/Twitter — Paul Copplestone announcing Docker-free Edge Function deploys](https://x.com/kiwicopple/status/1890284547897716762) and corroborating [Supabase GitHub Discussion #33613](https://github.com/orgs/supabase/discussions/33613) — cross-verified with the official CLI reference's `--use-api` flag entry
- [lucide-angular standalone usage pattern](https://github.com/lucide-icons/lucide/issues/2097) and npm package docs — confirms `LucideAngularModule.pick(...)` + `importProvidersFrom` pattern for Angular standalone apps; note this project has `lucide-angular@^1.0.0` installed but **zero actual usage in `src/app` as of this research** (verified via repo-wide grep) — if icons are desired in the reveal card, provider setup is net-new, not a reuse of an existing pattern

### Tertiary (LOW confidence — flagged, not used as a basis for recommendations above)
- None required for this phase; all claims above were verifiable against official docs or this repo's own files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new npm dependency, versions verified against registry and locally installed CLI
- Architecture (Edge Function + RLS): HIGH — `ARCHITECTURE.md` is itself a HIGH-confidence prior research artifact, and this research re-verified the specific client-side error-handling and deploy-flag claims against current official docs
- Testing strategy: MEDIUM — the pure-function-duplication approach and the mocked-`DrawService` test for lock-rejection are sound engineering judgment calls consistent with project precedent, but are first-time patterns in this repo (not yet proven by an existing passing test) and the roadmap-vs-CONTEXT.md tension on ENG-03's test requirement (Open Question 3) needs a planner decision
- `@defer (on interaction)` exact markup: MEDIUM — the trigger-semantics caveat (Pitfall 5 / Open Question 2) is based on general Angular `@defer` documentation knowledge, not verified against this project's actual rendered output; recommend a quick local smoke-check during planning or early execution

**Research date:** 2026-10-15
**Valid until:** ~30 days for the Angular/Spartan/RLS material (stable, locked stack); ~7-14 days for Supabase CLI flag behavior specifically (`--use-api`, config.toml requirements), since CLI minor versions have historically changed deploy-flow defaults
