# Roadmap: UTF-Secret

**Core Value:** O sorteio é privado de verdade — garantido pelo banco (RLS), não pela interface — e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.

**Granularidade:** coarse (5 fases, pedido explícito do usuário: projeto simples, fácil de explicar numa banca)

---

## Phases

- [ ] **Phase 1: Fundação — Scaffold, Banco e RLS** - Projeto Angular + Tailwind + Spartan rodando, schema completo com RLS testada manualmente, ESLint mecanicamente travando sintaxe antiga, Gitflow + Kanban + deploy Vercel operacionais desde o início
- [ ] **Phase 2: Autenticação End-to-End** - Usuário cria conta, loga, mantém sessão após F5, faz logout, e rotas protegidas redirecionam quem não está autenticado
- [ ] **Phase 3: Grupos, Participantes, Wishlist e API Pública** - Administrador cria grupo e gerencia participantes via convite; participante mantém sua lista de desejos; aplicação consome uma API pública externa via HttpClient com interceptor funcional
- [ ] **Phase 4: Sorteio e Revelação** - Sorteio roda uma única vez em Edge Function, sem autossorteio, e cada participante revela e vê apenas o próprio par — provadamente inacessível ao administrador
- [ ] **Phase 5: PWA, Acessibilidade e Entrega** - Aplicação instalável, responsiva e acessível em produção, com toda a documentação de entrega (PRD/SDD/ER, protótipo Figma, spec técnica) consolidada

---

## Phase Details

### Phase 1: Fundação — Scaffold, Banco e RLS

**Goal**: Existe uma base técnica completa e comprovadamente segura sobre a qual toda feature subsequente é construída — banco com privacidade garantida por RLS (não por UI), e um pipeline de qualidade que torna a rubrica mecanicamente verificável desde o primeiro commit.

**Depends on**: Nada (primeira fase).

**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11, UI-01, UI-02, ENG-01, ENG-04, ENG-05, ENG-06, ENG-08, ENG-10

**Success Criteria** (o que precisa ser OBSERVAVELMENTE verdadeiro):
  1. O scaffold Angular `^21.x` standalone + Tailwind `^4.x` + Spartan UI compila e roda (`ng serve`) sem nenhum componente `NgModule`
  2. As 4 tabelas (`profile`, `group`, `participant`, `draw`) existem no Supabase com todas as constraints (`UNIQUE`, `CHECK`) e índices, e RLS está habilitada nas 4 — verificável por `SELECT tablename, rowsecurity FROM pg_tables`
  3. Testando manualmente no SQL Editor com dois usuários distintos (antes de qualquer código de frontend): usuário B não lê/escreve linhas de `draw`/`participant`/`group` pertencentes a usuário A — nenhuma policy usa `using (true)` nem recursiona (42P17)
  4. `npx eslint src --max-warnings=0` falha o build se alguém usar `*ngIf`/`*ngFor`, `@Input()`/`@Output()`, DI por construtor ou `standalone: false`
  5. Push na branch `main` dispara deploy automático na Vercel; existe branch `develop`, pelo menos um Pull Request mesclado, um Kanban populado no GitHub Projects, e nenhuma `service_role`/`sb_secret_` key aparece em `grep` no bundle de produção

**Plans**: 4 plans (3 waves)

Plans:
- [x] 01-01-PLAN.md — Schema, constraints, índices, funções `private` SECURITY DEFINER e todas as policies de RLS, provadas com dois usuários no SQL Editor (DB-01..DB-10)
- [x] 01-02-PLAN.md — Kanban no GitHub Projects com as 11 user stories como Issues, evidência de Gitflow, MCP documentado no SDD (ENG-06, ENG-08, ENG-10)
- [x] 01-03-PLAN.md — Scaffold Angular 21 LTS + Tailwind v4 + Spartan UI + ESLint com as 7 regras como `error`, com teste negativo executado (UI-01, UI-02, ENG-01, ENG-04)
- [x] 01-04-PLAN.md — Deploy Vercel com rewrite de SPA, gate de CI (lint + grep de secrets), e as PRs que materializam o Gitflow (ENG-05, ENG-06, DB-11)

**Waves**: Wave 1 = 01-01 + 01-02 (paralelos) · Wave 2 = 01-03 (bloqueado por DB-10) · Wave 3 = 01-04

**UI hint**: yes

---

### Phase 2: Autenticação End-to-End

**Goal**: Qualquer pessoa consegue criar conta, entrar, permanecer logada e sair — com o estado de sessão como única fonte de verdade reativa (Signal), nunca um booleano ingênuo nem uma tela "piscando" para login no F5.

**Depends on**: Fase 1 (precisa da tabela `profile`, do trigger `handle_new_user` e das policies já testadas).

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Success Criteria**:
  1. Visitante cria conta com e-mail/senha e a tabela `profile` é populada automaticamente (trigger), sem nenhuma chamada extra do frontend
  2. Usuário loga com e-mail/senha e recebe uma sessão JWT válida, refletida imediatamente num Signal de estado (`'loading' | 'authenticated' | 'unauthenticated'`)
  3. Ao recarregar a página (F5) em uma rota autenticada, a sessão é restaurada sem flash de redirecionamento para `/login`
  4. Usuário faz logout a partir de qualquer página autenticada e a sessão é encerrada de fato (nova tentativa de acessar rota protegida redireciona para `/login`)
  5. Visitante não autenticado que tenta acessar uma rota protegida é redirecionado para `/login` pelo guard funcional

**Plans**: 4 plans (3 waves)

Plans:
- [x] 02-01-PLAN.md — `SupabaseClientService` injetável, `AuthService` com um signal de sessão e tudo derivado em `computed()`, mapa PT-BR de erros do Auth (AUTH-01..03, AUTH-06)
- [x] 02-02-PLAN.md — Geração das primitivas Spartan `input` e `label` em `libs/ui/`, sem nenhuma dependência nova, registrada no SDD §2.1 (AUTH-01, AUTH-02)
- [ ] 02-03-PLAN.md — `authGuard` funcional com `returnUrl`, `provideAppInitializer` matando o flash no F5, rotas com layout autenticado aninhado, header com logout e `/dashboard` placeholder (AUTH-03..05)
- [ ] 02-04-PLAN.md — Reactive Forms de `/login` e `/register` com validação PT-BR e submit condicional, mais o checkpoint que confere `profile.display_name` no banco (AUTH-01, AUTH-02, AUTH-04..06)

**Waves**: Wave 1 = 02-01 + 02-02 (paralelos) · Wave 2 = 02-03 · Wave 3 = 02-04 (checkpoint humano)

**UI hint**: yes

---

### Phase 3: Grupos, Participantes, Wishlist e API Pública

**Goal**: Um administrador consegue montar um grupo de ponta a ponta (criar, convidar, gerenciar participantes) e qualquer participante mantém sua própria lista de desejos — e, em paralelo, a aplicação prova que sabe consumir uma API HTTP externa com todo o ferramental moderno do Angular (`HttpClient`, interceptors funcionais, `toSignal()`).

**Depends on**: Fase 2 (precisa de usuário autenticado e do `authGuard`). A mini-feature de API pública é independente de Supabase e pode ser construída em paralelo, em branch separado.

**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, GRP-05, GRP-06, GRP-07, GRP-08, GRP-09, WISH-01, WISH-02, WISH-03, API-01, API-02, API-03, API-04

**Success Criteria**:
  1. Administrador cria um grupo (Reactive Form validado), recebe um link de convite único e único clique copia esse link
  2. Administrador vê a lista de participantes do grupo e consegue remover qualquer um; tentar entrar duas vezes no mesmo grupo é rejeitado com mensagem clara, e um grupo não `open` para de aceitar novos participantes
  3. Usuário autenticado entra em um grupo abrindo o link de convite diretamente (deep link), e o dashboard mostra separadamente os grupos que administra e os que participa
  4. Participante cadastra e edita a própria lista de desejos a qualquer momento antes do encerramento, mas não consegue editar a de outra pessoa
  5. A tela exibe quantos dias faltam até o Natal, obtidos de um `GET` real à `BrasilAPI` via `HttpClient`, convertidos de Observable para Signal (`toSignal()`), com falhas de rede tratadas por um interceptor funcional centralizado

**Plans**: TBD

**UI hint**: yes

---

### Phase 4: Sorteio e Revelação

**Goal**: O sorteio acontece uma única vez, de forma matematicamente livre de autossorteio, rodando inteiramente fora do alcance do administrador — e cada participante revela deliberadamente apenas o próprio par, nunca o de outra pessoa. Esta é a fase que prova o core value do projeto.

**Depends on**: Fase 3 (precisa de participantes reais num grupo `open` com `n ≥ 3`).

**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, DRAW-06, DRAW-07, DRAW-08, DRAW-09, DRAW-10, ENG-02, ENG-03

**Success Criteria**:
  1. Administrador aciona o sorteio pela tela de gestão do grupo e ele roda inteiramente na Edge Function (nunca no cliente); com menos de 3 participantes, a ação é bloqueada com mensagem explicativa
  2. Clicar duas vezes (ou duas abas) no botão de sorteio produz exatamente N pares, nunca duplicados — a segunda invocação é rejeitada e o grupo muda para `status = 'closed'` só uma vez
  3. Testes `.spec.ts` comprovam automaticamente: ausência de autossorteio, *perfect matching* (cada pessoa dá e recebe exatamente uma vez), e rejeição da segunda invocação
  4. Cada participante revela o próprio par com uma ação deliberada (cartão flip controlado por Signal) e, através desse par, vê a lista de desejos de quem tirou
  5. Autenticando como o administrador e tentando ler a tabela `draw` de outro participante via chamada direta ao client (DevTools/console), o resultado vem vazio — prova prática, não só de UI, de que o admin não acessa os pares

**Plans**: TBD

**UI hint**: yes

---

### Phase 5: PWA, Acessibilidade e Entrega

**Goal**: O produto é instalável, usável em qualquer tela a partir de 320px, acessível, e toda a documentação exigida pela rubrica de processo/entrega está consolidada e publicamente verificável — prontos para a banca.

**Depends on**: Fases 2–4 funcionalmente completas (manifest e auditoria não têm sobre o que atuar sem telas reais).

**Requirements**: UI-03, UI-04, UI-05, UI-06, UI-07, ENG-07, ENG-09

**Success Criteria**:
  1. A aplicação em produção (Vercel) é instalável como PWA, confirmado pelo Lighthouse/DevTools sem erros de manifest, com `manifest.webmanifest` completo (ícones, `theme_color`, `background_color`, `display: standalone`)
  2. Perder a conexão exibe feedback visual claro de estado offline
  3. O layout funciona a partir de 320px de largura e os fluxos principais passam auditoria WCAG 2.1 AA (contraste, foco visível, labels, navegação por teclado)
  4. O README consolida o PRD (incluindo diagrama ER em Mermaid e design system) e linka um protótipo Figma navegável e público
  5. Existe um `.spec.md` detalhando os componentes Standalone e Services do projeto

**Plans**: TBD

**UI hint**: yes

---

## Cobertura de Requisitos

**60/60 requisitos v1 mapeados · 0 órfãos ✓**

| Requisito | Fase |
|-----------|------|
| DB-01..11 | Fase 1 |
| UI-01, UI-02 | Fase 1 |
| ENG-01, ENG-04, ENG-05, ENG-06, ENG-08, ENG-10 | Fase 1 |
| AUTH-01..06 | Fase 2 |
| GRP-01..09 | Fase 3 |
| WISH-01..03 | Fase 3 |
| API-01..04 | Fase 3 |
| DRAW-01..10 | Fase 4 |
| ENG-02, ENG-03 | Fase 4 |
| UI-03..07 | Fase 5 |
| ENG-07, ENG-09 | Fase 5 |

## Cobertura do Checklist (RA1–RA8)

**33/33 indicadores mapeados · 0 sem fase ✓** (correção: REQUIREMENTS.md citava 34 por erro de soma; a contagem real de `docs/checklist.md` é RA1(3) + RA2(6) + RA3(4) + RA4(2) + RA5(4) + RA6(6) + RA7(3) + RA8(5) = 33 — já corrigido na seção de traceability)

| Indicador | Fase |
|-----------|------|
| RA1-ID1 (Figma) | Fase 5 |
| RA1-ID2 (Mobile-First) | Fase 5 |
| RA1-ID3 (PWA) | Fase 5 |
| RA2-ID3 (Standalone) | Fase 1 (lint) + todo o frontend |
| RA2-ID4 (CSS moderno) | Fase 1 |
| RA2-ID5 (`@if`/`@switch`) | Fase 1 (lint) + Fase 4 (DRAW-08) |
| RA2-ID6 (`@for` + track) | Fase 3 (GRP-04/09) |
| RA2-ID7 (Pipes) | Fase 3 (API-02, WISH-01) |
| RA2-ID8 (`@defer`) | Fase 4 (DRAW-09) + Fase 3 (API-02) |
| RA3-ID9 (Signals one-way) | Fase 2 (AUTH-03) + Fase 4 (DRAW-08) + Fase 3 (API-04) |
| RA3-ID10 (Event binding) | Fase 4 (DRAW-08) + Fase 3 (GRP-01/05) |
| RA3-ID11 (`model()`) | Fase 3 (WISH-02) |
| RA3-ID12 (`effect()`) | Fase 2 (AUTH-03) + Fase 5 (UI-05) |
| RA4-ID13 (`input()`/`output()`) | Fase 4 (DRAW-08) + Fase 3 (GRP-04) |
| RA4-ID14 (`inject()`) | Fase 2 + Fase 3 + Fase 4 (todos os core services) |
| RA5-ID15 (`provideRouter`) | Fase 2 (AUTH-05) + Fase 3 (GRP-06) |
| RA5-ID16 (route params como input) | Fase 3 (GRP-06) + Fase 4 (DRAW-08) |
| RA5-ID17 (rotas filhas) | Fase 3 (GRP-01..05) |
| RA5-ID18 (guards/resolvers funcionais) | Fase 2 (AUTH-05) + Fase 3 (GRP-04) + Fase 4 (DRAW-08) |
| RA6-ID19 (GET API pública) | Fase 3 (API-01) |
| RA6-ID20 (sessão JWT via BaaS) | Fase 2 (AUTH-01/02/03) |
| RA6-ID21 (CRUD completo) | Fase 3 (GRP-01/04/05, WISH-02) |
| RA6-ID22 (interceptors funcionais) | Fase 3 (API-03) |
| RA6-ID23 (Reactive Forms) | Fase 2 (AUTH-01/02) + Fase 3 (GRP-01, WISH-01) |
| RA6-ID24 (`toSignal()`/`toObservable()`) | Fase 3 (API-04) |
| RA7-ID25 (Gitflow) | Fase 1 (ENG-06) |
| RA7-ID26 (Pull Requests) | Fase 1 (ENG-06) |
| RA7-ID27 (build + deploy) | Fase 1 (ENG-04/05) |
| RA8-ID28 (Issues + Kanban) | Fase 1 (ENG-08) |
| RA8-ID29 (ER + Design System no README) | Fase 5 (ENG-07) |
| RA8-ID30 (`.spec.md`) | Fase 5 (ENG-09) |
| RA8-ID31 (MCP + Skills) | Fase 1 (ENG-10) |
| RA8-ID32 (testes unitários) | Fase 4 (ENG-02/03) |

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação — Scaffold, Banco e RLS | 0/4 | Planned | - |
| 2. Autenticação End-to-End | 0/TBD | Not started | - |
| 3. Grupos, Participantes, Wishlist e API Pública | 0/TBD | Not started | - |
| 4. Sorteio e Revelação | 0/TBD | Not started | - |
| 5. PWA, Acessibilidade e Entrega | 0/TBD | Not started | - |

---
*Roadmap criado em: 2026-10-14*
