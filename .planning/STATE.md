# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-14)

**Core value:** O sorteio é privado de verdade — garantido pelo banco (RLS), não pela interface — e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.
**Current focus:** Fase 1 — Fundação (Scaffold, Banco e RLS)

## Current Position

Phase: 1 of 5 (Fundação — Scaffold, Banco e RLS)
Plan: 0 of 4 in current phase
Status: Planned — pronto para executar
Last activity: 2026-10-14 — Fase 1 pesquisada e planejada (4 plans em 3 waves); plan-checker aprovou na 1ª iteração

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

### Pending Todos

Nenhum ainda.

### Blockers/Concerns

- Fase 1 é bloqueante para todas as demais — nenhuma linha de frontend antes de RLS testada manualmente com dois usuários distintos (DB-10)
- Débito técnico aceito e documentado: atomicidade cross-statement entre inserir pares e fechar grupo na Edge Function (ver ARCHITECTURE.md) — não bloqueia a Fase 4, mas deve constar no SDD/README
- ENG-06 (Gitflow/PRs) e ENG-08 (Kanban) são contínuos desde a Fase 1 — não tratar como tarefas de fechamento

## Session Continuity

Last session: 2026-10-14
Stopped at: Fase 1 planejada — 01-RESEARCH.md + 4 PLAN.md em `.planning/phases/01-fundacao-scaffold-banco-rls/`, na branch `gsd/phase-01-fundacao-scaffold-banco-rls`; aguardando `/gsd:execute-phase 1`
Resume file: None
