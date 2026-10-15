---
phase: 05-pwa-acessibilidade-e-entrega
plan: 01
subsystem: ui
tags: [pwa, tailwind, wcag, icons, resvg, service-worker]
requires: []
provides:
  - Paleta natalina (verde-pinho) nos dois temas, com --ring >= 3:1
  - Tema escuro via prefers-color-scheme
  - 3 icones PNG do PWA gerados por script versionado
  - Dependencias @angular/service-worker e @resvg/resvg-js declaradas no SDD §2
affects: [05-02, pwa-manifest, accessibility-audit]
tech-stack:
  added: ["@angular/service-worker ^21.2.25", "@resvg/resvg-js ^2.6.2 (dev)"]
  patterns: ["PNG commitados; script so regenera quando o SVG muda"]
key-files:
  created: [public/icon-source.svg, scripts/generate-pwa-icons.js, public/icons/icon-192x192.png, public/icons/icon-512x512.png, public/icons/icon-512x512-maskable.png]
  modified: [docs/sdd.md, package.json, package-lock.json, src/styles.css]
key-decisions:
  - "theme_color #16452a e background_color #fafafa para o manifest (plan 05-02)"
  - "Foco com outline CSS puro 2px solid var(--ring) a 100% de opacidade"
requirements-completed: [UI-03]
duration: 12min
completed: 2026-10-15
---

# Phase 5 Plan 01: Paleta natalina, tema escuro e icones PWA Summary

Paleta verde-pinho/dourado aplicada nos dois temas (escuro via `prefers-color-scheme`), `--ring` corrigido para passar WCAG 1.4.11, e 3 PNGs do PWA gerados por script com `@resvg/resvg-js`.

## Valores para a plan 05-02
- `theme_color`: `#16452a`
- `background_color`: `#fafafa`
- Versoes instaladas: `@angular/service-worker` ^21.2.25, `@resvg/resvg-js` ^2.6.2

## Commits
- 32df864: dependencias declaradas no SDD §2/§2.1 e instaladas
- 7104bf6: paleta natalina, tema escuro por media query, foco forte
- 575b0f4: SVG de origem, script e PNGs

## Deviations from Plan

**1. [Rule 1 - Bug] Maskable identico ao PNG "any"**
- O script, renderizando o mesmo SVG, gerou bytes identicos, contrariando o criterio de aceite. Fix: a variante maskable reduz o desenho a 88% (fundo intacto), dando folga extra na zona segura. Arquivos distintos (7598 vs 8104 bytes).

**2. [Verificacao] `npm run build` exige env vars (prebuild)**
- Sem SUPABASE_URL/KEY o prebuild aborta (comportamento esperado). Compilacao verificada com `npx ng build --configuration development` (ok). Foco implementado em CSS puro (fallback previsto pela plan).

lint e `npm test` (13 arquivos, 64 testes) passam. Nota: `check:no-secrets` nao foi rodado (depende de build de producao).

## Known Stubs
None.

## Self-Check: PASSED
