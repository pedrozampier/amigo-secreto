# Phase 3: Grupos, Participantes, Wishlist e API Pública - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Um administrador monta um grupo de ponta a ponta (criar → gerar e copiar link de convite →
listar e remover participantes), qualquer participante mantém a própria lista de desejos, e
a aplicação prova que consome uma API HTTP externa com o ferramental moderno do Angular
(`HttpClient`, interceptor funcional, `toSignal()`).

Cobre **GRP-01..GRP-09**, **WISH-01..WISH-03**, **API-01..API-04**.

Entrega: `GroupService`, `adminGuard`, `groupResolver`, `HolidayService` + interceptor de
erro, migration `0004` com os dois RPCs de convite, rotas aninhadas `/group` (ID17), rota
flat `/join/:token`, dashboard real com as duas listas, e o card de contagem regressiva.

**Fora desta fase:** o sorteio e a revelação do par (Fase 4 — DRAW-*, incluindo a Edge
Function e os testes do algoritmo); PWA, manifest, estado offline e auditoria WCAG
(Fase 5 — UI-03..07); README/`.spec.md`/Figma (Fase 5 — ENG-07/09).

</domain>

<decisions>
## Implementation Decisions

### Entrada por convite — o bloqueador de RLS descoberto no scout

> **Contexto obrigatório para quem for planejar:** as policies da Fase 1
> (`supabase/migrations/0003_rls_policies.sql`) **não permitem entrar num grupo por
> convite**, e isso só aparece quando se lê as duas policies juntas:
> 1. `group` só tem SELECT para o admin (`admin_id = auth.uid()`) ou para quem já é
>    participante (`id in (select private.my_group_ids())`). Quem abre `/join/:token` ainda
>    não é nenhum dos dois — **não consegue sequer ler o grupo para descobrir o `id`**.
> 2. A policy de INSERT em `participant` valida
>    `group_id in (select g.id from public.group g where g.status = 'open')` — esse subquery
>    é **ele mesmo filtrado por RLS**, então devolve apenas grupos onde a pessoa já está.
>    Resultado: o INSERT falha silenciosamente para todo convidado novo.
>
> O comentário em `.planning/research/ARCHITECTURE.md:224` diz que a validação de token
> "é feita no serviço/RPC de frontend", mas nenhum RPC foi escrito na Fase 1. Esta fase
> escreve esses RPCs.

- **D-01:** Entrar num grupo acontece por **um RPC plpgsql `SECURITY DEFINER`
  `join_group_by_token(p_token text)`**, numa nova migration `0004`. Ele resolve o token →
  grupo, valida `status = 'open'`, valida que o usuário ainda não é membro, e insere a linha
  de `participant` com `user_id = auth.uid()` e o `display_name` copiado de `profile`.
  Um único ponto onde a regra de negócio vive, e o token nunca precisa virar critério de
  leitura numa policy. Mesmas precauções das funções da Fase 1: `set search_path = ''` e
  nomes schema-qualificados.
  Rejeitado: nova policy de SELECT em `group` por token (expõe a linha do grupo a qualquer
  authenticated que adivinhe/receba um token, e espalha a regra em duas policies).
- **D-02:** A tela `/join/:token` **não entra automaticamente**. Um segundo RPC
  **`preview_group_by_token(p_token text)`** (`SECURITY DEFINER`, também na `0004`) devolve
  **somente `name` e `status`** do grupo — nunca participantes, nunca pares. A tela mostra
  "Você foi convidado para <nome>" e um botão de confirmar. Confirmação deliberada: evita
  que um refresh acidental vire erro de GRP-07 e deixa a pessoa saber no que está entrando.
  **`preview_group_by_token` nunca deve passar a devolver lista de participantes** — isso
  transformaria o token num vazamento de quem está no grupo.
- **D-03:** Ambos os RPCs devolvem um **código estável em inglês** em caso de recusa —
  `ALREADY_MEMBER`, `GROUP_CLOSED`, `INVALID_TOKEN` — e o Angular traduz para PT-BR num mapa,
  **exatamente no padrão de `src/app/core/auth-error-messages.ts` já escrito na Fase 2**
  (incluindo fallback genérico para código desconhecido). Mantém o split do CLAUDE.md:
  código/banco em inglês, UI em PT-BR. É isto que entrega a "mensagem clara" que GRP-07 e
  GRP-08 exigem.
  Rejeitado: `RAISE EXCEPTION` com texto PT-BR (põe string de UI dentro do banco) e confiar
  no erro bruto da constraint `UNIQUE (group_id, user_id)` (mensagem incompreensível).
- **D-04:** A constraint `participant_group_user_unique` continua sendo a rede de segurança
  real de GRP-07 — o RPC checa antes para dar mensagem boa, mas uma corrida entre duas abas
  ainda bate na constraint. O RPC deve tratar a violação e devolver `ALREADY_MEMBER`
  em vez de vazar o erro do Postgres.

### Estado e reatividade (ID9, ID21)

- **D-05:** `GroupService` guarda **`signal()`** com as listas (grupos administrados, grupos
  participados, participantes do grupo aberto) e, **depois de cada mutação, re-busca e
  re-seta o signal**. Uma fonte de verdade, sem cache a invalidar, trivial de explicar em
  banca. Casa com o guard mecânico já ativo (`npm run check:no-rxjs-state` falha se aparecer
  `BehaviorSubject`/`new Subject` em `src/app`).
  Rejeitado: update otimista com rollback (lógica de reversão que não demonstra indicador
  novo) e re-execução do resolver por navegação forçada (comportamento implícito).
- **D-06:** `GroupService` é `@Injectable({providedIn:'root'})` e consome o
  **`SupabaseClientService` já existente via `inject()`** (D-05 da Fase 2) — não cria client
  próprio. ID14.

### Rotas, guard e resolver (ID15, ID16, ID17, ID18)

- **D-07:** Árvore de rotas: **`/group/create` e `/group/:id/manage` aninhados** sob um
  `GroupLayoutPage` com `<router-outlet>` próprio (ID17), e **`/join/:token` fica flat**.
  Razão: quem abre o convite ainda não é membro — renderizar o header/layout de um grupo que
  a pessoa não integra é incoerente. Essas rotas entram **dentro da rota de layout
  autenticado já existente** em `src/app/app.routes.ts` (D-19 da Fase 2), herdando o
  `authGuard` e o header sem reaplicá-los.
  **Consequência documental:** isto diverge de `docs/sdd.md` §5.2 (que lista tudo flat) —
  **atualizar o §5.2 no mesmo commit**, conforme a regra do CLAUDE.md de não deixar código e
  spec divergirem.
- **D-08:** **`groupResolver` busca o grupo uma vez; `adminGuard` lê esse resultado** e
  compara `admin_id` com o usuário da sessão. Uma query por navegação, e preserva a
  distinção que `.planning/research/ARCHITECTURE.md` (~linha 530) defende: *guard decide SE a
  navegação ocorre, resolver decide O QUE já está pronto quando ela ocorre*.
  Rejeitado: guard e resolver com queries independentes (duas roundtrips por navegação).
- **D-09:** O `:id` de `/group/:id/manage` e o `:token` de `/join/:token` chegam ao
  componente como **`input()`**, via o `withComponentInputBinding()` que já está ligado no
  `app.config.ts` desde a Fase 2 (D-08 daquela fase). ID16.

### Telas

- **D-10:** **Dashboard (GRP-09): duas seções empilhadas** com títulos "Grupos que
  administro" e "Grupos que participo", cada uma com `@for` + `track` sobre cards. GRP-09
  pede explicitamente que apareçam "separadamente" — um badge de papel numa lista única é
  mais fraco. Mobile-first natural em 320px e entrega ID6 duas vezes. O conteúdo placeholder
  atual de `src/app/features/dashboard/dashboard.page.html` ("Seus grupos de amigo secreto
  aparecerão aqui") é substituído.
- **D-11:** **Wishlist editada dentro da tela do grupo** (WISH-01/02), não em rota própria
  nem em página global. `wish_list` vive em `participant`, ou seja, é **uma lista por grupo** —
  editar dentro de `/group/:id` torna esse escopo visualmente óbvio e evita a confusão de
  parecer um campo de perfil. Um `textarea` com **`model()`** entrega ID11.
- **D-12:** **BrasilAPI: card de contagem regressiva no `/dashboard`, dentro de um bloco
  `@defer (on viewport)`** — que de quebra entrega ID8 nesta fase. Fica visível logo após o
  login, é independente de ter grupo criado, e é fácil de demonstrar na banca.
- **D-13:** **Usar `lucide-angular` onde ajuda** (botão de copiar link, remover participante,
  ícones dos cards). Já está na tabela §2 do SDD e instalado desde a Fase 1 — nenhuma
  dependência nova. Melhora a leitura de botões de ícone-único em 320px.

### API pública, interceptor e ponte RxJS (ID19, ID22, ID24, ID7)

- **D-14:** Falha de rede/HTTP na BrasilAPI é **tratada pelo interceptor funcional
  centralizado (ID22) e o card renderiza um estado de erro discreto em PT-BR**. A feature é
  opcional — falhar nela não pode quebrar o dashboard.
  Rejeitado: fallback calculando 25/12 local com `date-fns` (tornaria o GET à API pública
  decorativo — o número apareceria igual sem a API, péssimo de defender oralmente) e
  esconder o card em caso de falha (o avaliador que testar offline vê a feature sumir sem
  explicação).
- **D-15:** Esta fase adiciona **`provideHttpClient(withInterceptors([...]))`** ao
  `app.config.ts` — hoje ele não tem `HttpClient` nenhum. O tráfego da BrasilAPI é o **único**
  tráfego interceptável do projeto; `supabase-js` usa `fetch` próprio e não passa pelo
  `HttpClient` (ver ARCHITECTURE.md §"O conflito do ID22"). **Não tentar fazer o Supabase
  passar pelo `HttpClient`** — é um conflito real já resolvido por decisão de projeto.
- **D-16:** A resposta da BrasilAPI é convertida de Observable para Signal com
  **`toSignal()`** (ID24 — o indicador que a Fase 2 deliberadamente adiou, por D-07 daquela
  fase). `DatePipe` na data do feriado entrega ID7.

### Limitações conhecidas (registrar, não corrigir nesta fase)

- **D-17:** A policy `"participant: editar os proprios dados"` permite ao usuário atualizar
  **a linha inteira** da sua própria participação — inclusive `group_id` e `display_name`, não
  só `wish_list`. **Travar apenas no service**: `GroupService.updateWishList()` faz
  `.update({ wish_list })` e nada mais, e nenhuma tela expõe outro campo. WISH-03 (não editar
  a lista de outra pessoa) já está garantido pela policy, que é o que de fato importa.
  Um trigger `BEFORE UPDATE` seria a defesa em profundidade, mas é a mesma classe de
  robustez que REQUIREMENTS.md já adiou como **V2-02** — registrar junto, não implementar.
- **D-18:** A policy de UPDATE em `group` permite ao admin mudar `status` livremente pelo
  cliente (ARCHITECTURE.md ~linha 207). Nesta fase, **nenhuma tela expõe edição de `status`** —
  a transição `open → drawing → closed` é exclusividade da Edge Function na Fase 4.

### Link de convite e testes

- **D-19:** O link copiado (GRP-03) é montado com **`window.location.origin` em runtime** +
  `/join/<token>`. Funciona em localhost, em preview e em produção sem configuração — e isso
  importa aqui porque o STATE.md registra que a URL de produção é **por-deployment na Vercel**,
  não um domínio fixo (`amigo-secreto.vercel.app` é de terceiros).
  Rejeitado: campo `appUrl` em `environment.ts` (o arquivo é git-ignored e gerado por
  `scripts/generate-env.js` no build — mais uma coisa a manter em sincronia).
- **D-20:** **Testes só onde há regra real**: specs para o mapa de tradução dos códigos de
  erro do join (GRP-07/GRP-08) e para o cálculo de dias até o Natal — lógica pura, sem mock
  de rede. **Pular** CRUD trivial e mock de `supabase-js` (testaria mais o mock que a regra).
  ENG-02/03 continuam formalmente na Fase 4; isto só amortiza o ID32.

### Organização do trabalho

- **D-21:** Planejar **duas trilhas paralelas**: (a) trilha Supabase — migration `0004`,
  `GroupService`, rotas `/group`, `/join`, dashboard, wishlist; (b) trilha API — `HttpClient`,
  interceptor, `toSignal()`, card de contagem regressiva. São independentes (a trilha API não
  toca Supabase). Isso gera **duas PRs reais em vez de uma gigante** — ID26 pede colaborar
  *ativamente*, e várias PRs pequenas pontuam melhor que um merge único no fim.

### Claude's Discretion

- Nomes exatos de arquivos/componentes dentro de `features/group/{create,manage,join}/` e
  onde exatamente mora o mapa de tradução dos códigos do join (helper em `core/`, const no
  service, ou pipe em `shared/pipes/` — o mesmo grau de liberdade que a Fase 2 teve).
- Assinatura de retorno dos RPCs (json com `{ code, group_id }`, tipo composto, ou
  `returns text`) — desde que D-03 (código estável em inglês) seja respeitado.
- Validação do Reactive Form de criar grupo (o schema já impõe `char_length(name) between 3
  and 60`, então o validador de cliente deve espelhar isso) e textos de estado vazio das
  listas.
- Se remover participante (GRP-05) pede confirmação e em que forma (dialog Spartan, inline,
  ou direto) — e se isso exige gerar uma primitiva Spartan nova.
- Quais primitivas Spartan gerar além das já existentes (`button`, `card`, `input`, `label`),
  seguindo a regra da Fase 2 de evitar as que arrastam peers ausentes do SDD §2.
- Composição visual fina: espaçamentos, variantes de botão, quais ícones Lucide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### O bloqueador de RLS (ler ANTES de planejar o fluxo de convite)
- `supabase/migrations/0003_rls_policies.sql` — as policies de `group` e `participant` que
  **não** suportam o convite; é a razão de existirem D-01, D-02, D-03
- `supabase/migrations/0002_private_helpers.sql` — `private.my_group_ids()` /
  `private.my_participant_ids()`; o **padrão a imitar** nos RPCs novos (`SECURITY DEFINER`,
  `set search_path = ''`, nomes schema-qualificados, `revoke`/`grant` explícitos)
- `supabase/migrations/0001_schema.sql` — DDL das 4 tabelas: `group.invite_token`,
  `participant.wish_list`, a constraint `participant_group_user_unique` (D-04), e o
  `check (char_length(name) between 3 and 60)` que o form de criar grupo deve espelhar
- `.planning/research/PITFALLS.md` Pitfall 4 (~linhas 116–138) — recursão 42P17 em policy;
  os RPCs novos não podem reintroduzir o problema
- `docs/db-rls-verification.md` — evidência de como a RLS foi testada com dois usuários na
  Fase 1; o mesmo método vale para validar a `0004`

### Arquitetura de frontend desta fase
- `.planning/research/ARCHITECTURE.md` ~linha 224 — o comentário "validação feita no
  serviço/RPC" que D-01 concretiza
- `.planning/research/ARCHITECTURE.md` ~linhas 438–450 — estrutura de pastas
  `features/group/{group-layout,create,manage,join}`
- `.planning/research/ARCHITECTURE.md` ~linhas 505–545 — `groupRoutes` com rotas filhas
  (base de D-07) e a tabela **guards vs. resolvers** (base de D-08)
- `.planning/research/ARCHITECTURE.md` ~linhas 546–560 e ~623 — **o conflito do ID22**:
  por que interceptors só cobrem a chamada `HttpClient` e nunca o tráfego Supabase (D-15)
- `.planning/research/ARCHITECTURE.md` ~linha 179 — nomes de outros participantes vêm do
  `display_name` **denormalizado em `participant`**, nunca de join em `profile` (as policies
  de `profile` só liberam a própria linha)
- `.planning/research/ARCHITECTURE.md` ~linhas 200–208 — a policy de UPDATE em `group` que
  deixa o admin mexer em `status` pelo cliente (base de D-18)
- `.planning/research/ARCHITECTURE.md` ~linhas 44–49 — a reinterpretação da RN5 do PRD
  (link único por grupo + `UNIQUE (group_id, user_id)`, sem tabela de convites)

### Especificação e contratos
- `docs/sdd.md` §4 — contratos TypeScript de `Group`, `Participant`; reusar verbatim
- `docs/sdd.md` §5.1 — estrutura de pastas base
- `docs/sdd.md` §5.2 (linhas 287–297) — mapa de rotas atual; **D-07 diverge dele e exige
  atualizar o §5.2 no mesmo commit**
- `docs/sdd.md` §5.3 (linhas 299–305) — responsabilidade macro do `GroupService`
- `docs/sdd.md` §2 e §2.1 — stack travada; **nenhuma dependência nova sem atualizar a tabela
  primeiro** (`lucide-angular` de D-13 já está lá)
- `docs/prd.md` §5 — regras de negócio RN1..RN7 (mínimo 3 participantes, convite single-use
  por e-mail, ninguém entra após o sorteio, wishlist editável até o fechamento)

### Decisões herdadas da Fase 2 (não reabrir)
- `.planning/phases/02-autentica-o-end-to-end/02-CONTEXT.md` — **D-21** (`returnUrl` no
  `authGuard`, construído justamente para o deep link `/join/:token`), **D-19** (layout
  autenticado onde as rotas novas se encaixam), **D-08** (`withComponentInputBinding`),
  **D-05** (`SupabaseClientService` injetável), **D-07** (ID22/ID24 adiados para cá),
  **D-17** (o padrão do mapa de erros PT-BR que D-03 replica)
- `src/app/core/auth-error-messages.ts` — o arquivo concreto cujo padrão D-03 segue
- `src/app/app.routes.ts` — a árvore atual; as rotas de grupo entram como filhas da rota de
  layout autenticado existente
- `src/app/app.config.ts` — onde D-15 adiciona `provideHttpClient`

### Requisitos e rubrica
- `.planning/ROADMAP.md` §"Phase 3" — goal e os 5 success criteria
- `.planning/REQUIREMENTS.md` linhas 58–81 — GRP-01..09, WISH-01..03, API-01..04
- `.planning/REQUIREMENTS.md` linhas 115–139 — rastreabilidade dos indicadores desta fase:
  **ID6, ID7, ID8, ID9, ID10, ID11, ID13, ID14, ID15, ID16, ID17, ID18, ID19, ID21, ID22,
  ID23, ID24**
- `.planning/REQUIREMENTS.md` §"Requisitos v2" — **V2-02** (trigger de transição de status),
  onde a limitação de D-17 se encaixa
- `docs/checklist.md` — a rubrica completa

### Regras de processo
- `CLAUDE.md` — Gitflow (nunca commitar em `main`, branchar de `develop`, integrar por PR),
  Conventional Commits, UI em PT-BR / código e entidades em inglês, Kanban atualizado durante
  o trabalho (não no fim)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/core/services/supabase-client.service.ts` — client injetável pronto;
  `GroupService` e `HolidayService` consomem via `inject()` (D-06).
- `src/app/core/services/auth.service.ts` — padrão a imitar: **um signal privado escrito,
  todo o resto `computed()`**. Expõe `user`, `email`, `displayName`, `isAuthenticated` —
  `GroupService` e `adminGuard` leem daqui, sem nova query de sessão.
- `src/app/core/auth-error-messages.ts` — mapa código→PT-BR com fallback genérico; **o
  template exato de D-03**.
- `src/app/core/guards/auth.guard.ts` — guard funcional síncrono com `returnUrl` e
  `createUrlTree`; `adminGuard` segue a mesma forma.
- `libs/ui/{button,card,input,label,utils}/` — primitivas Spartan já geradas. Importadas por
  path alias `@spartan-ng/helm/<nome>` (ex.: `@spartan-ng/helm/card`), **não** por caminho
  relativo em `src/app/shared/ui`.
- `src/app/features/auth/login/login.page.*` — Reactive Form de referência: validação
  mostrada após `touched || submetido`, submit desabilitado por `invalid || enviando`, erro
  da API traduzido. O form de criar grupo (GRP-01) e o de wishlist (WISH-01) seguem isto.
- `src/app/features/shell/authenticated-layout.page.*` — header + `<router-outlet>` onde as
  rotas novas se encaixam sem reaplicar guard.
- `src/app/features/dashboard/dashboard.page.*` — alvo da reescrita de D-10; o placeholder
  "Seus grupos aparecerão aqui" sai.

### Established Patterns
- **ESLint trava a sintaxe antiga mecanicamente** (`eslint.config.js`, tudo como `error`):
  `prefer-standalone`, `prefer-signals`, `prefer-inject`, `prefer-signal-model`,
  `prefer-output-emitter-ref`, `prefer-control-flow`, `banana-in-box`, `templateAccessibility`.
  `npm run lint` roda com `--max-warnings=0` — `@Input()`, DI por construtor ou `*ngFor`
  **quebram o build**. `prefer-signal-model` em particular empurra D-11 (`model()`) de graça.
- **`npm run check:no-rxjs-state`** falha se `BehaviorSubject`/`new Subject` aparecer em
  `src/app` — reforça D-05. Atenção: `toSignal()` (D-16) consome um Observable do
  `HttpClient`, o que é permitido; o que é proibido é **estado** em RxJS.
- **`npm run check:no-secrets`** falha com `service_role`/`sb_secret_` em `src/` ou `dist/`.
- Angular **21 zoneless + Vitest** (não Karma). `ng test --watch=false --include=<glob>`
  para rodar um spec só — **`--run` é rejeitado** pelo builder (aprendido na Fase 2).
- **`npm install` neste projeto exige `--legacy-peer-deps`** (bug do arborist do npm 10.9.2
  com o grafo de peers do vitest@4) — vale também em CI.
- Convenção de nomes do Angular 21 no scaffold: sem sufixo `.component`; páginas usam
  `.page.ts` / `.page.html`. Prefixo de selector `app`.
- Ao gerar primitivas Spartan novas, **checar os peers antes**: a Fase 2 deixou de gerar
  `field` porque ele arrasta `separator` + `@ng-icons`, ausentes do SDD §2.

### Integration Points
- `src/app/app.config.ts` — ganha `provideHttpClient(withInterceptors([errorInterceptor]))`
  (D-15). Hoje tem só `provideBrowserGlobalErrorListeners`, `provideRouter(...)` e
  `provideAppInitializer`.
- `src/app/app.routes.ts` — ganha `/join/:token` (flat, dentro do layout autenticado) e o
  bloco `/group` com filhas (D-07).
- `src/app/core/{guards,interceptors,resolvers}/` — `guards/` tem só `auth.guard.ts`;
  `interceptors/` e `resolvers/` estão **vazias com `.gitkeep`**. Esta fase escreve os
  primeiros arquivos reais em ambas.
- `supabase/migrations/` — tem `0001`, `0002`, `0003` aplicadas. D-01/D-02 adicionam a
  **`0004`**, que precisa ser aplicada no projeto Supabase real e verificada com dois
  usuários, no mesmo método da Fase 1.
- Supabase: projeto real ativo, RLS verificada, **"Confirm email" desabilitado e precisa
  continuar assim** (D-20 da Fase 2 / STATE.md Blockers).

</code_context>

<specifics>
## Specific Ideas

- **A descoberta central desta discussão** foi que as policies da Fase 1 bloqueiam o convite,
  e que isso é invisível lendo cada policy isoladamente — só aparece ao notar que o subquery
  `select g.id from public.group g where g.status='open'` dentro da policy de INSERT é ele
  mesmo filtrado por RLS. Quem for planejar **não deve "simplificar" isso de volta para um
  insert direto do cliente**: ele falha silenciosamente.
- "Simplicidade defensável numa banca" continua sendo o critério de desempate (PROJECT.md
  §Restrições). Foi o que decidiu D-01 (um RPC concentrando a regra em vez de duas policies
  novas), D-05 (refetch em vez de update otimista) e D-08 (uma query em vez de duas).
- D-14 carrega um argumento de defesa oral: um fallback local que calcula 25/12 tornaria o
  GET à API pública (ID19) decorativo — o número apareceria idêntico sem a API. Mostrar o
  erro é mais honesto e mais demonstrável.
- D-21 (duas trilhas) existe tanto por paralelismo quanto por nota: ID26 grada o *processo*
  de colaboração, e várias PRs pequenas valem mais que um merge único.
- Decisões tomadas pensando na Fase 4, para não refatorar depois: D-18 (nenhuma tela edita
  `status` — a Edge Function é a única dona da transição) e D-02 (`preview_group_by_token`
  nunca devolve participantes, para não abrir um canal lateral de identidade).

</specifics>

<deferred>
## Deferred Ideas

- **Trigger `BEFORE UPDATE` em `participant`** restringindo a edição a `wish_list` (D-17).
  Mesma classe de robustez de **V2-02** em `.planning/REQUIREMENTS.md` — registrar lá, não
  implementar nesta fase.
- **Convite nominal por e-mail / tabela `invite`** — explicitamente Fora de Escopo em
  REQUIREMENTS.md; a RN5 do PRD já foi reinterpretada como `UNIQUE (group_id, user_id)`.
- **Página de perfil / editar `display_name` global** — não está nos requisitos v1.
  `participant.display_name` é denormalizado na entrada e não é reeditável nesta fase.
- **Avatar por participante** — é **V2-04**; `avatar_url` existe no schema mas nada no MVP o
  preenche.
- **Documentar no README que "Confirm email" está desabilitado** — herdado da Fase 2; cabe na
  Fase 5 (ENG-07) ou num `/gsd:quick`.
- **Sugestões de presente via API externa** (ideia solta em ARCHITECTURE.md ~linha 552 como
  alternativa de API pública) — não é necessária: a BrasilAPI cobre ID19 e a wishlist é texto
  livre por WISH-01.

</deferred>

---

*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Context gathered: 2026-10-15*
