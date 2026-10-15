---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 2 all 4 plans complete; 02-04 human checkpoint approved, ready for phase verification
last_updated: "2026-10-15T03:46:24.309Z"
last_activity: 2026-10-15
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-14)

**Core value:** O sorteio é privado de verdade — garantido pelo banco (RLS), não pela interface — e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.
**Current focus:** Phase 02 — autentica-o-end-to-end

## Current Position

Phase: 02 (autentica-o-end-to-end) — EXECUTING
Plan: 4 of 4
Status: All 4 plans complete — 02-04 human checkpoint approved, ready for phase verification
Last activity: 2026-10-15

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 horas

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 25 | 2 tasks | 3 files |
| Phase 01 P01 | 15min | 3 tasks | 4 files |
| Phase 01 P03 | 35 | 3 tasks | 54 files |
| Phase 01-fundacao-scaffold-banco-rls P04 | 25min | 2 tasks | 5 files |
| Phase 02 P02 | 10min | 2 tasks | 6 files |
| Phase 02 P01 | 25min | 2 tasks | 4 files |
| Phase 02 P03 | 20min | 3 tasks | 13 files |

## Accumulated Context

### Decisions

Decisões detalhadas em PROJECT.md § Decisões-Chave. Relevantes para o trabalho atual:

- Stack fechada: Angular `^21.x` (LTS, zoneless, Vitest) + Tailwind `^4.x` + Spartan UI `^1.7.x` — não reabrir
- `draw.giver_id`/`receiver_id` apontam para `participant.id`, nunca para `user_id`/`profile.id`
- RN5 do PRD (convite nominal por e-mail) reinterpretada como `UNIQUE (group_id, user_id)` — sem tabela de convites
- Sorteio por pareamento circular (Fisher-Yates + ciclo único) — garantia estrutural, não probabilística, de zero autossorteio
- Granularidade grossa (5 fases) — pedido explícito do usuário para simplicidade defensável em banca
- Headings estruturais do ROADMAP.md usam `Phase N:` em inglês (não `Fase N:`) — o parser do GSD casa literalmente a palavra `Phase`; com `Fase` o `roadmap analyze` retornava 0 fases. Prosa e tabelas seguem em PT-BR.
- Dist-tag do Angular é `v21-lts` com `v` inicial (`21-lts` dá 404); npm `latest` é v22 e quebra o peer range `13.x - 21.x` do `lucide-angular`. `@angular/cdk` também precisa ser pinado na linha 21.
- `@angular-eslint/prefer-output-emitter-ref` existe e pega `@Output()` direto — PITFALLS.md dizia o contrário (correção planejada na plan 01-02). Os 7 rules do rubric foram verificados carregando os plugins instalados.
- `@spartan-ng/brain@1.7.0` exige `clsx`, `luxon` e `tw-animate-css`, ausentes da tabela §2 do SDD — plan 01-03 as adiciona (regra de não instalar dependência fora da tabela).
- ARCHITECTURE.md não tinha `CREATE TABLE` nenhum (só `ALTER`/constraints/índices/policies); o DDL das 4 tabelas foi escrito na plan 01-01 a partir do ER do SDD §3.2.
- [Phase 01]: Kanban reuses pre-existing Issues #1-11 (matching the 11 PRD stories) instead of duplicates; closed 11 duplicate Issues created mid-task as not-planned
- [Phase 01]: Supabase MCP documented in SDD §1 with project_ref + read_only=true scoping and an explicit prompt-injection caveat
- [Phase 01]: ARCHITECTURE.md had no CREATE TABLE statements — the 4-table DDL was derived fresh from SDD §3.2 ER diagram in plan 01-01 Task 1
- [Phase 01]: Two pg_policies cells were UI-truncated in Supabase SQL Editor grid; db-rls-verification.md quotes the authoritative full policy text from 0003_rls_policies.sql instead
- [Phase 01]: SUPABASE_URL and the issued publishable-key scheme were not supplied this session; deferred to plans 01-03/01-04 which consume them
- [Phase 01]: [Phase 01-03]: angular-eslint v22 (unpinned @angular-eslint/schematics) self-rejects on an Angular v21 workspace; use ng add angular-eslint@21 explicitly, not the generic schematics package
- [Phase 01]: [Phase 01-03]: npm 10.9.2 arborist crashes on vitest@4's peer graph (edgesOut bug) for every install in this project; --legacy-peer-deps is the required workaround, not a real peer conflict
- [Phase 01]: [Phase 01-03]: Spartan UI components import from @spartan-ng/helm/<name> (e.g. @spartan-ng/helm/button), the real tsconfig path alias written by the CLI — not a guessed src/app/shared/ui path
- [Phase 01-fundacao-scaffold-banco-rls]: [Phase 01-04]: Disabled Vercel Deployment Protection deliberately for an academic deliverable so the grader can open the production URL without a Vercel login
- [Phase 01-fundacao-scaffold-banco-rls]: [Phase 01-04]: amigo-secreto.vercel.app is an unrelated third-party Next.js app occupying that subdomain globally; the real production URL is the per-deployment Vercel URL under the zmp2 team scope
- [Phase 01-fundacao-scaffold-banco-rls]: [Phase 01-04]: npm requires --legacy-peer-deps in CI too (vitest@4/npm 10.9.2 arborist bug), consistent with plan 01-03
- [Phase 02]: [Phase 02-02]: Generated only input and label Spartan primitives, not field — field pulls separator + @ng-icons peers absent from docs/sdd.md §2
- [Phase 02]: [Phase 02-01]: ng test's Vitest builder rejects --run; use ng test --watch=false --include=<glob> to target a single spec
- [Phase 02]: authGuard applied exactly once on the parent layout route (D-19); provideAppInitializer awaits AuthService.initialize() before first navigation, eliminating the F5 login flash (D-01)
- [Phase 02]: Login/register stub components are structurally required in plan 02-03 because tsc resolves loadComponent statically; without them the route tree fails TS2307
- [Phase 02-autentica-o-end-to-end]: 02-04 complete — human browser/SQL checkpoint approved 2026-10-15, all 6 steps passed and profile.display_name confirmed correct (D-13 chain proven end to end)
- [Phase 02-autentica-o-end-to-end]: D-20 ("Confirm email" desabilitado) era falso no projeto real — signUp devolvia session: null sem erro e o redirect para /dashboard era revertido pelo authGuard em silencio. Resolvido desativando "Confirm email" no Supabase (escolha do usuario, Opcao A); fragilidade residual no codigo registrada em deferred-items.md

### Pending Todos

Nenhum ainda.

### Blockers/Concerns

- Fase 1 é bloqueante para todas as demais — nenhuma linha de frontend antes de RLS testada manualmente com dois usuários distintos (DB-10)
- Débito técnico aceito e documentado: atomicidade cross-statement entre inserir pares e fechar grupo na Edge Function (ver ARCHITECTURE.md) — não bloqueia a Fase 4, mas deve constar no SDD/README
- ENG-06 (Gitflow/PRs) e ENG-08 (Kanban) são contínuos desde a Fase 1 — não tratar como tarefas de fechamento
- Supabase "Confirm email" DEVE permanecer desativado (mailer_autoconfirm: true): com ele ligado, signUp devolve session: null sem erro e register.page.ts navega para /dashboard so para o authGuard devolver ao /login, sem mensagem alguma. Correcao robusta (signUp expor needsConfirmation) registrada em deferred-items.md

## Session Continuity

Last session: 2026-10-15T03:46:24.302Z
Stopped at: Phase 2 all 4 plans complete; 02-04 human checkpoint approved, ready for phase verification
Resume file: None
