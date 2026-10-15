---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
verified: 2026-10-15T14:20:22Z
status: passed
score: 5/5 truths verified
re_verification:
  previous_status: gaps_found
  previous_score: "4/5 (1 partial) + 1 documentation gap"
  gaps_closed:
    - "Participante cadastra e edita a própria lista de desejos a qualquer momento antes do encerramento, mas não consegue editar a de outra pessoa (Success Criteria 4) — fechado pela plan 03-06 com memberGuard + GroupViewPage em /group/:id"
    - "docs/sdd.md §5.2 continha parágrafo afirmando que o adminGuard não existia — já havia sido corrigido fora do escopo de 03-06, nos commits b324e3a/8dcf70f, antes desta rodada"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Abrir /group/create, /group/:id/manage e /group/:id em viewport de 320px"
    expected: "Layout mobile-first sem overflow horizontal, textarea e botões com área de toque adequada"
    why_human: "Avaliação visual/responsiva não é verificável por grep"
  - test: "Com duas contas reais: A cria grupo, convida B; B entra, abre /group/:id pelo dashboard, vê colegas e a própria wishlist (sem botão Remover, sem link de convite, sem 'Gerenciar grupo'); B edita a wishlist, salva, dá F5, confirma persistência; B tenta abrir /group/:id/manage na URL e é redirecionado para /dashboard; A abre /group/:id do próprio grupo e vê o link 'Gerenciar grupo'"
    expected: "Todos os 8 passos do roteiro de verificação manual de 03-06-PLAN.md se comportam como descrito"
    why_human: "Requer sessões de navegador reais com Supabase Auth; não reproduzível por grep/build"
---

# Phase 3: Grupos, Participantes, Wishlist e API Pública — Verification Report

**Phase Goal:** Administrador cria grupo e gerencia participantes via convite; participante
mantém sua lista de desejos; aplicação consome uma API pública externa via HttpClient com
interceptor funcional.

**Verified:** 2026-10-15T14:20:22Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 03-06, merged via commit 3c40d56)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin cria grupo (Reactive Form validado), recebe link de convite único, copia em um clique | ✓ VERIFIED (regression-checked, unchanged) | `create-group.page.ts`/`.html` unmodified since prior verification |
| 2 | Admin vê/remove participantes; entrar 2x é rejeitado com mensagem clara; grupo não-`open` para de aceitar | ✓ VERIFIED (regression-checked, unchanged) | `manage-group.page.ts`/`.html` byte-identical to pre-03-06 state (confirmed via `git diff --stat`) |
| 3 | Usuário entra por deep link de convite; dashboard separa grupos administrados/participados | ✓ VERIFIED (regression-checked, unchanged) | `join-group.page.ts`, dashboard "administro"/"participo" sections unmodified in logic, only the "participo" card gained a `routerLink` |
| 4 | Participante cadastra e edita a própria wishlist a qualquer momento; não edita a de outro | ✓ VERIFIED — **gap closed this round** | `memberGuard` (`src/app/core/guards/member.guard.ts`) admits any member via `group !== null` (RLS already ORs admin/participant SELECT policies); `GroupViewPage` at `/group/:id` renders roster + a `model<string>()` wishlist textarea wired to `GroupService.updateWishList`; dashboard's "Grupos que participo" card now has `[routerLink]="['/group', grupo.id]"`. Read directly from source, not from SUMMARY claims |
| 5 | Dashboard mostra dias até o Natal via `GET` real à BrasilAPI, `toSignal()`, interceptor funcional de erro | ✓ VERIFIED (regression-checked, unchanged) | `HolidayService`, `errorInterceptor`, `christmas-countdown.card` all unmodified by 03-06 |

**Score:** 5/5 verified. The one gap from the prior round (WISH-01/WISH-02 UI unreachable for
non-admin participants) is now closed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/core/guards/member.guard.ts` | `CanActivateFn` admitting admin OR participant, blocking strangers | ✓ VERIFIED | Read in full. `async (route) => { ... }`, checks `route.paramMap.get('id')`, calls `groups.loadGroup(id)`, returns `router.createUrlTree(['/dashboard'])` twice (missing `:id`, `group === null`), otherwise `true`. No `AuthService` injected, no `admin_id` comparison in executable code (only in JSDoc comments) — exactly as specified |
| `src/app/core/guards/member.guard.spec.ts` | Spec proving real Router navigation, not just return value | ✓ VERIFIED | 6 tests across 2 describe blocks. Block A (4 tests) mirrors `admin.guard.spec.ts`'s return-value pattern. Block B (2 tests) uses `RouterTestingHarness.create()` + `harness.navigateByUrl('/group/g1')`, asserting `activatedComponent` is `DummyDashboardComponent` (not `DummyGroupViewComponent`) for the blocked case, and the inverse for the allowed case — genuinely testing Router *action*, not guard return value |
| `src/app/features/group/view/group-view.page.ts` | Participant screen: group name, roster, own wishlist via `model()` | ✓ VERIFIED | `input.required<string>()` for `id`; `model<string>('')` for `wishList`; two `effect()`s (input-read pattern, wishlist seeding with `semeado` flag to avoid clobbering in-flight edits); `constructor()` takes zero params (DI via `inject()`); `salvarWishList()` calls `this.groups.updateWishList(p.id, this.wishList(), this.id())` |
| `src/app/features/group/view/group-view.page.html` | Template with `@for`+`track`, `[(ngModel)]`, admin-only manage link | ✓ VERIFIED | `@for (p of participantes(); track p.id)` with `[podeRemover]="false"`; `[(ngModel)]="wishList"` on the textarea; `@if (souAdmin())` gates a single `routerLink` to `/group/:id/manage` — no removal controls, no invite link, confirmed absent via grep (`removeParticipant\|invite_token` = 0 matches in the `.ts`) |
| `src/app/features/group/group.routes.ts` | New `:id` route with `memberGuard`, `:id/manage` untouched | ✓ VERIFIED | `path: ':id'` with `canActivate: [memberGuard]`, no `resolve`, positioned after `:id/manage` in the array. The `:id/manage` route block is byte-identical to before (`canActivate: [adminGuard]`, `resolve: { group: groupResolver }`) |
| `src/app/features/dashboard/dashboard.page.html` | "Grupos que participo" card now clickable | ✓ VERIFIED | `<a [routerLink]="['/group', grupo.id]" class="mb-2 block">` wraps the card; "Grupos que administro" section unchanged, still routes to `/group/:id/manage` |
| `docs/sdd.md` §5.1/§5.2 | Folder tree + route table reflect new guard/component | ✓ VERIFIED | `member.guard.ts` and `features/group/view/` listed in the folder tree; `/group/:id` row (with `memberGuard`) appears in the route table immediately before the `/group/:id/manage` row; new 3-paragraph section documents the two-role split and the rejected `@if (souAdmin())`-in-one-component alternative; the previously-fixed `adminGuard` paragraph ("Ele existe, em...") remains intact |
| `src/app/core/guards/admin.guard.ts`, `admin.guard.spec.ts`, `src/app/core/resolvers/group.resolver.ts`, `group.resolver.spec.ts`, `src/app/features/group/manage/**` | Must remain byte-identical | ✓ VERIFIED | `git diff --stat` between the pre-03-06 commit (`3f5de40`) and the current `HEAD` (`3c40d56`) for these paths returns empty — zero bytes changed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `group.routes.ts` | `memberGuard` | `canActivate: [memberGuard]` on `:id` | ✓ WIRED | Confirmed line-by-line in the real file |
| `group-view.page.ts` | `GroupService.updateWishList` | `salvarWishList()` | ✓ WIRED | Calls `updateWishList(p.id, this.wishList(), this.id())`, handles error and success feedback signals |
| `dashboard.page.html` | `/group/:id` | `routerLink` on "Grupos que participo" card | ✓ WIRED | `[routerLink]="['/group', grupo.id]"` present, `RouterLink` already imported in `dashboard.page.ts` (unmodified) |
| `group-view.page.html` | `/group/:id/manage` | `@if (souAdmin())` conditional link | ✓ WIRED | Single conditional `routerLink` to `['/group', id(), 'manage']`, gated correctly, no other admin controls present |
| `member.guard.ts` | `GroupService.loadGroup` | RLS-backed membership check | ✓ WIRED | `await groups.loadGroup(id)`; non-null result relied upon as proof of membership — verified against the real RLS policy text in `0003_rls_policies.sql` (ORed admin/participant SELECT on `group`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `group-view.page.html` (roster) | `participantes()` | `GroupService.refreshParticipants(groupId)` → real Supabase query, policy `"participant: ver colegas do mesmo grupo"` | Yes | ✓ FLOWING |
| `group-view.page.html` (wishlist textarea) | `wishList` (`model()`) | Seeded once from `meuParticipante()?.wish_list`, persisted via `updateWishList` (hardcoded to `{ wish_list }` column, same as `manage-group.page.ts`) | Yes | ✓ FLOWING |
| `dashboard.page.html` ("participo" card link) | `grupo.id` | `GroupService.participated` signal, populated by `refreshDashboard()` | Yes | ✓ FLOWING |

No static/hardcoded values found flowing into this round's new UI.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build | `npx ng build` | Exit 0; only the pre-existing bundle-budget warning (526.55 kB vs 500 kB, +26.55 kB, unchanged by this round's lazy chunk) | ✓ PASS |
| Lint | `npx eslint src --max-warnings=0` | Exit 0, silent | ✓ PASS |
| No RxJS state leakage | `npm run check:no-rxjs-state` | Exit 0, silent | ✓ PASS |
| Full test suite | `npx ng test --watch=false` | 8 test files, 34 tests, all passing | ✓ PASS |
| `member.guard.spec.ts` real-navigation assertions | Read directly | 2 of the 6 tests use `RouterTestingHarness`, asserting on `activatedComponent instanceof` and `router.url` — confirmed this is not a return-value-only check | ✓ PASS |
| Regression: `admin.guard.ts` / `group.resolver.ts` / `manage-group.page.*` untouched | `git diff --stat 3f5de40..HEAD -- <paths>` | Empty diff | ✓ PASS |
| Regression: `draw` table RLS untouched, no admin exception | Read `supabase/migrations/0003_rls_policies.sql` directly; grep for `draw` in new files | Single SELECT policy by `giver_id`, zero write policies for `authenticated`, comment warns against ever adding an admin exception; `member.guard.ts`/`group-view.page.ts` contain zero references to `draw` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| GRP-01 | 03-03, 03-04 | Admin cria grupo (Reactive Form validado) | ✓ SATISFIED | Unchanged from prior round |
| GRP-02 | 03-01, 03-04 | `invite_token` único por grupo | ✓ SATISFIED | Unchanged |
| GRP-03 | 03-04, 03-05 | Link de convite visível e copiável | ✓ SATISFIED | Unchanged |
| GRP-04 | 03-03, 03-05 | Admin vê lista de participantes | ✓ SATISFIED | Unchanged |
| GRP-05 | 03-03, 03-05 | Admin remove participante | ✓ SATISFIED | Unchanged |
| GRP-06 | 03-01, 03-03, 03-05 | Entrar via link de convite | ✓ SATISFIED | Unchanged |
| GRP-07 | 03-01, 03-03, 03-05 | Entrar 2x rejeitado com mensagem clara | ✓ SATISFIED | Unchanged |
| GRP-08 | 03-01, 03-03, 03-05 | Grupo não-`open` não aceita novos | ✓ SATISFIED | Unchanged |
| GRP-09 | 03-03, 03-04 | Dashboard separa administrados/participados | ✓ SATISFIED | Unchanged |
| WISH-01 | 03-03, 03-05, **03-06** | Participante cadastra a própria wishlist | ✓ SATISFIED (gap closed) | `GroupViewPage` at `/group/:id`, reachable from the dashboard, renders the wishlist textarea for any non-admin participant |
| WISH-02 | 03-03, 03-05, **03-06** | Participante edita a qualquer momento | ✓ SATISFIED (gap closed) | Same screen; `salvarWishList()` calls `updateWishList` on demand, no time/status restriction added beyond the existing group-open business rule |
| WISH-03 | 03-03, 03-05 | Participante não edita a lista de outro | ✓ SATISFIED | RLS `user_id = auth.uid()` + `updateWishList` hardcoded to `{ wish_list }`, unchanged — enforced at the database level regardless of UI |
| API-01 | 03-02 | `GET` à BrasilAPI via `HttpClient` | ✓ SATISFIED | Unchanged |
| API-02 | 03-02 | Dias até o Natal na UI | ✓ SATISFIED | Unchanged |
| API-03 | 03-02 | Interceptor funcional de erro | ✓ SATISFIED | Unchanged |
| API-04 | 03-02 | `toSignal()` | ✓ SATISFIED | Unchanged |

**No orphaned requirements.** All 16 IDs (GRP-01..09, WISH-01..03, API-01..04) appear in the
`requirements` field of at least one plan (03-01 through 03-06).

**REQUIREMENTS.md bookkeeping gap from the prior round is closed:** the checklist section
(lines 68-69) now shows `[x]` for WISH-01/WISH-02, consistent with the traceability table
(lines 227-228) which now reads `Completo` for both — no more self-contradiction within the
same document.

### Anti-Patterns Found

None blocking. Scanned `member.guard.ts`, `group-view.page.ts`, `group-view.page.html`, and
the modified `dashboard.page.html` for `TODO`/`FIXME`/`placeholder`/empty-return patterns —
zero matches. No `*ngIf`/`*ngFor`, no `@Input()`/`@Output()` decorators, no constructor
parameter injection in any file touched by this round.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `angular.json` budgets | — | Bundle initial exceeds 500 kB budget by 26.55 kB (pre-existing, unaffected by this round's lazy-loaded chunk) | ℹ️ Info | Non-blocking for this phase; carried forward from prior verification |
| `src/**` | — | Zero `.spec.ts` for `group.service.ts`, `group-view.page.ts`, `create-group.page.ts`, `join-group.page.ts` | ℹ️ Info | Carried forward from prior verification; `member.guard.spec.ts` itself is thoroughly tested and sets a new precedent (real-navigation testing) explicitly flagged for reuse in Phase 4's `drawResultResolver` |

### Human Verification Required

### 1. Mobile responsiveness of `/group/:id`

**Test:** Open `/group/create`, `/group/:id/manage`, and `/group/:id` at 320px viewport width.
**Expected:** No horizontal overflow, textarea and buttons readable and tappable.
**Why human:** Visual/responsive evaluation is not verifiable by grep or build output.

### 2. End-to-end two-account walkthrough

**Test:** Repeat the 8-step manual verification script from `03-06-PLAN.md`: account A
creates a group and invites account B; B joins, opens `/group/:id` from the dashboard card,
sees the roster and own wishlist (no remove buttons, no invite link, no "Gerenciar grupo"
link); B edits the wishlist, saves, refreshes (F5), confirms persistence; B attempts
`/group/:id/manage` via the address bar and is redirected to `/dashboard`; A opens `/group/:id`
of their own group and sees the "Gerenciar grupo" link.
**Expected:** All 8 steps behave as scripted; no step regresses the 4 defects fixed during the
03-05 UAT.
**Why human:** Requires real browser sessions with Supabase Auth and real round-trips; not
reproducible by static analysis.

### Gaps Summary

No gaps remain. The single blocking gap from the prior verification — **WISH-01/WISH-02 had
no reachable UI path for a non-admin participant** — is closed by plan 03-06: a new
`memberGuard` (admits admin or participant via the already-ORed RLS SELECT policy on `group`,
verified live in `0003_rls_policies.sql`) protects a new `/group/:id` route rendering
`GroupViewPage`, which the dashboard's "Grupos que participo" card now links to. The admin-only
`/group/:id/manage` route, its `adminGuard`, its `groupResolver`, and `ManageGroupPage` are
confirmed byte-identical to their pre-gap-closure state via `git diff --stat`, so no regression
was introduced. The second, documentation-only gap from the prior round (an SDD paragraph
incorrectly claiming `adminGuard` didn't exist) had already been fixed in commits `b324e3a`
/`8dcf70f`, outside 03-06's scope, and remains correct. `docs/sdd.md` §5.1/§5.2 now also
document the new guard, component, and the two-role architectural decision.

All automated gates pass: `ng build` (exit 0, pre-existing bundle warning only),
`eslint --max-warnings=0` (silent), `check:no-rxjs-state` (silent), `ng test --watch=false`
(34/34 passing across 8 files, up from 28/7 in the prior round). The project's core privacy
invariant — the `draw` table's single SELECT-by-`giver_id` policy with zero admin exception
and zero write policies for `authenticated` — was independently re-read from
`supabase/migrations/0003_rls_policies.sql` and remains untouched by this phase.

Remaining items are human-verification-only (mobile viewport rendering, a full two-account
browser walkthrough) and do not block closing Phase 3.

---

_Verified: 2026-10-15T14:20:22Z_
_Verifier: Claude (gsd-verifier)_
