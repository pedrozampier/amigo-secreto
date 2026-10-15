---
phase: 05-pwa-acessibilidade-e-entrega
plan: 06
subsystem: docs
tags: [a11y, wcag, contrast, audit]
requires: [05-01, 05-02, 05-03]
provides:
  - docs/accessibility-audit.md (evidencia WCAG 2.1 AA, 218 linhas)
affects: [05-05]
key-files:
  created: [docs/accessibility-audit.md]
key-decisions:
  - "Valores calculados prevalecem sobre os esperados; divergencias registradas no documento"
requirements-completed: [UI-06]
duration: 8min
completed: 2026-10-15
---

# Phase 5 Plan 06: Auditoria de acessibilidade Summary

Documento de evidencia com contraste calculado por script Node descartavel (scratchpad, nao commitado) a partir dos tokens reais de `src/styles.css`, auditoria das 10 telas, justificativa de D-12 e pendencias humanas.

## Commits
- Task 1+2 (documento unico, escrito de uma vez): `docs(05-06): add WCAG 2.1 AA accessibility audit`

## Razoes calculadas
- Claro: foreground 19.79, muted-foreground 4.73, primary 10.95, primary-foreground/primary 10.49, accent-foreground 6.04, destructive 4.76, ring 5.27.
- Escuro: foreground 18.96, muted-foreground 7.63 (6.91 sobre card), primary 12.91, primary-foreground/primary 11.68, accent-foreground 10.52, destructive 6.84, ring 5.69.
- Banner offline (`text-background` sobre `bg-foreground`): 19.79:1 claro, 18.96:1 escuro.
- Divergencias vs. esperado: `--primary` claro 10.95 (esperado 12.31) e `--destructive` escuro 6.84 (esperado 6.89). Nenhum par reprova.
- Ring antigo `oklch(0.708 0 0)` = 2.59:1 confirmado.

## Limitacoes registradas
Contraste so de tokens e composicoes listadas; sem gate a11y no CI (axe-core deferido v2); hex do manifest sincronizado a mao (e background_color #fafafa difere do fundo #fff); "Carregando..." em regioes montadas via @if; textos de botao ("Entrando..." etc.) sem regiao viva; DatePipe sem locale pt-BR (WCAG 3.1.2, nao conforme, deferido); auditoria estatica, sem leitor de tela real.

## Deviations from Plan
Tasks 1 e 2 foram commitadas juntas (mesmo arquivo). Adicionado, alem do plano, o defeito 3.1.2 do DatePipe (pedido no contexto de execucao). Parte D (Lighthouse, 320px, teclado, temas) ficou como pendente para o checkpoint da 05-05.

## Known Stubs
Parte D contem espacos "a preencher" intencionais, resolvidos na 05-05.

## Self-Check: PASSED
