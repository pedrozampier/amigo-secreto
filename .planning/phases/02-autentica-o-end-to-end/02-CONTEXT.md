# Phase 2: Autenticação End-to-End - Context

**Gathered:** 2026-10-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Qualquer pessoa cria conta, entra, permanece logada após F5, e sai — com o estado de sessão
como única fonte de verdade reativa (Signal), e rotas protegidas redirecionando quem não
está autenticado via guard funcional.

Cobre **AUTH-01..AUTH-06**. Entrega: `SupabaseClientService`, `AuthService`, `authGuard`,
páginas `/login` e `/register`, rota de layout autenticado com logout, e uma `/dashboard`
placeholder que serve apenas de alvo protegido.

**Fora desta fase:** grupos, participantes, wishlist, convites, sorteio (Fases 3–4);
interceptors funcionais e `toSignal()` (Fase 3, tráfego BrasilAPI — veja D-07); PWA e
auditoria de acessibilidade (Fase 5). A `/dashboard` real é GRP-* na Fase 3.

</domain>

<decisions>
## Implementation Decisions

### Inicialização de sessão e o F5 (critério de aceite 3 — sem flash de /login)
- **D-01:** Usar **`provideAppInitializer`** no `app.config.ts` para resolver
  `supabase.auth.getSession()` **antes** do router navegar. Quando a primeira navegação
  ocorre, o estado já é `'authenticated'` ou `'unauthenticated'` — nunca `'loading'`.
  Consequência: o `authGuard` fica síncrono e trivial (um `if`), defensável em banca.
  Rejeitado: guard assíncrono esperando o signal sair de `'loading'` (complica todo guard
  futuro, incluindo o `adminGuard` da Fase 3).
- **D-02:** `onAuthStateChange` é conectado **uma única vez**, dentro do `AuthService`,
  atualizando o signal de sessão. Nunca duplicar a subscription em componentes
  (PITFALLS.md Pitfall 8).
- **D-03:** O signal de status de 3 valores (`'loading' | 'authenticated' | 'unauthenticated'`)
  continua existindo e é exposto — `'loading'` é o valor inicial antes do initializer
  resolver. Com D-01 ele nunca é observado pelo guard, mas é a forma correta do estado
  exigida pelo critério de aceite 2 do ROADMAP.

### Forma do estado no AuthService
- **D-04:** **Um único signal privado** `_session = signal<Session | null>(null)`, exposto
  como readonly, e **todo o resto derivado com `computed()`**: `status`, `user`,
  `isAuthenticated`. Uma fonte de verdade, o resto derivado — é exatamente o que ID9 pede.
  Base já escrita em `.planning/research/ARCHITECTURE.md` (~linha 470).
  Rejeitado: dois signals escritos independentemente (risco de dessincronia).
- **D-05:** Cliente Supabase vive num **`SupabaseClientService` injetável**
  (`@Injectable({providedIn:'root'})` em `core/services/supabase-client.service.ts`,
  expondo `.client`), consumido via `inject()`. Mockável no Vitest para os `.spec.ts` da
  Fase 4 e coerente com ID14. Rejeitado: `export const supabase = createClient(...)`
  (singleton global não-injetável, difícil de mockar).
- **D-06:** Superfície do `AuthService` nesta fase é **só o essencial**: `signUp()`,
  `signIn()`, `signOut()` + os signals de estado. **Sem** carregar a linha de `profile` do
  banco — o header autenticado usa o que já está na sessão (`user.email` /
  `user_metadata.display_name`), evitando uma query no boot.

### Posicionamento de indicadores do checklist
- **D-07:** **ID24 (`toSignal()`/`toObservable()`) NÃO é demonstrado nesta fase.** Com D-01,
  o `AuthService` não precisa da ponte RxJS, e forçá-la criaria código que ninguém consome.
  ID24 fica na Fase 3 (API-04, BrasilAPI via `HttpClient`), como o ROADMAP já mapeia.
- **D-08:** `app.config.ts` precisa ganhar **`provideRouter(routes, withComponentInputBinding())`**
  nesta fase (ID15) — hoje tem só `provideRouter(routes)`.
- **D-09:** O `authGuard` retorna **`createUrlTree(['/login'], ...)`** (forma canônica:
  cancela a navegação e redireciona atomicamente). Rejeitado:
  `router.navigate()` + `return false` (duas entradas de navegação, padrão antigo).
- **D-10:** A rota de layout autenticado (D-16) entrega **ID17 (rotas filhas)** de forma
  natural nesta fase, sem forçar a feature.

### Telas de login e cadastro
- **D-11:** **Duas rotas separadas**: `/login` e `/register`, conforme `docs/sdd.md` §5.2,
  cada uma com seu próprio Reactive Form e link cruzado para a outra. Divergir do SDD
  exigiria atualizar o SDD no mesmo commit — não vale a pena aqui.
- **D-12:** Formulário de cadastro tem **nome + e-mail + senha** (3 campos, sem confirmar
  senha).
- **D-13:** **CRÍTICO — o `signUp()` deve passar `options: { data: { display_name: <nome> } }`.**
  O trigger `handle_new_user` (`supabase/migrations/0001_schema.sql:70-85`) lê exatamente a
  chave `raw_user_meta_data ->> 'display_name'`, com `coalesce` para
  `split_part(email,'@',1)`. Errar o nome da chave **não gera erro** — cai silenciosamente
  no fallback e produz nomes feios (`pedrootaviopz`) nas listas de participantes da Fase 3.
  Verificar o valor em `public.profile.display_name` após o cadastro de teste.
- **D-14:** Visual: **card Spartan centrado seguindo o padrão já no scaffold**
  (`src/app/app.html`): `min-h-dvh`, `max-w-md`, `mx-auto`, card com header/content, campos
  empilhados, botão full-width. Mobile-first funcionando a partir de 320px.

### Validação dos Reactive Forms (ID23)
- **D-15:** Senha: **mínimo 6 caracteres** — casa exatamente com o mínimo que o Supabase
  Auth impõe por padrão, então validação de cliente e de servidor concordam e nunca aparece
  um erro de servidor que o form deixou passar.
- **D-16:** Mensagem de erro sob o campo aparece **após sair do campo ou tentar submeter**:
  condição `control.invalid && (control.touched || submetido)`. Não acusa erro enquanto a
  pessoa ainda digita.
- **D-17:** Erros da API Supabase são traduzidos por um **mapa PT-BR dos casos conhecidos
  com fallback genérico** — ex.: `Invalid login credentials` → "E-mail ou senha incorretos.";
  `User already registered` → "Este e-mail já está cadastrado."; qualquer outro → texto
  genérico. Cumpre a regra de UI em PT-BR (CLAUDE.md) sem engolir erros inesperados.
- **D-18:** Botão de submit **desabilitado quando o form é inválido OU quando há envio em
  andamento** (um signal `enviando`), com texto mudando para "Entrando..." /
  "Criando conta...". Entrega ID23 e previne duplo clique criando duas contas.

### Shell autenticado, logout e redirects
- **D-19:** Logout vive num **header dentro de uma rota de layout autenticado** — rota pai
  com componente de layout (header + `<router-outlet>` próprio) envolvendo as rotas
  autenticadas, com `authGuard` aplicado **no pai uma única vez**. Atende
  "a partir de qualquer página autenticada" (AUTH-04) estruturalmente, e qualquer página
  futura herda guard + header sem precisar lembrar de nada.
- **D-20:** **Login e cadastro redirecionam ambos para `/dashboard`.** Com "Confirm email"
  desabilitado no projeto Supabase (feito na Fase 1), o `signUp()` já devolve sessão ativa —
  cadastrar entra direto, sem passar pela tela de login. Fluxo mais curto para a banca.
- **D-21:** O `authGuard` **preserva a URL pretendida** (`returnUrl`) e o login redireciona
  de volta para ela depois de autenticar. Construir agora, não depois: na Fase 3, abrir um
  link de convite `/join/:token` sem estar logado precisa levar ao grupo após o login, não
  ao dashboard — fazer isso agora evita refatorar login e guard.
- **D-22:** A `/dashboard` nesta fase é um **placeholder mínimo autenticado**: saudação com
  nome/e-mail lidos do Signal + botão de sair. Suficiente para provar guard, sessão
  persistida e logout. As listas de grupos são GRP-* (Fase 3) — não antecipar.

### Claude's Discretion
- Nomes exatos de arquivos e componentes dentro de `features/auth/login/` e
  `features/auth/register/` (o SDD §5.2 já sugere `login.page.ts` / `register.page.ts`).
- Se as rotas de auth e o layout autenticado usam `loadComponent` (lazy) ou import direto.
- Onde exatamente mora o mapa de tradução de erros (helper em `core/`, const no service, ou
  pipe em `shared/pipes/`).
- Composição visual fina: espaçamentos, tipografia, qual variante de botão Spartan, se há
  ícone Lucide nos campos.
- Quais `.spec.ts` escrever nesta fase (ENG-02/03 são formalmente Fase 4; testes aqui são
  bem-vindos mas não são critério de aceite da Fase 2).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contratos, rotas e arquitetura de frontend
- `docs/sdd.md` §4 — contratos TypeScript globais; a interface `Profile` é o contrato da
  tabela `profile` populada pelo trigger
- `docs/sdd.md` §5.1 — estrutura de pastas base (`core/services`, `core/guards`,
  `features/auth/{login,register}`)
- `docs/sdd.md` §5.2 — mapa de rotas: `/login` e `/register` públicas, `/dashboard` com
  `authGuard`
- `docs/sdd.md` §5.3 — responsabilidade macro do `AuthService` (sessão Supabase, estado do
  usuário em Signal, fluxos de login/logout)
- `docs/sdd.md` §2 e §2.1 — stack e versões travadas; **nenhuma dependência nova sem
  atualizar esta tabela primeiro**

### Padrões de código a reusar (código já escrito nos docs de pesquisa)
- `.planning/research/ARCHITECTURE.md` (~linhas 470–500) — `AuthService` com signal de
  sessão + `computed`, `login()`, `logout()` — base direta para D-04
- `.planning/research/ARCHITECTURE.md` (~linhas 500–545) — rotas aninhadas (ID17), tabela
  guards vs. resolvers, e a explicação do conflito do ID22 com `supabase-js`
- `.planning/research/STACK.md` §"Ponte `onAuthStateChange` → Signal" (~linhas 265–300) —
  variante com `SupabaseClientService` injetável (D-05) e por que Signals em vez de
  `BehaviorSubject`

### Armadilhas conhecidas (ler antes de escrever o AuthService)
- `.planning/research/PITFALLS.md` Pitfall 8 (~linhas 208–238) — sessão não restaurada no
  F5 / `onAuthStateChange` mal conectado; é a razão de ser de D-01, D-02, D-03
- `.planning/research/PITFALLS.md` Pitfall 9 (~linhas 239–260) — confirmação de e-mail
  bloqueando login; já resolvido na Fase 1 (desabilitado), mas **precisa ser documentado no
  README** para sobreviver a uma recriação do projeto Supabase

### Banco de dados (já aplicado na Fase 1 — não recriar)
- `supabase/migrations/0001_schema.sql:68-89` — trigger `handle_new_user`; a chave exata
  `raw_user_meta_data ->> 'display_name'` que D-13 depende
- `supabase/migrations/0003_rls_policies.sql` — policies de `profile` (INSERT é feito só
  pelo trigger `SECURITY DEFINER`, não pelo frontend)
- `docs/db-rls-verification.md` — evidência de que RLS foi testada com dois usuários

### Requisitos e critérios de aceite
- `.planning/ROADMAP.md` §"Phase 2: Autenticação End-to-End" — goal e os 5 success criteria
- `.planning/REQUIREMENTS.md` linhas 20–25 — AUTH-01..AUTH-06
- `.planning/REQUIREMENTS.md` linhas 124–138 — rastreabilidade dos indicadores
  (RA3-ID9, RA3-ID12, RA4-ID14, RA5-ID15, RA5-ID18, RA6-ID20, RA6-ID23)
- `docs/checklist.md` — a rubrica; IDs 9, 12, 14, 15, 17, 18, 20, 23 são os desta fase
- `docs/prd.md` linhas 46–47 — as duas user stories de visitante (criar conta, fazer login)

### Regras de processo
- `CLAUDE.md` — Gitflow (nunca commitar em `main`, branch de `develop`, integrar por PR),
  Conventional Commits, UI em PT-BR / código em inglês, Kanban atualizado durante o trabalho

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/app.html` — **o padrão visual já estabelecido**: `min-h-dvh`, `max-w-md`,
  `mx-auto`, card Spartan com `hlmCard`/`hlmCardHeader`/`hlmCardTitle`/`hlmCardDescription`/
  `hlmCardContent`, `button hlmBtn`. D-14 manda seguir isso.
- `libs/ui/{button,card,utils}/` — componentes Spartan (HLM) já gerados localmente pelo CLI
  do Spartan e prontos para importar. **Campos de formulário (input/label/form-field) ainda
  NÃO foram gerados** — provavelmente precisam de `npx spartan-ng add` nesta fase.
- `src/environments/environment.ts` — já tem `supabaseUrl` e `supabasePublishableKey`
  (git-ignored, com placeholders); `environment.example.ts` é o template commitado.
  `scripts/generate-env.js` roda no `prebuild` para gerar o arquivo em CI/Vercel.
- `src/app/core/{services,guards,interceptors,resolvers}/` — pastas existem com `.gitkeep`,
  todas vazias. Esta fase escreve os **primeiros** arquivos reais em `services/` e `guards/`.
- `src/app/features/` e `src/app/shared/{components,pipes}/` — existem vazias.

### Established Patterns
- **ESLint trava mecanicamente a sintaxe antiga** (`eslint.config.js`, todas como `error`):
  `prefer-standalone`, `prefer-signals`, `prefer-inject`, `prefer-signal-model`,
  `prefer-output-emitter-ref`, e nos templates `prefer-control-flow` + `banana-in-box`,
  mais `templateAccessibility`. Escrever `@Input()`, DI por construtor ou `*ngIf` **falha o
  build** (`npm run lint` usa `--max-warnings=0`). Os labels dos forms precisam passar as
  regras de acessibilidade de template.
- **Guard de estado em RxJS é proibido por script**: `npm run check:no-rxjs-state` falha se
  aparecer `BehaviorSubject` ou `new Subject` em `src/app` — reforça D-04 (Signals apenas).
- **`npm run check:no-secrets`** falha se `service_role`/`sb_secret_` aparecer em `src/` ou
  `dist/`. Usar somente a chave publicável.
- Angular **21 zoneless + Vitest** (não Karma). Prefixo de selector é `app`
  (`app-` para componentes, camelCase `app` para diretivas).
- Convenção de nomes de arquivo do Angular 21 no scaffold: sem sufixo `.component`
  (`app.ts`, `app.html`, `app.spec.ts`).

### Integration Points
- `src/app/app.config.ts` — hoje só `provideBrowserGlobalErrorListeners()` e
  `provideRouter(routes)`. Esta fase adiciona `withComponentInputBinding()` (D-08) e
  `provideAppInitializer(...)` (D-01).
- `src/app/app.routes.ts` — hoje `export const routes: Routes = []`. Esta fase popula com
  `/login`, `/register`, a rota de layout autenticado contendo `/dashboard`, e o redirect
  da rota vazia.
- `src/app/app.html` — hoje é uma landing de demonstração do scaffold com `<router-outlet/>`
  no fim. Precisa virar um shell limpo (só o `<router-outlet/>`); o conteúdo de boas-vindas
  atual é descartável.
- Supabase: projeto real já criado e com as 3 migrations aplicadas, RLS verificada, e
  **"Confirm email" já desabilitado** (Fase 1) — `signUp()` devolve sessão imediatamente.

</code_context>

<specifics>
## Specific Ideas

- "O estado de sessão como única fonte de verdade reativa (Signal), nunca um booleano
  ingênuo nem uma tela 'piscando' para login no F5" — o goal da fase no ROADMAP; é o
  espírito de D-01..D-04.
- Simplicidade defensável numa banca é requisito explícito do projeto (PROJECT.md
  §Restrições): entre duas implementações que funcionam, escolher a que é mais fácil de
  explicar em voz alta. Foi o critério que decidiu D-01 (initializer em vez de guard
  assíncrono) e D-15 (senha mín. 6 alinhada ao servidor em vez de regra própria).
- Decisões tomadas pensando na Fase 3 para não refatorar depois: D-21 (`returnUrl`, por
  causa do deep link de convite) e D-19 (layout autenticado, para o header não ser
  reimportado página por página).

</specifics>

<deferred>
## Deferred Ideas

- **Documentar no README que "Confirm email" está desabilitado** no projeto Supabase
  (PITFALLS.md Pitfall 9 pede isso explicitamente, para sobreviver a uma recriação do
  projeto perto da apresentação). Cabe na Fase 5 (ENG-07, consolidação do README) — ou num
  `/gsd:quick` a qualquer momento.
- **Recuperação de senha / "esqueci minha senha"** — não está em AUTH-01..06 nem no PRD.
  Nova capacidade; fora de escopo do MVP.
- **Login social (Google/Facebook)** — explicitamente Fora de Escopo em PROJECT.md; não
  demonstra nenhum indicador adicional.
- **Página de perfil / editar `display_name` e `avatar_url`** — não está nos requisitos
  v1; `avatar_url` existe no schema mas nada no MVP o preenche.
- **Interceptors funcionais (ID22) e `toSignal()` (ID24)** — Fase 3 (API-03, API-04).
  `supabase-js` usa `fetch` próprio e não passa pelo `HttpClient`, então não há tráfego
  interceptável nesta fase.

</deferred>

---

*Phase: 02-autentica-o-end-to-end*
*Context gathered: 2026-10-14*
