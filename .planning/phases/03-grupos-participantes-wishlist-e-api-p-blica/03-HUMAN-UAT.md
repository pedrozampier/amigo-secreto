---
status: partial
phase: 03-grupos-participantes-wishlist-e-api-p-blica
source: [03-VERIFICATION.md]
started: 2026-10-15T14:22:00Z
updated: 2026-10-15T14:22:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Responsividade mobile de /group/:id em 320px
expected: Abrir `/group/create`, `/group/:id/manage` e `/group/:id` em viewport de 320px — layout mobile-first sem overflow horizontal, textarea e botões com área de toque adequada
result: [pending]

### 2. Roteiro end-to-end com duas contas reais
expected: Os 8 passos do roteiro manual de `03-06-PLAN.md` — A cria grupo e convida B; B entra, abre `/group/:id` pelo dashboard, vê colegas e a própria wishlist (sem botão Remover, sem link de convite, sem "Gerenciar grupo"); B edita a wishlist, salva, dá F5 e confirma persistência; B tenta `/group/:id/manage` na URL e é redirecionado para `/dashboard`; A abre `/group/:id` do próprio grupo e vê o link "Gerenciar grupo"
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
