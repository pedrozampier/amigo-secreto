---
phase: 05-pwa-acessibilidade-e-entrega
plan: 03
subsystem: ui
tags: [a11y, wcag, skip-link, aria-live, viewChild]
requires: [05-01, 05-02]
provides:
  - Skip link funcional (handler + focus no main), provado por spec
  - Regioes role=status/aria-live nos 5 carregamentos e no "Sorteando..."
  - h1 em draw-result, alvos de toque min-h-11, shell largo em lg:
affects: [05-06]
tech-stack:
  added: []
  patterns: ["viewChild.required para foco programatico"]
key-files:
  created: [src/app/features/shell/authenticated-layout.page.spec.ts]
  modified: [authenticated-layout.page.html, authenticated-layout.page.ts, join-group.page.html, christmas-countdown.card.html, group-view.page.html, manage-group.page.html, dashboard.page.html, draw-result.page.html, participant-row.html]
key-decisions:
  - "Skip link usa (click)+preventDefault+focus() porque <base href='/'> faria o href puro navegar para /#main-content"
requirements-completed: [UI-06]
duration: 10min
completed: 2026-10-15
---

# Phase 5 Plan 03: Acessibilidade WCAG 2.1 AA nas telas existentes Summary

Skip link funcional com prova comportamental (4 testes), live regions nos carregamentos e no sorteio, h1 em draw-result e alvos de toque de 44px.

## Commits
- 1dd3709: skip link, container lg:, Sair min-h-11, spec
- 9adbbb7: aria-live nos 5 "Carregando..." + regiao "Sorteando..."
- 282f242: h1 em draw-result + min-h-11

## Registros para a 05-06
- **create-group (2 h1):** falso positivo. Estao em ramos exclusivos de `@if (grupoCriado())` / `@else`; nada alterado.
- **draw-result:** adicionado `<h1 class="sr-only">Meu amigo secreto</h1>` antes do `@switch`; o `@defer` e o h2 revelado ficaram intactos (sem salto h1 -> h2).
- **Labels:** login, register (nome/email/senha), group-view e manage-group (wishlist, invite-link) ja tinham `label for` casado com `id`; nada a corrigir.
- **Alvos de toque:** `min-h-11` em todos os botoes/links `size="sm"` exceto `variant="link"` (login "Criar conta", register "Entrar", join "voltar ao dashboard"), que sao links inline de texto onde 44px nao se aplica da mesma forma.
- **Regiao viva "Sorteando...":** `<p class="sr-only" role="status" aria-live="polite">` em manage-group, irmao do `@if (confirmandoSorteio())` dentro da div do sorteio (sempre montada), conteudo condicionado a `sorteando()`.
- **Skip link:** handler em vez de href puro por causa do `<base href="/">`.
- **Limitacao conhecida:** os 5 `<p role="status">` de carregamento nascem junto com o texto via `@if`; menos robusto que regiao persistente, aceito.
- Texto do skip link com acento ("Pular para o conteúdo"), seguindo a UI PT-BR do projeto.

## Deviations from Plan
None - plan executed as written. lint, build (env dummy) e `npm test` (15 arquivos, 74 testes) passam.

## Known Stubs
None.

## Self-Check: PASSED
