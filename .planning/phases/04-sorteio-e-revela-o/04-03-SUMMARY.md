---
phase: 04-sorteio-e-revela-o
plan: 03
subsystem: ui
tags: [angular, signals, supabase-functions, draw, vitest, drawservice]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Edge Function run-draw (código {code} estável: NOT_ENOUGH_PARTICIPANTS, ALREADY_DRAWN, NOT_ADMIN, GROUP_NOT_FOUND, UNKNOWN_ERROR) e formato de resposta de sucesso {success, pairs}"
  - phase: 04-02
    provides: "RPC create_group garantindo que o admin tem uma linha em participant (D-01/D-02), usado pelo link 'Ver meu amigo secreto'"
provides:
  - "DrawService.runDraw(groupId) — único ponto do cliente que invoca a Edge Function run-draw via supabase.functions.invoke()"
  - "draw-error-messages.ts — tradução PT-BR dos 4 códigos estáveis de D-12 + fallback genérico"
  - "Botão de sorteio real na tela de gestão, com confirmação em dois passos (D-09), contador de faltantes (D-10) e refetch pós-sucesso (D-11)"
  - "Admin não vê o botão de remover a própria linha na lista de participantes (D-04)"
  - "grupoAtual() — leitura reativa de GroupService.currentGroup() com fallback ao input() do resolver, corrigindo um bug de reatividade descoberto nesta plan"
affects: [04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tradução de erro de Edge Function: error instanceof FunctionsHttpError -> await error.context.json() -> translateXError(body?.code), nunca error.message"
    - "grupoAtual() = currentGroup() ?? input() do resolver — padrão para refletir refetch pós-mutação em uma página cujo dado de entrada principal vem de um resolver (input estático de navegação), espelhando o que GroupViewPage já fazia com currentGroup() puro"

key-files:
  created:
    - src/app/core/draw-error-messages.ts
    - src/app/core/draw-error-messages.spec.ts
    - src/app/core/services/draw.service.ts
    - src/app/core/services/draw.service.spec.ts
  modified:
    - src/app/features/group/manage/manage-group.page.ts
    - src/app/features/group/manage/manage-group.page.html
    - docs/sdd.md

key-decisions:
  - "Introduzido grupoAtual() em ManageGroupPage em vez de seguir a plan literalmente (ler group() depois do refetch) — group() é um input.required() de groupResolver, congelado na navegação; withComponentInputBinding não o reatribui quando o próprio componente chama loadGroup() de novo. Sem essa correção, D-11 ('a tela de gestão refaz o fetch do grupo e reflete o novo status closed') ficaria falso apesar do refetch ser executado"
  - "Linha compactada em runDraw() (invoke numa linha só) para passar o grep de verificação functions.invoke('run-draw', { body: { groupId } }) sem perder legibilidade"

requirements-completed: [DRAW-01, ENG-03]

duration: 6min
completed: 2026-10-15
---

# Phase 04 Plan 03: Botão de Sorteio (DrawService + UI) Summary

**DrawService.runDraw() chamando a Edge Function run-draw via supabase.functions.invoke(), com tradução PT-BR dos 4 códigos estáveis de erro, e o botão real de sorteio na tela de gestão com confirmação em dois passos, contador de faltantes e refetch reativo pós-sucesso.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-15T18:38:48Z (commit anterior na branch)
- **Completed:** 2026-10-15T18:44:07Z
- **Tasks:** 2
- **Files modified:** 4 created, 3 modified

## Accomplishments
- `draw-error-messages.ts`: mapa PT-BR dos 4 códigos estáveis (`NOT_ENOUGH_PARTICIPANTS`, `ALREADY_DRAWN`, `NOT_ADMIN`, `GROUP_NOT_FOUND`) + fallback genérico cobrindo `UNKNOWN_ERROR`/desconhecido/`undefined`/`null`
- `DrawService.runDraw(groupId)`: único ponto do cliente que chama `run-draw`, extraindo o `code` via `error.context.json()` (nunca `error.message`) quando o erro é `FunctionsHttpError`
- `draw.service.spec.ts` prova ENG-03: uma resposta `ALREADY_DRAWN` simulada com um `FunctionsHttpError` real (`instanceof` verdadeiro) chega traduzida como "O sorteio deste grupo já foi realizado.", sem cair no fallback
- Botão "Realizar sorteio" na tela de gestão: visível e desabilitado com `<3` participantes (texto explicativo, nunca escondido — D-10), confirmação em dois passos espelhando `participant-row` (D-09), refetch de grupo+participantes no sucesso (D-11), link "Ver meu amigo secreto" para `/draw/:groupId/result` quando `closed`
- D-04: admin não vê mais o botão "Remover" na própria linha de participante (UI-only, policy de DELETE no banco inalterada)
- `docs/sdd.md` §5.3: linha do `DrawService` atualizada do placeholder "(Fase 4.)" para o contrato real

## Task Commits

Each task was committed atomically:

1. **Task 1: draw-error-messages.ts + DrawService.runDraw() com tratamento de FunctionsHttpError** - `e603f75` (feat)
2. **Task 2: Botão de sorteio na tela de gestão (D-09/D-10/D-11) + D-04** - `d9d2ac0` (feat)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `src/app/core/draw-error-messages.ts` - tradução PT-BR dos 4 códigos estáveis de `run-draw` + `GENERIC_DRAW_ERROR`
- `src/app/core/draw-error-messages.spec.ts` - 7 testes cobrindo os 4 códigos + fallback (desconhecido/undefined/null/UNKNOWN_ERROR)
- `src/app/core/services/draw.service.ts` - `runDraw(groupId)`, único chamador de `functions.invoke('run-draw', ...)`
- `src/app/core/services/draw.service.spec.ts` - 4 testes (chamada correta, sucesso, ENG-03/ALREADY_DRAWN, falha de rede sem `.context`)
- `src/app/features/group/manage/manage-group.page.ts` - `DrawService` injetado, `grupoAtual()`, `faltamParaSortear`/`podeSortear`, `confirmandoSorteio`/`sorteando`, `pedirSorteio`/`cancelarSorteio`/`confirmarSorteio`
- `src/app/features/group/manage/manage-group.page.html` - bloco de sorteio (contador + confirmação em dois passos + link de resultado), D-04 no `[podeRemover]` do `@for`
- `docs/sdd.md` - linha do `DrawService` em §5.3 atualizada

## Decisions Made
- **`grupoAtual()`** substitui a leitura direta de `group()` no template depois que o refetch de D-11 expôs que `group()` é um `input.required()` do `groupResolver`, fixado na navegação — chamar `loadGroup()` de dentro do próprio componente nunca reatribui esse input via `withComponentInputBinding`. `grupoAtual()` lê `GroupService.currentGroup()` (o mesmo signal reativo que `GroupViewPage` já usa) com fallback ao `group()` do resolver antes do primeiro refetch, preservando o status inicial correto na primeira renderização.
- `functions.invoke('run-draw', { body: { groupId } })` escrito numa única linha em `draw.service.ts` para casar literalmente com o grep de verificação do plan sem alterar o comportamento.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ManageGroupPage` lia `group()` (snapshot do resolver) em vez de um signal reativo, quebrando D-11**
- **Found during:** Task 2 (implementação do refetch pós-sorteio)
- **Issue:** O plan instruía `await this.groups.loadGroup(this.id())` após o sucesso do sorteio, mas o template continuava lendo `group()` — um `input.required<Group>()` populado uma única vez por `withComponentInputBinding` a partir de `route.data.group` (saída do `groupResolver`). Angular não reatribui esse input quando o próprio componente dispara um novo `loadGroup()` na mesma navegação: o `status` exibido continuaria `'open'` mesmo depois do sorteio ter fechado o grupo no banco, contradizendo a `must_haves.truths` do plan ("a tela de gestão refaz o fetch do grupo e reflete o novo status 'closed'").
- **Fix:** Adicionado `grupoAtual = computed<Group>(() => this.groups.currentGroup() ?? this.group())`, espelhando o padrão já usado em `GroupViewPage` (que lê `GroupService.currentGroup()` diretamente, pois sua rota não tem resolver). Todas as leituras de `group()` no template e no componente (`souAdmin`, `linkConvite`, `faltamParaSortear`, status no `@switch`, `[podeRemover]` do D-04) foram trocadas para `grupoAtual()`. Antes do primeiro refetch, `currentGroup()` ainda está `null` (populado apenas por `loadGroup`/`memberGuard`), então o fallback ao `group()` do resolver preserva o comportamento atual na primeira renderização.
- **Files modified:** `src/app/features/group/manage/manage-group.page.ts`, `src/app/features/group/manage/manage-group.page.html`
- **Verification:** `npx ng build` (0), `npx eslint src --max-warnings=0` (0), suite completa de testes (52/52 passando, nenhuma spec de `ManageGroupPage` existente quebrou)
- **Committed in:** `d9d2ac0` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessário para que D-11 funcione de fato, não apenas na superfície do código. Sem a correção, o `grep` de verificação do plan passaria mas o comportamento em runtime estaria quebrado. Efeito colateral esperado na verificação automatizada: o grep literal `p.user_id !== group().admin_id` do plan não casa mais (virou `grupoAtual().admin_id`) — documentado abaixo.

## Issues Encountered
- O grep de aceite do plan `grep -q "p.user_id !== group().admin_id" src/app/features/group/manage/manage-group.page.html` falha, porque a correção do Rule 1 acima trocou `group()` por `grupoAtual()` em todo o arquivo, incluindo essa linha (D-04). O requisito semântico (admin não remove a própria linha) está cumprido e verificado por `grep -q "p.user_id !== grupoAtual().admin_id"` — confirmado manualmente. Não é um bug, é uma consequência esperada e documentada da correção de reatividade.
- Falso positivo no grep `! grep -q "error.message" src/app/core/services/draw.service.ts` da Task 1: o padrão `error.message` casa com a substring dentro de `draw-error-messages` (regex `.` combina `-`) no `import` do topo do arquivo. Confirmado manualmente que o código nunca lê `.message` para extrair o `code` — o único acesso é `error.context.json()`. Mesma classe de falso-negativo de grep já registrada em STATE.md para a plan 03-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `DrawService.runDraw()` está pronto para a plan 04-04 (revelação), que lerá o par sorteado via join com `participant`
- O link "Ver meu amigo secreto" em `/draw/:groupId/result` fica estruturalmente "quebrado" (404) até a plan 04-04 criar essa rota — comportamento esperado, não bloqueia esta plan
- O padrão `grupoAtual()` (fallback reativo sobre um input de resolver) é reaproveitável se outra tela precisar de refetch pós-mutação enquanto ainda depende de um resolver para a primeira carga

---
*Phase: 04-sorteio-e-revela-o*
*Completed: 2026-10-15*

## Self-Check: PASSED

All 8 referenced files found on disk (4 created, 3 modified, plus this SUMMARY); both task commit hashes (`e603f75`, `d9d2ac0`) found in git history.
