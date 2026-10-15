# Phase 3: Grupos, Participantes, Wishlist e API Pública - Research

**Researched:** 2026-10-15
**Domain:** Supabase RPC-based invite flow + RLS, Angular 21 Reactive Forms/routing/resolvers, HttpClient + functional interceptors + toSignal() against a public API
**Confidence:** HIGH (schema, RLS, and service code read directly from the repository; Angular 21 APIs verified against installed `node_modules`; BrasilAPI endpoint verified by live fetch)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entrada por convite — RLS**
- **D-01:** Join happens via a plpgsql `SECURITY DEFINER` RPC `join_group_by_token(p_token text)` in a new migration `0004`. It resolves token → group, validates `status = 'open'`, validates the user isn't already a member, and inserts the `participant` row with `user_id = auth.uid()` and `display_name` copied from `profile`. Same precautions as Phase 1 functions: `set search_path = ''`, schema-qualified names. Rejected: a new SELECT policy on `group` keyed by token.
- **D-02:** `/join/:token` does **not** auto-join. A second RPC `preview_group_by_token(p_token text)` (`SECURITY DEFINER`, also in `0004`) returns **only `name` and `status`** — never participants, never pairs. UI shows "Você foi convidado para \<nome\>" + confirm button. `preview_group_by_token` must **never** return a participant list.
- **D-03:** Both RPCs return a stable **English** code on rejection — `ALREADY_MEMBER`, `GROUP_CLOSED`, `INVALID_TOKEN` — translated to PT-BR by Angular in a map, following the exact pattern of `src/app/core/auth-error-messages.ts` (generic fallback included). Rejected: `RAISE EXCEPTION` with PT-BR text; trusting the raw constraint error.
- **D-04:** `participant_group_user_unique` remains the real safety net for GRP-07 — RPC checks first for a good message, but a race between two tabs still hits the constraint. The RPC must catch the violation and return `ALREADY_MEMBER` instead of leaking the raw Postgres error.

**Estado e reatividade**
- **D-05:** `GroupService` holds `signal()` state (admin groups, participant groups, current group's participants) and **refetches + re-sets the signal after every mutation**. No optimistic updates, no forced resolver re-run. Matches `check:no-rxjs-state` guard.
- **D-06:** `GroupService` is `@Injectable({providedIn:'root'})`, consumes the existing `SupabaseClientService` via `inject()` — no separate client.

**Rotas, guard e resolver**
- **D-07:** Route tree: `/group/create` and `/group/:id/manage` nested under a `GroupLayoutPage` with its own `<router-outlet>` (ID17); `/join/:token` stays flat. These routes enter **inside the existing authenticated layout route** in `src/app/app.routes.ts`, inheriting `authGuard` and header without reapplying them. **Documentary consequence: this diverges from `docs/sdd.md` §5.2 (which lists everything flat) — update §5.2 in the same commit.**
- **D-08:** `groupResolver` fetches the group once; `adminGuard` reads that result and compares `admin_id` to the session user. One query per navigation. Preserves "guard decides IF navigation happens, resolver decides WHAT is already ready when it happens" (ARCHITECTURE.md ~line 530).
- **D-09:** `:id` (`/group/:id/manage`) and `:token` (`/join/:token`) arrive at the component as `input()`, via `withComponentInputBinding()` already wired in `app.config.ts` since Phase 2.

**Telas**
- **D-10:** Dashboard (GRP-09): two stacked sections, "Grupos que administro" / "Grupos que participo", each with `@for` + `track`. Replaces the placeholder text in `dashboard.page.html`.
- **D-11:** Wishlist edited inside the group screen (WISH-01/02), not its own route or a global page. `wish_list` lives on `participant` — one list per group. `textarea` with `model()` delivers ID11.
- **D-12:** BrasilAPI countdown card on `/dashboard`, inside an `@defer (on viewport)` block — delivers ID8 incidentally.
- **D-13:** Use `lucide-angular` where it helps (copy-link button, remove-participant, card icons). Already in SDD §2 table and installed since Phase 1 — no new dependency.

**API pública, interceptor, ponte RxJS**
- **D-14:** Network/HTTP failure on BrasilAPI is handled by the centralized functional error interceptor (ID22); the card renders a discrete PT-BR error state. The feature is optional — failing it must not break the dashboard. Rejected: local 25/12 fallback via date-fns (makes the GET decorative); hiding the card on failure.
- **D-15:** This phase adds `provideHttpClient(withInterceptors([...]))` to `app.config.ts` — it currently has no `HttpClient` at all. BrasilAPI traffic is the **only** interceptable traffic in the project; `supabase-js` uses its own `fetch` and never passes through `HttpClient`. **Do not attempt to route Supabase through `HttpClient`.**
- **D-16:** BrasilAPI response converted Observable → Signal with **`toSignal()`** (ID24, deliberately deferred by Phase 2's D-07). `DatePipe` on the holiday date delivers ID7.

**Limitações conhecidas (registrar, não corrigir)**
- **D-17:** The `"participant: editar os proprios dados"` policy lets a user update their **entire** participation row (including `group_id`, `display_name`), not just `wish_list`. Lock down **only in the service**: `GroupService.updateWishList()` does `.update({ wish_list })` and nothing else; no screen exposes another field. A `BEFORE UPDATE` trigger is the defense-in-depth fix — same robustness class as **V2-02**, registered not implemented.
- **D-18:** The UPDATE policy on `group` lets the admin change `status` freely from the client. This phase exposes **no** status-editing screen — `open → drawing → closed` stays exclusive to the Edge Function in Phase 4.

**Link de convite e testes**
- **D-19:** The copied link (GRP-03) is built with **`window.location.origin` at runtime** + `/join/<token>`. Rejected: `appUrl` field in `environment.ts` (git-ignored, generated by `scripts/generate-env.js` at build time).
- **D-20:** Tests only where there's a real rule: specs for the join error-code translation map (GRP-07/GRP-08) and for days-until-Christmas — pure logic, no network mock. Skip trivial CRUD and `supabase-js` mocking.

**Organização do trabalho**
- **D-21:** Plan two parallel tracks: (a) Supabase track — migration `0004`, `GroupService`, `/group` + `/join` routes, dashboard, wishlist; (b) API track — `HttpClient`, interceptor, `toSignal()`, countdown card. Independent of each other — two real PRs instead of one giant one.

### Claude's Discretion
- Exact file/component names inside `features/group/{create,manage,join}/` and where the join error-code translation map lives (helper in `core/`, const in the service, or pipe in `shared/pipes/`).
- RPC return signature (`json` with `{ code, group_id }`, composite type, or `returns text`) — as long as D-03 (stable English code) holds.
- Create-group Reactive Form validation (schema already enforces `char_length(name) between 3 and 60` — client validator should mirror it) and empty-state copy for lists.
- Whether removing a participant (GRP-05) asks for confirmation and in what form (Spartan dialog, inline, or direct) — and whether that requires generating a new Spartan primitive.
- Which Spartan primitives to generate beyond the existing ones (`button`, `card`, `input`, `label`), following Phase 2's rule of avoiding ones that pull peers absent from SDD §2.
- Fine visual composition: spacing, button variants, which Lucide icons.

### Deferred Ideas (OUT OF SCOPE)
- `BEFORE UPDATE` trigger on `participant` restricting edits to `wish_list` (D-17) — same robustness class as **V2-02**, register there, don't implement.
- Nominal per-email invite / `invite` table — explicitly out of scope in REQUIREMENTS.md; PRD's RN5 already reinterpreted as `UNIQUE (group_id, user_id)`.
- Profile page / global `display_name` edit — not in v1 requirements; `participant.display_name` is denormalized at join time and not re-editable this phase.
- Per-participant avatar — **V2-04**; `avatar_url` exists in schema but nothing in MVP populates it.
- Documenting "Confirm email" disabled in README — inherited from Phase 2; belongs in Phase 5 (ENG-07) or a `/gsd:quick`.
- Gift-suggestion external API (alternative API idea from ARCHITECTURE.md ~line 552) — unnecessary; BrasilAPI covers ID19 and the wishlist is free text per WISH-01.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRP-01 | Admin creates a group via validated Reactive Form | Login page pattern (`src/app/features/auth/login/login.page.ts`) to mirror; `group.name` CHECK constraint in `0001_schema.sql` to mirror client-side |
| GRP-02 | System generates a unique `invite_token` per group | Already satisfied by schema default `encode(gen_random_bytes(16),'hex')` in `0001_schema.sql` — no new code needed, just surface it in the create-group response |
| GRP-03 | Admin views and copies the invite link | `window.location.origin` runtime construction (D-19); Clipboard API pattern below |
| GRP-04 | Admin sees the group's participant list | Existing `"participant: ver colegas do grupo"` SELECT policy already supports this — no RLS change needed |
| GRP-05 | Admin removes a participant | Existing `"participant: admin remove participante"` DELETE policy already supports this — no RLS change needed; optional confirmation dialog costs new Spartan peers (see Don't Hand-Roll) |
| GRP-06 | Authenticated user joins a group via invite link | **Blocked by current RLS** (see Common Pitfalls) — requires new RPC `join_group_by_token` (D-01) |
| GRP-07 | Double-join attempt rejected with a clear message | `participant_group_user_unique` constraint (DB-02, already exists) + RPC-level pre-check + `23505` catch (D-01/D-04) |
| GRP-08 | Non-`open` group accepts no new participants | RPC-level `status = 'open'` check inside `join_group_by_token` (D-01) — current INSERT policy's own status check is unreachable for non-members (see Pitfalls) |
| GRP-09 | Dashboard shows administered vs. participated groups separately | Two `GroupService` queries (`group` where `admin_id = uid`, `group` via `private.my_group_ids()`) — both already supported by existing SELECT policies |
| WISH-01 | Participant creates own wishlist (free text, optional) | `participant.wish_list` column already exists; Reactive Form / `model()` textarea inside `/group/:id/manage` |
| WISH-02 | Participant edits own wishlist any time before closing | Same `UPDATE` policy, scoped client-side to `{ wish_list }` only (D-17) |
| WISH-03 | Participant cannot edit another's wishlist | Already enforced by `"participant: editar os proprios dados"` policy (`user_id = auth.uid()`) — no new SQL |
| API-01 | `GET` to a public API via `HttpClient` | `GET https://brasilapi.com.br/api/feriados/v1/{ano}` — verified live, no auth required |
| API-02 | UI shows days until Christmas, derived from the API | `date-fns` `differenceInCalendarDays` against a `Date` for Dec 25 of the response year (verified export in installed date-fns ^3.6) |
| API-03 | Centralized functional interceptor handles failures of this call | `HttpInterceptorFn` type confirmed in installed `@angular/common/http`; `provideHttpClient(withInterceptors([...]))` not yet in `app.config.ts` |
| API-04 | Response converted Observable → Signal via `toSignal()` | `toSignal` confirmed exported from `@angular/core/rxjs-interop` in installed Angular 21.2 |
</phase_requirements>

## Summary

The codebase already has everything Phase 1–2 promised: four tables with every constraint CONTEXT.md references, the two `private.*` SECURITY DEFINER helpers, all RLS policies from `0003_rls_policies.sql`, a working `AuthService`/`authGuard`/`SupabaseClientService` triad using signals + `inject()`, and an auth-error-message translation pattern that Phase 3 is meant to clone. None of that needs to be re-derived — it needs to be read and extended.

The one real technical discovery this phase hinges on is already correctly diagnosed in CONTEXT.md and independently confirmed here by reading `0003_rls_policies.sql` directly: the Phase 1 policies **cannot support joining a group by invite link**. A non-member can't SELECT the group row to resolve the token, and the INSERT policy on `participant` filters its own `status = 'open'` subquery through RLS on `group`, which a non-member can't read either. The fix locked by CONTEXT.md — two `SECURITY DEFINER` RPCs (`join_group_by_token`, `preview_group_by_token`) in a new migration `0004` — is correct and is the only viable option; a new SELECT policy on `group` keyed by token was rightly rejected because it would let anyone with a guessed/leaked token read the group row directly.

Angular 21.2 is actually installed (not just declared) with `toSignal()`, `HttpInterceptorFn`, `provideHttpClient(withInterceptors(...))`, and `httpResource` all available — CONTEXT.md's choice of `toSignal()` over `httpResource` is viable and is what's locked (D-16); `httpResource` is noted below only as a rejected alternative. BrasilAPI's actual endpoint and response shape were verified live: `GET https://brasilapi.com.br/api/feriados/v1/{ano}` → `[{date, name, type, weekday}]`, no auth. One new finding not previously documented: generating the Spartan `dialog` primitive (candidate for a remove-participant confirmation) pulls `@ng-icons/core` + `@ng-icons/lucide` as peers — exactly the SDD §2 violation Phase 2 already avoided once by skipping `field`. This is a live landmine for the "Claude's Discretion" item about confirmation dialogs and must be flagged for the planner.

**Primary recommendation:** Write migration `0004` exactly as D-01–D-04 specify (mirroring `0002_private_helpers.sql`'s `SECURITY DEFINER`/`search_path=''` pattern), build `GroupService` as a thin signal-based wrapper over Supabase queries + the two new RPCs, and keep the API track (`HolidayService` + `errorInterceptor` + `toSignal()`) entirely separate from Supabase — it needs nothing from the Supabase track and should ship as its own PR per D-21.

## Standard Stack

No new runtime dependencies are needed for this phase — everything required is already installed and in `docs/sdd.md` §2.

### Core (already installed, reused)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/common/http` | 21.2.25 | `HttpClient`, functional interceptors, `provideHttpClient` | Ships with Angular; only legitimate interceptor target in this project (ID22) |
| `@angular/core` (rxjs-interop) | 21.2.25 | `toSignal()` | Locked by D-16; confirmed present in `@angular/core/rxjs-interop` |
| `@supabase/supabase-js` | ^2.117.3 | RPC calls (`.rpc('join_group_by_token', ...)`), table CRUD | Already the project's sole BaaS client (`SupabaseClientService`) |
| `date-fns` | ^3.6.0 | `differenceInCalendarDays` for API-02 | Already in SDD §2; confirmed exported in installed version |
| `lucide-angular` | ^1.0.0 | Copy/remove icons (D-13) | Already installed since Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@spartan-ng/helm/input`, `/label`, `/button`, `/card` | ^1.7.0 (already generated) | Create-group form, dashboard cards | Already generated in `libs/ui/` — reuse, don't regenerate |

### Alternatives Considered (and rejected by CONTEXT.md or this research)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `toSignal()` on an `HttpClient().get()` pipe | `httpResource()` (Angular 21 signal-based HTTP primitive, confirmed present in installed `@angular/common/http`) | `httpResource` is newer and arguably more idiomatic in v21, but D-16 explicitly locks `toSignal()` because ID24 literally asks for the RxJS↔Signals bridge — `httpResource` would not demonstrate that bridge. Do not substitute. |
| New SELECT policy on `group` keyed by `invite_token` | RPC `join_group_by_token`/`preview_group_by_token` (D-01/D-02) | Policy approach leaks the group row to anyone holding/guessing the token and splits the join rule across two policies instead of one RPC. Rejected by CONTEXT.md. |
| Spartan `dialog` for remove-participant confirmation | Inline confirm (two-click / `window.confirm`) or no confirmation | `dialog` pulls `@ng-icons/core`+`@ng-icons/lucide`, absent from SDD §2 — same violation Phase 2 avoided for `field`. Flagged as a new finding below; left to Claude's Discretion but the tradeoff must be visible. |

**No installation needed.** If the planner decides a Spartan `dialog` is worth the new peers, that requires updating `docs/sdd.md` §2 first per CLAUDE.md's hard rule — treat as a deliberate, documented exception, not a silent `ng g`.

**Version verification performed:**
```
@angular/core, @angular/common: 21.2.25 (checked in node_modules, matches ^21.2.0 range)
date-fns: ^3.6.0 (package.json; differenceInCalendarDays confirmed present)
```

## Architecture Patterns

### Recommended file additions
```
supabase/migrations/
└── 0004_group_join_rpcs.sql       # join_group_by_token, preview_group_by_token (D-01, D-02)

src/app/core/
├── services/
│   ├── group.service.ts           # D-05/D-06: signals + refetch-after-mutation
│   └── holiday.service.ts         # API track: wraps HttpClient + toSignal()
├── guards/
│   └── admin.guard.ts             # D-08: reads groupResolver's result
├── resolvers/
│   └── group.resolver.ts          # D-08: fetches the group once
├── interceptors/
│   └── error.interceptor.ts       # D-14/D-15: HttpInterceptorFn, only touches HttpClient traffic
└── join-error-messages.ts         # D-03: mirrors auth-error-messages.ts exactly (or discretion: elsewhere)

src/app/features/group/
├── group.routes.ts                # D-07: nested under GroupLayoutPage
├── group-layout/
│   └── group-layout.page.ts       # own <router-outlet>
├── create/
│   └── create-group.page.ts       # GRP-01, Reactive Form
├── manage/
│   └── manage-group.page.ts       # GRP-04/05, WISH-01/02, resolver-fed
└── join/
    └── join-group.page.ts         # GRP-06/07/08, D-02 preview + confirm
```

### Pattern 1: SECURITY DEFINER RPC for join (D-01)
**What:** A plpgsql function owned by the table owner, callable via `supabase.rpc()`, that performs the token→group resolution, status check, membership check, and INSERT as one atomic unit — entirely server-side, never relying on a client-visible SELECT of `group`.
**When to use:** Any time a non-member needs to act on a row they cannot yet read under RLS (the exact situation for invite links).
**Example, mirroring the exact pattern already in `supabase/migrations/0002_private_helpers.sql`:**
```sql
-- supabase/migrations/0004_group_join_rpcs.sql
create or replace function public.preview_group_by_token(p_token text)
returns table (name text, status text)
language sql
security definer
set search_path = ''
stable
as $$
  select g.name, g.status
  from public.group g
  where g.invite_token = p_token
$$;

revoke execute on function public.preview_group_by_token(text) from public;
grant execute on function public.preview_group_by_token(text) to authenticated;

create or replace function public.join_group_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group     public.group;
  v_profile   public.profile;
  v_new_id    uuid;
begin
  select * into v_group from public.group where invite_token = p_token;
  if v_group is null then
    return json_build_object('code', 'INVALID_TOKEN');
  end if;

  if v_group.status <> 'open' then
    return json_build_object('code', 'GROUP_CLOSED');
  end if;

  if exists (
    select 1 from public.participant
    where group_id = v_group.id and user_id = (select auth.uid())
  ) then
    return json_build_object('code', 'ALREADY_MEMBER');
  end if;

  select * into v_profile from public.profile where id = (select auth.uid());

  begin
    insert into public.participant (group_id, user_id, display_name)
    values (v_group.id, (select auth.uid()), v_profile.display_name)
    returning id into v_new_id;
  exception when unique_violation then
    -- D-04: the constraint is the real safety net for a two-tab race;
    -- translate it to the same stable code instead of leaking 23505.
    return json_build_object('code', 'ALREADY_MEMBER');
  end;

  return json_build_object('code', 'OK', 'group_id', v_group.id);
end;
$$;

revoke execute on function public.join_group_by_token(text) from public;
grant execute on function public.join_group_by_token(text) to authenticated;
```
**Note on schema placement:** unlike `private.my_group_ids()`, these two functions are **intentionally in `public`**, not `private` — they are meant to be called directly by the authenticated client via `supabase.rpc()`. `private` is reserved for helpers meant only to be referenced *inside* other SQL (policies/functions), never invoked from the client. Calling a `public`-schema `SECURITY DEFINER` function from the client is safe here specifically because its own body re-validates everything (token, status, membership) rather than trusting the caller — this is different from the recursion-helper functions, which trust being called only from within a policy's `USING` clause.
**Still required:** `set search_path = ''` and schema-qualified names in both functions, exactly as ARCHITECTURE.md and `0002_private_helpers.sql` establish — omitting this reopens the same search-path-hijack footgun regardless of which schema the function lives in.

### Pattern 2: Signal-based service with refetch-after-mutation (D-05)
**What:** Private writable `signal()`, public `.asReadonly()` or `computed()`, every mutating method calls `.set()` again with freshly fetched data rather than patching local state.
**When to use:** All of `GroupService`'s mutating operations (create group, remove participant, update wishlist, join).
**Example, following the existing `AuthService` shape exactly:**
```typescript
// core/services/group.service.ts
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly _administered = signal<Group[]>([]);
  private readonly _participated = signal<Group[]>([]);

  readonly administered = this._administered.asReadonly();
  readonly participated = this._participated.asReadonly();

  async refreshDashboard(): Promise<void> {
    const [{ data: admin }, { data: member }] = await Promise.all([
      this.supabase.from('group').select('*').order('created_at', { ascending: false }),
      this.supabase.from('group').select('*, participant!inner(user_id)').order('created_at', { ascending: false }),
    ]);
    this._administered.set(admin ?? []);
    this._participated.set(member ?? []);
  }

  async removeParticipant(participantId: string): Promise<void> {
    await this.supabase.from('participant').delete().eq('id', participantId);
    // D-05: refetch, never patch the signal locally.
  }
}
```
Note: the two SELECT policies on `group` (`admin_id = auth.uid()` OR via `private.my_group_ids()`) are separate policies, not an OR in one — so a single `.from('group').select('*')` with no filter already returns the **union** of both (admin groups + member groups) because Postgres RLS ORs all permissive policies together automatically. The split into `administered`/`participated` for GRP-09 happens **client-side** by checking `admin_id === currentUserId`, or via two separate queries as shown — either works; the dashboard section split (D-10) is a UI concern, not an RLS one.

### Pattern 3: Guard reads resolver's result (D-08)
**What:** `groupResolver` performs the one query; `adminGuard` is ordered after it in the route config and reads `route.data['group']` (resolvers populate `ActivatedRouteSnapshot.data` before guards on child routes see it only if ordered correctly — see pitfall below) or, more robustly, re-reads the already-fetched signal from the service if the resolver stored it there.
**When to use:** `/group/:id/manage`.
**Pitfall to verify during planning:** Angular resolves `data` for guards on the **same route** only if the resolver runs in `resolve` of that route and the guard is `canActivate` on that *same* route — guard and resolver execution order for the *same* route is: guards run first, then resolvers, by default. This means `adminGuard` **cannot** read `groupResolver`'s output via route data if both are attached to `/group/:id/manage` directly, because the guard runs before the resolver. The pattern that actually works: have `groupResolver` itself be the single source of truth — call it once, store the result in `GroupService`'s signal, and let `adminGuard` call the **same async fetch** (or read the signal set moments earlier in the same navigation if resolvers are guaranteed to run after guards and nothing else races). **Practical resolution for the planner:** either (a) do the admin check *inside* the resolver itself (throw/redirect via `inject(Router).createUrlTree(...)` returned from the resolver, which Angular supports as a valid `ResolveFn` return value) and drop `adminGuard` as a separate guard, or (b) keep both but accept one query in the guard and one in the resolver (reverts to the "two roundtrips" option D-08 explicitly rejected). **This is a genuine ambiguity in D-08 that the plan must resolve explicitly** — recommend option (a): fold the admin check into the resolver, since `ResolveFn` returning a `UrlTree` to redirect is official, documented Angular Router behavior and satisfies ID18's requirement for "Guards ... and Resolvers" with one query, honoring the spirit of D-08 even if not its literal guard/resolver split.

### Pattern 4: Functional interceptor + toSignal() bridge (D-14/D-15/D-16)
**What:** Register `provideHttpClient(withInterceptors([errorInterceptor]))` in `app.config.ts`; `HolidayService` calls `HttpClient.get()`, pipes a `catchError` (or lets the interceptor normalize), and bridges to a signal with `toSignal()`.
**Example, confirmed against installed Angular 21.2 types:**
```typescript
// core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      console.error('[HTTP]', req.url, err.status);
      return throwError(() => err); // rethrow so the caller's catchError still sees it
    }),
  );
```
```typescript
// core/services/holiday.service.ts
@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly http = inject(HttpClient);
  private readonly year = new Date().getFullYear();

  private readonly holidays = toSignal(
    this.http.get<{ date: string; name: string; type: string; weekday: string }[]>(
      `https://brasilapi.com.br/api/feriados/v1/${this.year}`,
    ).pipe(catchError(() => of(null))),
    { initialValue: undefined },
  );

  readonly daysUntilChristmas = computed(() => {
    const data = this.holidays();
    if (data === undefined) return undefined; // still loading
    if (data === null) return null; // errored — card shows error state
    const today = new Date();
    const christmas = new Date(today.getFullYear(), 11, 25);
    return differenceInCalendarDays(christmas, today);
  });
}
```
```typescript
// app.config.ts — D-15 addition
provideHttpClient(withInterceptors([errorInterceptor])),
```
This gives the card three distinct states (`undefined` = loading, `null` = error, `number` = loaded) without needing a separate "loading" signal — matches D-14's requirement that failure renders a discrete error state rather than hiding the card or silently falling back to a local calculation.

### Anti-Patterns to Avoid
- **Adding a `group` SELECT policy keyed by `invite_token`:** explicitly rejected by D-01; re-opens the exact token-leak vector CONTEXT.md already ruled out.
- **Trusting the client-visible `participant` INSERT policy for join:** that policy's own `status = 'open'` subquery is itself RLS-filtered on `group` and returns nothing for a non-member — a direct `.from('participant').insert(...)` from the client will fail silently (no rows match the `with check`) for every new invitee. This is the core pitfall this phase exists to fix; do not "simplify" D-01 back into a direct insert.
- **Routing Supabase traffic through `HttpClient`:** structurally impossible (`supabase-js` uses its own `fetch`); don't spend planning time trying.
- **Letting `GroupService.updateWishList()` call a generic `.update(partial)`:** must be hardcoded to `.update({ wish_list })` only (D-17) — the RLS policy would allow a broader update, so the narrowing has to live in the service, not the database, for this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Single-use-per-user join enforcement | Custom "has this email already joined" lookup table/logic | `participant_group_user_unique` constraint (already exists, DB-02) + RPC pre-check (D-04) | The constraint is the DB-level truth; duplicating that logic in application code risks a race-condition gap the constraint already closes for free |
| Token → group resolution bypassing RLS | A new RLS policy carve-out | `SECURITY DEFINER` RPC (D-01/D-02) | RLS carve-outs by token are visible/exploitable by anyone who obtains the token string; a RPC validates and acts in one atomic, non-queryable step |
| Copy-to-clipboard | A clipboard polyfill library | `navigator.clipboard.writeText()` (native, supported in all evergreen browsers this project targets) | Zero new dependency; Spartan/Lucide already provide the icon, the API call is one line |
| Error-code → PT-BR message mapping | A generic i18n library (ngx-translate, @angular/localize) | A plain `Record<string, string>` map, exact shape of `auth-error-messages.ts` | The project has ~6 known codes total across Auth + Join; a full i18n pipeline is unjustified machinery for a fixed, small, enumerable set |
| Days-until-Christmas math | Manual date arithmetic (`Math.floor((christmas - today) / 86400000)`) | `date-fns` `differenceInCalendarDays` (already a dependency) | Hand-rolled ms-diff math is wrong at DST boundaries and when "today" has a non-midnight time component; `differenceInCalendarDays` is calendar-day-aware and already in the stack |

**Key insight:** Every "don't hand-roll" in this phase traces back to one idea — the project already paid for the right primitive (a constraint, a service, a library) in an earlier phase or in the SDD table; Phase 3's job is to wire to it, not re-derive it.

## Common Pitfalls

### Pitfall 1: The current RLS silently blocks every new invitee (the phase's central discovery)
**What goes wrong:** A naive implementation does `supabase.from('participant').insert({ group_id, user_id, display_name })` directly from the join page. It fails — but not loudly. The INSERT's `with check` clause requires `group_id in (select g.id from public.group g where g.status = 'open')`, and that inner SELECT on `group` is itself subject to `group`'s own RLS SELECT policies. A user who is not yet a participant and not the admin matches **neither** `group` SELECT policy, so the subquery returns zero rows for them — the `with check` evaluates false, and Postgres returns a generic RLS-violation error (or, depending on client error handling, the insert simply reports 0 rows affected / an opaque 42501).
**Why it happens:** It's invisible reading either policy in isolation — only visible when tracing what the INSERT policy's subquery can see under the *invitee's* session, not the admin's.
**How to avoid:** Use `join_group_by_token` (D-01). It's a `SECURITY DEFINER` function, so its internal queries run with the owning role's privileges, not the caller's RLS-filtered view — the function itself can see the group row regardless of the caller's membership.
**Warning signs:** Manual testing of "join via invite link" with a second browser/incognito session returns success from the Supabase client with 0 rows actually inserted, or a `new row violates row-level security policy for table "participant"` error (code `42501`).

### Pitfall 2: Guard/resolver ordering on the same route (new finding, not in CONTEXT.md)
**What goes wrong:** Angular Router runs `canActivate` guards for a route **before** that route's `resolve` resolvers. If `adminGuard` is meant to read `groupResolver`'s output (as D-08 implies) and both are declared on `/group/:id/manage`, the guard executes first and the resolver's data doesn't exist yet.
**Why it happens:** This is standard, documented Router behavior, not a bug — but it's easy to assume "whatever I put in `resolve` is available to `canActivate` on the same route" by analogy with parent/child route data inheritance (which *does* flow downward, just not sideways-before-resolution).
**How to avoid:** Fold the admin check into the resolver itself (a `ResolveFn` can return a `UrlTree` to redirect, which the Router accepts as a cancel-and-redirect — same mechanism `authGuard` already uses), or accept two independent queries (guard + resolver), or put `adminGuard` on a *parent* route and the resolver on the child (then the guard's own independent check runs, separately, before the child resolver — still two queries, just not reading each other).
**Warning signs:** `adminGuard` reads `undefined` from `route.data`, or crashes on first navigation to `/group/:id/manage` because the resolver hasn't populated anything yet.

### Pitfall 3: Spartan `dialog` generation pulls peers outside SDD §2 (new finding)
**What goes wrong:** If the remove-participant confirmation (an open "Claude's Discretion" item) is implemented with `ng g @spartan-ng/cli:ui dialog`, it installs/generates code depending on `@ng-icons/core` and `@ng-icons/lucide` — neither is in `docs/sdd.md` §2's locked dependency table. It may also require adding `provideSpartanHlm()` to `app.config.ts` for Angular 21's CDK overlay `usePopover` default to not visually break the dialog (renders overlay-based components, like dialogs, above `position: fixed` elements correctly).
**Why it happens:** Spartan's "generate primitive" step is marketed as zero-install (it copies code into `libs/ui/`), but the generated code's own imports still introduce new *peer* dependencies that `npm install` must resolve — same class of problem Phase 2 already hit and avoided once with `field`.
**How to avoid:** For GRP-05's confirmation, prefer a pattern that needs no new primitive: a disabled-until-second-click button, an inline "tem certeza?" row swapped in via `@if`, or (if a true modal is wanted) `@angular/cdk/dialog` directly (CDK is already a pinned dependency, `21.0.0`) without pulling Spartan's `helm/dialog` wrapper and its icon peers. If the planner does want the Spartan dialog, treat it as a deliberate SDD §2 update (new row for `@ng-icons/core`/`@ng-icons/lucide`), not a silent side effect.
**Warning signs:** `npm install` (even with `--legacy-peer-deps`) pulls packages not listed in SDD §2; `check:no-secrets`/CI stays green but the dependency table is now stale, violating CLAUDE.md's hard rule.

### Pitfall 4: `0003`'s `participant` INSERT policy is still correct to keep, not remove
**What goes wrong:** It might look tempting to delete the existing `"participant: entrar em um grupo"` INSERT policy since the RPC bypasses it entirely (as `SECURITY DEFINER`).
**Why it happens:** Once the RPC does the real insert, the policy looks dead.
**How to avoid:** Keep it. It's still the thing that stops a signed-in user from inserting an arbitrary `participant` row directly (bypassing the RPC) for a group that happens to be `open` and where they already pass `user_id = auth.uid()`. Removing it would mean *any* authenticated user could self-insert into *any* open group without going through token validation at all — the RPC adds the token/membership checks on top of, not instead of, the existing policy's baseline guarantee.
**Warning signs:** None visible in normal testing — this is a security regression that only shows up if someone deliberately bypasses the RPC via direct table access, which is exactly why it's easy to miss.

### Pitfall 5: `preview_group_by_token` returning `status` is intentional but must never grow
**What goes wrong:** A natural "nice to have" extension is making `preview_group_by_token` also return participant count ("3 people have already joined!") for a nicer invite screen.
**Why it happens:** Seems harmless, improves UX.
**How to avoid:** D-02 explicitly forbids this — even a count is information leakage about group membership to someone who isn't a member yet, and CONTEXT.md flags this as a hard line ("nunca deve passar a devolver lista de participantes"). Keep the function's return type exactly `{ name, status }`.
**Warning signs:** None at runtime — this is a design discipline issue the planner must encode as an explicit constraint in the RPC's return type, not something a test will catch.

## Code Examples

### Clipboard copy without a new dependency (GRP-03)
```typescript
// Source: MDN Clipboard API — https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
protected async copiarLink(): Promise<void> {
  const link = `${window.location.origin}/join/${this.group().invite_token}`;
  await navigator.clipboard.writeText(link);
  this.copiado.set(true);
  setTimeout(() => this.copiado.set(false), 2000);
}
```
Requires no permission prompt for `writeText` in a secure context (HTTPS or localhost) triggered by a user gesture (the click handler) — exactly this project's deployment target (Vercel HTTPS + localhost dev).

### Wishlist two-way binding with model() (WISH-01/02, ID11)
```typescript
// Source: Angular docs — model() two-way binding, confirmed pattern already flagged
// by eslint's prefer-signal-model rule in this repo's eslint.config.js
protected readonly wishList = model<string>('');
```
```html
<textarea [(ngModel)]="wishList" ...></textarea>
```
Note: `model()` + `[(ngModel)]` requires `FormsModule`, not `ReactiveFormsModule` — if the wishlist textarea is meant to live inside a Reactive Form (for consistency with GRP-01's form), use a plain `FormControl` with `.valueChanges` + `toSignal()` instead and skip `model()` for this field, OR keep the wishlist textarea genuinely standalone (not part of the Reactive Form) specifically so `model()` applies cleanly — this is the actual mechanism D-11 intends (`model()` for ID11), so the wishlist textarea should be a **separate, simple two-way-bound control**, not folded into the create-group Reactive Form.

### Days until Christmas (API-02) — pure function, testable per D-20
```typescript
// Source: date-fns v3 docs — differenceInCalendarDays
import { differenceInCalendarDays } from 'date-fns';

export function diasAteNatal(hoje: Date, ano: number): number {
  const natal = new Date(ano, 11, 25);
  return differenceInCalendarDays(natal, hoje);
}
```
This is exactly the kind of pure, mockable-without-network function D-20 calls for — testable with `describe/it/expect` the same way `auth.guard.spec.ts` is structured, no `TestBed` or Supabase mock required.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `toSignal()` for every HTTP call | `httpResource()` as an Angular-native alternative | Angular 19+ (confirmed present in this project's installed 21.2) | Not adopted here — D-16 deliberately keeps `toSignal()` because ID24 specifically grades the RxJS↔Signals bridge; `httpResource()` wouldn't demonstrate it. Noted so the planner doesn't "upgrade" to `httpResource` and accidentally lose ID24 coverage. |
| CDK overlay default positioning pre-Angular 21 | Angular 21 CDK overlay defaults to `usePopover` behavior, which can render dialogs/tooltips incorrectly relative to `position: fixed` elements unless `provideSpartanHlm()` is added | Angular 21 | Only relevant if a Spartan overlay-based primitive (dialog, tooltip, sheet) is generated this phase — see Pitfall 3 |

**Deprecated/outdated:** None relevant to this phase's scope — Angular 21, Supabase JS v2, and date-fns v3 are all current and already locked by the project.

## Open Questions

1. **Does `adminGuard` + `groupResolver` as two separate mechanisms on the same route actually satisfy D-08's "one query" intent, or should the admin check be folded into the resolver?**
   - What we know: Angular runs guards before resolvers on the same route, so a literal reading of D-08 ("resolver fetches, guard reads result") is not mechanically possible without either reordering onto parent/child routes or merging the two.
   - What's unclear: whether CONTEXT.md's author intended a parent/child split (guard on `/group`, resolver on `:id/manage`) or a resolver-does-everything merge.
   - Recommendation: the plan should pick one explicitly and say so — recommend folding the admin check into `groupResolver` (returning a redirect `UrlTree` on mismatch), since this is official supported `ResolveFn` behavior and genuinely achieves "one query," which is D-08's actual stated goal even if the literal "guard reads resolver's result" wording doesn't map onto Router mechanics.

2. **Should `join_group_by_token` and `preview_group_by_token` live in `public` or get an extra wrapper?**
   - What we know: CONTEXT.md and ARCHITECTURE.md's precedent (`private.*` helpers) both reserve `private` for functions that must never be Data-API-callable. These two RPCs are meant to be called directly via `supabase.rpc()` from the browser — that requires `public` schema (or any schema exposed to PostgREST) by definition.
   - What's unclear: nothing structurally — this is settled — but the planner must not accidentally put them in `private` by over-applying the Phase 1 precedent, which would make them uncallable from the client.
   - Recommendation: confirm in the plan that these two functions are explicitly `public` schema, each individually `revoke ... from public; grant execute ... to authenticated;` scoped (least privilege, but still client-callable) — this is spelled out in the Code Example above.

3. **`docs/sdd.md` §5.2 update — exact wording.**
   - What we know: D-07 mandates updating §5.2 "in the same commit" to reflect the nested `/group` tree instead of the current flat listing.
   - What's unclear: whether the update should also touch §5.1 (folder structure) to add `resolvers/` (currently absent from SDD §5.1, though ARCHITECTURE.md already proposed it) and §5.3 (core services table, to add `GroupService`'s actual responsibilities and a new `HolidayService` row).
   - Recommendation: update §5.1, §5.2, and §5.3 together as one documentation task in the plan — they're inconsistent with each other right now in ways this phase's code will make worse if only §5.2 is touched.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (real, remote) | Migration `0004` apply + RLS verification with two users | ✓ (per STATE.md: "Supabase: projeto real ativo, RLS verificada") | — | — |
| `supabase` CLI | Applying migration `0004` | ✓ | ^2.121.0 (devDependency) | — |
| BrasilAPI (`brasilapi.com.br`) | API-01..04 | ✓ (verified live GET during this research) | — | None needed — D-14 explicitly treats API failure as an expected, handled UI state, not a blocker |
| `@angular/common/http` | API-01, API-03, API-04 | ✓ | 21.2.25 (installed) | — |
| `navigator.clipboard` | GRP-03 | ✓ (all evergreen browsers; HTTPS/localhost only) | — | None needed for this project's deployment target (Vercel HTTPS) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — the only "missing" item (BrasilAPI being down at grading time) already has its fallback designed into the requirement itself (D-14's error state), not into the environment.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0001_schema.sql`, `0002_private_helpers.sql`, `0003_rls_policies.sql` — read directly; confirms exact current RLS state and the join blocker
- `src/app/core/services/auth.service.ts`, `supabase-client.service.ts`, `auth-error-messages.ts`, `guards/auth.guard.ts` — read directly; the patterns this phase's code must mirror
- `src/app/app.routes.ts`, `app.config.ts` — read directly; exact insertion points for D-07/D-15
- `node_modules/@angular/common/types/http.d.ts` — confirmed `HttpInterceptorFn`, `withInterceptors`, `httpResource` all present in installed 21.2.25
- `node_modules/@angular/core/types/rxjs-interop.d.ts` (file located) — confirms `toSignal` ships in installed Angular 21.2.25
- `package.json` — confirms `date-fns ^3.6.0`, no new dependency needed
- Live fetch of `https://brasilapi.com.br/api/feriados/v1/2026` — confirmed response shape `[{date, name, type, weekday}]`, no auth header needed
- `.planning/config.json` — confirms `workflow.nyquist_validation: false`, so the Validation Architecture section is correctly omitted from this document

### Secondary (MEDIUM confidence)
- [spartan.ng/components/dialog](https://spartan.ng/components/dialog) — confirmed via WebFetch: `provideSpartanHlm()` needed for Angular 21 CDK overlay `usePopover` default; `@ng-icons/core`/`@ng-icons/lucide` as peers for the `dialog` primitive

### Tertiary (LOW confidence, flagged)
- BrasilAPI field names (`weekday` in Portuguese) came from an initial WebSearch before being independently re-verified by a direct WebFetch of the live endpoint — the WebFetch confirmation upgrades this to MEDIUM/HIGH; no longer purely LOW.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all versions confirmed against installed `node_modules` and `package.json` directly
- Architecture (RLS/RPC design): HIGH — the join-blocker diagnosis was independently re-derived by reading the actual migration files, not just trusting CONTEXT.md's claim
- Architecture (guard/resolver ordering): MEDIUM — Angular Router's guard-before-resolver execution order on the same route is well-documented standard behavior, but the exact resolution the planner should choose (fold into resolver vs. parent/child split) is a judgment call flagged as an Open Question
- Pitfalls: HIGH for Pitfalls 1, 3, 4, 5 (derived from reading actual SQL/docs); MEDIUM for Pitfall 2 (general Router behavior, not project-specific code read)

**Research date:** 2026-10-15
**Valid until:** 30 days (stable Angular/Supabase APIs; BrasilAPI endpoint has been stable for years) — re-verify BrasilAPI endpoint reachability only if execution happens much later, as it's a third-party free service with no SLA
