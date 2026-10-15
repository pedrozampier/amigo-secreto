---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
verified: 2026-10-15T13:50:00Z
status: gaps_found
score: 4/5 truths verified (1 partial, deliberately scoped and documented)
gaps:
  - truth: "Participante cadastra e edita a própria lista de desejos a qualquer momento antes do encerramento, mas não consegue editar a de outra pessoa"
    status: partial
    reason: >
      A escrita é protegida corretamente no banco (WISH-03 real), mas não existe
      nenhuma rota/tela alcançável por um participante que NÃO é admin do grupo.
      A única UI de wishlist vive em manage-group.page.html, atrás de
      /group/:id/manage, que o adminGuard bloqueia para não-admin. No dashboard,
      "Grupos que participo" renderiza <div> sem link — não há navegação possível
      até a wishlist. WISH-01 e WISH-02 estão corretamente desmarcados ([ ]) na
      seção de checklist do REQUIREMENTS.md, e o gap já está documentado em
      deferred-items.md como decisão deliberada (não uma descoberta nova desta
      verificação). Reportado aqui porque corresponde exatamente ao Success
      Criteria 4 do ROADMAP, que pede "participante cadastra e edita", não apenas
      "o banco garante que ninguém edita a lista de outro".
    artifacts:
      - path: "src/app/features/group/manage/manage-group.page.html"
        issue: "Textarea de wishlist existe e funciona, mas só é alcançável pela rota /group/:id/manage, que é admin-only"
      - path: "src/app/features/dashboard/dashboard.page.html"
        issue: "Seção 'Grupos que participo' usa <div> sem routerLink — nenhum destino de navegação para o participante puro"
    missing:
      - "Uma rota/tela para o participante não-admin (ex.: /group/:id) que exponha a própria wishlist, OU afrouxar o adminGuard em /manage com @if (souAdmin()) ocultando os controles exclusivos do admin — ambas as opções já avaliadas em deferred-items.md"
  - truth: "docs/sdd.md §5.1, §5.2 e §5.3 refletem a árvore de rotas e os services que esta fase realmente construiu (truth da plan 03-05)"
    status: failed
    reason: >
      A reconciliação do SDD (commit 8b54f9b, 10:19:20) aconteceu ANTES do fix que
      criou o adminGuard (commit 22f2181, 10:40:14) na mesma sessão de UAT. O SDD
      ficou congelado na versão pré-bugfix e hoje contém uma afirmação factualmente
      incorreta sobre o mecanismo de segurança que de fato impede um não-admin de
      abrir /group/:id/manage.
    artifacts:
      - path: "docs/sdd.md"
        issue: "§5.2 contém o parágrafo 'Sobre o adminGuard previsto na v1.0.0 deste documento. Ele não existe.' — mas admin.guard.ts existe, está em canActivate da rota e é o mecanismo real de proteção, substituindo a checagem que o próprio parágrafo descreve como vivendo no groupResolver. A tabela de rotas em §5.2 lista apenas 'herda authGuard + groupResolver' para /group/:id/manage, sem mencionar adminGuard. §5.1 não lista core/guards/admin.guard.ts na árvore de pastas. §5.3 não lista o guard entre os artefatos de Fase 3."
    missing:
      - "Atualizar §5.1 (árvore de pastas) para incluir core/guards/admin.guard.ts"
      - "Atualizar §5.2 (tabela de rotas) para refletir canActivate: [adminGuard] + resolve: { group: groupResolver } em /group/:id/manage, e remover ou reescrever o parágrafo que afirma a inexistência do adminGuard"
human_verification:
  - test: "Abrir /group/create em viewport de 320px e confirmar leiturabilidade/toque dos botões copiar link / ir para gerenciar"
    expected: "Layout mobile-first sem overflow horizontal, botões com área de toque adequada"
    why_human: "Avaliação visual/responsiva não é verificável por grep"
  - test: "Com duas contas reais, repetir o fluxo criar → convidar → entrar → gerenciar → remover, igual ao UAT documentado em 03-05-SUMMARY.md, para confirmar que os 4 defeitos corrigidos (admin_id FK, loading infinito, acesso cruzado a /manage, zero participantes) não regrediram"
    expected: "Os 4 comportamentos corrigidos continuam corrigidos"
    why_human: "Já foi feito uma vez (UAT aprovado pelo usuário) — reteste de regressão é opcional, não bloqueante, mas recomendado antes de fechar a fase definitivamente"
---

# Phase 3: Grupos, Participantes, Wishlist e API Pública — Verification Report

**Phase Goal:** Um administrador consegue montar um grupo de ponta a ponta (criar, convidar,
gerenciar participantes) e qualquer participante mantém sua própria lista de desejos — e, em
paralelo, a aplicação prova que sabe consumir uma API HTTP externa com todo o ferramental
moderno do Angular (`HttpClient`, interceptors funcionais, `toSignal()`).

**Verified:** 2026-10-15T13:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin cria grupo (Reactive Form validado), recebe link de convite único, copia em um clique | ✓ VERIFIED | `create-group.page.ts`/`.html`: `FormBuilder.nonNullable.group` com `Validators.required/minLength(3)/maxLength(60)`, `[disabled]="form.invalid \|\| enviando()"`, `navigator.clipboard.writeText` no botão "Copiar link". `invite_token` gerado pelo default do schema (0001), nunca pelo cliente |
| 2 | Admin vê/remove participantes; entrar 2x é rejeitado com mensagem clara; grupo não-`open` para de aceitar | ✓ VERIFIED | `manage-group.page.html` lista via `participant-row`, remoção em 2 passos com `confirmarRemocao`→`GroupService.removeParticipant`; migration 0004 devolve `ALREADY_MEMBER`/`GROUP_CLOSED`, traduzidos por `join-error-messages.ts`, exibidos em `join-group.page.html` |
| 3 | Usuário entra por deep link de convite; dashboard separa grupos administrados/participados | ✓ VERIFIED | `/join/:token` (rota flat), `JoinGroupPage` usa `input.required<string>()` + `withComponentInputBinding`; dashboard tem duas seções com `@for...track` sobre `administered`/`participated`, populadas por `refreshDashboard()` filtrando por `admin_id` |
| 4 | Participante cadastra e edita a própria wishlist a qualquer momento; não edita a de outro | ⚠️ PARTIAL | Escrita protegida de verdade (RLS `user_id = auth.uid()` + `updateWishList` hardcoded a `{wish_list}`) — WISH-03 real. Mas **não existe rota alcançável pelo participante não-admin** para editar a própria lista; a única tela com a textarea é admin-only. Gap já documentado em `deferred-items.md`, não é descoberta nova |
| 5 | Dashboard mostra dias até o Natal via `GET` real à BrasilAPI, `toSignal()`, interceptor funcional de erro | ✓ VERIFIED | `HolidayService.feriados` = `toSignal(http.get(...).pipe(catchError(() => of(null))))`; `errorInterceptor` registrado em `provideHttpClient(withInterceptors([errorInterceptor]))`; `diasAteNatal()` função pura testada em `dias-ate-natal.spec.ts`; card em `@defer (on viewport)` no dashboard; `DatePipe` formata a data do feriado |

**Score:** 4/5 verified, 1 partial (deliberately scoped, documented, not hidden)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0004_group_join_rpcs.sql` | RPCs `join_group_by_token`/`preview_group_by_token`, SECURITY DEFINER | ✓ VERIFIED | Confirmado no banco real (`pg_proc.prosecdef = true` para ambos). Preview devolve só `name, status`. Join devolve códigos `OK/INVALID_TOKEN/GROUP_CLOSED/ALREADY_MEMBER`, com defesa de corrida via `unique_violation` |
| `supabase/migrations/0005_admin_reads_participants.sql` | Admin lê participantes do próprio grupo, sem tocar `draw` | ✓ VERIFIED | Policy nova é só SELECT em `participant`, `group_id in (select g.id from group where admin_id = auth.uid())`. Confirmado via `pg_policies` no projeto real: nenhuma policy de `draw` foi alterada; `draw` continua com 1 única policy SELECT por `giver_id` |
| `src/app/core/join-error-messages.ts` | Mapa código→PT-BR | ✓ VERIFIED | `translateJoinError` + `GENERIC_JOIN_ERROR`, spec cobrindo os 3 códigos + fallback |
| `src/app/core/models/group.model.ts` | Contratos SDD §4 verbatim | ✓ VERIFIED | `Group`, `Participant`, `GroupStatus`, `JoinResult`, `GroupPreview` — campos idênticos ao SDD |
| `src/app/core/services/group.service.ts` | CRUD + RPCs, tudo em signals, refetch pós-mutação | ✓ VERIFIED | `_administered/_participated/_participants/_currentGroup` são `signal()`, toda mutação chama `refreshDashboard`/`refreshParticipants` antes de devolver. `updateWishList` hardcoded a `{wish_list}` apenas |
| `src/app/core/resolvers/group.resolver.ts` | Busca grupo, mas NÃO mais a checagem de admin | ✓ VERIFIED (revisado) | Checagem de admin foi corretamente MOVIDA para `admin.guard.ts` depois do UAT achar que `UrlTree` de `ResolveFn` não redireciona. Comentário interno do resolver documenta a mudança |
| `src/app/core/guards/admin.guard.ts` | Guard funcional que bloqueia não-admin, criado no UAT | ✓ VERIFIED | `CanActivateFn` real, compara `group.admin_id === auth.user()?.id`, devolve `router.createUrlTree(['/dashboard'])` quando falha. 4 testes em `admin.guard.spec.ts` cobrindo admin ok, não-admin, grupo null, rota sem `:id` |
| `src/app/features/group/group.routes.ts` | `canActivate: [adminGuard]` na rota `:id/manage` | ✓ VERIFIED | Lido diretamente do arquivo: `canActivate: [adminGuard]` + `resolve: { group: groupResolver }` na mesma rota — não é apenas uma afirmação do SUMMARY, é código real |
| `src/app/features/group/create/create-group.page.ts` | Reactive Form + link copiável | ✓ VERIFIED | min 40 linhas, formulário reativo, validação 3-60, clipboard |
| `src/app/features/dashboard/dashboard.page.html` | Duas seções com `@for`+`track` | ✓ VERIFIED | `@for (grupo of administrados(); track grupo.id)` e o mesmo para `participados()` |
| `src/app/features/group/manage/manage-group.page.ts` | Lista, remoção, wishlist, link de convite | ✓ VERIFIED | Todas as responsabilidades presentes; `effect()` usado corretamente para ler `input.required()` (fix do UAT) |
| `src/app/features/group/manage/participant-row.ts` | `input()`/`output()` | ✓ VERIFIED | `input.required<Participant>()`, `input(false)` x2, `output<string>()` x2, `output<void>()` |
| `src/app/features/group/join/join-group.page.ts` | Preview + confirmação | ✓ VERIFIED | `input.required<string>()` para `token`, preview antes de confirmar, nunca entra automaticamente |
| `src/app/core/interceptors/error.interceptor.ts` | Interceptor funcional centralizado | ✓ VERIFIED | `HttpInterceptorFn`, normaliza erro, re-lança (não engole) |
| `src/app/core/services/holiday.service.ts` | `toSignal()` + estados loading/erro/ok | ✓ VERIFIED | 3 estados via `undefined/null/array`, `catchError(() => of(null))` |
| `src/app/core/dias-ate-natal.ts` | Função pura testável | ✓ VERIFIED | `differenceInCalendarDays`, spec sem TestBed/mock HTTP |
| `src/app/features/dashboard/christmas-countdown.card.ts` | Card de contagem | ✓ VERIFIED | Carregado via `@defer (on viewport)` no dashboard, `DatePipe` no template |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `supabase/migrations/0004_group_join_rpcs.sql` | `public.participant` | `INSERT` dentro de `SECURITY DEFINER` | ✓ WIRED | `insert into public.participant (...)` dentro da função, confirmado no corpo da migration e replicado no banco real |
| `src/app/app.config.ts` | `errorInterceptor` | `provideHttpClient(withInterceptors([...]))` | ✓ WIRED | Linha 18 de `app.config.ts`: `provideHttpClient(withInterceptors([errorInterceptor]))` |
| `src/app/app.routes.ts` → `group.routes.ts` | `groupRoutes` | children da rota de layout autenticado | ✓ WIRED | Confirmado via import e uso em `group.routes.ts`; rota ativa no build (`group-routes` aparece como lazy chunk) |
| `src/app/features/group/group.routes.ts` | `adminGuard` | `canActivate` | ✓ WIRED | Confirmado linha a linha no arquivo real, não apenas no SUMMARY |
| `src/app/features/group/manage/participant-row.ts` | `ManageGroupPage` | `input()`/`output()` | ✓ WIRED | `(pedirRemocao)`, `(confirmarRemocao)`, `(cancelarRemocao)` ligados no template de `manage-group.page.html` a métodos reais do componente pai |
| `src/app/features/group/manage/manage-group.page.ts` | `GroupService.updateWishList` | botão "Salvar lista" | ✓ WIRED | `salvarWishList()` chama `this.groups.updateWishList(p.id, this.wishList(), this.id())` |
| `src/app/features/group/join/join-group.page.ts` | `GroupService.joinByToken` | botão "Confirmar" | ✓ WIRED | `confirmar()` chama `joinByToken`, trata erro traduzido, navega para `/dashboard` em sucesso |

### Data-Flow Trace (Level 4)

| Artefato | Variável | Fonte | Dados Reais? | Status |
|----------|----------|-------|---------------|--------|
| `dashboard.page.html` (seções de grupos) | `administrados()`/`participados()` | `GroupService.refreshDashboard()` → `supabase.from('group').select('*')` | Sim — query real, filtrada no cliente por `admin_id` | ✓ FLOWING |
| `manage-group.page.html` (participantes) | `participantes()` | `refreshParticipants(groupId)` → `supabase.from('participant').select('*').eq('group_id', ...)` | Sim | ✓ FLOWING |
| `christmas-countdown.card.html` (`dias()`) | `HolidayService.diasAteONatal` | `GET` real à `brasilapi.com.br`, ano extraído da própria resposta (`feriado.date.slice(0,4)`), não de `new Date()` local | Sim — se a API falhar, estado explicitamente vira `null`, não um cálculo local disfarçado | ✓ FLOWING |
| `join-group.page.html` (preview) | `preview()` | `previewByToken(token)` → RPC `preview_group_by_token` | Sim, confirmado como SECURITY DEFINER no banco | ✓ FLOWING |

Nenhum dado estático/hardcoded encontrado fluindo para a UI nesta fase.

### Behavioral Spot-Checks

| Comportamento | Comando | Resultado | Status |
|----------------|---------|-----------|--------|
| Build de produção | `npx ng build` | Sucesso; 1 warning de orçamento de bundle (526.55 kB vs 500 kB, excedido por 26.55 kB) | ⚠️ WARN (não bloqueante para a fase, mas ENG-04 exige "sem warnings") |
| Lint | `npx eslint src --max-warnings=0` | Sem saída, sem erro — passou | ✓ PASS |
| Ausência de `BehaviorSubject`/`new Subject` | `npm run check:no-rxjs-state` | Sem saída, sem erro — passou | ✓ PASS |
| Suíte de testes | `npx ng test --watch=false` | 7 arquivos, 28 testes, todos passando | ✓ PASS |
| Ausência de secrets no bundle | `npm run check:no-secrets` | Falha, mas confirmado como falso positivo: única ocorrência é `r.startsWith("sb_secret_")` dentro do código-fonte vendorizado de `@supabase/auth-js`, sem chave real anexada. Zero ocorrências em `src/` | ℹ️ FALSO POSITIVO CONHECIDO (já documentado em deferred-items.md da Fase 2, repetido aqui) |
| Policies live de `draw`/`participant` | `SELECT * FROM pg_policies WHERE tablename IN ('draw','participant')` no projeto Supabase real | `draw`: 1 policy, SELECT, `giver_id in (...)`. `participant`: 5 policies incluindo a nova `participant: admin ve participantes do seu grupo` (SELECT, por `admin_id`). Nenhuma policy de escrita em `draw` | ✓ PASS — confirma DB-07/DB-08 intactos |
| RPCs `SECURITY DEFINER` live | `SELECT prosecdef FROM pg_proc WHERE proname IN (...)` no projeto real | Ambos `true` | ✓ PASS |

### Requirements Coverage

| Requirement | Plan de origem | Descrição | Status | Evidência |
|---|---|---|---|---|
| GRP-01 | 03-03, 03-04 | Admin cria grupo (Reactive Form validado) | ✓ SATISFIED | `create-group.page.ts` + validators |
| GRP-02 | 03-01, 03-04 | `invite_token` único por grupo | ✓ SATISFIED | default do schema (0001), nunca gerado pelo cliente |
| GRP-03 | 03-04, 03-05 | Link de convite visível e copiável | ✓ SATISFIED | presente em `create-group` e `manage-group` |
| GRP-04 | 03-03, 03-05 | Admin vê lista de participantes | ✓ SATISFIED | corrigido por 0005 (admin sem linha própria em `participant` lia zero antes) |
| GRP-05 | 03-03, 03-05 | Admin remove participante | ✓ SATISFIED | `removeParticipant` + confirmação em dois passos |
| GRP-06 | 03-01, 03-03, 03-05 | Entrar via link de convite | ✓ SATISFIED | RPC `join_group_by_token` |
| GRP-07 | 03-01, 03-03, 03-05 | Entrar 2x rejeitado com mensagem clara | ✓ SATISFIED | `ALREADY_MEMBER` + tradução PT-BR |
| GRP-08 | 03-01, 03-03, 03-05 | Grupo não-`open` não aceita novos | ✓ SATISFIED | `GROUP_CLOSED` + checagem antecipada na UI |
| GRP-09 | 03-03, 03-04 | Dashboard separa administrados/participados | ✓ SATISFIED | duas seções `@for`+`track` |
| WISH-01 | 03-03, 03-05 | Participante cadastra a própria wishlist | ✗ BLOCKED (corretamente desmarcado) | Nenhuma rota alcançável pelo não-admin; ver gap acima. REQUIREMENTS.md tem `[ ]` correto na seção de checklist |
| WISH-02 | 03-03, 03-05 | Participante edita a qualquer momento | ✗ BLOCKED (corretamente desmarcado) | Mesma causa de WISH-01 |
| WISH-03 | 03-03, 03-05 | Participante não edita a lista de outro | ✓ SATISFIED | RLS `user_id = auth.uid()` + `updateWishList` hardcoded a `{wish_list}` — garantido no banco independente de UI |
| API-01 | 03-02 | `GET` à BrasilAPI via `HttpClient` | ✓ SATISFIED | `HolidayService` |
| API-02 | 03-02 | Dias até o Natal na UI | ✓ SATISFIED | `christmas-countdown.card` |
| API-03 | 03-02 | Interceptor funcional de erro | ✓ SATISFIED | `error.interceptor.ts`, registrado em `app.config.ts` |
| API-04 | 03-02 | `toSignal()` | ✓ SATISFIED | `HolidayService.feriados` |

**Nenhum requisito órfão:** todos os 16 IDs do roadmap para esta fase (GRP-01..09, WISH-01..03, API-01..04) aparecem no campo `requirements` de pelo menos uma plan.

**Inconsistência encontrada em `.planning/REQUIREMENTS.md` (não é um gap de código, é um gap de bookkeeping):** a seção de checklist (linhas 68-69) corretamente desmarca `WISH-01` e `WISH-02` como `[ ]`. Mas a tabela de rastreabilidade no final do arquivo (linhas 227-228) ainda lista `WISH-01 | Fase 3 | Completo` e `WISH-02 | Fase 3 | Completo` — contradizendo a própria seção de cima no mesmo documento. Isso deveria ser `Pendente` ou `Parcial`, para não mascarar a lacuna já documentada em `deferred-items.md` para quem só lê a tabela.

### Anti-Patterns Found

Nenhum anti-padrão bloqueante encontrado (sem `TODO`/`FIXME`/retornos vazios disfarçados de dados reais) nos arquivos desta fase. As únicas ocorrências de `placeholder` são o bloco `@placeholder` legítimo de `@defer` e o atributo HTML `placeholder` de um `<textarea>` — nenhum dos dois é um stub.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `docs/sdd.md` | §5.2 | Afirma que `adminGuard` "não existe", mas existe e está em uso | ⚠️ Warning | Documentação de arquitetura desalinhada com um mecanismo de segurança real; risco de um futuro agente/revisor confiar na doc errada |
| `.planning/REQUIREMENTS.md` | 227-228 | Tabela de rastreabilidade marca WISH-01/02 como "Completo" contradizendo o `[ ]` da seção acima | ⚠️ Warning | Lacuna já documentada fica mascarada para quem só lê a tabela final |
| `angular.json` budgets | — | Bundle inicial excede o orçamento de 500 kB em 26.55 kB | ℹ️ Info | Não bloqueia build, mas ENG-04 ("sem warnings") hoje não está 100% limpo |
| `src/**` | — | Zero `.spec.ts` para `group.service.ts`, `manage-group.page.ts`, `create-group.page.ts`, `join-group.page.ts` | ℹ️ Info | Fora do escopo estrito de ENG-02/03 (que são do algoritmo de sorteio, Fase 4), mas os 4 defeitos do UAT passaram justamente pelos gates automatizados sem serem pegos — mais spec coverage nestas telas reduziria a dependência de UAT manual |

### Human Verification Required

### 1. Responsividade mobile das telas novas

**Test:** Abrir `/group/create`, `/group/:id/manage` e `/join/:token` em 320px de largura.
**Expected:** Sem overflow horizontal, botões com área de toque adequada, textos legíveis.
**Why human:** Avaliação visual não é verificável por grep/build.

### 2. Reteste de regressão dos 4 defeitos do UAT

**Test:** Repetir o fluxo criar → convidar → entrar → gerenciar → remover com duas contas
reais, replicando os 10 passos de `03-05-SUMMARY.md`.
**Expected:** Os 4 defeitos (FK de `admin_id`, loading infinito, acesso cruzado a `/manage`,
zero participantes para o admin) continuam corrigidos.
**Why human:** Já foi feito uma vez e aprovado pelo usuário; não é bloqueante, mas é a única
forma de confirmar que nada regrediu depois dos commits de correção mais recentes.

### Gaps Summary

A Fase 3 está solidamente implementada no que diz respeito ao administrador: criar grupo,
gerar e copiar link de convite, ver e remover participantes, e os dois RPCs `SECURITY
DEFINER` que viabilizam a entrada por convite — tudo isso verificado contra código real (não
só contra o que o SUMMARY afirma) e, nos pontos críticos de segurança (`adminGuard` no
`canActivate`, policies de `draw`/`participant` no banco real), contra o estado vivo do
projeto Supabase.

A trilha de API pública (API-01..04) está completa e genuína: GET real, interceptor
funcional, `toSignal()`, `@defer`, sem nenhum fallback que torne a chamada decorativa.

A lacuna real — e já conhecida, documentada e deliberadamente não corrigida pela própria
equipe de execução — é que **WISH-01 e WISH-02 não têm caminho de UI para o participante
que não é admin**. A garantia de banco (WISH-03) é genuína e independente de qualquer tela,
mas o Success Criteria 4 do ROADMAP pede explicitamente que o participante "cadastre e
edite", o que hoje só o admin consegue fazer (e só incidentalmente, se ele também for
participante do próprio grupo). Isto não é uma descoberta desta verificação: já está em
`deferred-items.md` com duas opções de correção avaliadas, aguardando uma fase 3.1.

Dois gaps adicionais, de natureza documental/bookkeeping, foram encontrados nesta
verificação e não estavam no radar do `deferred-items.md`:

1. `docs/sdd.md` §5.2 ficou congelado na versão pré-bugfix do UAT (a reconciliação do SDD
   aconteceu 21 minutos antes do commit que criou o `adminGuard`) e hoje afirma que o guard
   "não existe" — o que era verdade quando a frase foi escrita, mas não é mais.
2. A tabela de rastreabilidade final de `.planning/REQUIREMENTS.md` contradiz a própria
   seção de checklist do mesmo arquivo quanto a WISH-01/WISH-02.

Nenhum dos dois exige reabrir código de produto; são correções de documentação, mas valem
a pena fechar antes de considerar a fase definitivamente encerrada, porque ambos podem
induzir um futuro agente (ou o avaliador do curso) a erro sobre o que realmente foi
construído.

---

_Verified: 2026-10-15T13:50:00Z_
_Verifier: Claude (gsd-verifier)_
