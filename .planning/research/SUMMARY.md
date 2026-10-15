# Project Research Summary

**Project:** UTF-Secret — Sistema de Amigo Secreto Online
**Domain:** PWA acadêmica (Angular + Supabase) avaliada por rubrica de 32 indicadores
**Researched:** 2026-10-14/15
**Confidence:** MÉDIA-ALTA

## Executive Summary

O UTF-Secret é, tecnicamente, um CRUD pequeno com um algoritmo de sorteio — mas o que o torna
não trivial é que ele tem **dois públicos simultâneos**: quem usa o produto (organizador e
participantes de um amigo secreto) e quem o avalia (o professor, via rubrica de 32 indicadores
em `docs/checklist.md`). A pesquisa confirma que a stack e a arquitetura certas para agradar o
primeiro público (simples, Supabase + RLS, sorteio circular) são, por acaso quase feliz, também
as que demonstram melhor os indicadores obrigatórios — desde que a implementação use
deliberadamente as APIs modernas do Angular (Signals, `inject()`, `@defer`, interceptors
funcionais) em vez das equivalentes "clássicas" que ainda compilam sem erro.

A pesquisa de stack identificou dois conflitos reais de versão no SDD original — já resolvidos
e registrados em `docs/sdd.md`/`docs/prd.md` antes desta síntese: **Angular pinado em `^21.x`
(LTS)** (não 17, não 22 — porque `@spartan-ng/brain@1.7.0` exige `@angular/core >=21 <23` e
`lucide-angular@1.0.0` só declara suporte até `21.x`; v21 também já é zoneless por padrão e usa
Vitest em vez de Karma) e **Tailwind atualizado para `^4.x`** (porque Spartan UI 1.0 exige
`tailwindcss >=4.0.0` como peer dependency hard; não existe tag atual do Spartan compatível com
v3). Essas decisões devem ser tratadas como fechadas no roadmap, não reabertas.

O maior risco do projeto não é técnico, é de **disciplina de implementação**: a diferença entre
"funciona" e "pontua" está inteiramente em usar a sintaxe certa (`@if`/`@for`, `input()`/
`output()`, `inject()`, Signals em vez de `BehaviorSubject`). A boa notícia é que a maior parte
disso é mecanicamente forçável via ESLint e até pelo próprio compilador; a má notícia é que dois
pontos específicos (`BehaviorSubject` como estado e `effect()` onde deveria haver `computed()`)
não têm nenhuma rede de segurança automática e dependem de revisão de código. O segundo maior
risco é arquitetural, mas já resolvido na pesquisa: há uma única chamada HTTP em todo o projeto
que passa pelo `HttpClient` do Angular — tudo que é Supabase usa `fetch` nativo por dentro e
nunca atravessa um interceptor Angular. Essa chamada única (API de feriados) precisa ser tratada
como uma mini-feature central do roadmap, porque fecha sozinha quatro indicadores.

## Key Findings

### Recommended Stack

A stack final, com os dois conflitos já resolvidos: **Angular `^21.x`** (LTS, standalone e
zoneless por padrão, Vitest como test runner padrão) + **`@angular/cdk@^21.x`** (peer dependency
do Spartan) + **`@supabase/supabase-js@^2.117`** (único cliente maduro para Auth/Postgres/
Functions) + **Tailwind CSS `^4.x`** (CSS-first, sem `tailwind.config.js`, via
`@import "tailwindcss"` + `@theme {}` + plugin PostCSS `@tailwindcss/postcss`) +
**`@spartan-ng/brain` + `@spartan-ng/cli` `^1.7.x`** (componentes acessíveis estilo shadcn,
mantidos e compatíveis com Angular `^21.x`/Tailwind `^4.x`).

**Core technologies:**
- `@angular/core`/`@angular/cli` `^21.x` — framework SPA; satisfaz "20+" do checklist e o peer range do Spartan UI, zoneless e Vitest de fábrica
- Tailwind CSS `^4.x` — utilitários CSS, base do Spartan; única versão aceita pelo peer dependency do `@spartan-ng/brain`
- `@spartan-ng/brain`/`cli` `^1.7.x` — componentes acessíveis prontos (botão, card, dialog), reduz trabalho de UI sem fugir do Tailwind
- `@supabase/supabase-js` `^2.117` — Auth, Postgres via `.from()`, Edge Functions; API estável desde 2023
- `lucide-angular` `^1.0.0` — ícones; instalar com `--legacy-peer-deps` pois seu peer range declara só até Angular 21.x (coerente, já que o projeto fixou 21)
- Vitest (padrão do `ng new` em v21+) — substitui Karma/Jasmine, API `describe/it/expect/vi`
- `date-fns` `^3.x` + `zod` `^3.25.x` — formatação de datas (pipe pt-BR) e validação de formulário; **não migrar para v4 de nenhum dos dois**, evita breaking changes sem ganho

### Expected Features

O PRD já fez a curadoria correta de escopo — a pesquisa de mercado (Elfster, DrawNames,
Giftster) apenas confirma que nada essencial falta e nada supérfluo foi deixado de fora.

**Must have (table stakes):**
- Criar grupo + convite por link (não e-mail individual) — padrão de 100% dos concorrentes
- Mínimo de 3 participantes para sortear
- Sorteio automático e aleatório, único e definitivo por grupo
- Ocultar o resultado de terceiros — aqui mais forte que a concorrência: garantido por RLS no banco, não só pela UI
- Lista de desejos (texto simples) + visualização da lista de quem a pessoa tirou

**Should have (para fechar indicadores da rubrica, encaixadas organicamente):**
- Consumo de API pública via GET (`BrasilAPI` feriados) — ID19, inserida como "faltam N dias para o Natal/feriado", não como tela isolada
- Revelação do par via cartão flip com confirmação prévia (`signal<boolean>` + classe CSS) — simples de implementar e de explicar, mais defensável que scratch-to-reveal ou tap-and-hold
- Um bloco `@defer` envolvendo o painel "wishlist do par + dias até o Natal", carregado `on viewport` — só existe depois do sorteio, portanto é um caso de uso legítimo, não forçado

**Defer / fora de escopo (decisão confirmada pela pesquisa de mercado, não reabrir):**
- Regras de exclusão de pares — conflitaria com o algoritmo de ciclo único escolhido
- Chat entre participantes, múltiplas rodadas/histórico, orçamento, login social, lembretes automáticos — nenhum destreva indicador novo e todos somam infraestrutura desproporcional ao valor

### Architecture Approach

A arquitetura segue o que o SDD já definia (RLS como mecanismo de privacidade, sorteio em Edge
Function), mas a pesquisa converteu a prosa do SDD em SQL executável e revelou/fechou três
problemas de modelagem: a FK de `draw` deve apontar para `participant.id` (nunca direto para
`user_id`), a interpretação de "convite de uso único por e-mail" do PRD é satisfeita de forma
suficiente por `UNIQUE (group_id, user_id)` em `participant` (sem tabela de convites nominal —
decisão já registrada em `docs/sdd.md`/`docs/prd.md`), e faltam constraints/índices explícitos
que tornam o resultado do sorteio um *perfect matching* verificável no banco, não só no código.

**Major components:**
1. **Banco Postgres + RLS (Supabase)** — quatro tabelas (`profile`, `group`, `participant`,
   `draw`), duas funções `SECURITY DEFINER` em schema `private` que resolvem a recursão de
   policy, e políticas que nunca mencionam `admin_id` na tabela `draw`
2. **Edge Function `run-draw` (Deno)** — único ponto de escrita em `draw`, autenticada com
   `service_role`/`sb_secret_`; valida o JWT do chamador antes de agir; implementa o lock
   otimista `UPDATE ... WHERE status = 'open'` e o algoritmo Fisher-Yates + pareamento circular
3. **`AuthService`/`GroupService`/`DrawService` (Angular, Signals)** — cada serviço mantém
   estado em `signal()` privado exposto como `computed()`/`readonly`; nenhuma store library
   (NgRx/Akita) é necessária dado o tamanho do domínio
4. **Feature isolada de API pública (`HttpClient` + interceptors + `toSignal()`)** — a única
   superfície do app que passa por interceptors funcionais Angular, porque `supabase-js` usa
   `fetch` nativo e nunca atravessa o `HttpClient`

### Critical Pitfalls

1. **Sintaxe "clássica" que ainda compila mas zera indicadores** (`*ngIf`/`*ngFor`,
   `@Input()`/`@Output()`, DI por construtor) — mitigado mecanicamente ativando como `error`
   (não warning) as regras `@angular-eslint/prefer-control-flow`, `prefer-signals`,
   `prefer-inject`, `prefer-standalone`, `prefer-signal-model` desde o scaffold. `@for` sem
   `track` nem precisa de lint — é erro de compilação (`NG5002`). Duas lacunas sem cobertura
   de lint: `BehaviorSubject` como estado (regra `prefer-signals` explicitamente não detecta
   isso) e `effect()` usado onde `computed()` seria correto — ambas exigem grep/revisão manual
   de PR, não existe autofix.
2. **Recursão infinita em RLS (`42P17`)** — qualquer policy que consulta a própria tabela que
   protege entra em loop. Única correção aceita: função `SECURITY DEFINER` em schema `private`
   com `set search_path = ''`, nomes sempre qualificados por schema. É a primeira migration do
   projeto, antes de qualquer `CREATE POLICY`.
3. **`service_role`/`sb_secret_` key vazando para o bundle do cliente** — destruiria o core
   value de forma mais grave que qualquer bug de UI (vira falha de segurança de banco
   auditável). Mitigação mecânica: grep em CI contra `dist/` de produção
   (`grep -r "sb_secret_\|service_role" dist/`), `.env*` no `.gitignore` desde o primeiro commit.
4. **Confiar na UI para "esconder" o sorteio em vez de a policy de RLS restringir** — qualquer
   usuário autenticado pode chamar a REST API do Supabase direto via DevTools/curl ignorando a
   tela. O teste de aceite correto é autenticar como usuário B e tentar ler a linha de `draw`
   do usuário A — deve retornar vazio, não erro.
5. **Condição de corrida no botão "iniciar sorteio"** — dois cliques/abas simultâneas sem lock
   atômico geram pares duplicados. Corrigido com `UPDATE group SET status='drawing' WHERE
   status='open'` condicional (aborta se 0 linhas afetadas) **e** `UNIQUE (group_id, giver_id)`
   como defesa em profundidade — nunca só um botão desabilitado no frontend.

## Implications for Roadmap

A pesquisa de arquitetura já propõe 5 fases grossas alinhadas à restrição de simplicidade do
PROJECT.md. A síntese abaixo adota essa estrutura, incorporando os achados de stack/features/
pitfalls em cada fase.

### Phase 1: Fundação — Scaffold + Banco + RLS
**Rationale:** toda feature subsequente lê/escreve nessas quatro tabelas; testar RLS depois da
UI pronta inverte a ordem de depuração (não dá para saber se um bug é de policy ou de código
Angular). É também onde os dois conflitos de stack (Angular `^21.x`, Tailwind `^4.x`) são
resolvidos de uma vez, no scaffold, antes de qualquer código de feature depender da decisão.
**Delivers:** projeto Angular `^21.x` standalone + Tailwind `^4.x` + Spartan UI rodando; schema
completo (`profile`, `group`, `participant`, `draw`) com todas as constraints (`UNIQUE
(group_id, user_id)`, `UNIQUE (group_id, giver_id)`, `UNIQUE (group_id, receiver_id)`, `CHECK
(giver_id <> receiver_id)`, índices); trigger `handle_new_user`; as duas funções `SECURITY
DEFINER` em `private`; todas as policies das quatro tabelas testadas manualmente via SQL Editor
com usuários diferentes; ESLint com as cinco regras do Pitfall 1 ativas como `error`; Gitflow
(`main`/`develop`) e deploy Vercel configurados em paralelo.
**Addresses:** base de dados para "criar grupo", "entrar via convite", "sorteio privado" do
FEATURES.md.
**Avoids:** Pitfall 2 (recursão RLS), Pitfall 5 (`service_role` vazando), Pitfall 1 (sintaxe
antiga) — todos são mais caros de corrigir depois do que de prevenir aqui.

### Phase 2: Autenticação end-to-end
**Rationale:** nenhuma feature de grupo faz sentido sem usuário autenticado; o guard de
autenticação criado aqui é reusado por todas as rotas protegidas das fases seguintes.
**Depends on:** Fase 1 (precisa de `profile` e do trigger `handle_new_user`).
**Delivers:** `AuthService` com sessão como `signal`/`computed` (estado explícito `'loading' |
'authenticated' | 'unauthenticated'`, nunca booleano); páginas de login/registro com Reactive
Forms; `authGuard` funcional; `provideRouter` + `withComponentInputBinding`.
**Avoids:** Pitfall 8 (sessão não restaurada no F5), Pitfall 9 (confirmação de e-mail bloqueando
demonstração — decidir e documentar a política já aqui).

### Phase 3: Grupos, Participantes e a feature isolada de API pública
**Rationale:** cobre a maior parte do CRUD do checklist; a UI (Spartan/Tailwind) pode avançar em
paralelo à lógica de serviço, já que as policies da Fase 1 já garantem os limites de acesso.
**Depends on:** Fase 2 (precisa de usuário logado e `authGuard`).
**Delivers:** `GroupService`, `adminGuard`, `groupResolver`; rotas aninhadas sob `/group`
(layout + `create`/`manage/:id`/`join/:token`); criar grupo, gerar/consumir invite token,
listar/remover participantes, CRUD de wish list. **Em paralelo, sem dependência de Supabase**:
a mini-feature de API pública (`BrasilAPI` feriados via `HttpClient` + interceptor funcional de
erro + `toSignal()`) — pode ser um branch separado do Gitflow, porque não depende de grupo nem
de autenticação Supabase.
**Addresses:** "criar grupo + convite", "entrar via convite", "admin remove participante",
"wishlist CRUD" do FEATURES.md; fecha ID19/ID22/ID24 via a feature de API pública.
**Avoids:** Pitfall 7 parcialmente preparado aqui (a constraint `UNIQUE` já existe desde a
Fase 1, mas o teste de duplo clique só é possível a partir da Fase 4).

### Phase 4: Sorteio (Edge Function) + Revelação
**Rationale:** é logicamente a última etapa do fluxo de negócio (grupo fechado = fim) e depende
tecnicamente de tudo anterior já funcionar — sem grupo e participantes reais não há o que
sortear. É também a fase que prova o core value do projeto.
**Depends on:** Fase 3 (participantes reais num grupo `open` com `n ≥ 3`).
**Delivers:** Edge Function `run-draw` (lock otimista `open→drawing`, validação de JWT do
chamador, Fisher-Yates + pareamento circular, insert atômico dos pares, `drawing→closed`);
`DrawService` via `functions.invoke()`; página de resultado com revelação deliberada (cartão
flip, `@defer on viewport` envolvendo o painel de wishlist do sorteado + "dias até o Natal");
testes `.spec.ts` (Vitest) cobrindo ausência de autossorteio, rejeição de segunda invocação, e
RLS bloqueando leitura cruzada entre participantes.
**Addresses:** "sorteio automático", "ocultar resultado de terceiros", "revelação do par",
"ver wishlist de quem tirei" do FEATURES.md; fecha ID8 (`@defer`), ID9-12 (Signals no estado de
revelação).
**Avoids:** Pitfall 6 (UI escondendo em vez de RLS proteger — critério de aceite explícito desta
fase), Pitfall 7 (corrida no clique duplo — testar ativamente), o débito técnico conhecido da
não-atomicidade entre inserir pares e fechar o grupo (aceitável para o MVP, documentado como
melhoria futura: mover para uma função `plpgsql` transacional via RPC).

### Phase 5: PWA, Polimento e Entrega
**Rationale:** manifest e service worker só fazem sentido sobre telas reais; é também onde os
critérios não-funcionais (instalabilidade, acessibilidade, documentação) são validados contra
produção, não contra `ng serve`.
**Depends on:** Fases 2–4 funcionalmente completas.
**Delivers:** `manifest.webmanifest` customizado + ícones 192/512 maskable; `ngsw-config.json`;
listener de `SwUpdate.versionUpdates`; responsividade mobile-first + auditoria WCAG 2.1 AA;
`vercel.json` com rewrite de SPA e output directory `dist/<app>/browser` confirmados; variáveis
de ambiente geradas em build-time na Vercel; protótipo Figma linkado; README consolidando
PRD + ER; Issues/Kanban no GitHub Projects (idealmente mantido desde a Fase 1, não fechado aqui).
**Can run in parallel with:** escrita de `.spec.md`/documentação de processo (ID30) e
configuração de MCP/Skills (ID31) — artefatos independentes do código.
**Avoids:** Pitfall 10 (PWA não instalável — validar com Lighthouse contra produção), Pitfall 11
(cache do service worker servindo build antigo), Pitfall 12 (404 em deep link `/join/<token>`
na Vercel), Pitfall 13 (output directory errado), Pitfall 14 (variáveis de ambiente ausentes no
build da Vercel).

### Phase Ordering Rationale

- A ordem segue dependência de dados real: banco+RLS → autenticação → grupos → sorteio → PWA/
  entrega. Não é uma ordem arbitrária de "o que é mais fácil primeiro" — é a cadeia de
  pré-requisitos funcionais do próprio domínio (não se autentica sem `profile`, não se cria
  grupo sem autenticação, não se sorteia sem grupo com participantes).
- Duas oportunidades de paralelismo reais, já identificadas pela pesquisa de arquitetura: (1)
  deploy Vercel + Gitflow podem ser configurados desde a Fase 1, em paralelo ao trabalho de
  schema/RLS; (2) a feature de API pública + interceptors (ID19/22/24) é estruturalmente
  desacoplada do Supabase e pode ser um branch paralelo à Fase 3.
- A convergência de indicadores mais importante do roadmap: a chamada à `BrasilAPI` de feriados
  é a **única** chamada HTTP de todo o projeto que passa pelo `HttpClient` do Angular — todo o
  tráfego Supabase usa `fetch` nativo internamente e nunca atravessa um interceptor Angular.
  Por isso essa única chamada fecha simultaneamente ID19 (GET em API pública), ID22
  (interceptors funcionais — o único lugar onde eles podem legitimamente se aplicar neste
  projeto), ID24 (`toSignal()`), e ID7 (`DatePipe` na formatação da data do feriado), além de
  viver dentro do bloco `@defer` (ID8) da Fase 4. Tratar essa chamada como uma tarefa dispersa
  e genérica seria desperdiçar o maior ganho de eficiência de todo o roadmap — ela deve ser uma
  entrega nomeada e explícita, não um detalhe de implementação de outra fase.

### Research Flags

Phases likely needing deeper research during planning:
- **Fase 1 (RLS):** as policies e as funções `SECURITY DEFINER` já têm SQL de referência
  pronto na pesquisa de arquitetura, mas vale uma rodada de `/gsd:research-phase` focada em
  *testar* essas policies com usuários simulados antes de integrar ao frontend — é o ponto de
  maior custo de recuperação se descoberto tarde.
- **Fase 4 (Edge Function):** a atomicidade entre inserir pares e fechar o grupo é um débito
  técnico conhecido e aceito para o MVP; se houver tempo, pesquisar o padrão de função
  `plpgsql` transacional via RPC como melhoria, mas isso não deve bloquear a fase.

Phases with standard patterns (skip research-phase):
- **Fase 2 (Autenticação):** padrão Supabase Auth + Signal bem documentado, com snippet de
  referência completo já na pesquisa de stack.
- **Fase 5 (PWA/Deploy):** `ng add @angular/pwa` + `vercel.json` são schematics/configuração
  padrão, amplamente documentados; os pitfalls conhecidos (output directory, rewrite de SPA)
  já têm checklist de verificação pronto no PITFALLS.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | ALTA | Versões e peer dependencies confirmadas via `npm view` (registry oficial), não opinião de blog; os dois conflitos bloqueantes já foram decididos e refletidos em `docs/sdd.md`/`docs/prd.md` |
| Features | ALTA (table stakes) / MÉDIA (recomendações de UX) | Mercado (Elfster, DrawNames) e API pública (`BrasilAPI`) verificados ao vivo via `curl`; padrões de revelação de par vêm de fontes gerais de design, não específicas de Secret Santa |
| Architecture | ALTA | RLS, recursão e algoritmo de sorteio verificados contra documentação oficial do Supabase e prova matemática direta; único ponto de confiança MÉDIA é o snippet exato de propagação de header de Auth na Edge Function, não testado neste projeto ainda |
| Pitfalls | ALTA (regras de lint, RLS) / MÉDIA (detalhes de deploy Vercel) | Regras `@angular-eslint` confirmadas no repositório oficial; pitfalls de Vercel vêm majoritariamente de fontes de comunidade, consistentes entre si mas não de documentação oficial exaustiva |

**Overall confidence:** ALTA

### Gaps to Address

- **Atomicidade cross-statement na Edge Function** (inserir pares + fechar grupo): débito
  técnico conhecido, aceitável para o MVP, mas deve ser escrito explicitamente no roadmap/SDD
  como limitação documentada, não descoberto como bug depois.
- **Snippet exato de propagação de JWT para a Edge Function:** confiança MÉDIA na pesquisa de
  stack — validar na prática durante a Fase 4, antes de assumir que o padrão documentado
  funciona sem ajuste.
- **Detalhes de configuração da Vercel (`outputDirectory`, auto-detect):** confiança MÉDIA-ALTA;
  vale testar o auto-detect da Vercel primeiro, antes de forçar `vercel.json` manual, já que a
  plataforma frequentemente acerta sozinha para projetos Angular.
- **Uniformidade do algoritmo de sorteio:** o pareamento circular garante matematicamente zero
  autossorteio, mas não é uma derangement uniformemente aleatória (exclui mutuamente pares
  A↔B). Isso é desejável para o caso de uso, mas deve ser mencionado proativamente na banca se
  o professor perguntar sobre uniformidade estatística — não é uma lacuna a corrigir, é uma
  nuance a saber explicar.

## Sources

### Primary (HIGH confidence)
- `npm view` (registry oficial, 2026-10-14) — versões exatas e peer dependencies de todos os pacotes da stack
- [angular.dev](https://angular.dev) (overview, tailwind, routing/common-router-tasks, http/interceptors, ecosystem/service-workers/devops) — documentação oficial Angular
- [spartan.ng/documentation/installation](https://spartan.ng/documentation/installation) — requisitos e fluxo de instalação do Spartan UI
- [supabase.com/docs](https://supabase.com/docs) (RLS, migrating to publishable/secret keys, functions-invoke, tutorials/with-angular) — documentação oficial Supabase
- [github.com/angular-eslint/angular-eslint](https://github.com/angular-eslint/angular-eslint) — regras de lint verificadas diretamente no repositório oficial
- [BrasilAPI feriados](https://brasilapi.com.br/api/feriados/v1/2026) — verificado ao vivo via `curl` em 2026-10-14 (CORS, shape de resposta, keyless)
- [vercel.com/kb](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404) — documentação oficial da Vercel sobre rewrites de SPA

### Secondary (MEDIUM confidence)
- [github.com/orgs/supabase/discussions/47525](https://github.com/orgs/supabase/discussions/47525) — confirmação cruzada do erro `42P17`
- [elfster.com](https://www.elfster.com/content/secret-santa-rules) / [yourappland.com — Elfster vs DrawNames](https://yourappland.com/elfster-vs-drawnames-comparison/) — padrões de mercado de produtos de Secret Santa
- [itishermann.me — mysterious 404 Angular 19 Vercel](https://itishermann.me/fixing-the-mysterious-404-when-deploying-angular-19-to-vercel) — mudança de output directory do builder `application`

### Tertiary (LOW confidence)
- Fontes gerais de UX (scratch-card/flip-card/tap-and-hold) — sem fonte específica de apps de Secret Santa; recomendação final priorizou simplicidade de implementação sobre "melhor prática" isolada de UX

---
*Research completed: 2026-10-14*
*Ready for roadmap: yes*
