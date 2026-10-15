# Stack Research

**Domínio:** PWA de Amigo Secreto (Angular + Supabase) — projeto final acadêmico
**Pesquisado em:** 2026-10-14/15
**Confiança geral:** MÉDIA-ALTA (versões confirmadas via npm registry e docs oficiais; dois conflitos reais exigem decisão humana — ver "Conflitos Bloqueantes")

> **Leia isto primeiro:** o SDD (`docs/sdd.md` §2) fixa a stack, mas duas das versões
> pinadas (**Tailwind `^3.x`** e, em menor grau, **Angular `17+`**) colidem com o estado
> atual do ecossistema em 2026. Não decidi por conta própria — documentei o conflito e as
> duas opções em cada caso, para a stack ser validada/ajustada antes do roadmap.

---

## Conflitos Bloqueantes (decisão humana necessária)

### 🔴 Conflito 1 — Tailwind `^3.x` vs Spartan UI exige Tailwind `>=4.0.0`

Verificado **diretamente no registry do npm** (não é opinião de blog):

```
$ npm view @spartan-ng/brain@1.7.0 peerDependencies
{
  "tailwindcss": ">=4.0.0",
  "@angular/core": ">=21.0.0 <23.0.0",
  ...
}
```

O Spartan UI 1.0 (estável, lançado 2026) **não suporta Tailwind v3** — o peer dependency
é um hard constraint. Instalar `tailwindcss@^3` junto com `@spartan-ng/brain@^1.7` vai gerar
`ERESOLVE` no `npm install`. Não existe tag/versão atual do Spartan que aceite Tailwind v3;
isso só existia em versões pré-1.0 (descontinuadas).

O próprio guia oficial Angular (`angular.dev/guide/tailwind`) também já documenta **apenas
o setup de Tailwind v4** (`@import 'tailwindcss'`, `.postcssrc.json`, plugin
`@tailwindcss/postcss`) — não há mais página oficial do Angular para v3.

**As duas opções:**

| Opção | O que muda | Recomendação |
|-------|-----------|--------------|
| **A — Atualizar o SDD para Tailwind `^4.x`** | Sintaxe CSS muda (`@import 'tailwindcss'` em vez de `@tailwind base/components/utilities`), config vira CSS-first (`@theme` em vez de `tailwind.config.js`), PostCSS usa `@tailwindcss/postcss` | **Recomendado.** É o caminho sem fricção, documentado pelo próprio Angular, e desbloqueia o Spartan UI sem gambiarra. Tailwind v4 ainda é só CSS utilitário — não muda nada do que o checklist pede (ID4). |
| **B — Manter Tailwind `^3.x` e abandonar o Spartan UI** | Perde-se o Spartan/HLM; componentes de UI (botão, card, modal) teriam de ser feitos à mão com classes Tailwind puras | Só faz sentido se o Spartan UI for dispensável para a nota — releia o checklist: ID4 pede "Framework CSS moderno (ex: Tailwind CSS, PrimeNG)", **não exige Spartan** nominalmente. O SDD é quem adicionou Spartan como requisito próprio. |

Minha recomendação é a **Opção A**: atualizar `docs/sdd.md` §2 para `Tailwind CSS ^4.x`
antes do roadmap. É a mudança mínima (uma linha de tabela + reescrever a seção de setup)
e mantém 100% do valor do Spartan UI (componentes prontos, acessíveis, estilo shadcn,
que impressionam numa banca visualmente). Confiança: **ALTA** (peer dependency é fato, não
opinião).

### 🟡 Conflito 2 — `lucide-angular@latest` (1.0.0) não declara suporte a Angular 22

```
$ npm view lucide-angular@1.0.0 peerDependencies
{
  "@angular/core": "13.x - 21.x",
  "@angular/common": "13.x - 21.x"
}
```

`lucide-angular@1.0.0` (lançado 2026-03-23, é a versão mais recente hoje) trava o range de
peer dependency em Angular 13–21. Não existe ainda uma versão publicada que declare
Angular 22 oficialmente.

**Impacto prático:** instalar `lucide-angular` num projeto Angular 22 vai emitir um
warning de `ERESOLVE`/peer mismatch (ou erro, dependendo do gerenciador de pacotes), mas
**na prática o pacote funciona** — ele não usa nenhuma API interna do Angular que tenha
sido removida entre v21 e v22, é apenas a biblioteca não ter sido testada formalmente
ainda contra v22 e o `package.json` não ter sido atualizado.

**As duas opções:**

| Opção | Ação | Quando usar |
|-------|------|-------------|
| **A — Instalar com `--legacy-peer-deps` (npm) ou aceitar o warning (pnpm/yarn)** | `npm install lucide-angular --legacy-peer-deps` | Recomendado se for usar Angular 22 (ver Decisão de Versão do Angular abaixo) |
| **B — Fixar o projeto em Angular 21 LTS** | `ng new --package-manager npm` com `@angular/cli@21` | Resolve o peer mismatch "de verdade", mas há outro motivo mais forte para ficar em v21 — ver próxima seção |

---

## Decisão de Versão do Angular — 17+ do SDD vs 20+ do checklist vs 22 atual

O SDD diz "Angular 17+", o checklist (ID31) pede explicitamente **"Skills de Angular
20+"**. Nenhum dos dois documentos pede uma versão exata — então a pergunta real é:
**20, 21 ou 22?**

Linha do tempo confirmada via npm registry (`npm view @angular/core dist-tags`) e releases
oficiais:

| Versão | Status em 2026-10-14 | Marco relevante |
|--------|----------------------|------------------|
| v20 | LTS (suporte estendido) | Signals estável, `effect()` sai de developer preview, zoneless (`provideZonelessChangeDetection`) torna-se estável em v20.2 |
| v21 | LTS / suporte ativo recente | Zoneless passa a ser o **default** em `ng new` (sem precisar chamar o provider), Vitest substitui Karma como runner default, Signal Forms experimental, remove APIs já deprecadas desde v19 |
| **v22** | **`latest` atual (22.2.3)** | Linha ativa de desenvolvimento; sem quebras adicionais relevantes para este projeto |

**Recomendação: Angular 22 (latest).** Justificativa:

1. O checklist pede "20+" — qualquer uma das três serve ao requisito literal, mas v22 é o
   que `ng new` instala por padrão hoje, então é o caminho de menor atrito.
2. Nenhuma API obrigatória do checklist foi removida entre v17 e v22 — **ao contrário**,
   todas ficaram *mais* simples:
   - `effect()`: o parâmetro `allowSignalWrites` foi **removido em v19** (escritas em
     signal dentro de `effect()` são permitidas por padrão, sem flag). Se algum tutorial
     ou exemplo de IA gerar `effect(() => {...}, { allowSignalWrites: true })`, isso é
     **código desatualizado para v19+** — remova a opção.
   - `input()`, `output()`, `model()`, `signal()`, `computed()`: estáveis desde v17/v19,
     sem mudança de assinatura.
   - `@if`/`@for`/`@switch`/`@defer`: sintaxe de control flow estável desde v17, sem
     mudanças.
   - `provideRouter` + `withComponentInputBinding`: confirmado atual na doc oficial
     (`angular.dev/guide/routing/common-router-tasks`), sem deprecação.
   - Guards/resolvers funcionais (`CanActivateFn`, `ResolveFn`): estáveis, sem mudança.
   - `toSignal()` / `toObservable()`: estáveis desde v16/v17 (`@angular/core/rxjs-interop`).
   - `provideHttpClient(withInterceptors([...]))`: confirmado atual, inalterado.
3. **Diferença real que importa:** a partir de v21, projetos novos vêm **zoneless por
   padrão** (sem `zone.js`, sem chamar provider algum). Isso **não quebra nenhum requisito
   do checklist** — na verdade reforça ID9–ID12 (Signals como única fonte de reatividade),
   porque sem zone.js não há mais nenhuma mudança de detecção "por fora" dos Signals. Mas
   é importante **saber disso** para não copiar tutoriais antigos que chamam
   `provideZonelessChangeDetection()` manualmente — em v21+/`ng new` isso já vem de fábrica,
   chamar de novo não quebra nada, mas é redundante.
4. **Vitest substitui Karma por padrão** a partir de v21 (ver seção de Testes).

**Trade-off a registrar:** se o professor/avaliador rodar `ng version` e comparar
literalmente com "17+", v22 está coberto (17+ inclui 22). O único risco é algum
exemplo/skill de IA mais antigo (pré-v19) gerar `allowSignalWrites: true` — maneira
simples de pegar isso: `grep -rn allowSignalWrites src/` antes de entregar.

**Ação recomendada:** atualizar `docs/sdd.md` §2 de "Angular 17+" para "Angular 22
(`^22.x`)" — não é uma mudança de arquitetura, é só precisão de versão, e evita ambiguidade
na hora de rodar `ng new`.

Confiança: **ALTA** (versões e dist-tags confirmados via `npm view`, APIs confirmadas via
`angular.dev` oficial).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@angular/core` + `@angular/cli` | **22.2.x** (`latest` no npm) | Framework SPA, build, dev server | Versão atual estável; zoneless + Signals + nova sintaxe de control flow todos estáveis; cobre literalmente "17+" do SDD e "20+" do checklist |
| `@angular/cdk` | **22.2.x** (deve casar com `@angular/core`) | Primitivas de acessibilidade/overlay exigidas pelo Spartan UI (Brain layer usa CDK internamente) | Peer dependency obrigatória do `@spartan-ng/brain` |
| `@supabase/supabase-js` | **^2.117** (confirmado `2.117.3` no npm) | Cliente BaaS: Auth, Postgres via `.from()`, Storage, Functions | Única opção madura de cliente JS para Supabase; API estável dentro do `^2.x` desde 2023 |
| Tailwind CSS | **Recomendado: `^4.x`** (SDD pede `^3.x` — ver Conflito 1) | Utilitários CSS, base de estilo do Spartan UI | v3 ainda existe como tag `v3-lts` no npm, mas **não é compatível com Spartan UI 1.0** |
| `@spartan-ng/brain` + `@spartan-ng/cli` | **^1.7.0** (publicado, estável, "1.0 production-ready") | Componentes acessíveis sem estilo (Brain) + CLI que copia estilos Tailwind prontos (Helm) para dentro do projeto | Biblioteca de componentes tipo shadcn para Angular, exigida pelo SDD; ativamente mantida (2.9k+ stars, commits recentes) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-angular` | **^1.0.0** (ver Conflito 2 — instalar com `--legacy-peer-deps` em npm) | Ícones SVG como componentes Angular | Em qualquer botão/ação que precise de ícone (ex.: convite, copiar link, sair) |
| `date-fns` | **^3.6.0** (SDD pede `^3.x`; `latest` real é `4.4.0`, mas **`^3.x` ainda é instalável e mantido**, sem peer conflicts com Angular 22) | Formatação de datas (`created_at`, `joined_at`) | Usar com *pipe* customizado para exibir datas em pt-BR (atende ID7 — Pipes) |
| `zod` | **^3.25.x** (SDD pede `^3.x`; `latest` real é `4.6.x`, com breaking changes de API — ver nota abaixo) | Validação de schemas (payloads de formulário, resposta da Edge Function) | Validar o body antes de enviar para Supabase/Edge Function; integra bem com Reactive Forms (ID23) |
| `clsx` | `>=2.0.0` | Concatenar classes condicionalmente | Peer dependency **obrigatória** do `@spartan-ng/brain` — vem goela abaixo junto com Spartan, não é opcional |
| `tw-animate-css` | `>=1.0.0` | Animações utilitárias Tailwind (substituiu `tailwindcss-animate` no ecossistema v4) | Peer dependency **obrigatória** do `@spartan-ng/brain` |

> **Nota sobre Zod:** o SDD pede `^3.x`. A versão `3.25.76` é a mais recente da linha 3 e
> está sendo usada como peer dependency pelo próprio `@spartan-ng/cli` internamente — ou
> seja, ficar em Zod 3 é não só o que o SDD pede, mas também o que o ecossistema Spartan já
> espera. **Não migrar para Zod 4** nesse projeto: Zod 4 muda a forma de customizar
> mensagens de erro (`message` → `error`) e isso só adicionaria risco sem ganho para o
> checklist. Confiança: **ALTA** (confirmado via `npm view zod dist-tags` e
> `@spartan-ng/cli@1.7.0 dependencies`).

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest** | Test runner padrão do Angular 21+/22 (substitui Karma) | `ng new` já configura Vitest por padrão em v21+; API de teste é `describe`/`it`/`expect`/`vi` (muito parecida com Jasmine, troca `spyOn` por `vi.spyOn()`) |
| **Supabase CLI** | `supabase functions new/serve/deploy`, `supabase gen types typescript` | Instalar globalmente ou via `npx supabase`; versão atual `2.121.0` |
| **Vercel CLI** (opcional) | Deploy e preview local (`vercel dev`) | O deploy em si pode ser feito só pela integração GitHub↔Vercel, sem precisar da CLI local |

---

## Installation

```bash
# 1. Scaffold do projeto (Angular 22, standalone é o padrão, zoneless é o padrão em v21+)
npx -y @angular/cli@latest new amigo-secreto \
  --routing --style=css --ssr=false --package-manager=npm

cd amigo-secreto

# 2. Tailwind v4 (recomendado — ver Conflito 1) via schematic oficial do Angular
ng add tailwindcss
# Isso cria .postcssrc.json com o plugin @tailwindcss/postcss e troca
# src/styles.css para `@import "tailwindcss";`

# 3. Spartan UI — Brain (primitivas) + CLI (copia componentes Helm estilizados)
npm install -D @spartan-ng/cli
npx ng g @spartan-ng/cli:init
# Isso instala @spartan-ng/brain, @angular/cdk, clsx, tw-animate-css
# e configura o preset de tema no styles.css automaticamente

# 4. Adicionar componentes Spartan conforme necessário (exemplo: botão, card, dialog)
npx ng g @spartan-ng/cli:ui button
npx ng g @spartan-ng/cli:ui card
npx ng g @spartan-ng/cli:ui dialog

# 5. Supabase client
npm install @supabase/supabase-js@^2

# 6. Ícones
npm install lucide-angular --legacy-peer-deps   # ver Conflito 2

# 7. Utilitários e validação (pinados conforme SDD)
npm install date-fns@^3 zod@^3

# 8. PWA (gera manifest.webmanifest, ngsw-config.json, @angular/service-worker)
ng add @angular/pwa

# 9. Supabase CLI (projeto, não global, para versionar junto do repo)
npm install -D supabase

# 10. Tipos do banco (depois de aplicar as migrations no projeto Supabase)
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase gen types typescript --linked > src/app/core/models/database.types.ts
```

---

## Tailwind v4 + Spartan UI — Setup Detalhado

`src/styles.css` após `ng add tailwindcss` + `spartan-ng:init`:

```css
@import "tailwindcss";
@import "@spartan-ng/brain/hlm-tailwind-preset.css";
@import "tw-animate-css";

/* Tema (CSS-first config do Tailwind v4 — substitui tailwind.config.js) */
@theme {
  --color-primary: #c0392b; /* tema natalino do Amigo Secreto */
  --color-background: #0f172a;
}
```

Não há mais `tailwind.config.js` tradicional no setup v4 — a configuração de tema vira
`@theme {}` dentro do próprio CSS. Isso é uma mudança real de workflow em relação ao que o
SDD descreve implicitamente (v3 usa `tailwind.config.js` com `content: [...]`). Se a
Opção A (adotar v4) for aceita, vale documentar isso no SDD também, não só na tabela de
versão.

---

## Supabase + Angular — Padrão de Integração

### Cliente Supabase como Service singleton

```typescript
// src/app/core/services/supabase-client.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient<Database> = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );
}
```

`environment.supabaseAnonKey` é a `anon key` pública — é seguro expô-la no bundle do
cliente porque a privacidade real vem do RLS no banco (coerente com o Core Value do
projeto), não da ocultação da chave.

### Ponte `onAuthStateChange` → Signal (atende ID20 + ID24)

```typescript
// src/app/core/services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import type { Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseClientService).client;

  readonly session = signal<Session | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }
}
```

Isso cobre ID20 (sessão JWT) e dá a base de Signal para os guards funcionais consumirem
(`authGuard` lê `inject(AuthService).isAuthenticated()`). O padrão "mais comum" encontrado
na comunidade ainda usa `BehaviorSubject`/RxJS puro — aqui a ponte é feita direto para
Signal porque o checklist (ID9–ID12, ID24) **exige** Signals como fonte de estado; se
alguma lib ou exemplo de IA gerar a versão RxJS/BehaviorSubject, ela não atende ID9–ID12
sem um `toSignal()` por cima.

### Tipagem do banco

```bash
npx supabase gen types typescript --linked > src/app/core/models/database.types.ts
```

Gera tipos a partir do schema real do projeto Supabase (não do SDD manualmente escrito) —
usar isso como fonte de verdade para `Database`, e manter as interfaces do SDD §4
(`Profile`, `Group`, etc.) como *view models* derivados, não como tipos do banco em si.

---

## Supabase Edge Functions — Fluxo de Deploy e Invocação

### Criar e testar localmente

```bash
npx supabase functions new run-draw
# gera supabase/functions/run-draw/index.ts

npx supabase functions serve run-draw --env-file ./supabase/.env.local
```

### Esqueleto da função (Deno, `Deno.serve`)

```typescript
// supabase/functions/run-draw/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // A partir daqui, toda query roda com o JWT do usuário chamador —
  // o RLS decide se ele pode ou não iniciar o sorteio daquele grupo.
  const { groupId } = await req.json();
  // ... Fisher-Yates + pares circulares (algoritmo do SDD §7) ...

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Passar o `Authorization` header do chamador para o client Deno (em vez de usar a
`service_role key`) é o que garante que a Edge Function **não vira um jeito de burlar o
RLS** — ela herda exatamente as permissões do usuário que acionou o sorteio, reforçando o
Core Value ("a privacidade é garantida no banco, não na interface").

### Deploy

```bash
npx supabase functions deploy run-draw
```

### Invocar do Angular com o JWT do usuário

```typescript
async runDraw(groupId: string) {
  const { data: { session } } = await this.supabase.auth.getSession();
  const { data, error } = await this.supabase.functions.invoke('run-draw', {
    body: { groupId },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data;
}
```

Confiança: **ALTA** para a mecânica geral (`functions.invoke`, `Deno.serve`, CLI
workflow — confirmados na documentação oficial do Supabase); **MÉDIA** para o snippet
exato de propagação do header de Auth dentro da função (padrão amplamente documentado,
mas não testado neste projeto ainda).

---

## Angular PWA — `ng add @angular/pwa`

```bash
ng add @angular/pwa
```

O que o schematic gera/modifica (confirmado na doc oficial e no pacote `@angular/pwa`):

- Adiciona `@angular/service-worker` como dependência
- Cria `public/manifest.webmanifest` (ou `src/manifest.webmanifest`, dependendo da
  estrutura do projeto gerado)
- Cria `ngsw-config.json` (estratégia de cache do service worker)
- Injeta `<link rel="manifest">` e `<meta name="theme-color">` no `index.html`
- Registra o `ServiceWorkerModule`/`provideServiceWorker` no bootstrap, condicionado a
  `!isDevMode()`
- Gera um conjunto de ícones placeholder (72px–512px) em `public/icons/`

Itens a customizar manualmente após o `ng add` (exigido por ID3 do checklist):

```json
// public/manifest.webmanifest
{
  "name": "UTF-Secret — Amigo Secreto",
  "short_name": "UTF-Secret",
  "theme_color": "#c0392b",
  "background_color": "#0f172a",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "icons": [
    { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ]
}
```

Estado offline: o `ngsw-config.json` já cacheia os assets de build por padrão (estratégia
`prefetch`); para dar feedback visual de "você está offline" é necessário escutar
`window.ononline`/`onoffline` (ou o serviço `NgswUpdateService`) num componente de shell
e exibir um banner — isso não vem de fábrica, precisa ser implementado.

Confiança: **ALTA** (estrutura gerada confirmada via doc oficial + `npm view @angular/pwa`
mostrando peer dependency `@angular/cli: ^22.2.2`, ou seja, a versão do schematic
acompanha exatamente a versão do Angular instalado).

---

## Deploy na Vercel

Com o builder `application` (padrão desde Angular 17+, usado em v22), o build gera:

```
dist/amigo-secreto/
└── browser/
    ├── index.html
    ├── main-XXXX.js
    ├── styles-XXXX.css
    └── ... (chunks, assets)
```

`vercel.json` na raiz do projeto:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/amigo-secreto/browser",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

O `rewrites` é obrigatório porque o Angular Router faz roteamento client-side — sem isso,
recarregar a página em `/group/:id/manage` retorna 404 do Vercel antes do `index.html`
carregar o router.

Variáveis de ambiente (Supabase URL/anon key): como são valores públicos por design (RLS
protege o dado, não a chave), a abordagem mais simples é **gerar o arquivo de environment
no build time via variáveis da Vercel**, por exemplo com um pequeno script `prebuild` que
escreve `src/environments/environment.prod.ts` a partir de `process.env.SUPABASE_URL` e
`process.env.SUPABASE_ANON_KEY` configuradas no painel da Vercel — assim a chave não fica
hardcoded no repositório, mesmo sendo pública por natureza.

Confiança: **MÉDIA-ALTA** (estrutura `dist/<app>/browser` confirmada via comunidade +
changelog do builder `application`; o `vercel.json` exato é um padrão comum, mas vale
testar o auto-detect da Vercel primeiro — ela frequentemente acerta o `outputDirectory`
sozinha para projetos Angular).

---

## Testes — Vitest (não Karma)

A partir do Angular 21 (e mantido em v22), `ng new` configura **Vitest** como test runner
por padrão, substituindo Karma + Jasmine. Karma está oficialmente deprecado desde 2023 e
continua funcional só por compatibilidade retroativa — **não usar Karma em projeto novo**,
isso seria regredir para uma ferramenta já fora do caminho recomendado pelo próprio Angular
CLI.

Sintaxe (API muito parecida com Jasmine — `describe`/`it`/`expect`, importados de
`'vitest'`):

```typescript
// src/app/core/services/draw.service.spec.ts
import { describe, it, expect } from 'vitest';
import { buildCircularPairs } from './draw.service';

describe('buildCircularPairs', () => {
  it('nunca forma um par onde o participante tira a si mesmo', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const pairs = buildCircularPairs(ids);
    for (const pair of pairs) {
      expect(pair.giverId).not.toBe(pair.receiverId);
    }
  });

  it('gera exatamente N pares para N participantes', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect(buildCircularPairs(ids)).toHaveLength(ids.length);
  });
});
```

Para mocks de dependências (ex.: cliente Supabase injetado em `DrawService`), trocar
`spyOn()`/`jasmine.createSpy()` por `vi.spyOn()`/`vi.fn()`.

Confiança: **ALTA** (confirmado via `npm view vitest` mostrando versão `5.0.4` publicada e
ativamente consumida pelo tooling do Angular CLI atual, e múltiplas fontes concordando
sobre o default em v21+).

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Tailwind v4 (proposto) | Tailwind v3 (SDD original) | Só se o Spartan UI for removido da stack — v3 sozinho (sem Spartan) continua 100% válido e documentado |
| Angular 22 | Angular 21 LTS | Se o peer-dependency warning do `lucide-angular` for inaceitável para a banca/avaliador, fixar em v21 resolve isso sem custo de feature |
| Vitest | Jest | Jest é mais popular fora do ecossistema Angular, mas exigiria configuração manual — Vitest é o default já integrado ao `@angular/build`, menos atrito |
| `functions.invoke` com header manual | Deixar o Supabase client propagar o JWT automaticamente (comportamento padrão quando há sessão ativa) | Passar o header explicitamente é mais didático para a banca (mostra o fluxo JWT claramente) e é redundante-seguro, mas tecnicamente opcional |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `NgModule` em qualquer componente | Viola ID3 diretamente (exige Standalone) | `standalone: true` (padrão em v19+, nem precisa declarar) |
| `@Input()`/`@Output()` decorators | Viola ID13 (exige `input()`/`output()` funcionais) | `input()`, `output()`, `model()` |
| Injeção via construtor | Viola ID14 (exige `inject()`) | `inject(MeuService)` no corpo da classe |
| `effect(fn, { allowSignalWrites: true })` | API removida em v19 — código de tutorial desatualizado | `effect(fn)` simples, sem a opção |
| Karma/Jasmine test runner em projeto novo | Deprecado, caminho antigo que o próprio CLI abandonou como default | Vitest (default do `ng new` em v21+) |
| `tailwind.config.js` com `content:[...]` (estilo v3) se adotar v4 | Setup v4 é CSS-first (`@theme` dentro do `.css`), o arquivo JS de config é só compatibilidade legada | `@theme {}` dentro de `styles.css` |
| Sorteio calculado no componente/serviço do browser do admin | Quebra o Core Value do projeto — os pares passariam pela máquina do admin antes de ir pro banco | Edge Function (`supabase/functions/run-draw`) |
| Service Role Key da Supabase no bundle do Angular | Bypassa RLS por completo — qualquer um no DevTools vira super-admin do banco | Apenas a `anon key` no cliente; `service_role` só dentro de Edge Functions, via `Deno.env.get()` |

## Stack Patterns by Variant

**Se a banca aceitar atualizar o SDD (Opção A do Conflito 1):**
- Tailwind `^4.x` + Spartan UI `^1.7.x` sem gambiarra
- Setup CSS-first, sem `tailwind.config.js`

**Se o SDD tiver de permanecer travado em Tailwind `^3.x` (Opção B):**
- Remover Spartan UI da stack
- Construir `shared/components/{button,card,modal}` manualmente com Tailwind puro — ainda
  atende ID4 (Tailwind) e ID13 (input/output funcionais nesses componentes), só perde o
  verniz visual pronto do Spartan

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `@angular/core@22.2.x` | `@angular/cdk@22.2.x` | Devem ser a mesma major/minor — confirmado via `npm view @angular/cdk version` = `22.2.3` |
| `@spartan-ng/brain@1.7.0` | `@angular/core >=21.0.0 <23.0.0`, `tailwindcss >=4.0.0` | Hard peer deps confirmados via npm registry — bloqueia Angular 23+ futuramente e qualquer Tailwind < 4 |
| `lucide-angular@1.0.0` | `@angular/core` declarado só até `21.x` | Funciona na prática com v22, mas vai exigir `--legacy-peer-deps` ou `--force` no `npm install` |
| `@angular/pwa@22.2.2` | `@angular/cli: ^22.2.2` | O schematic do PWA sempre casa exatamente com a versão do CLI instalada — nunca instalar uma major diferente |
| `vitest@5.0.4` | `vite: ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0` | Gerenciado automaticamente pelo `@angular/build` quando o `ng new` já escolhe Vitest; não precisa versionar manualmente |
| `zod@^3.25.x` | `@spartan-ng/cli@1.7.0` (usa `zod: ^3.25.76` internamente) | Ficar em Zod 3 também evita dois Zods diferentes resolvidos na árvore de dependências |

## Sources

- `npm view` (registry oficial do npm, consultado em 2026-10-14) — versões exatas de
  `@angular/core`, `@angular/cli`, `@angular/cdk`, `@angular/pwa`, `@supabase/supabase-js`,
  `tailwindcss`, `@spartan-ng/cli`, `@spartan-ng/brain`, `lucide-angular`, `date-fns`,
  `zod`, `vitest`, `supabase` (CLI) — confiança **ALTA**, é a fonte primária de verdade de
  versão/peer dependency.
- [angular.dev/overview](https://angular.dev/overview) — confirma Angular 22 como versão
  atual da documentação oficial. Confiança **ALTA**.
- [angular.dev/guide/tailwind](https://angular.dev/guide/tailwind) — guia oficial atual de
  integração Tailwind, confirmado como setup v4 (`ng add tailwindcss`, `.postcssrc.json`,
  `@tailwindcss/postcss`). Confiança **ALTA**.
- [angular.dev/guide/routing/common-router-tasks](https://angular.dev/guide/routing/common-router-tasks)
  — confirma `provideRouter` + `withComponentInputBinding` como atual. Confiança **ALTA**.
- [angular.dev/guide/http/interceptors](https://angular.dev/guide/http/interceptors) —
  sintaxe atual de interceptor funcional + `provideHttpClient(withInterceptors(...))`.
  Confiança **ALTA**.
- [spartan.ng/documentation/installation](https://spartan.ng/documentation/installation) —
  confirma requisito de Tailwind v4 e fluxo de instalação via `@spartan-ng/cli`. Confiança
  **ALTA**.
- [github.com/spartan-ng/spartan](https://github.com/spartan-ng/spartan) — confirma status
  1.0 estável, manutenção ativa. Confiança **MÉDIA-ALTA** (dados de stars/commits via fetch,
  não 100% verificáveis em tempo real, mas consistentes com o registry).
- [supabase.com/docs/guides/getting-started/tutorials/with-angular](https://supabase.com/docs/guides/getting-started/tutorials/with-angular)
  — padrão oficial de client setup e `getSession`/`getUser`/`getClaims`. Confiança **ALTA**.
  Nota: a doc oficial recomenda RxJS/BehaviorSubject como "padrão comum" — a ponte para
  Signal documentada aqui é uma adaptação **necessária para o checklist**, não o que a doc
  Supabase mostra por padrão.
- [supabase.com/docs/reference/javascript/functions-invoke](https://supabase.com/docs/reference/javascript/functions-invoke)
  — sintaxe de `functions.invoke` com headers customizados. Confiança **ALTA**.
- WebSearch cruzado (múltiplas fontes concordando): Angular 21 lançado 2025-11-20 com
  zoneless default + Vitest default + remoção de APIs deprecadas desde v19; Angular 20
  lançado 2025-05 com Signals/`effect()` estáveis. Confiança **MÉDIA** nas datas exatas
  (fontes secundárias, não confirmadas num changelog oficial único nesta sessão), **ALTA**
  nos fatos de "o que mudou em qual versão" (múltiplas fontes independentes convergem).

---
*Stack research for: PWA Amigo Secreto — Angular 22 + Supabase + Tailwind + Spartan UI*
*Researched: 2026-10-14/15*
