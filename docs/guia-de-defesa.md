# Guia de Defesa — UTF-Secret

Roteiro para a apresentação: **o que dizer** sobre cada tópico da rubrica e **onde abrir no código** quando
perguntarem. Os caminhos são relativos à raiz do repositório.

---

## 1. Visão em 30 segundos

> "O UTF-Secret é um amigo secreto online. A regra central é que **nem o administrador do grupo vê os pares
> sorteados** — e isso é garantido pelo **banco de dados (RLS do Supabase)**, não por esconder na tela. O
> sorteio roda numa **Edge Function** no servidor, então o navegador de quem clica em 'Sortear' nunca recebe os
> pares. O front é Angular 21 com Standalone + Signals, Tailwind 4 e Spartan UI, publicado como PWA na Vercel."

## 2. Mapa do sistema — onde fica cada coisa

| Parte | Onde está | O que contém |
|:------|:----------|:-------------|
| Bootstrap da app | `src/main.ts`, `src/app/app.ts` | Inicia a app Standalone (sem NgModule) |
| Configuração global | `src/app/app.config.ts` | `provideRouter(withComponentInputBinding)`, `provideHttpClient(withInterceptors)`, `provideServiceWorker` |
| Rotas principais | `src/app/app.routes.ts` | login, register, layout autenticado com filhas, `draw/:groupId/result` |
| Rotas filhas de grupo | `src/app/features/group/group.routes.ts` | create, view, manage aninhadas no `group-layout` |
| Serviços (estado em Signals) | `src/app/core/services/` | `auth`, `group`, `draw`, `holiday`, `connectivity`, `supabase-client` |
| Guards | `src/app/core/guards/` | `auth.guard.ts`, `admin.guard.ts`, `member.guard.ts` |
| Resolvers | `src/app/core/resolvers/` | `group.resolver.ts`, `draw-result.resolver.ts` |
| Interceptor | `src/app/core/interceptors/error.interceptor.ts` | Tratamento centralizado de erros HTTP |
| Algoritmo do sorteio (puro, testável) | `src/app/core/draw-algorithm.ts` | `shuffle` (Fisher-Yates) e `pairCircular` |
| Sorteio no servidor | `supabase/functions/run-draw/index.ts` | Edge Function: trava, embaralha, insere pares, fecha o grupo |
| Banco: tabelas | `supabase/migrations/0001_schema.sql` | `profile`, `group`, `participant`, `draw` |
| Banco: funções auxiliares | `supabase/migrations/0002_private_helpers.sql` | `private.my_group_ids()`, `private.my_participant_ids()` |
| Banco: políticas RLS | `supabase/migrations/0003_rls_policies.sql` | Quem pode ler/escrever cada tabela |
| Banco: RPCs | `0004_group_join_rpcs.sql`, `0006_create_group_rpc.sql` | Entrar por convite, criar grupo |
| Telas | `src/app/features/` | `auth/`, `dashboard/`, `group/`, `draw/`, `shell/` |
| Estilo / Design System | `src/styles.css` | Tailwind 4 `@theme`, paleta natalina, tema escuro, anel de foco |
| PWA | `public/manifest.webmanifest`, `ngsw-config.json`, `public/icons/` | Manifest, cache do service worker, ícones |
| Testes | `src/app/**/*.spec.ts` | Vitest — regras de negócio e componentes |
| CI | `.github/workflows/ci.yml` | lint, testes, build, verificação de secrets |
| Deploy | `vercel.json`, `scripts/generate-env.js` | Build na Vercel gerando o environment a partir de variáveis |

## 3. Fluxo principal (para contar como história)

1. **Cadastro/Login** → `features/auth/login|register` usam **Reactive Forms**; `AuthService` chama o Supabase
   Auth e guarda a sessão num `signal`.
2. **Criar grupo** → `features/group/create` chama a RPC de criação (`0006_create_group_rpc.sql`) e mostra o
   link de convite (um `computed`).
3. **Convidar** → quem abre `/join/:token` cai em `features/group/join`; o `:token` chega como **input do
   componente** (graças a `withComponentInputBinding`).
4. **Gerenciar** → `features/group/manage` (só admin, via `adminGuard`) lista participantes com o componente
   filho `participant-row` (`input()`/`output()`).
5. **Sortear** → `DrawService` invoca a Edge Function `run-draw`. A função usa a chave `service_role`, que
   **nunca** vai para o navegador.
6. **Ver resultado** → `/draw/:groupId/result` (protegido por `memberGuard` + `drawResultResolver`). O cartão
   abre com `@defer (on interaction)`. O banco só devolve a linha em que **você** é o `giver_id`.

## 4. Tópicos da rubrica — o que dizer e onde mostrar

### RA1 — Prototipação, responsividade e PWA
- **ID1 Protótipo:** roteiro de telas em `docs/prototype-brief.md`; link do Figma na seção Links do README.
- **ID2 Mobile-First:** classes Tailwind sem prefixo valem para o celular e `sm:`/`md:`/`lg:` ampliam. Mostrar
  `src/app/features/shell/authenticated-layout.page.html` (container `lg:`). Funciona a partir de 320px.
- **ID3 PWA:** `public/manifest.webmanifest` (nome, ícones, `theme_color`, `display: standalone`),
  `provideServiceWorker` em `src/app/app.config.ts`, e o **estado offline**: `ConnectivityService` expõe um
  signal `online` e o layout mostra um banner quando cai a conexão.

### RA2 — Componentes e templates
- **ID3 Standalone:** nenhum `*.module.ts` existe; o ESLint (`eslint.config.js`, `prefer-standalone`) e o CI
  bloqueiam NgModule. Prova negativa em `docs/eslint-negative-test.md`.
- **ID4 CSS moderno:** Tailwind 4 "CSS-first" — não existe `tailwind.config.js`; tudo em `src/styles.css`
  com `@theme`. Componentes visuais do Spartan UI.
- **ID5 `@if`/`@switch`:** `draw-result.page.html`, `group-view.page.html`, `manage-group.page.html`.
- **ID6 `@for` com `track`:** `dashboard.page.html`, `manage-group.page.html`. Dizer: *"`track` permite ao
  Angular reaproveitar os nós do DOM em vez de recriar a lista."*
- **ID7 Pipes:** `DatePipe` em `features/dashboard/christmas-countdown.card.html`.
- **ID8 `@defer`:** `dashboard.page.html` (`on viewport`) e `draw-result.page.html` (`on interaction` — o
  resultado só é carregado quando o usuário clica para revelar).

### RA3 — Data binding com Signals
- **ID9 One-way com Signals:** `AuthService` (`signal` da sessão + `computed` como `isAuthenticated` e `displayName`); templates leem
  `displayName()` direto, sem subscribe.
- **ID10 Event binding:** `(click)` em `draw-result.page.html` e `manage-group.page.html`.
- **ID11 Two-way com `model()`:** `group-view.page.ts` e `manage-group.page.ts`.
- **ID12 `effect()`:** `connectivity.service.ts` e `authenticated-layout.page.ts` (reagem à mudança de
  conexão/sessão).

### RA4 — Comunicação e injeção de dependência
- **ID13 `input()`/`output()`:** `src/app/features/group/manage/participant-row.ts` — recebe o participante
  e emite o pedido de remoção para o pai.
- **ID14 `inject()`:** todos os services e páginas usam `inject()`, nunca construtor. ESLint `prefer-inject`.

### RA5 — Roteamento
- **ID15:** `provideRouter(routes, withComponentInputBinding())` em `src/app/app.config.ts`.
- **ID16 Params como inputs:** `join-group.page.ts` (`token`) e `draw-result.page.ts` (`groupId`).
- **ID17 Rotas filhas:** `children` em `app.routes.ts` e `group.routes.ts` (com `<router-outlet>` no
  `group-layout`).
- **ID18 Guards e Resolvers funcionais:** `core/guards/*.guard.ts` são funções `CanActivateFn`;
  `core/resolvers/*.resolver.ts` são `ResolveFn`. Detalhe para defender: o controle de admin é um **guard**,
  porque um resolver que devolve `UrlTree` não redireciona.

### RA6 — Integração com back-end
- **ID19 API pública:** `holiday.service.ts` faz GET na **BrasilAPI** (feriados) via `HttpClient`.
- **ID20 Auth JWT:** Supabase Auth em `auth.service.ts`; o `supabase-client.service.ts` cria o cliente que
  anexa o JWT em cada chamada.
- **ID21 CRUD:** `group.service.ts` (criar grupo, listar, editar wishlist, remover participante).
- **ID22 Interceptors:** `core/interceptors/error.interceptor.ts` centraliza erros. **Pergunta provável:**
  *"E o interceptor de token?"* → *"O supabase-js usa o `fetch` próprio e não passa pelo `HttpClient`, então
  um interceptor não enxergaria essas requisições; o próprio cliente anexa o JWT. O único tráfego `HttpClient`
  é a BrasilAPI, que é pública."*
- **ID23 Reactive Forms:** `login.page.ts`, `register.page.ts`, `create-group.page.ts` — validadores,
  mensagens e botão `[disabled]` enquanto inválido.
- **ID24 `toSignal()`:** `holiday.service.ts` converte o Observable do `HttpClient` em Signal com `toSignal()`.

### RA7 — Git e entrega
- **ID25 Gitflow:** `main` (produção) + `develop` (integração) + branches por fase `gsd/phase-*`.
- **ID26 Pull Requests:** histórico no GitHub — feature → `develop`, depois `develop` → `main` (ex.: #32,
  #33, #34).
- **ID27 Build + deploy automático:** `.github/workflows/ci.yml` roda lint, testes, build e verifica que
  nenhuma chave secreta foi parar no bundle; a Vercel (`vercel.json`) publica preview a cada PR e produção a
  cada merge na `main`.

### RA8 — Documentação e qualidade
- **ID28 Kanban:** `docs/kanban.md` + Issues no GitHub.
- **ID29 ER + Design System:** seções "Modelagem de Dados" (Mermaid) e "Design System" do `README.md`.
- **ID30 Spec:** `docs/utf-secret.spec.md`.
- **ID31 MCP e Skills:** `docs/sdd.md` §1.
- **ID32 Testes unitários:** `src/app/core/draw-algorithm.spec.ts` (ninguém tira a si mesmo, todos dão e
  recebem exatamente uma vez) e demais `.spec.ts`. Rodar com `npm test`.

## 5. As perguntas difíceis (e as respostas)

**"Como você garante que o admin não vê os pares?"**
Abrir `supabase/migrations/0003_rls_policies.sql`, política `"draw: ver apenas meu proprio par"`:
`giver_id in (select private.my_participant_ids())`. Não existe nenhuma regra que mencione `admin_id`, e não
há política de INSERT/UPDATE/DELETE para usuários — só a Edge Function (com `service_role`) escreve.
Evidência de teste em `docs/draw-privacy-verification.md` e `docs/db-rls-verification.md`.

**"Por que as funções ficam no schema `private`?"**
Uma política em `participant` que consulta `participant` causa *recursão infinita* (erro 42P17). As funções
`SECURITY DEFINER` em `0002_private_helpers.sql` resolvem isso. Ficam em `private` e não em `public` para não
serem expostas pela API REST do Supabase.

**"Como funciona o sorteio? Pode alguém tirar a si mesmo?"**
`supabase/functions/run-draw/index.ts` + `src/app/core/draw-algorithm.ts`: embaralha com **Fisher-Yates** e
liga em círculo — `p[i]` presenteia `p[(i+1) % n]`. Numa permutação, `p[i]` nunca é igual a `p[i+1]`, então
**é impossível** tirar a si mesmo (estrutural, não probabilístico). Observação honesta: um ciclo único nunca
gera pares mútuos (A↔B), o que é desejável, mas não é um sorteio uniforme entre todas as combinações.

**"E se dois admins clicarem 'Sortear' ao mesmo tempo?"**
A função faz `UPDATE group SET status='drawing' WHERE status='open'` (linhas ~90–97 do `run-draw`). Só uma
chamada altera a linha; a outra recebe zero linhas e aborta. Além disso, `UNIQUE (group_id, giver_id)` na
tabela `draw`. Não depende de botão desabilitado.

**"Quais regras de negócio existem e onde estão?"**
Mínimo de 3 participantes (`min_participants`, checado no `run-draw` e no `computed` `podeSortear` de
`manage-group.page.ts`); sorteio único e irreversível (máquina de estados `open → drawing → closed`);
ninguém entra depois do sorteio (RPC de join checa `status`); wishlist editável até fechar.

**"Por que não NgRx?"**
Quatro entidades e um algoritmo não justificam uma store; Signals em services resolvem com menos código.

**"Débito técnico conhecido?"**
O INSERT dos pares e o `status='closed'` na Edge Function não estão na mesma transação (comentário no topo
de `run-draw/index.ts`). A solução seria uma RPC plpgsql transacional — registrada como V2-01.

## 6. Comandos úteis na demo

```bash
npm start            # app local em http://localhost:4200
npm test             # testes unitários (Vitest)
npm run lint         # ESLint com as regras da rubrica
npm run build        # build de produção (precisa SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY)
```
