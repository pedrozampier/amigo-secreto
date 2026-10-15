# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-14)

**Core value:** O sorteio é privado de verdade — garantido pelo banco (RLS), não pela interface — e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.
**Current focus:** Fase 1 — Fundação (Scaffold, Banco e RLS)

## Current Position

Phase: 1 of 5 (Fundação — Scaffold, Banco e RLS)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-10-14 — ROADMAP.md criado e aprovado para início do planejamento

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

### Pending Todos

Nenhum ainda.

### Blockers/Concerns

- Fase 1 é bloqueante para todas as demais — nenhuma linha de frontend antes de RLS testada manualmente com dois usuários distintos (DB-10)
- Débito técnico aceito e documentado: atomicidade cross-statement entre inserir pares e fechar grupo na Edge Function (ver ARCHITECTURE.md) — não bloqueia a Fase 4, mas deve constar no SDD/README
- ENG-06 (Gitflow/PRs) e ENG-08 (Kanban) são contínuos desde a Fase 1 — não tratar como tarefas de fechamento

## Session Continuity

Last session: 2026-10-14
Stopped at: Roadmap criado (.planning/ROADMAP.md, .planning/STATE.md) e traceability de REQUIREMENTS.md atualizada; aguardando `/gsd:plan-phase 1`
Resume file: None
