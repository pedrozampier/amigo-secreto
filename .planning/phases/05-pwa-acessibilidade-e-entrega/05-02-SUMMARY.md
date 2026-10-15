---
phase: 05-pwa-acessibilidade-e-entrega
plan: 02
subsystem: ui
tags: [pwa, service-worker, manifest, signals, effect, offline]
requires: [05-01]
provides:
  - Manifest PWA com 3 icones, standalone, theme/background colors
  - Service worker registrado apenas em producao
  - ConnectivityService (signal + effect() que espelha data-offline no html)
  - Banner de offline PT-BR no layout autenticado
affects: [05-05, 05-06]
tech-stack:
  added: []
  patterns: ["effect() le signal e produz efeito colateral no DOM"]
key-files:
  created: [src/app/core/services/connectivity.service.ts, src/app/core/services/connectivity.service.spec.ts, public/manifest.webmanifest, ngsw-config.json]
  modified: [angular.json, src/app/app.config.ts, src/index.html, src/app/features/shell/authenticated-layout.page.ts, src/app/features/shell/authenticated-layout.page.html, docs/sdd.md]
key-decisions:
  - "Sem SwUpdate: banca abre o app uma vez, aviso de cache obsoleto nao tem audiencia"
  - "Banner usa bg-foreground/text-background (~19:1 nos dois temas), nao bg-destructive"
requirements-completed: [UI-03, UI-04, UI-05]
duration: 10min
completed: 2026-10-15
---

# Phase 5 Plan 02: PWA instalavel e banner de offline Summary

Manifest completo, service worker so em producao e um `ConnectivityService` cujo `effect()` le `online()` e espelha `data-offline` no `<html>`, alimentando um banner `role="status"` PT-BR.

## Commits
- 89dc698: ConnectivityService + spec (6 testes)
- 4f99f18: manifest, SW, index.html, banner, sdd §5.1

## O que o schematic fez
`npx ng add @angular/pwa` resolveu a versao incompativel 12.2.18 e abortou ("Main file (undefined) not found") sem alterar nada. Para nao instalar pacote fora do SDD, as mesmas alteracoes foram aplicadas a mao: `serviceWorker: "ngsw-config.json"` em `angular.json` (build options), `ngsw-config.json`, link do manifest e theme-color no `index.html`, `provideServiceWorker`. Nenhum PNG placeholder foi gerado; `public/icons` segue com exatamente 3 arquivos.

## Cache (ngsw-config.json)
Config padrao do schematic: grupo `app` (prefetch: index, manifest, css, js, favicon) e grupo `assets` (lazy, updateMode prefetch: imagens/fontes). Sem dataGroups; trafego Supabase nao e cacheado.

## Decisao: sem SwUpdate
Nao ha prompt de nova versao: o app e avaliado em banca que o abre uma vez; o aviso nao teria audiencia.

## Deviations from Plan
**1. [Rule 3 - Bloqueio] schematic indisponivel** - aplicado manualmente (acima).
**2. [Verificacao] `check:no-secrets` falha** - falso positivo: o gate casa `sb_secret_` dentro do codigo do supabase-js no bundle (validacao de prefixo de chave), independente desta plan. Registrado em `deferred-items.md`. `npm run build` (com env vars dummy) gerou `ngsw.json` e `ngsw-worker.js`. Aviso de budget inicial 540kB > 500kB (warning, nao erro).

lint, check:no-rxjs-state e `npm test` (14 arquivos, 70 testes) passam.

## Known Stubs
None.

## Self-Check: PASSED
