# UTF-Secret - Especificação Técnica de Componentes e Services

> Atende ao RA8-ID30 de [`docs/checklist.md`](checklist.md). Todas as assinaturas abaixo foram
> conferidas contra o código em `src/app/`; quando o código mudar, este documento muda junto.

## 1. Propósito e escopo

Este documento detalha a arquitetura dos **componentes Standalone** e dos **Services** do front-end Angular
do UTF-Secret: dependências, estado (Signals), entradas e saídas, rotas, guards, resolvers, interceptor e o
fluxo do sorteio. Cada item cita o indicador da rubrica que demonstra.

Não especifica: o schema SQL e as políticas RLS (ver [`docs/sdd.md`](sdd.md) §3 e §6 e
[`docs/db-rls-verification.md`](db-rls-verification.md)), nem requisitos de produto (ver [`docs/prd.md`](prd.md)).

## 2. Nota de processo

O ID30 pede a especificação "antes da geração do código-fonte". Neste projeto isso aconteceu, mas **em outros
arquivos**: os artefatos do GSD (`.planning/phases/*/XX-CONTEXT.md` e `XX-PLAN.md`) foram commitados
**antes** de cada implementação, e o histórico git prova a ordem. Este `.spec.md` foi escrito depois do código
e **descreve o que foi construído**; ele não finge ter precedido a implementação.

Exemplos reais de contexto e plano precedendo o código (`git log --oneline`):

| Fase | Commit de contexto | Commit de plano | Primeiro commit de código |
|:-----|:-------------------|:----------------|:--------------------------|
| 3 (grupos e API pública) | `3ea8c5a docs(03): capture phase context` | `5c27c7f docs(03): create phase plan` | `85f87b4 feat(03-01): implement PT-BR translation map for join RPC error codes` |
| 4 (sorteio) | `19041b1 docs(04): capture phase context` | `bea2d16 docs(04): create phase plan` | `ee6ce6c feat(04-01): add pure draw algorithm with ENG-02 self-gift/matching proofs` |
| 5 (PWA e entrega) | `2c2e549 docs(05): capture phase context` | `092056a docs(05): create phase plan` | commits `feat(05-01)` em diante |

Além disso, [`docs/sdd.md`](sdd.md) (§4 contratos, §5 estrutura e rotas, §7 algoritmo) existia antes de qualquer
linha de Angular e foi atualizado quando o código precisou divergir.

## 3. Arquitetura macro

```
src/app/
  core/       services, guards, resolvers, interceptors, models, funções puras (algoritmo, traduções)
  features/   uma pasta por tela: auth, dashboard, group, draw, shell
  shared/     reservado a componentes e pipes reutilizáveis (ainda sem conteúdo)
```

- **Estado em Signals dentro de services.** Cada service escreve em `signal()` privados e expõe
  `asReadonly()` / `computed()`. Não há NgRx: quatro entidades e um algoritmo não justificam uma store.
- **Gate mecânico:** `npm run check:no-rxjs-state` falha se `BehaviorSubject` ou `new Subject` aparecer em
  `src/app`. RxJS aparece apenas na ponte `toSignal()` do `HolidayService` e no `catchError` do interceptor.
- **Sem `NgModule`.** Todo componente é Standalone; a configuração fica em `app.config.ts`
  (`provideRouter(routes, withComponentInputBinding())`, `provideHttpClient(withInterceptors([errorInterceptor]))`,
  `provideAppInitializer`, `provideServiceWorker`).
- **Privacidade no banco.** O front-end nunca decide quem pode ver um par; a RLS decide. Ver §8.

## 4. Services

Todos usam `@Injectable({ providedIn: 'root' })` e obtêm dependências com `inject()`, **nunca por injeção de
construtor** (RA4-ID14).

### 4.1 `SupabaseClientService`

- **Arquivo:** `core/services/supabase-client.service.ts`
- **Dependências:** nenhuma (importa `environment`).
- **Estado:** nenhum. Expõe `readonly client: SupabaseClient`, criado com a chave **publicável**.
- **Responsabilidade:** dono único do cliente Supabase; por ser injetável (e não um `const` global), pode ser
  mockado nos testes.
- **Demonstra:** RA4-ID14.

### 4.2 `AuthService`

- **Arquivo:** `core/services/auth.service.ts` (+ `auth.service.spec.ts`)
- **Dependências:** `inject(SupabaseClientService).client`.
- **Estado:** `_session` e `_resolved` privados (`signal`); expõe `session` (readonly) e os `computed`
  `status` (`'loading' | 'authenticated' | 'unauthenticated'`), `user`, `isAuthenticated`, `displayName`, `email`.
- **Métodos:** `initialize(): Promise<void>`, `signUp(nome, email, senha): Promise<AuthResult>`,
  `signIn(email, senha): Promise<AuthResult>`, `signOut(): Promise<AuthResult>`, com
  `AuthResult = { error: string | null }` (mensagens já traduzidas por `auth-error-messages.ts`).
- **Detalhes:** o construtor registra **uma única** `onAuthStateChange`; `initialize()` roda em
  `provideAppInitializer` antes da primeira navegação, o que permite um `authGuard` síncrono. `signUp` envia
  `options.data.display_name`, chave que o trigger `handle_new_user` lê.
- **Demonstra:** RA3-ID9 (signals e computed), RA6-ID20 (autenticação real).

### 4.3 `GroupService`

- **Arquivo:** `core/services/group.service.ts`
- **Dependências:** `SupabaseClientService`, `AuthService`.
- **Estado privado:** `_administered`, `_participated`, `_participants`, `_currentGroup`. **Exposto:**
  `administered`, `participated`, `participants`, `currentGroup` (readonly) e o `computed` `meuParticipante`.
- **Métodos:** `refreshDashboard()`, `createGroup(name)`, `loadGroup(groupId)`, `refreshParticipants(groupId)`,
  `removeParticipant(...)`, `updateWishList(...)`, `previewByToken(token)`, `joinByToken(token)`. Todos devolvem
  `{ ..., error: string | null }` com mensagem em PT-BR.
- **Detalhes:** `createGroup` chama a RPC `create_group`; `previewByToken` e `joinByToken` chamam as RPCs
  `preview_group_by_token` e `join_group_by_token`, cujo código de retorno é traduzido por
  `join-error-messages.ts`. `refreshDashboard` faz uma query só: as duas políticas de SELECT em `group` são
  combinadas por OR pela RLS e a separação admin/participante é feita no cliente.
- **Responsabilidade:** único ponto de acesso a `group` e `participant`.
- **Demonstra:** RA3-ID9, RA4-ID14, RA6-ID20.

### 4.4 `HolidayService`

- **Arquivo:** `core/services/holiday.service.ts`
- **Dependências:** `inject(HttpClient)`.
- **Estado:** `feriados = toSignal(http.get<Holiday[]>(brasilapi.../feriados/v1/{ano}).pipe(catchError(() => of(null))), { initialValue: undefined })`
  (privado). Expõe os `computed` `natal` e `diasAteONatal`.
- **Semântica de três estados:** `undefined` = carregando, `null` = falhou, valor = carregado.
- **Responsabilidade:** consumir a API pública BrasilAPI e entregar a contagem para o Natal; a falha vira
  estado de UI e não quebra o dashboard.
- **Demonstra:** RA6-ID19 (consumo de API pública), RA6-ID24 (`toSignal()`), RA3-ID9.

### 4.5 `DrawService`

- **Arquivo:** `core/services/draw.service.ts` (+ `draw.service.spec.ts`)
- **Dependências:** `SupabaseClientService`.
- **Estado:** nenhum.
- **Métodos:** `runDraw(groupId): Promise<{ error: string | null }>` invoca a Edge Function `run-draw` e traduz
  o `code` do corpo da resposta (via `error.context.json()` de um `FunctionsHttpError`) com `translateDrawError`;
  `getMyResult(groupId): Promise<{ result: DrawResult | null; error: string | null }>` lê `draw` com join
  embutido `participant!draw_receiver_id_fkey(display_name, wish_list)`. A FK é nomeada porque `draw` tem
  duas chaves para `participant`.
- **Responsabilidade:** nenhuma lógica de sorteio no cliente; apenas invocar e traduzir. A privacidade vem da RLS.
- **Demonstra:** RA6-ID19/ID20, RA8-ID32 (spec).

### 4.6 `ConnectivityService`

- **Arquivo:** `core/services/connectivity.service.ts` (+ `connectivity.service.spec.ts`)
- **Dependências:** `inject(DOCUMENT)`, `inject(DestroyRef)`.
- **Estado:** `_online = signal(navigator.onLine)`; expõe `online` (readonly). Os listeners `online`/`offline`
  do `window` são o único escritor e são removidos em `DestroyRef.onDestroy`.
- **Efeito:** um `effect()` lê `online()` e define/remove `data-offline` em `<html>`, efeito colateral reativo
  observável no DevTools.
- **Responsabilidade:** expor o status de conexão para o banner de offline do PWA.
- **Demonstra:** RA3-ID12 (`effect()`), RA1 (PWA, estado offline).

## 5. Componentes Standalone

**Nenhum** componente usa `NgModule`. **Todos** os templates usam o novo controle de fluxo (`@if`, `@for` com
`track`, `@switch`); não há `*ngIf` nem `*ngFor`. Dependências são obtidas com `inject()`; entradas, com
`input()` / `input.required()`; saídas, com `output()`. Parâmetros de rota chegam como inputs graças a
`withComponentInputBinding` (RA5-ID16).

### 5.1 `AuthenticatedLayoutPage`

- **Arquivo:** `features/shell/authenticated-layout.page.ts` - selector `app-authenticated-layout`
- **imports:** `RouterOutlet`, `HlmButton`
- **Estado:** `online` (de `ConnectivityService`), `displayName` (de `AuthService`), `saindo = signal(false)`,
  `viewChild.required('mainContent')`; um `effect()` redireciona para `/login` se a sessão acabar.
- **Rota:** componente da rota-pai `''` com `canActivate: [authGuard]` em `app.routes.ts`.
- **Responsabilidade:** header com nome do produto, nome do usuário e botão Sair; banner de offline; skip link
  funcional que move o foco para o `<main>`; container `max-w-md` que alarga em `lg:`.
- **Demonstra:** RA5-ID17 (layout com `router-outlet`), RA3-ID12 (consome o efeito de conectividade), WCAG 2.4.1.

### 5.2 `LoginPage`

- **Arquivo:** `features/auth/login/login.page.ts` - selector `app-login`
- **imports:** `ReactiveFormsModule`, `RouterLink`, `HlmButton`, `HlmCard*`, `HlmInput`, `HlmLabel`
- **Estado:** `form` (FormBuilder: `email` obrigatório/válido, `senha` obrigatória, mínimo 6), `submetido`,
  `enviando`, `erroApi` (signals).
- **Rota:** `/login`. Lê `returnUrl` da query string.
- **Responsabilidade:** autenticar; botão desabilitado enquanto o form é inválido ou está enviando; mensagens de
  validação por campo.
- **Demonstra:** RA6-ID23 (Reactive Forms), RA6-ID20.

### 5.3 `RegisterPage`

- **Arquivo:** `features/auth/register/register.page.ts` - selector `app-register`
- **imports:** igual ao login.
- **Estado:** `form` (`nome` mínimo 2, `email`, `senha` mínimo 6), `submetido`, `enviando`, `erroApi`.
- **Rota:** `/register`.
- **Responsabilidade:** criar conta via `AuthService.signUp`.
- **Demonstra:** RA6-ID23, RA6-ID20.

### 5.4 `DashboardPage`

- **Arquivo:** `features/dashboard/dashboard.page.ts` - selector `app-dashboard`
- **imports:** `RouterLink`, `HlmButton`, `HlmCard*`, `ChristmasCountdownCard`
- **Estado:** `displayName`, `email`, `administrados`, `participados` (referências aos signals dos services),
  `carregando`, `erro` (signals locais).
- **Rota:** `/dashboard` (filha do layout autenticado).
- **Responsabilidade:** saudação, card de contagem para o Natal, listas "Grupos que administro" e "Grupos que
  participo" (`@for` com `track` e `@empty`).
- **Demonstra:** RA2-ID8 (`@defer on viewport`), RA3-ID9, RA2-ID5/ID6.

### 5.5 `ChristmasCountdownCard`

- **Arquivo:** `features/dashboard/christmas-countdown.card.ts` - selector `app-christmas-countdown`
- **imports:** `DatePipe`, `HlmCard*`
- **Estado:** `dias = holidays.diasAteONatal`, `natal = holidays.natal` (somente leitura).
- **Rota:** nenhuma; renderizado dentro de `@defer (on viewport)` no dashboard, de modo que o GET à BrasilAPI
  só ocorre quando o card entra na viewport.
- **Responsabilidade:** mostrar os três estados (carregando, erro, valor) e a data do feriado com `DatePipe`.
- **Demonstra:** RA2-ID8, RA6-ID24, RA2-ID7 (pipes).

### 5.6 `GroupLayoutPage`

- **Arquivo:** `features/group/group-layout/group-layout.page.ts` - selector `app-group-layout`
- **imports:** `RouterOutlet`, `RouterLink`, `HlmButton`
- **Estado:** nenhum.
- **Rota:** `/group` (`groupRoutes`, carregado por `loadChildren`); as rotas filhas `create`, `:id/manage` e
  `:id` renderizam no `router-outlet` interno.
- **Responsabilidade:** moldura comum das telas de grupo com link "Voltar ao painel".
- **Demonstra:** RA5-ID17 (rotas filhas aninhadas).

### 5.7 `CreateGroupPage`

- **Arquivo:** `features/group/create/create-group.page.ts` - selector `app-create-group`
- **imports:** `ReactiveFormsModule`, `HlmButton`, `HlmCard*`, `HlmInput`, `HlmLabel`
- **Estado:** `form` (`name` obrigatório, 3 a 60 caracteres, espelhando o `check` do banco), `submetido`,
  `enviando`, `erroApi`, `grupoCriado = signal<Group | null>`, `copiado`; `linkConvite = computed(...)` monta
  `window.location.origin + '/join/' + invite_token`.
- **Rota:** `/group/create`.
- **Responsabilidade:** criar o grupo e, no estado de sucesso, exibir o link de convite copiável.
- **Demonstra:** RA6-ID23, RA3-ID9.

### 5.8 `JoinGroupPage`

- **Arquivo:** `features/group/join/join-group.page.ts` - selector `app-join-group`
- **imports:** `RouterLink`, `HlmButton`, `HlmCard*`
- **Inputs:** `token = input.required<string>()` (vem do param `:token` por `withComponentInputBinding`).
- **Estado:** `carregando`, `preview`, `erro`, `entrando`. Um `effect()` recarrega o preview quando `token()`
  muda (um `input.required` ainda não está populado no construtor).
- **Rota:** `/join/:token` (plana, dentro do layout autenticado, portanto protegida pelo `authGuard`).
- **Responsabilidade:** mostrar o nome do grupo convidado e confirmar a entrada via `joinByToken`.
- **Demonstra:** RA5-ID16 (param como input), RA3-ID12 (`effect()`).

### 5.9 `GroupViewPage` (tela do participante)

- **Arquivo:** `features/group/view/group-view.page.ts` - selector `app-group-view`
- **imports:** `FormsModule`, `RouterLink`, `ParticipantRow`, `HlmButton`, `HlmCard*`, `HlmLabel`
- **Inputs:** `id = input.required<string>()`.
- **Estado:** `grupo`, `participantes`, `meuParticipante` (dos services), `souAdmin` e `podeVerResultado`
  (`computed`), `carregando`, `salvandoWishlist`, `wishlistSalva`, `wishList` (two-way com `model`).
- **Rota:** `/group/:id`, com `canActivate: [memberGuard]`.
- **Responsabilidade:** nome e status do grupo, colegas (somente leitura), edição da própria lista de desejos e
  acesso ao resultado quando o grupo está `closed`.
- **Demonstra:** RA3-ID9, RA3-ID11 (`model`), RA5-ID16, RA5-ID18.

### 5.10 `ManageGroupPage` (tela do administrador)

- **Arquivo:** `features/group/manage/manage-group.page.ts` - selector `app-manage-group`
- **imports:** `FormsModule`, `RouterLink`, `ParticipantRow`, `HlmButton`, `HlmCard*`, `HlmInput`, `HlmLabel`
- **Inputs:** `id = input.required<string>()` (param) e `group = input.required<Group>()` (valor do `groupResolver`).
- **Estado:** `grupoAtual`, `souAdmin`, `faltamParaSortear`, `podeSortear` (`computed`); `carregando`, `erro`,
  `removendoId`, `copiado`, `confirmandoSorteio`, `sorteando`, `salvandoWishlist`, `wishlistSalva` (`signal`);
  `wishList = model<string>('')`.
- **Rota:** `/group/:id/manage`, com `canActivate: [adminGuard]` e `resolve: { group: groupResolver }`.
- **Responsabilidade:** link de convite, lista de participantes com remoção confirmada, botão "Realizar sorteio"
  habilitado só com participantes suficientes e confirmação "Sim, sortear" por ser irreversível; região
  `aria-live` para "Sorteando...". **Esta tela não recebe nenhum dado de pares.**
- **Demonstra:** RA3-ID10/ID11, RA4-ID13 (usa `ParticipantRow`), RA5-ID16/ID18.

### 5.11 `ParticipantRow`

- **Arquivo:** `features/group/manage/participant-row.ts` - selector `app-participant-row`
- **imports:** `HlmButton`
- **Inputs:** `participant = input.required<Participant>()`, `confirmando = input(false)`,
  `podeRemover = input(false)`.
- **Outputs:** `pedirRemocao = output<string>()`, `confirmarRemocao = output<string>()`,
  `cancelarRemocao = output<void>()`.
- **Template:** o botão "Remover" tem `[attr.aria-label]="'Remover ' + participant().display_name"`.
- **Responsabilidade:** uma linha da lista, com confirmação inline "Remover? Sim / Não". Reutilizado pela tela do
  admin (com remoção) e pela do participante (`podeRemover=false`).
- **Demonstra:** RA4-ID13 (`input()`/`output()` no lugar de decorators), RA2-ID6.

### 5.12 `DrawResultPage`

- **Arquivo:** `features/draw/result/draw-result.page.ts` - selector `app-draw-result`
- **imports:** `RouterLink`, `HlmButton`, `HlmCard*`
- **Inputs:** `groupId = input.required<string>()` (param `:groupId`) e
  `resultado = input.required<DrawResultState>()` (valor do `drawResultResolver`); `resultadoPronto` é um
  `computed` que extrai o resultado quando `status === 'ready'`.
- **Rota:** `/draw/:groupId/result`, com `canActivate: [memberGuard]` e `resolve: { resultado: drawResultResolver }`.
- **Responsabilidade:** `@switch` entre `not-drawn`, `missing` e `ready`; no estado `ready`, um
  `@defer (on interaction)` cujo `@placeholder` é o botão "Revelar meu amigo secreto": o nome e a lista de
  desejos só entram no DOM depois do clique deliberado.
- **Demonstra:** RA2-ID8 (`@defer on interaction`), RA5-ID16, RA5-ID18, RA2-ID5 (`@switch`).

### 5.13 Raiz: `App`

`app.ts` (selector `app-root`, `imports: [RouterOutlet]`) só hospeda o `router-outlet`. O arquivo de rotas
`features/group/group.routes.ts` não é componente: define as rotas filhas de `/group`.

## 6. Guards, Resolvers e Interceptors funcionais

Rotas em `app.routes.ts` e `features/group/group.routes.ts`. Todos são funções (`CanActivateFn`, `ResolveFn`,
`HttpInterceptorFn`) que usam `inject()`.

| Item | Arquivo | Comportamento |
|:-----|:--------|:--------------|
| `authGuard` | `core/guards/auth.guard.ts` | Síncrono. Libera se `isAuthenticated()`; senão devolve `UrlTree` para `/login` com `returnUrl`. Aplicado uma vez, na rota-pai do layout autenticado. |
| `adminGuard` | `core/guards/admin.guard.ts` | Assíncrono. Chama `loadGroup(id)`; libera só se `group.admin_id === auth.user().id`; senão `UrlTree` para `/dashboard`. |
| `memberGuard` | `core/guards/member.guard.ts` | Assíncrono. Lê `paramMap.get('id') ?? paramMap.get('groupId')`; libera se a RLS devolveu o grupo (admin ou participante), pois as duas políticas de SELECT são combinadas por OR. |
| `groupResolver` | `core/resolvers/group.resolver.ts` | `ResolveFn<Group \| UrlTree>`. Carrega o grupo para `/group/:id/manage`. |
| `drawResultResolver` | `core/resolvers/draw-result.resolver.ts` | `ResolveFn<DrawResultState \| UrlTree>`. Se o grupo não está `closed`, devolve `{ status: 'not-drawn' }`; se não há linha em `draw`, `{ status: 'missing' }`; senão `{ status: 'ready', result }`. |
| `errorInterceptor` | `core/interceptors/error.interceptor.ts` | `HttpInterceptorFn`. Normaliza falhas em `HttpFalha { status, mensagem }`, registra com `console.error('[HTTP]', ...)` e re-lança para o `catchError` do `HolidayService` decidir o estado de UI. |

**Indicadores:** RA5-ID18 (guards e resolvers funcionais) e RA6-ID22 (interceptor funcional, registrado com
`provideHttpClient(withInterceptors([errorInterceptor]))`).

**Desvio documentado em relação ao plano da Fase 3 (D-08).** O plano original colocava a checagem de admin
dentro do `groupResolver`, devolvendo `UrlTree`. Na verificação manual, um não-admin conseguiu abrir a tela de
gestão: o valor devolvido por um `ResolveFn` **não redireciona**, apenas vira `route.data` (o componente recebia
um `UrlTree` onde esperava um `Group`). Por isso a checagem foi movida para o `adminGuard`, que roda
em `canActivate` e cujo `UrlTree` é o contrato oficial de redirecionamento. O `UrlTree` que sobrou no resolver
cobre apenas o caso degenerado (rota sem `:id` ou grupo que sumiu entre o guard e o resolver). O custo é uma
segunda chamada a `loadGroup` por navegação, redundante mas inofensiva. Regra do projeto: **toda checagem de
acesso vai em `CanActivateFn`**.

**Escopo real do interceptor.** O `supabase-js` usa o `fetch` nativo e nunca passa pelo `HttpClient`, então o
interceptor cobre exclusivamente a chamada à BrasilAPI. O cliente Supabase anexa o JWT sozinho, portanto não há
token a injetar.

## 7. Modelo de dados e contratos

Definidos em `core/models/group.model.ts`, copiados de [`docs/sdd.md`](sdd.md) §4:

```typescript
export type GroupStatus = 'open' | 'drawing' | 'closed';

export interface Group {
  id: string; name: string; admin_id: string; status: GroupStatus;
  invite_token: string; min_participants: number; created_at: string;
}
export interface Participant {
  id: string; group_id: string; user_id: string; display_name: string;
  wish_list?: string; joined_at: string;
}
export interface Draw {
  id: string; group_id: string; giver_id: string; receiver_id: string; created_at: string;
}
export interface DrawResult { id: string; receiver: Pick<Participant, 'display_name' | 'wish_list'>; }
export interface JoinResult { code: 'OK' | 'INVALID_TOKEN' | 'GROUP_CLOSED' | 'ALREADY_MEMBER'; group_id?: string; }
export interface GroupPreview { name: string; status: GroupStatus; }
```

`Draw.giver_id` e `Draw.receiver_id` referenciam `participant.id`, não `user_id`. `GroupPreview` traz somente
nome e status de propósito: acrescentar participantes ou contagem transformaria o `invite_token` num vazamento.

## 8. Fluxo do sorteio

1. O admin confirma "Sim, sortear" em `ManageGroupPage`; `DrawService.runDraw(groupId)` invoca a Edge Function
   `run-draw` (`supabase/functions/run-draw`). **Nenhum sorteio roda no navegador.**
2. A função verifica o usuário e que ele é o admin do grupo (`NOT_ADMIN`), depois faz um **UPDATE condicional
   atômico** `status = 'drawing' WHERE status = 'open'`. Se zero linhas forem afetadas, devolve `ALREADY_DRAWN`
   (409). Isso, somado a `UNIQUE (group_id, giver_id)`, impede o sorteio duplo; um botão desabilitado não bastaria.
3. Carrega os participantes e exige o mínimo (`NOT_ENOUGH_PARTICIPANTS`).
4. **Fisher-Yates** embaralha os ids; o **pareamento circular** faz `p[i]` presentear `p[(i+1) mod n]`
   (`core/draw-algorithm.ts` e seu espelho em `supabase/functions/run-draw/draw-algorithm.ts`).
5. Um INSERT multi-linha grava os pares em `draw` com a `service_role` key e depois o grupo vai para `closed`.
   Se algo falha antes disso, o status volta para `open`.

**Garantia estrutural de zero autossorteio.** Numa permutação, `p[i] != p[(i+1) mod n]` para `n >= 2`, então
ninguém tira a si mesmo, sem depender de sorte. Um único ciclo hamiltoniano é um subconjunto estrito dos
desarranjos: nunca produz pares mútuos (A tira B e B tira A) para `n >= 3`, o que é desejável aqui, mas não é um
desarranjo uniformemente aleatório. Com `n = 2` a troca mútua é inevitável (mas o mínimo do produto é 3).

**Privacidade.** A única política de SELECT em `draw` é `giver_id in (select private.my_participant_ids())`.
Nenhuma política referencia `admin_id` e não há política de INSERT/UPDATE/DELETE para `authenticated`.

**Dívida técnica conhecida (V2-01).** O INSERT dos pares e o UPDATE `status = 'closed'` não são atômicos entre
si. O remédio seria uma RPC plpgsql transacional; é aceito para o MVP e rastreado como V2-01 em
`.planning/REQUIREMENTS.md`.

## 9. Estratégia de testes

Vitest, via `npm test`. Arquivos `.spec.ts` existentes (contagem de `it(...)` no momento da escrita):

| Arquivo | Testes | O que cobre |
|:--------|:------:|:------------|
| `core/draw-algorithm.spec.ts` | 7 | `shuffle` não muta a entrada e preserva o multiset; `pairCircular` devolve n pares, **nunca produz autossorteio** e **produz perfect matching** (n de 2 a 12, 200 execuções cada), caso n=2 e array vazio |
| `core/draw-error-messages.spec.ts` | 7 | tradução dos códigos da Edge Function (`NOT_ENOUGH_PARTICIPANTS`, `ALREADY_DRAWN`, `NOT_ADMIN`, `GROUP_NOT_FOUND`) e fallbacks |
| `core/join-error-messages.spec.ts` | 6 | tradução dos códigos da RPC de entrada (`ALREADY_MEMBER`, `GROUP_CLOSED`, `INVALID_TOKEN`) |
| `core/dias-ate-natal.spec.ts` | 5 | cálculo de dias até o Natal com `date-fns` |
| `core/services/auth.service.spec.ts` | 6 | estados de `status`, `displayName`, `display_name` no `signUp`, tradução de erro no `signIn` e uma única `onAuthStateChange` |
| `core/services/draw.service.spec.ts` | 4 | `runDraw` e a leitura de `code` do `FunctionsHttpError`, `getMyResult` |
| `core/services/connectivity.service.spec.ts` | 6 | `online()` inicial, eventos `online`/`offline`, `effect()` que define e remove `data-offline`, sem setter público |
| `core/guards/auth.guard.spec.ts` | 3 | libera autenticado; `UrlTree` para `/login` com `returnUrl` |
| `core/guards/admin.guard.spec.ts` | 4 | libera admin; bloqueia não-admin, grupo nulo e rota sem `:id` |
| `core/guards/member.guard.spec.ts` | 8 | libera admin e membro, aceita `groupId`, bloqueia estranho; inclui testes de roteamento reais |
| `core/resolvers/group.resolver.spec.ts` | 2 | devolve o `Group`; `UrlTree` quando nulo |
| `core/resolvers/draw-result.resolver.spec.ts` | 5 | estados `ready`, `not-drawn`, `missing` e redirecionamentos |
| `features/shell/authenticated-layout.page.spec.ts` | 4 | skip link é o primeiro focável, chama `preventDefault`, move o foco para `<main id="main-content">` e não altera a URL |
| `features/group/view/group-view-reveal-link.spec.ts` | 5 | predicado `podeVerResultadoDoSorteio` |
| `app.spec.ts` | 2 | criação do componente raiz |

Os testes de **regra de negócio** (RA8-ID32) são: `draw-algorithm.spec.ts` (ninguém se sorteia, todos dão e
recebem exatamente uma vez), os testes de mensagens de erro (regras de mínimo, sorteio único e convite),
`member.guard`/`admin.guard`/`group.resolver`/`draw-result.resolver` (quem pode ver o quê) e
`connectivity.service.spec.ts` (estado offline). A privacidade do banco (RLS) é verificada por consultas reais
documentadas em [`docs/draw-privacy-verification.md`](draw-privacy-verification.md) e
[`docs/db-rls-verification.md`](db-rls-verification.md), não por testes unitários.
