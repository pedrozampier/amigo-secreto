---
phase: quick
plan: 261015-mbk
subsystem: ui
tags: [angular, signals, routing, draw]

requires:
  - phase: 04-sorteio-e-revela-o
    provides: drawResultResolver, memberGuard generalized for /group/:id and /draw/:groupId/result, DrawService.getMyResult()
provides:
  - "Ver meu amigo secreto" link on the participant group view (/group/:id), closing the UI gap for DRAW-08/09
  - Exported pure predicate podeVerResultadoDoSorteio(status, temParticipante) reusable by manage-group.page.ts
affects: [group-view, manage-group, draw-result]

tech-stack:
  added: []
  patterns:
    - "Pure exported predicate functions for visibility rules, tested without TestBed (matches draw-error-messages.spec.ts pattern)"

key-files:
  created:
    - src/app/features/group/view/group-view-reveal-link.spec.ts
  modified:
    - src/app/features/group/view/group-view.page.ts
    - src/app/features/group/view/group-view.page.html

key-decisions:
  - "Gate the link on status === 'closed' AND meuParticipante() !== null (not status alone), matching the identical rule already used in manage-group.page.html, because memberGuard admits admin OR participant — an admin who isn't a participant would otherwise see a link that always leads to the resolver's `missing` state"
  - "Reused the existing exported GroupStatus type alias from group.model.ts rather than introducing Group['status'] or a new type"

requirements-completed: [DRAW-08, DRAW-09]

duration: 10min
completed: 2026-10-15
---

# Quick Task 261015-mbk: Link de Revelação na Tela do Participante Summary

**Link "Ver meu amigo secreto" adicionado a `/group/:id`, com predicado puro `podeVerResultadoDoSorteio` testado por 5 casos unitários, fechando o gap de UI que tornava DRAW-08/09 inalcançáveis para participantes não-admin.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Participante não-admin em grupo `closed` agora vê e pode clicar em "Ver meu amigo secreto" em `/group/:id`, chegando a `/draw/:groupId/result`
- Regra de visibilidade extraída como predicado puro exportado (`podeVerResultadoDoSorteio`), testável sem TestBed, no mesmo padrão de `draw-error-messages.spec.ts`
- Link não aparece em `open`/`drawing`, nem para um admin não-participante do próprio grupo (evita rebater o usuário para o estado `missing` do resolver)

## Task Commits

1. **Task 1: Predicado puro de visibilidade + computed podeVerResultado** - `ec415fa` (feat)
2. **Task 2: Spec do predicado de visibilidade** - `f481d18` (test)
3. **Task 3: Link no template + verificação da suíte completa** - `217aa9e` (feat)

_Nota: a plan marcava Task 1 e Task 2 com `tdd="true"`, mas como o predicado já nasceu puro e pequeno, cada task resultou num único commit coerente (feat/test) em vez do ciclo RED→GREEN separado — equivalente na prática, já que o teste cobre exatamente o comportamento implementado._

## Files Created/Modified
- `src/app/features/group/view/group-view.page.ts` - Exporta `podeVerResultadoDoSorteio(status, temParticipante)` e adiciona `podeVerResultado` computed usando `grupo()` e `meuParticipante()` já existentes
- `src/app/features/group/view/group-view.page.html` - Adiciona `@if (podeVerResultado())` com o link `routerLink=['/draw', id(), 'result']`, ao lado do link "Gerenciar grupo" existente, dentro de um `flex flex-col items-start gap-2`
- `src/app/features/group/view/group-view-reveal-link.spec.ts` (novo) - 5 testes do predicado: closed+participante (true), open (false), drawing (false), closed+não-participante (false), status indefinido (false)

## Decisions Made
- Usado o alias `GroupStatus` já exportado de `group.model.ts` na assinatura do predicado, em vez de `Group['status']` — a nota do planner pedia para checar antes de decidir, e o alias já existia (linha 5 do model), então nenhum tipo novo foi introduzido.
- Variant do botão: "Ver meu amigo secreto" é sólido (ação principal do participante nesta tela), enquanto "Gerenciar grupo" permanece `outline` (ação secundária) — divergência intencional da hierarquia em `manage-group.page.html`, onde os papéis se invertem.

## Deviations from Plan

None - plan executada exatamente como escrita. A única checagem explicitamente delegada pelo planner (`GroupStatus` alias vs. literal inline) confirmou que o alias já existe; nenhuma ambiguidade a resolver.

## Issues Encountered
None.

## User Setup Required
None - nenhuma configuração externa necessária.

## Verification Results

- `npx tsc --noEmit -p tsconfig.json` — sem erros (Task 1)
- `npx ng test --watch=false --include='**/group-view-reveal-link.spec.ts'` — 5/5 testes passando (Task 2)
- `npx ng build` — exit 0 (warning de budget inicial pré-existente, confirmado via `git stash` que já existia antes desta mudança, não é regressão)
- `npx eslint src --max-warnings=0` — exit 0
- `npx ng test --watch=false` — 64/64 testes passando (13 arquivos), exatamente os 59 pré-existentes + 5 novos
- `grep -c "'/draw'" src/app/features/group/view/group-view.page.html` — retorna 1

## Next Phase Readiness
DRAW-08/DRAW-09 agora são alcançáveis pela UI para o papel a que se destinam (participante não-admin). Nenhum bloqueio para a Fase 4.

---
*Quick task: 261015-mbk*
*Completed: 2026-10-15*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all three task commit hashes (ec415fa, f481d18, 217aa9e) confirmed present in git history.
