---
phase: 02-autentica-o-end-to-end
plan: 04
subsystem: auth-ui
tags: [reactive-forms, angular-router, signals, spartan-ui, checkpoint-pending]

# Dependency graph
requires:
  - phase: 02-autentica-o-end-to-end
    plan: 01
    provides: "AuthService.signIn/signUp/signOut with PT-BR translated errors"
  - phase: 02-autentica-o-end-to-end
    plan: 02
    provides: "HlmInput/HlmLabel Spartan primitives"
  - phase: 02-autentica-o-end-to-end
    plan: 03
    provides: "LoginPage/RegisterPage stub components, authGuard with returnUrl, route tree"
provides:
  - "LoginPage: validated Reactive Form (email + senha), returnUrl-aware post-login navigation"
  - "RegisterPage: validated Reactive Form (nome + email + senha) feeding nome into AuthService.signUp as display_name, navigates straight to /dashboard"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reactive Form error visibility gated by control.invalid && (control.touched || submetido()) — no premature error flash"
    - "Submit disabled via [disabled]=\"form.invalid || enviando()\", with button label swapping to a gerund during submission"
    - "returnUrl read once at construction via inject(ActivatedRoute).snapshot.queryParamMap, not reactively"

key-files:
  created: []
  modified:
    - src/app/features/auth/login/login.page.ts
    - src/app/features/auth/login/login.page.html
    - src/app/features/auth/register/register.page.ts
    - src/app/features/auth/register/register.page.html

key-decisions:
  - "D-11, D-12, D-15, D-16, D-17, D-18, D-20, D-21 all enforced exactly as specified in 02-CONTEXT.md — no deviations in the page implementations themselves"
  - "Tasks 1-2 fully machine-verified (tsc, lint, build, 11/11 Vitest specs); Task 3's browser/SQL verification steps require a human and could not be executed by this agent — see Known Stubs / Verification Status below"

requirements-completed: []

# Metrics
duration: continuation session (automated-gate re-verification only; Tasks 1-2 timing recorded in prior session)
completed: 2026-10-15
---

# Phase 2 Plan 4: Login/Register Forms + End-to-End Verification Summary

**Two validated Reactive Forms (`/login`, `/register`) replacing the plan 02-03 stubs wholesale, confirmed by `tsc`/`lint`/`build`/Vitest after real Supabase credentials were supplied — browser and database verification (display_name correctness, F5 flash, logout) still requires human confirmation.**

## Performance

- **Tasks:** 3 (2 complete and verified; 1 partially complete — automated portion done, human portion pending)
- **Completed:** 2026-10-15

## Accomplishments

- `LoginPage` (`src/app/features/auth/login/login.page.ts`/`.html`) wholesale-replaced the
  plan 02-03 stub with a Reactive Form: `email` (`required`+`email`) and `senha`
  (`required`+`minLength(6)`), error messages in PT-BR shown only after
  `touched || submetido()`, submit disabled while `form.invalid || enviando()`, and
  post-login navigation to `route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard'`
- `RegisterPage` wholesale-replaced its stub with a 3-field form (`nome`, `email`, `senha`,
  no confirm-password field per D-12), calling
  `auth.signUp(nome.trim(), email, senha)` and navigating straight to `/dashboard` on
  success (D-20)
- Confirmed the D-13 chain textually: `auth.service.ts` contains the literal
  `options: { data: { display_name: nome } }`, and `register.page.ts` passes
  `nome.trim()` as the first argument to `signUp` — the key the `handle_new_user` trigger
  reads is present end-to-end in source
- No stub survived: `grep -rn "STUB temporário" src/app/` returns empty; both pages use
  `templateUrl`, not inline `template`
- Re-ran every automated gate in this continuation session after the orchestrator wrote
  real Supabase credentials into the (git-ignored) `environment.ts`:
  - `npx tsc -p tsconfig.app.json --noEmit` — exit 0
  - `npm run lint` — exit 0 (`--max-warnings=0`)
  - `npx ng test --watch=false` — 11/11 Vitest specs passed across 3 files
  - `npm run build` (with `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` exported from
    `environment.ts`) — succeeded; lazy chunks confirmed present for `login-page`,
    `register-page`, `authenticated-layout-page`, `dashboard-page`
  - `npm run check:no-rxjs-state` — exit 0
  - `npm run check:no-secrets` — **see Known Stubs / Deferred Items below**: this run
    surfaced a pre-existing false positive in the Phase-1 script, not a real leak

## Task Commits

Tasks committed in the prior (interrupted) session; this continuation session added no
new source-code commits for Tasks 1-2 (re-verification only):

1. **Task 1: Login page Reactive Form, returnUrl** — `5c5c987` (feat) — prior session
2. **Task 2: Register page, display_name wiring** — `cd139b6` (feat) — prior session
3. **Task 3: Browser/SQL checkpoint** — automated portion re-confirmed this session;
   human portion still pending (no commit — nothing to commit for an unexecuted manual step)

## Files Created/Modified

- `src/app/features/auth/login/login.page.ts` — `LoginPage`, Reactive Form, `returnUrl` read from `ActivatedRoute` snapshot
- `src/app/features/auth/login/login.page.html` — card layout, 2 labeled inputs, PT-BR error messages, `[disabled]="form.invalid || enviando()"`
- `src/app/features/auth/register/register.page.ts` — `RegisterPage`, 3-field Reactive Form, `signUp(nome.trim(), email, senha)`, `navigateByUrl('/dashboard')`
- `src/app/features/auth/register/register.page.html` — card layout, 3 labeled inputs, PT-BR error messages, same disabled-submit pattern

## Decisions Made

No new decisions. All implementation choices (field sets, validators, error-visibility
timing, PT-BR copy, returnUrl handling, post-register destination) follow D-11 through
D-21 in `02-CONTEXT.md` exactly as written in the plan's prescribed code.

## Deviations from Plan

### Auto-fixed Issues

None — Tasks 1 and 2's source code required no fixes; both matched the plan's prescribed
content and passed every acceptance criterion on first verification (done in the prior
session before this checkpoint).

### Logged, not fixed (out of scope for this plan's files)

**1. `check:no-secrets` false positive on vendored `@supabase/auth-js` code**
- **Found during:** this continuation session's re-run of the plan's closing
  `<verification>` block, step 5, after a real `npm run build` was executed for the first
  time in this repo with genuine credentials (plan 02-03 explicitly deferred running
  `npm run build` to this plan)
- **Issue:** `dist/.../chunk-VNQ55WCU.js` contains the literal substring `sb_secret_` as
  part of `@supabase/auth-js`'s own internal key-format-detection helper
  (`e.startsWith("sb_publishable_")||e.startsWith("sb_secret_")`) — not an actual secret
  value. Confirmed by manual inspection: `src/` is clean, and `environment.ts` contains
  only the publishable key.
- **Why not fixed:** the `check:no-secrets` script was authored in Phase 1 (`3f6b68f`),
  outside this plan's `files_modified` list, and the false positive is not caused by
  Tasks 1-2's changes — it is inherent to any build of the current `@supabase/supabase-js`
  version. Per the scope-boundary rule, pre-existing issues in files this plan doesn't own
  are logged, not auto-fixed.
- **Logged in:** `.planning/phases/02-autentica-o-end-to-end/deferred-items.md`, with a
  suggested fix (anchor the `dist/` grep to app-authored chunks or to a realistic key
  pattern instead of the SDK's own bare detection-prefix literal) for a future
  `/gsd:quick` or a phase that touches build tooling.
- **No source code changed. No commit.**

## Known Stubs / Verification Status

**This plan is NOT fully closed.** Per the plan's own Task 3 design (`type="checkpoint:human-verify"`,
`gate="blocking"`), the following cannot be machine-verified and require explicit human
confirmation before Phase 2 can be marked complete:

| # | What needs confirming | Automatable? | Status |
|---|---|---|---|
| 1 | Guard redirect: unauthenticated visit to `/dashboard` → `/login?returnUrl=%2Fdashboard` | No (browser) | **Awaiting human** |
| 2 | `public.profile.display_name` contains the typed name, not the e-mail-prefix fallback (D-13 — the one failure mode that is silent) | No (browser + SQL Editor) | **Awaiting human** |
| 3 | No `/login` flash across 3 consecutive F5 reloads on `/dashboard` | No (browser) | **Awaiting human** |
| 4 | Logout is effective: after "Sair", visiting `/dashboard` redirects to `/login` again | No (browser) | **Awaiting human** |
| 5 | Submit disabled on empty form; PT-BR field errors appear only after blur/submit | No (browser) | **Awaiting human** |
| 6 | Invalid-credential error renders in PT-BR, not the raw English API string | No (browser) | **Awaiting human** |

Everything machine-checkable in Task 3's scope (tsc, lint, Vitest, build with real
credentials, the no-rxjs-state/no-secrets scripts, and the textual D-13 chain via grep)
is done and green. The remaining items are intrinsically browser/SQL-only — this agent
has no browser or Supabase SQL Editor access and will not fabricate a result for them.

## Issues Encountered

None beyond the `check:no-secrets` false positive documented above.

## User Setup Required

**Action needed from the user before Phase 2 can be marked complete.** Run the app
locally and walk through the 6-step verification below (also mirrored from the plan's
`<how-to-verify>` block).

### Como subir o app

```bash
cd /home/pedro-zampier/Documentos/ULTIMOSEMESTRE/web-3/amigo-secreto
npm start
```

Abrir `http://localhost:4200`.

### Checklist de verificação (6 passos)

1. **Guard redireciona** — Sem estar logado, acesse `http://localhost:4200/dashboard`
   diretamente.
   **Esperado:** a URL muda para `http://localhost:4200/login?returnUrl=%2Fdashboard` e a
   tela de login aparece.

2. **Cadastro com nome + verificação no banco (o passo crítico)** — Clique em "Criar
   conta" e cadastre-se com um e-mail novo e um nome com acento e sobrenome, por exemplo:
   Nome `Ana Júlia Souza`, e-mail `teste-fase2@exemplo.com`, senha `123456`.
   **Esperado:** você entra direto em `/dashboard` (sem passar pelo login) e o card exibe
   "Olá, Ana Júlia Souza!".

   Depois, no SQL Editor do projeto Supabase, execute:
   ```sql
   select id, email, display_name from public.profile order by created_at desc limit 3;
   ```
   **Esperado:** a linha mais recente tem `display_name` = `Ana Júlia Souza`.
   **FALHA CRÍTICA** se aparecer `teste-fase2` (o prefixo do e-mail) em vez do nome —
   isso significaria que a chave de metadata não é `display_name` em algum lugar da
   cadeia e precisaria ser corrigida em `auth.service.ts`.

3. **F5 sem flash de login** — Já em `/dashboard`, pressione F5. Repita 3 vezes.
   **Esperado:** o dashboard reaparece direto, sem nenhum piscar da tela de login e sem
   mudança de URL para `/login`.

4. **Logout efetivo** — Clique em "Sair" no header.
   **Esperado:** vai para `/login`. Em seguida, digite
   `http://localhost:4200/dashboard` na barra de endereço.
   **Esperado:** volta para `/login?returnUrl=%2Fdashboard` — a sessão foi encerrada de
   fato.

5. **Validação do form e submit desabilitado** — Na tela de login, com os campos
   vazios, o botão "Entrar" deve estar desabilitado (cinza, sem resposta ao clique).
   Clique no campo e-mail, digite `abc` e saia do campo: deve aparecer "Informe um
   e-mail válido." Digite uma senha de 3 caracteres e saia do campo: deve aparecer "A
   senha precisa ter pelo menos 6 caracteres."
   **Importante:** antes de tocar nos campos, nenhuma mensagem de erro deve estar
   visível.

6. **Erro de API em português** — Ainda em `/login`, tente entrar com o e-mail
   cadastrado no passo 2 e a senha errada (`senhaerrada1`).
   **Esperado:** aparece "E-mail ou senha incorretos." — nunca o texto em inglês
   `Invalid login credentials`.

**Bônus (mobile-first):** no DevTools, reduza a largura para 320px nas telas de login e
cadastro. Nada deve ultrapassar a borda horizontalmente.

Se todos os 6 passos passarem, a Fase 2 pode ser considerada concluída.

## Next Phase Readiness

- Blocked on human verification of Task 3 above. Phase 3 should not start until the user
  confirms the checklist, particularly step 2 (D-13's silent-failure risk).
- If step 2 fails, the fix is in `src/app/core/services/auth.service.ts`: the key inside
  `options.data` must be exactly `display_name`. After fixing, the user must register
  with a brand-new e-mail (the trigger only fires on `auth.users` insert, so reusing the
  same e-mail will not re-populate `profile`) and repeat the check.
- No other blockers for Phase 3.

---
*Phase: 02-autentica-o-end-to-end*
*Completed (automated portion): 2026-10-15*

## Self-Check: PASSED (automated portion only)

- `src/app/features/auth/login/login.page.ts` — FOUND
- `src/app/features/auth/login/login.page.html` — FOUND
- `src/app/features/auth/register/register.page.ts` — FOUND
- `src/app/features/auth/register/register.page.html` — FOUND
- Commit `5c5c987` — FOUND in `git log --oneline --all`
- Commit `cd139b6` — FOUND in `git log --oneline --all`
- `tsc`, `lint`, `ng test --watch=false`, `build` (with real credentials),
  `check:no-rxjs-state` — all exit 0, confirmed in this session
- `check:no-secrets` — exit 1 due to a documented pre-existing vendor-code false
  positive (see Deviations above), not an actual leak; logged to `deferred-items.md`
- Browser/SQL steps (Task 3 `<how-to-verify>`) — **NOT executed by this agent**; awaiting
  human confirmation per the checklist above
