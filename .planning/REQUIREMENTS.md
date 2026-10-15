# Requisitos: UTF-Secret

**Definido em:** 2026-10-14
**Core Value:** O sorteio é privado de verdade — garantido pelo banco (RLS), não pela interface — e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.

> **Nota sobre a numeração do checklist.** Os indicadores de `docs/checklist.md` são
> numerados **por RA**, não globalmente. Existem **dois ID3 distintos**: `RA1-ID3` (PWA /
> `manifest.webmanifest`) e `RA2-ID3` (componentes Standalone). São 34 itens no total, não
> 32. Neste documento eles aparecem sempre com o prefixo do RA para que nenhum dos dois
> seja perdido por ambiguidade.

---

## Requisitos v1

### Autenticação (AUTH)

- [ ] **AUTH-01**: Visitante cria conta com e-mail e senha via Supabase Auth
- [ ] **AUTH-02**: Usuário faz login com e-mail e senha e recebe sessão JWT
- [ ] **AUTH-03**: Sessão persiste após recarregar a página (`onAuthStateChange` → Signal)
- [ ] **AUTH-04**: Usuário faz logout a partir de qualquer página autenticada
- [ ] **AUTH-05**: Rotas protegidas redirecionam visitante não autenticado para `/login`
- [ ] **AUTH-06**: Criação de conta popula automaticamente a tabela `profile` (trigger `handle_new_user`)

### Banco de Dados e Segurança (DB)

- [ ] **DB-01**: Schema criado com as 4 tabelas (`profile`, `group`, `participant`, `draw`) conforme SDD §3
- [ ] **DB-02**: Constraint `UNIQUE (group_id, user_id)` em `participant` impede entrada dupla no mesmo grupo
- [ ] **DB-03**: Constraints `UNIQUE (group_id, giver_id)` e `UNIQUE (group_id, receiver_id)` em `draw` provam no banco que o resultado é um *perfect matching*
- [ ] **DB-04**: Constraint `CHECK (giver_id <> receiver_id)` em `draw` como defesa em profundidade contra autossorteio
- [ ] **DB-05**: Funções `private.my_group_ids()` e `private.my_participant_ids()` criadas como `SECURITY DEFINER` com `search_path = ''` em schema `private` (evita recursão 42P17 e não é exposta na Data API)
- [ ] **DB-06**: RLS habilitada nas 4 tabelas, sem nenhuma policy permissiva `using (true)`
- [ ] **DB-07**: Policy de `draw` permite SELECT **apenas** da própria linha como `giver`, sem nenhuma exceção para `admin_id`
- [ ] **DB-08**: Nenhuma policy de INSERT/UPDATE/DELETE em `draw` para o papel `authenticated` — a única escrita vem da Edge Function
- [ ] **DB-09**: Índices criados nas colunas usadas pelas policies (`group_id`, `user_id`, `giver_id`, `admin_id`)
- [ ] **DB-10**: Políticas validadas manualmente no SQL Editor com dois usuários distintos antes de qualquer código de frontend
- [ ] **DB-11**: A `service_role` / `sb_secret_` key existe apenas no ambiente da Edge Function e nunca no bundle do cliente

### Gestão de Grupos (GRP)

- [ ] **GRP-01**: Administrador cria um grupo informando nome (Reactive Form validado)
- [ ] **GRP-02**: Sistema gera um `invite_token` único por grupo
- [ ] **GRP-03**: Administrador visualiza o link de convite e consegue copiá-lo
- [ ] **GRP-04**: Administrador vê a lista de participantes do seu grupo
- [ ] **GRP-05**: Administrador remove um participante do grupo
- [ ] **GRP-06**: Usuário autenticado entra em um grupo via link de convite
- [ ] **GRP-07**: Tentativa de entrar duas vezes no mesmo grupo é rejeitada com mensagem clara
- [ ] **GRP-08**: Grupo com status diferente de `open` não aceita novos participantes
- [ ] **GRP-09**: Usuário vê no dashboard os grupos que administra e os que participa

### Sorteio (DRAW)

- [ ] **DRAW-01**: Administrador aciona o sorteio a partir da tela de gestão do grupo
- [ ] **DRAW-02**: Sorteio roda em Supabase Edge Function, nunca no cliente
- [ ] **DRAW-03**: Edge Function valida que o chamador é o `admin_id` do grupo
- [ ] **DRAW-04**: Sorteio é bloqueado com menos de 3 participantes, com mensagem explicativa
- [ ] **DRAW-05**: Sorteio usa Fisher-Yates + pareamento circular (ciclo único), garantindo estruturalmente zero autossorteio
- [ ] **DRAW-06**: Segunda invocação é rejeitada por lock otimista (`UPDATE ... WHERE status='open'`, aborta se 0 linhas afetadas)
- [ ] **DRAW-07**: Grupo passa para `status = 'closed'` ao fim do sorteio
- [ ] **DRAW-08**: Participante revela o próprio par com ação deliberada (cartão flip controlado por Signal)
- [ ] **DRAW-09**: Participante vê a lista de desejos de quem tirou
- [ ] **DRAW-10**: Administrador não consegue ler os pares — verificável na prática, não só na UI

### Lista de Desejos (WISH)

- [ ] **WISH-01**: Participante cadastra a própria lista de desejos (texto livre, opcional)
- [ ] **WISH-02**: Participante edita a própria lista de desejos a qualquer momento antes do encerramento
- [ ] **WISH-03**: Participante não consegue editar a lista de desejos de outra pessoa

### Contexto Externo / API Pública (API)

> Esta é a **única** feature cujo tráfego passa pelo `HttpClient` do Angular — e por isso é
> o único lugar onde os interceptors funcionais (ID22) podem legitimamente atuar, já que o
> `supabase-js` usa `fetch` próprio e nunca passa pelo `HttpClient`.

- [ ] **API-01**: Aplicação consome `GET https://brasilapi.com.br/api/feriados/v1/{ano}` via `HttpClient`
- [ ] **API-02**: Interface exibe quantos dias faltam para o Natal, derivado da resposta da API
- [ ] **API-03**: Interceptor funcional de erro trata falhas dessa chamada de forma centralizada
- [ ] **API-04**: Resposta é convertida de Observable para Signal via `toSignal()`

### Interface e PWA (UI)

- [ ] **UI-01**: Layout mobile-first funcional a partir de 320px de largura
- [ ] **UI-02**: Interface construída com Tailwind CSS v4 + componentes Spartan UI
- [ ] **UI-03**: `manifest.webmanifest` configurado com ícones, `theme_color`, `background_color` e `display: standalone`
- [ ] **UI-04**: Aplicação é instalável como PWA (verificado no Lighthouse/DevTools)
- [ ] **UI-05**: Estado offline exibe feedback visual ao usuário
- [ ] **UI-06**: Acessibilidade WCAG 2.1 AA nos fluxos principais (contraste, foco, labels, navegação por teclado)
- [ ] **UI-07**: Protótipo navegável no Figma com link público no README

### Qualidade e Entrega (ENG)

- [ ] **ENG-01**: ESLint configurado com as 5 regras que tornam a rubrica mecanicamente verificável (`prefer-control-flow`, `prefer-signals`, `prefer-inject`, `prefer-standalone`, `prefer-signal-model`)
- [ ] **ENG-02**: Testes unitários (`.spec.ts`) cobrindo o algoritmo de sorteio: ausência de autossorteio e *perfect matching*
- [ ] **ENG-03**: Teste cobrindo a rejeição da segunda invocação do sorteio
- [ ] **ENG-04**: Build de produção executa sem erros nem warnings de lint
- [ ] **ENG-05**: Deploy automatizado na Vercel a partir da branch `main`, com rewrite de SPA configurado
- [ ] **ENG-06**: Gitflow mantido (`main` + `develop`) com integrações via Pull Request
- [ ] **ENG-07**: README consolida o PRD (diagrama ER em Mermaid + design system)
- [ ] **ENG-08**: User stories cadastradas como Issues em um Kanban no GitHub Projects
- [ ] **ENG-09**: Documento de especificação técnica (`.spec.md`) detalhando componentes Standalone e Services
- [ ] **ENG-10**: Servidores MCP configurados na IDE (Supabase e/ou Figma) documentados no SDD

---

## Rastreabilidade do Checklist (RA1–RA8)

Cada indicador do `docs/checklist.md` mapeado para os requisitos que o demonstram. Esta é
a tabela que garante o pedido central do usuário: **cumprir o checklist inteiro.**

| Indicador | Exigência | Requisitos que demonstram |
|:----------|:----------|:--------------------------|
| **RA1-ID1** | Protótipo navegável (Figma) com link público | UI-07 |
| **RA1-ID2** | Interfaces responsivas Mobile-First | UI-01 |
| **RA1-ID3** | PWA: `manifest.webmanifest`, ícones, tema, splash, standalone, offline | UI-03, UI-04, UI-05 |
| **RA2-ID3** | Componentes estritamente Standalone (sem `NgModules`) | ENG-01 (regra `prefer-standalone`) + todo o frontend |
| **RA2-ID4** | Framework CSS moderno incorporado e customizado | UI-02 |
| **RA2-ID5** | `@if` / `@switch` para exibição condicional | ENG-01 (regra `prefer-control-flow`), DRAW-08 |
| **RA2-ID6** | `@for` com `track` obrigatório | GRP-04 (lista de participantes), GRP-09 — garantido por erro de compilação NG5002 |
| **RA2-ID7** | Pipes (nativos ou customizados) | API-02 (`DatePipe` na data do feriado), WISH-01 |
| **RA2-ID8** | Deferrable Views (`@defer`) | DRAW-09 + API-02 (bloco diferido com `on viewport`) |
| **RA3-ID9** | One-way binding com Signals (`writable` + `computed`) | AUTH-03, DRAW-08, API-04 |
| **RA3-ID10** | Event binding `( )` atualizando estado | DRAW-08, GRP-01, GRP-05 |
| **RA3-ID11** | Two-way binding com `model()` | WISH-02 (campo de lista de desejos) |
| **RA3-ID12** | `effect()` para efeitos colaterais reativos | AUTH-03 (sincronizar sessão), UI-05 (status offline) |
| **RA4-ID13** | Funções `input()` / `output()` | DRAW-08 (cartão de revelação), GRP-04 (item de participante) |
| **RA4-ID14** | `inject()` em Services para comunicação não hierárquica | AUTH-01..06, GRP-*, DRAW-* (todos os core services) |
| **RA5-ID15** | `provideRouter` + `withComponentInputBinding` | AUTH-05, GRP-06 |
| **RA5-ID16** | Parâmetros de rota recebidos como `@Input()` | GRP-06 (`/join/:token`), DRAW-08 (`/draw/:groupId/result`) |
| **RA5-ID17** | Rotas filhas aninhadas (hierarquia de layout) | GRP-01..05 (layout `/group` com `<router-outlet>` próprio) |
| **RA5-ID18** | Functional Guards + Resolvers | AUTH-05 (`authGuard`), GRP-04 (`adminGuard` + `groupResolver`), DRAW-08 (`drawResultResolver`) |
| **RA6-ID19** | GET a uma API pública | API-01 |
| **RA6-ID20** | Autenticação e sessão JWT via BaaS | AUTH-01, AUTH-02, AUTH-03 |
| **RA6-ID21** | CRUD completo contra o BaaS | GRP-01 (C), GRP-04 (R), WISH-02 (U), GRP-05 (D) |
| **RA6-ID22** | Functional Interceptors (token + erro centralizado) | API-03 |
| **RA6-ID23** | Reactive Forms com validação e submit desabilitado | AUTH-01, AUTH-02, GRP-01, WISH-01 |
| **RA6-ID24** | Ponte `toSignal()` / `toObservable()` | API-04 |
| **RA7-ID25** | Repositório com Gitflow (`main` + `develop`) | ENG-06 |
| **RA7-ID26** | Pull Requests e resolução de conflitos | ENG-06 |
| **RA7-ID27** | Build moderno + deploy automatizado | ENG-04, ENG-05 |
| **RA8-ID28** | User Stories geradas com IA + Kanban no GitHub Projects | ENG-08 |
| **RA8-ID29** | Modelagem ER em Mermaid + Design System no README (PRD) | ENG-07 |
| **RA8-ID30** | Documento de especificação rigoroso (`.spec.md`) | ENG-09 |
| **RA8-ID31** | MCP + Skills de Angular 20+ configurados na IDE | ENG-10 (+ stack fixada em Angular ^21) |
| **RA8-ID32** | Testes unitários (`.spec.ts`) nas regras de negócio | ENG-02, ENG-03 |

**Cobertura:** 34 indicadores · 34 mapeados · 0 sem requisito correspondente ✓

---

## Requisitos v2 (adiados — não bloqueiam a nota)

### Melhorias de Robustez

- **V2-01**: Mover o INSERT dos pares e o UPDATE de `status` para uma função plpgsql transacional via RPC (fecha a janela não atômica da Edge Function — débito técnico conhecido e documentado)
- **V2-02**: Trigger `BEFORE UPDATE` validando as transições de `group.status` no banco
- **V2-03**: Confirmação de presença (RSVP) explícita antes do sorteio
- **V2-04**: Avatar gerado automaticamente por participante

---

## Fora de Escopo

| Feature | Motivo |
|---------|--------|
| Regras de exclusão de pares ("A não pode tirar B") | Transforma a rotação circular (trivial de provar e explicar) em problema de grafos com possibilidade de não ter solução; exige backtracking. Não destrava indicador novo |
| Chat entre participantes | Exige Realtime e moderação; abriria canal onde a identidade pode escapar, minando a privacidade garantida por RLS |
| Histórico de sorteios / grupos recorrentes | Exigiria modelar arquivamento e múltiplos resultados por participante, sem indicador correspondente |
| Login social (Google/Facebook) | ID20 pede apenas "sessão JWT via BaaS" — e-mail/senha já cumpre. OAuth soma configuração sem ganho |
| Notificações por e-mail/SMS/push | Exigiria cron ou serviço transacional; nenhum indicador pede |
| Controle de orçamento / valor do presente | Excluído no PRD |
| Upload de foto de avatar | Exigiria Supabase Storage e policies de bucket; sem indicador correspondente |
| Tabela `invite` com convite nominal por e-mail | A constraint `UNIQUE (group_id, user_id)` entrega a mesma garantia de negócio com uma linha de SQL (ver nota da RN5 no PRD) |

---

## Rastreabilidade por Fase

Preenchido durante a criação do roadmap.

| Requisito | Fase | Status |
|-----------|------|--------|
| (a ser preenchido pelo roadmapper) | — | Pendente |

---
*Requisitos definidos em: 2026-10-14*
*Última atualização: 2026-10-14 após inicialização*
