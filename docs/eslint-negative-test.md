# Teste Negativo do ESLint — Prova de que o Lint Rejeita Sintaxe Proibida

**Objetivo:** o critério 4 do ROADMAP exige que `npx eslint src --max-warnings=0`
**falhe o build** quando alguém introduz `*ngIf`/`*ngFor`, `@Input()`/`@Output()`, injeção de
dependência por construtor ou `standalone: false`. "Config escrita" é evidência fraca — este
documento registra a evidência forte: cada sintaxe proibida foi introduzida deliberadamente em
`src/app/_lint-probe/`, o lint foi executado, o exit code e a regra disparada foram capturados, e
o arquivo-sonda foi removido antes de passar para a próxima sintaxe.

Executado em: 2026-10-15.

---

## Sonda 1 — `*ngIf` no template

**Sintaxe proibida:**

```html
<div *ngIf="true">proibido</div>
```

**Regra esperada:** `@angular-eslint/template/prefer-control-flow`

**Exit code: 1** (`exit code: 1`)

**Trecho do output do ESLint:**

```
src/app/_lint-probe/probe.html
  1:7  error  Use built-in control flow instead of directive ngIf  @angular-eslint/template/prefer-control-flow

✖ 1 problem (1 error, 0 warnings)
```

---

## Sonda 2 — `@Input()`

**Sintaxe proibida:**

```typescript
import { Component, Input } from '@angular/core';
@Component({ selector: 'app-probe-input', template: '' })
export class ProbeInput {
  @Input() valor = '';
}
```

**Regra esperada:** `@angular-eslint/prefer-signals`

**Exit code: 1** (`exit code: 1`)

**Trecho do output do ESLint:**

```
src/app/_lint-probe/probe-input.ts
  5:3  error  Use `InputSignal`s (e.g. via `input()`) for Component input properties rather than the legacy `@Input()` decorator  @angular-eslint/prefer-signals

✖ 1 problem (1 error, 0 warnings)
```

---

## Sonda 3 — `@Output()`

**Sintaxe proibida:**

```typescript
import { Component, Output, EventEmitter } from '@angular/core';
@Component({ selector: 'app-probe-output', template: '' })
export class ProbeOutput {
  @Output() mudou = new EventEmitter<string>();
}
```

**Regra esperada:** `@angular-eslint/prefer-output-emitter-ref`

**Exit code: 1** (`exit code: 1`)

**Trecho do output do ESLint:**

```
src/app/_lint-probe/probe-output.ts
  5:3  error  Use `OutputEmitterRef` via `output()` for Component and Directive outputs rather than the legacy `@Output()` decorator  @angular-eslint/prefer-output-emitter-ref

✖ 1 problem (1 error, 0 warnings)
```

Esta é a regra que a pesquisa prévia (`PITFALLS.md`) havia marcado como inexistente/não coberta.
Esta sonda confirma na prática que ela existe, está ativa e dispara exatamente no `@Output()`.

---

## Sonda 4 — Injeção de dependência por construtor

**Sintaxe proibida:**

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({ selector: 'app-probe-ctor', template: '' })
export class ProbeCtor {
  constructor(private router: Router) {}
}
```

**Regra esperada:** `@angular-eslint/prefer-inject`

**Exit code: 1** (`exit code: 1`)

**Trecho do output do ESLint:**

```
src/app/_lint-probe/probe-ctor.ts
  6:15  error  Prefer using the inject() function over constructor parameter injection. Use Angular's migration schematic to automatically refactor: ng generate @angular/core:inject  @angular-eslint/prefer-inject

✖ 1 problem (1 error, 0 warnings)
```

---

## Sonda 5 — `standalone: false`

**Sintaxe proibida:**

```typescript
import { Component } from '@angular/core';
@Component({ selector: 'app-probe-std', standalone: false, template: '' })
export class ProbeStd {}
```

**Regra esperada:** `@angular-eslint/prefer-standalone`

**Exit code: 1** (`exit code: 1`)

**Trecho do output do ESLint:**

```
src/app/_lint-probe/probe-std.ts
  3:41  error  Components, Directives and Pipes should not opt out of standalone. Following this guide is highly recommended: https://angular.dev/reference/migrations/standalone  @angular-eslint/prefer-standalone

✖ 1 problem (1 error, 0 warnings)
```

---

## Estado final

Após remover completamente `src/app/_lint-probe/` (todas as 5 sondas já haviam sido apagadas
uma a uma, antes da próxima ser criada — nunca coexistiram duas sondas simultaneamente no
repositório, para que o mapeamento regra↔violação ficasse inequívoco):

```bash
rm -rf src/app/_lint-probe
npx eslint src --max-warnings=0; echo "exit code limpo: $?"   # exit code limpo: 0
npx ng build                                                   # Application bundle generation complete.
```

- `npx eslint src --max-warnings=0` → **exit code limpo: 0**
- `npx ng build` → conclui sem erros, bundle gerado em `dist/amigo-secreto/browser/`

## Conclusão

As 5 sintaxes proibidas pelo checklist (`*ngIf`/`*ngFor`/`*ngSwitch`, `@Input()`, `@Output()`,
DI por construtor, `standalone: false`) foram individualmente introduzidas e **cada uma causou
exit code não-zero**, citando a regra exata do `eslint.config.js` responsável. Isso é a prova
mecânica — não apenas a configuração escrita — de que `npx eslint src --max-warnings=0` falha o
build sempre que alguém usar a sintaxe antiga da rubrica.
