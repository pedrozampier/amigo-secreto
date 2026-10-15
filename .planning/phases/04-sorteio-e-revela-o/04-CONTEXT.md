# Phase 4: Sorteio e Revelação - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Phase Boundary

O sorteio acontece **uma única vez**, matematicamente livre de autossorteio, rodando
inteiramente dentro de uma Supabase Edge Function (fora do alcance do navegador do
administrador) — e cada participante revela **deliberadamente** apenas o próprio par,
vendo através dele a lista de desejos de quem tirou. Esta é a fase que prova o core value.

Cobre **DRAW-01..DRAW-10** e **ENG-02/ENG-03**.

Entrega: Edge Function `run-draw` (Deno), `DrawService` chamando via
`supabase.functions.invoke()`, migration nova com o RPC transacional `create_group`,
botão de sorteio em `/group/:id/manage` com confirmação, rota `/draw/:groupId/result`
com `drawResultResolver`, `draw-error-messages.ts`, specs do algoritmo (ENG-02/03) e
`docs/draw-privacy-verification.md`.

**Fora desta fase:** PWA, manifest, estado offline e auditoria WCAG 2.1 AA (Fase 5 —
UI-03..07); README consolidando o PRD, `.spec.md` e Figma (Fase 5 — ENG-07/09);
V2-01 (RPC transacional fechando a janela insert→close da Edge Function) e V2-02
(triggers de defesa em profundidade) continuam adiados.

</domain>

<decisions>
## Implementation Decisions

### O administrador participa do sorteio — a descoberta central desta discussão

> **Contexto obrigatório para quem for planejar.** Hoje
> `GroupService.createGroup()` (`src/app/core/services/group.service.ts`) insere **somente**
> a linha de `group`. O criador do grupo **não tem linha em `participant`**. Isso já causou
> um bug real na Fase 3 — a migration `0005_admin_reads_participants.sql` existe
> exatamente porque `private.my_group_ids()` devolvia zero grupos para o admin, que lia
> zero participantes do próprio grupo.
>
> **Consequência para esta fase:** a Edge Function busca `participant where group_id = X`.
> Sem a correção abaixo, o admin **não entra no sorteio** — não tira ninguém e ninguém o
> tira. O PRD é silencioso no assunto (linha 37 lista o admin como organizador sem dizer
> se joga), então isto é uma decisão de produto, não uma leitura de spec.

- **D-01:** **O administrador participa do sorteio do próprio grupo** e é inserido como
  `participant` **no momento da criação do grupo**. É o comportamento esperado de um
  amigo secreto real (quem organiza joga), resolve de raiz o problema que motivou a
  `0005`, e **fortalece a demonstração de DRAW-10**: o admin participa, tira alguém, vê o
  próprio par — e ainda assim não lê os pares dos outros.
  Rejeitado: o admin entrar pelo próprio `/join/:token` (passo manual fácil de esquecer;
  se esquecer, o sorteio roda sem ele — frágil numa demonstração ao vivo) e o admin ser
  organizador puro (exigiria 4 contas de teste na banca e deixaria a tela do admin sem
  revelação).

- **D-02:** A inserção é feita por um **RPC plpgsql transacional `create_group`** numa
  **migration nova** (a próxima livre é a `0006`): insere `group` + `participant` do admin
  num único `BEGIN/COMMIT` e devolve o grupo criado. `GroupService.createGroup()` passa a
  chamar esse RPC em vez do `.insert()` direto.
  Razão: duas escritas separadas do cliente não são atômicas — se a segunda falhar, sobra
  um grupo sem o admin dentro, que é o mesmo bug de D-01, só mais raro. Segue o padrão que
  a Fase 3 já estabeleceu (D-01 daquela fase: a regra de negócio vive num RPC, não
  espalhada no cliente), com as mesmas precauções das funções existentes:
  `SECURITY DEFINER`, `set search_path = ''`, nomes schema-qualificados.
  Rejeitado: trigger `AFTER INSERT` em `group` (atômico e impossível de esquecer, mas é
  magia invisível — quem lê `createGroup()` não vê que o admin entrou, pior de defender
  oralmente que um RPC com nome óbvio).
  **Atenção:** a `0005` continua necessária para grupos criados **antes** desta fase
  (cujo admin não tem linha em `participant`) — **não removê-la**.

- **D-03:** O mínimo de 3 (DRAW-04 / RN1) é **`count(participant) >= group.min_participants`**,
  contando o admin. `min_participants` já é `3` por default no schema, com
  `check (min_participants >= 3)`. Com o admin dentro, um grupo sorteável é admin + 2
  convidados — **3 contas de teste, não 4**. A Edge Function compara contra
  `group.min_participants` exatamente como o código de referência da `ARCHITECTURE.md` já
  faz, **sem nenhum caso especial para o admin**.
  Rejeitado: exigir 3 convidados além do admin (introduz um caso especial na Edge Function
  e na UI, exige uma quarta conta, e nenhum indicador ganha com isso).

- **D-04:** **O admin não pode se remover do próprio grupo.** `participant-row` já recebe
  `podeRemover` como `input()`; a tela de gestão passa a esconder o botão na linha cujo
  `user_id` é o `admin_id` do grupo. Evita que o admin se auto-exclua do sorteio por
  engano e reabra silenciosamente o problema que D-01 fechou.
  **Esta é uma limitação de UI, não de banco** — a policy de DELETE em `participant`
  continua permitindo. Registrar explicitamente como limitação conhecida (mesma classe de
  D-17 da Fase 3), **não** implementar policy/trigger nesta fase: é a mesma classe de
  robustez já adiada como **V2-02**.

### Revelação do par (DRAW-08, DRAW-09 · ID8, ID9, ID10, ID13, ID16, ID18)

- **D-05:** A revelação vive numa **rota própria `/draw/:groupId/result`**, exatamente como
  `docs/sdd.md` §5.2 já reserva (e a pasta `features/draw/result/` da §5.1). Não diverge de
  spec nenhuma, entrega **ID16** de novo (`groupId` como `input()` via o
  `withComponentInputBinding` já ligado), e dá à revelação uma tela inteira — melhor de
  demonstrar. `/group/:id` ganha um botão "Ver meu amigo secreto" quando o grupo está
  `closed`.
  Rejeitado: card dentro de `/group/:id` (divergiria do SDD §5.2, desperdiçaria o resolver
  de ID18, e empilharia um quarto card numa tela de 320px) e rota filha `/group/:id/result`
  (também divergiria do §5.2, com ganho marginal).

- **D-06:** A revelação é **um `signal` `revelado` + `@defer (on interaction)`** com
  `@placeholder` renderizando o cartão fechado. O bloco diferido contém o conteúdo pesado —
  nome de quem foi tirado + a wishlist dela. O event binding escrevendo o signal entrega
  **ID9/ID10**; o `@defer` entrega **ID8 de forma honesta**: o conteúdo realmente não é
  renderizado antes do clique, que é o ponto do `@defer`.
  **Por que isso importa:** o `@defer` do ID8 **já está gasto** no card da BrasilAPI
  (`src/app/features/dashboard/dashboard.page.html:13`, `on viewport`). O ROADMAP mapeia
  ID8 também para DRAW-09, e a revelação é o lugar natural — um `@defer` decorativo aqui
  enfraqueceria a demonstração.
  Rejeitado: flip com animação CSS 3D real (`rotateY(180deg)` + `backface-visibility`) —
  conflita com `@defer` (o verso precisa existir no DOM para girar) e exigiria cuidado com
  `prefers-reduced-motion` na auditoria WCAG da Fase 5.

- **D-07:** O par + nome + wishlist vêm numa **única query com join embedado**, com a FK
  **nomeada explicitamente** (há duas FKs de `draw` para `participant` — `giver_id` e
  `receiver_id` — então `participant(...)` sozinho é ambíguo e o supabase-js recusa).
  Forma: `.from('draw').select('id, receiver:participant!draw_receiver_id_fkey(display_name, wish_list)')`.
  A RLS é aplicada nas duas tabelas independentemente: a policy
  `"participant: ver colegas do grupo"` (0003) libera o nome e a wishlist para qualquer
  membro, e a policy de `draw` garante que o admin **não tem linha de onde partir o join**.
  Uma roundtrip, coerente com D-08 da Fase 3.
  Rejeitado: duas queries sequenciais (duas roundtrips onde uma basta) e reusar
  `GroupService.participants` (acopla a tela ao estado de outra; num deep link direto para
  `/draw/:groupId/result` a lista está vazia e precisaria ser carregada de todo jeito).

- **D-08:** A rota usa **`drawResultResolver` funcional** (carrega o par — **ID18**, como
  `REQUIREMENTS.md` mapeia) **+ o `memberGuard` já existente** (barra quem não é membro,
  redirecionando para `/dashboard`). Estados tratados **na tela, em PT-BR, não como erro**:
  - grupo ainda não `closed` → "O sorteio ainda não aconteceu" + link de volta ao grupo;
  - `closed` mas sem linha de `draw` (impossível após o perfect matching, mas defensivo) →
    mensagem genérica.
  Rejeitado: carregar no componente com `effect()` (consistente com `GroupViewPage`, mas
  deixaria ID18 sem demonstração nova nesta fase, contra o mapeamento explícito do ROADMAP)
  e redirecionar sem mensagem quando não há sorteio (joga o usuário para outra tela sem
  explicar por quê).

### Acionamento do sorteio e feedback (DRAW-01, DRAW-04, DRAW-06, DRAW-07)

- **D-09:** O botão de sorteio fica em **`/group/:id/manage`** e usa **confirmação inline em
  dois passos**, no mesmo padrão que `participant-row` já usa para remoção: clique → "Tem
  certeza? Esta ação é irreversível" + Confirmar/Cancelar, controlado por um `signal`.
  Consistente com a UI existente, **zero primitiva Spartan nova** (a Fase 3 deliberadamente
  evitou `dialog`/`field` por causa de peers ausentes do SDD §2), e funciona em 320px sem
  overlay.
  Rejeitado: dialog Spartan modal (mais enfático para ação destrutiva, mas exigiria gerar
  uma primitiva nova e checar peers antes) e botão direto sem confirmação (um clique
  acidental fecha o grupo para sempre).

- **D-10:** Com menos de 3 participantes, o botão aparece **visível e desabilitado, com
  texto explicativo ao lado**: "Faltam N participantes para sortear (mínimo 3)", onde `N`
  vem de um `computed()` sobre a lista de participantes — muda sozinho quando alguém entra.
  DRAW-04 pede explicitamente "mensagem explicativa"; esconder o botão não explica nada.
  A Edge Function **revalida de todo jeito** — a UI é conveniência, a regra vive no servidor.
  Rejeitado: botão oculto (DRAW-01 pede que o admin "acione pela tela de gestão", menos
  óbvio sem botão) e botão sempre habilitado (oferece uma ação que sabidamente vai falhar).

- **D-11:** Após o sorteio bem-sucedido, a tela de gestão **faz refetch** (`loadGroup` /
  `refreshDashboard` — D-05 da Fase 3, refetch-após-mutação): o `@switch` do status passa
  para "Status: fechado", o link de convite desaparece, e surge **"Ver meu amigo secreto"**
  apontando para `/draw/:groupId/result` — possível justamente porque o admin agora
  participa (D-01). **Reforça DRAW-07 e DRAW-10 ao vivo:** a tela do admin muda de estado e
  ele continua vendo só o próprio par.
  Rejeitado: redirecionar direto para o resultado (perde de vista a tela de gestão no
  momento exato em que ela muda de estado, que é a prova visual de DRAW-07) e só exibir
  "Sorteio realizado!" sem refetch (deixa a tela mentindo sobre o status até o F5).

- **D-12:** A Edge Function devolve **códigos estáveis em inglês** — `NOT_ENOUGH_PARTICIPANTS`,
  `ALREADY_DRAWN`, `NOT_ADMIN`, `GROUP_NOT_FOUND` — e o Angular traduz num
  **`draw-error-messages.ts`** com fallback genérico, **exatamente no padrão de
  `src/app/core/join-error-messages.ts`** (D-03 da Fase 3) e `auth-error-messages.ts`
  (D-17 da Fase 2). Mantém o split do CLAUDE.md (código em inglês, UI em PT-BR) e é
  **testável sem mock de rede**, amortizando ID32.
  Rejeitado: mensagens PT-BR direto da função (põe string de UI no backend — a Fase 3
  rejeitou isso pelo mesmo motivo) e mapear por status HTTP (amarra a mensagem ao
  transporte; dois erros que compartilham status ficam indistinguíveis).
  **Armadilha de implementação:** `supabase.functions.invoke()` devolve, para status
  não-2xx, um `FunctionsHttpError` cujo corpo **só é acessível via
  `await error.context.json()`**. Ler apenas `error.message` perde o `code` e todo o mapa
  de tradução fica inútil.

### Prova prática de DRAW-10

- **D-13:** DRAW-10 é provado por um **roteiro versionado `docs/draw-privacy-verification.md`**,
  no mesmo formato de `docs/db-rls-verification.md` da Fase 1, **mais um item no
  `04-HUMAN-UAT.md`**. O documento contém: o snippet exato a colar no console do DevTools
  autenticado como admin, o resultado esperado, e o SQL equivalente para o SQL Editor com
  duas sessões.
  **Atenção ao texto do roteiro — D-01 mudou o resultado esperado.** Como o admin agora
  participa, o `select('*').from('draw')` dele **não volta vazio: volta com exatamente 1
  linha, a dele, de N existentes**. A asserção correta passa a ser dupla:
  (a) o admin lê 1 de N linhas, e (b) um `select` filtrando por um `giver_id` de outro
  participante volta **vazio**. Isso é uma prova **mais forte** que "volta vazio", e precisa
  estar escrita assim — o critério 5 do ROADMAP foi redigido assumindo um admin
  não-participante.
  Rejeitado: só item de UAT (a evidência ficaria em `.planning/`, que não é entregue — e o
  README da Fase 5 não teria o que linkar) e teste automatizado com duas sessões reais
  (exigiria credenciais de teste no CI, viraria teste de integração com rede, e o CI atual
  não tem esse setup).

### Claude's Discretion

**Estratégia dos testes ENG-02/ENG-03 (ID32) — decisão delegada.** O usuário optou por não
discutir esta área. O planejador decide, com estas restrições de contexto:
- O algoritmo roda em **Deno** dentro da Edge Function; o **Vitest do Angular não importa
  esse arquivo**. Alguma forma de tornar o algoritmo testável é necessária — a opção
  natural é extrair a função pura (`shuffle` + `pairCircular`, recebendo e devolvendo
  arrays de ids) para um módulo importável pelos dois lados, mas duplicar o algoritmo ou
  testar via Deno também são válidos.
- O que **precisa** estar coberto, por ENG-02/ENG-03 e pelo critério de aceite 3 do
  ROADMAP: (a) **ausência de autossorteio** (`p[i] !== p[(i+1) % n]` para todo `i`),
  (b) **perfect matching** (cada participante aparece exatamente uma vez como `giver` e
  exatamente uma vez como `receiver`), (c) **rejeição da segunda invocação**.
- O item (c) é lógica de banco (o lock otimista), não lógica pura — decidir se é um teste
  unitário da função de lock, um teste do `DrawService` com o client mockado, ou um passo
  de UAT humano com duas abas. O precedente de D-20 da Fase 3 ("testes só onde há regra
  real, pular mock de `supabase-js`") é a orientação.
- `ng test --watch=false --include=<glob>` roda um spec só; **`--run` é rejeitado** pelo
  builder (aprendido na Fase 2).

**Deploy e segredos da Edge Function — decisão delegada.** Também não discutida. Estado
atual: a CLI do Supabase está em `devDependencies` (`supabase@^2.121.0`) e o projeto está
**linkado** (`supabase/.temp/project-ref` = `ccruvfblgdvnjxenezuh`), mas **não existe
`supabase/config.toml` nem `supabase/functions/`** — esta fase cria ambos. O planejador
decide se o deploy é manual via `supabase functions deploy run-draw` ou entra no CI, e
como a `SERVICE_ROLE_KEY` é configurada. Restrições:
- A `SERVICE_ROLE_KEY` **nunca** entra em `src/` nem em `dist/` — o gate
  `npm run check:no-secrets` e dois passos do `.github/workflows/ci.yml` falham o build com
  `service_role`/`sb_secret_`/`SERVICE_ROLE` em qualquer um dos dois. Dentro da Edge
  Function ela vem de `Deno.env.get(...)`, que o Supabase injeta automaticamente.
  **Cuidado:** um `supabase/functions/` com a string `SUPABASE_SERVICE_ROLE_KEY` está fora
  de `src/` e `dist/`, então não quebra os gates atuais — mas vale conferir se algum passo
  do CI varre o repositório inteiro antes de assumir isso.
- **Nenhuma dependência nova** sem atualizar `docs/sdd.md` §2 primeiro. A Edge Function
  importa `jsr:@supabase/supabase-js@2` em Deno, que não passa pelo `package.json`.

**Outras áreas de liberdade:**
- Nomes exatos de arquivos e componentes em `features/draw/result/`, e onde mora o mapa de
  tradução (`core/draw-error-messages.ts` seguindo o padrão, ou outro lugar).
- Assinatura de retorno do RPC `create_group` (json, tipo composto, `setof group`) — desde
  que a atomicidade de D-02 seja preservada.
- Composição visual fina do cartão de revelação: espaçamentos, variante de botão, quais
  ícones Lucide (`lucide-angular` já instalado, D-13 da Fase 3), texto do `@placeholder`.
- Se `DrawService` é um service novo em `core/services/` ou métodos adicionados ao
  `GroupService` — embora um `DrawService` separado seja o que `ARCHITECTURE.md` (~linha 588)
  e `docs/sdd.md` §5.3 preveem.
- Organização em plans/waves e quantas PRs a fase gera (ID26 grada o processo — o
  precedente de D-21 da Fase 3 é que várias PRs pequenas valem mais que um merge único).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### A Edge Function (ler ANTES de planejar o sorteio)
- `.planning/research/ARCHITECTURE.md` ~linhas 298–405 — **implementação de referência
  completa** da Edge Function `run-draw` em Deno/TypeScript: validação de admin, lock
  otimista, Fisher-Yates, pareamento circular, insert dos pares, fechamento do grupo, e o
  rollback do `catch`. É o ponto de partida, não uma sugestão.
- `.planning/research/ARCHITECTURE.md` ~linhas 282–296 — **a prova matemática** de que
  Fisher-Yates + pareamento circular garante zero autossorteio estruturalmente (não
  probabilisticamente), e a nota de que ciclo único é um subconjunto estrito das
  derangements (não produz pares mútuos A↔B) — **material direto para a banca**.
- `.planning/research/ARCHITECTURE.md` ~linha 407 — por que o `UPDATE ... WHERE status='open'`
  rejeita a segunda invocação sem precisar de `SELECT ... FOR UPDATE` (MVCC do Postgres).
- `.planning/research/ARCHITECTURE.md` ~linhas 409–411 — **o risco residual** entre o insert
  dos pares e o fechamento do grupo; é o débito técnico **V2-01**, a ser **documentado, não
  corrigido** nesta fase.
- `.planning/research/ARCHITECTURE.md` ~linha 15 e ~linhas 254–264 — por que a
  `service_role key` na Edge Function **não é falha de segurança** e sim a única forma
  correta de escrever em `draw`; inclui a **conclusão demonstrável na banca** e o limite
  aceito (RLS protege contra o admin da *aplicação*, não contra o operador da
  *infraestrutura*).
- `.planning/research/ARCHITECTURE.md` ~linha 89 — por que o estado `drawing` existe: é o
  mecanismo do lock, não um estado de UI.
- `.planning/research/ARCHITECTURE.md` ~linha 588 — o parágrafo que descreve esta fase
  (`DrawService` via `functions.invoke()`, revelação com `@defer`, os testes exigidos).
- `docs/sdd.md` §7 (linhas 400–412) — os 6 passos do algoritmo em prosa; a
  `ARCHITECTURE.md` é a versão executável.

### Banco: o que já existe e não pode ser tocado
- `supabase/migrations/0003_rls_policies.sql` linhas 63–73 — **A POLÍTICA CRÍTICA DO
  PROJETO.** Única policy de SELECT em `draw`: `giver_id in (select private.my_participant_ids())`.
  **Zero policies de INSERT/UPDATE/DELETE para `authenticated`** — a ausência é o mecanismo.
  O arquivo diz literalmente: *"Se alguém algum dia adicionar `or ... admin_id ...` aqui, o
  core value do projeto morre"*. **Não adicionar policy de escrita em `draw` nesta fase.**
- `supabase/migrations/0001_schema.sql` linhas 35–59 — DDL de `draw` e as **três constraints
  que são a defesa em profundidade dos testes**: `draw_no_self_gift`
  (`giver_id <> receiver_id`), `draw_giver_unique` e `draw_receiver_unique`
  (`unique (group_id, giver_id)` / `(group_id, receiver_id)` — o perfect matching no banco).
  Também: `group.status check (in ('open','drawing','closed'))` e
  `min_participants check (>= 3)`.
- `supabase/migrations/0002_private_helpers.sql` — `private.my_participant_ids()` (o que a
  policy de `draw` consulta) e `private.my_group_ids()`. **O padrão a imitar** no RPC
  `create_group` de D-02: `SECURITY DEFINER`, `set search_path = ''`, nomes
  schema-qualificados, `revoke`/`grant` explícitos.
- `supabase/migrations/0005_admin_reads_participants.sql` — **leitura obrigatória para
  entender D-01/D-02.** O cabeçalho documenta em detalhe o bug de "admin com zero linhas em
  `participant`" e, crucialmente, explica **por que ver quem está no grupo (GRP-04) e ver
  quem tirou quem (`draw`) são coisas diferentes** — argumento direto para a banca.
  **Não remover** esta migration (D-02).
- `supabase/migrations/0004_group_join_rpcs.sql` — os RPCs de convite da Fase 3; o padrão
  concreto de RPC `SECURITY DEFINER` com código de retorno estável que D-02 e D-12 seguem.
- `.planning/research/ARCHITECTURE.md` ~linhas 200–208 — a policy de UPDATE em `group` que
  deixaria o admin mudar `status` pelo cliente; **D-18 da Fase 3 fechou isso: nenhuma tela
  expõe edição de `status`, a Edge Function é a única dona da transição
  `open → drawing → closed`.**
- `.planning/research/PITFALLS.md` Pitfall 4 — recursão `42P17` em policy; o RPC novo não
  pode reintroduzir o problema.
- `docs/db-rls-verification.md` — **o formato que `docs/draw-privacy-verification.md` (D-13)
  deve seguir**, e a evidência de como a RLS foi testada com dois usuários na Fase 1.

### Frontend: o que reusar
- `src/app/core/services/group.service.ts` — `createGroup()` é o método que D-02 reescreve
  para chamar o RPC; `refreshParticipants()` / `loadGroup()` são o refetch de D-11; o
  cabeçalho da classe documenta por que o join por convite passa por RPC.
- `src/app/core/join-error-messages.ts` — **o template exato de D-12** (mapa de código
  estável → PT-BR com fallback genérico).
- `src/app/core/guards/member.guard.ts` — o guard que D-08 reusa em
  `/draw/:groupId/result`.
- `src/app/core/resolvers/group.resolver.ts` — o padrão de resolver funcional que
  `drawResultResolver` (D-08) segue.
- `src/app/features/group/manage/participant-row.ts` — **dois padrões de uma vez**: o
  `input() podeRemover` que D-04 restringe, e a **confirmação inline em dois passos** que
  D-09 replica para o botão de sorteio.
- `src/app/features/group/manage/manage-group.page.{ts,html}` — onde entram o botão de
  sorteio (D-09), o contador de participantes faltantes (D-10) e o refetch pós-sorteio
  (D-11). O `@switch (group().status)` já existe e só precisa refletir `closed`.
- `src/app/features/group/view/group-view.page.{ts,html}` — onde entra o botão "Ver meu
  amigo secreto" (D-05); também documenta a armadilha do `effect()` com `input.required()`
  (ler o input no constructor lança).
- `src/app/features/dashboard/dashboard.page.html:13` — **o `@defer (on viewport)` já
  existente**; D-06 explica por que a revelação precisa de um `@defer` próprio e não
  decorativo.
- `src/app/features/group/group.routes.ts` e `src/app/app.routes.ts` — a árvore atual;
  `/draw/:groupId/result` entra **dentro da rota de layout autenticado** (herdando
  `authGuard`), de forma análoga a `/join/:token`.
- `src/app/core/models/group.model.ts` — contratos de `Group`/`Participant` copiados
  verbatim do SDD §4; **falta o contrato de `Draw`**, que esta fase adiciona.

### Especificação (atualizar no mesmo commit se divergir)
- `docs/sdd.md` §5.2 (linhas ~320–325) — a tabela de rotas já lista
  `/draw/:groupId/result → features/draw/result/draw-result.page.ts` marcada "Fase 4";
  D-05 a concretiza. Atualizar a linha retirando a marca de pendência.
- `docs/sdd.md` §5.1 — a árvore de pastas já reserva `features/draw/result/ # Fase 4`.
- `docs/sdd.md` §5.3 — responsabilidade macro do `DrawService`.
- `docs/sdd.md` §4 — contratos TypeScript; o de `Draw` deve ser reusado verbatim (ou
  adicionado lá, se ausente).
- `docs/sdd.md` §2 e §2.1 — **stack travada; nenhuma dependência nova sem atualizar a
  tabela primeiro.**
- `docs/prd.md` §5 — RN1 (mínimo 3), **RN2 (sorteio irreversível, uma só vez)**,
  RN3 (ninguém tira a si mesmo), **RN4 (admin sem acesso aos pares)**, RN6 (ninguém entra
  após o sorteio), RN7 (wishlist editável até o fechamento).
- `docs/prd.md` linhas 37 e 54 — o admin como ator que "inicia sorteio"; **silencioso sobre
  se ele participa**, que é a lacuna que D-01 preenche.

### Decisões herdadas (não reabrir)
- `.planning/phases/03-grupos-participantes-wishlist-e-api-p-blica/03-CONTEXT.md` —
  **D-05** (signals com refetch-após-mutação), **D-06** (`inject()` +
  `SupabaseClientService`), **D-03** (mapa de códigos estáveis), **D-13**
  (`lucide-angular` disponível), **D-17/D-18** (limitações de policy registradas; nenhuma
  tela edita `status`), **D-21** (várias PRs pequenas > um merge único), e **D-02**
  (`preview_group_by_token` nunca devolve participantes).
- `.planning/phases/02-autentica-o-end-to-end/02-CONTEXT.md` — **D-04** (um signal escrito,
  resto `computed()`), **D-05** (`SupabaseClientService` mockável no Vitest, pensado
  justamente para os specs desta fase), **D-08** (`withComponentInputBinding`), **D-17**
  (padrão do mapa de erros PT-BR).

### Requisitos e rubrica
- `.planning/ROADMAP.md` §"Phase 4" — goal e os **5 success criteria**, que são o contrato
  de verificação da fase. Atenção ao critério 5: foi redigido assumindo admin
  não-participante — ver a ressalva em D-13.
- `.planning/REQUIREMENTS.md` linhas 55–64 — DRAW-01..DRAW-10; linhas 96–97 — ENG-02/ENG-03.
- `.planning/REQUIREMENTS.md` linhas 120–147 — rastreabilidade dos indicadores desta fase:
  **ID5, ID8, ID9, ID10, ID13, ID14, ID16, ID18, ID32**.
- `.planning/REQUIREMENTS.md` §"Requisitos v2" linhas 153–167 — **V2-01** (atomicidade
  insert→close) e **V2-02** (triggers de defesa em profundidade, onde a limitação de D-04
  se encaixa). Registrar, não implementar.
- `docs/checklist.md` — a rubrica completa.

### Processo e gates mecânicos
- `.github/workflows/ci.yml` — os gates que o código novo precisa passar: `eslint
  --max-warnings=0`, `check:no-rxjs-state`, **dois grep de secrets (em `src/` e em
  `dist/`)**, "nenhum NgModule", build de produção e `npm test`.
- `package.json` — scripts (`check:no-secrets`, `check:no-rxjs-state`) e o fato de que a
  **CLI do Supabase já está em `devDependencies`** (`supabase@^2.121.0`).
- `CLAUDE.md` — Gitflow (nunca commitar em `main`, branchar de `develop`, integrar por PR),
  Conventional Commits, UI em PT-BR / código e entidades em inglês, Kanban atualizado
  durante o trabalho.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`memberGuard`** (`src/app/core/guards/member.guard.ts`) — reusado tal e qual em
  `/draw/:groupId/result` (D-08). Já chama `loadGroup()` na mesma navegação.
- **`groupResolver`** (`src/app/core/resolvers/group.resolver.ts`) — o padrão de resolver
  funcional que `drawResultResolver` imita.
- **`join-error-messages.ts`** — o template literal de D-12; tem o mapa, a constante de
  fallback genérico e um `.spec.ts` já escrito (`join-error-messages.spec.ts`) que serve de
  molde para o spec do mapa novo.
- **`participant-row.ts`** — confirmação inline em dois passos via `input()`/`output()`
  (ID13), reusada por D-09; e o `podeRemover` que D-04 restringe.
- **`GroupService`** — `loadGroup()`, `refreshParticipants()`, `refreshDashboard()`,
  `meuParticipante` (`computed()` que acha a própria linha de `participant`) — este último
  é exatamente o que a tela de revelação precisa para descobrir o próprio `giver_id`.
- **`SupabaseClientService`** — `.client` injetável, e `.functions.invoke()` sai dele.
  Mockável no Vitest (a razão declarada de D-05 da Fase 2).
- **Primitivas Spartan já geradas**: `libs/ui/{button,card,input,label,utils}/`, importadas
  por `@spartan-ng/helm/<nome>`. **Não há `dialog`** — base de D-09.
- **`lucide-angular`** instalado e usado desde a Fase 3.

### Established Patterns
- **ESLint trava a sintaxe antiga mecanicamente** (tudo como `error`): `prefer-standalone`,
  `prefer-signals`, `prefer-inject`, `prefer-signal-model`, `prefer-output-emitter-ref`,
  `prefer-control-flow`, `banana-in-box`, `templateAccessibility`. `@Input()`, DI por
  construtor ou `*ngFor` **quebram o build**.
- **`npm run check:no-rxjs-state`** falha com `BehaviorSubject`/`new Subject` em `src/app` —
  o estado da revelação precisa ser signal.
- **`npm run check:no-secrets`** falha com `service_role`/`sb_secret_` em `src/` ou `dist/`.
  Restrição direta sobre onde a Edge Function pode viver e como referencia a chave.
- **Angular 21 zoneless + Vitest.** `ng test --watch=false --include=<glob>` roda um spec
  só; **`--run` é rejeitado** pelo builder.
- **`npm install` exige `--legacy-peer-deps`** neste projeto (bug do arborist do npm 10.9.2
  com o grafo de peers do vitest@4) — vale também em CI.
- **A armadilha do `effect()` com `input.required()`**: ler o input no constructor lança, e
  a promise rejeitada (silenciada por `void`) deixa `carregando` em `true` para sempre.
  Documentada em `group-view.page.ts`, `join-group.page.ts` e `manage-group.page.ts` — a
  tela de revelação cai no mesmo caso se não usar o resolver de D-08.
- **Convenção de nomes**: sem sufixo `.component`; páginas usam `.page.ts` / `.page.html`.
  Prefixo de selector `app`.
- Textos de UI em PT-BR; identificadores, entidades e commits em inglês.

### Integration Points
- **`supabase/functions/`** — **não existe ainda.** Esta fase a cria, junto com
  `supabase/config.toml` (também ausente). O projeto **já está linkado**
  (`supabase/.temp/project-ref` = `ccruvfblgdvnjxenezuh`) e a CLI está em
  `devDependencies`.
- **`supabase/migrations/`** — `0001` a `0005` aplicadas. D-02 adiciona a **`0006`**, que
  precisa ser aplicada no projeto real e verificada.
  **⚠ Nota de ambiente** (memória de sessões anteriores): as migrations foram aplicadas **à
  mão**, não estão registradas na CLI — um `supabase db push` quebraria. Inspecionar o
  estado remoto antes de usar a CLI para migrations.
- **`src/app/app.routes.ts`** — ganha `/draw/:groupId/result` dentro do layout autenticado.
- **`src/app/core/models/group.model.ts`** — ganha o contrato de `Draw` (e o tipo do
  retorno do join de D-07).
- **`src/app/features/draw/result/`** — pasta nova, já reservada pelo SDD §5.1.
- **`src/app/core/services/`** — ganha `draw.service.ts` (ver discretion).
- **`src/app/features/group/manage/manage-group.page.*`** — recebe botão de sorteio,
  contador e refetch.
- **`docs/sdd.md` §5.2** — a linha de `/draw/:groupId/result` perde a marca "Fase 4".
- **`docs/draw-privacy-verification.md`** — arquivo novo (D-13).

</code_context>

<specifics>
## Specific Ideas

- **A descoberta central desta discussão** foi que o administrador **não é participante do
  próprio grupo** — `createGroup()` insere só em `group`. Sem D-01/D-02, a Edge Function
  roda um sorteio do qual o organizador está ausente, e a migration `0005` (escrita na
  Fase 3 para contornar o mesmo fato) é a evidência de que isso já causou um bug real.
  Quem for planejar **não deve "simplificar" a criação de grupo de volta para um `.insert()`
  direto**.
- **D-01 fortalece a demonstração do core value**, não só corrige um bug: com o admin
  participando, a banca vê que ele *tem* um par, *vê* o próprio par, e **ainda assim** não
  lê os dos outros. É mais convincente que um admin sem nenhuma linha em `draw`.
- **O `@defer` do ID8 já estava gasto** no card da BrasilAPI. D-06 recupera o indicador com
  um uso honesto — `on interaction`, onde o conteúdo realmente não é renderizado antes do
  clique — em vez de um `@defer` decorativo. "A revelação é deliberada" e "o conteúdo é
  carregado sob demanda" passam a ser **a mesma afirmação**, o que é bom de defender.
- **Material de banca que já está escrito e vale levar**: a prova de que o pareamento
  circular garante zero autossorteio *estruturalmente* (`ARCHITECTURE.md` ~282), a ressalva
  de que ciclo único é mais restrito que derangement geral e **não produz pares mútuos
  A↔B** (desejável aqui, mas não uniformemente aleatório — mencionar se perguntarem sobre
  uniformidade), e o limite aceito da `service_role` (RLS protege contra o admin da
  aplicação, não contra o operador da infraestrutura).
- **O cabeçalho da migration `0005`** contém o argumento mais limpo do projeto para a banca:
  *ver quem está no grupo* (GRP-04, permitido) e *ver quem tirou quem* (`draw`, proibido)
  são coisas diferentes, e as policies refletem exatamente essa distinção.
- "Simplicidade defensável numa banca" continua sendo o critério de desempate
  (PROJECT.md §Restrições). Foi o que decidiu D-02 (um RPC nomeado em vez de um trigger
  invisível), D-03 (zero caso especial para o admin) e D-09 (confirmação inline em vez de
  uma primitiva Spartan nova).
- **D-13 corrige silenciosamente uma imprecisão do ROADMAP**: o critério de aceite 5 diz
  "o resultado vem vazio", redigido assumindo um admin não-participante. Com D-01 o admin lê
  1 de N linhas. A asserção precisa ser reescrita como dupla (lê só a própria, e lê vazio
  ao filtrar pelo par de outro) — **isso é uma prova mais forte, mas o texto precisa mudar**.

</specifics>

<deferred>
## Deferred Ideas

- **V2-01 — RPC plpgsql transacional envolvendo o insert dos pares + o `status='closed'`**
  da Edge Function. Débito técnico **conhecido e já registrado** em
  `.planning/REQUIREMENTS.md`; a janela não atômica entre os passos 6 e 7 é aceitável para
  o MVP (grupos pequenos, falha exatamente nesse milissegundo é residual). **Documentar na
  fase, não corrigir.** Nota: D-02 cria um RPC transacional para a *criação* do grupo — não
  confundir com este, que é sobre o *fechamento*.
- **V2-02 — triggers de defesa em profundidade**: (a) `BEFORE UPDATE` validando transições
  de `group.status`; (b) `BEFORE UPDATE` em `participant` restringindo a edição a
  `wish_list`; e agora também (c) impedir no banco a remoção do admin de `participant`
  (D-04, hoje só travado na UI). Registrar o item (c) junto dos outros.
- **Policy de DELETE em `draw`** / desfazer o sorteio — RN2 define o sorteio como
  irreversível, e a ausência de policy de escrita em `draw` é o mecanismo do core value.
  Fora de escopo por design, não por falta de tempo.
- **Notificar os participantes de que o sorteio aconteceu** (e-mail/push) — explicitamente
  Fora de Escopo em `.planning/REQUIREMENTS.md` (exigiria cron ou serviço transacional, e
  nenhum indicador pede).
- **Bloquear a edição da wishlist após o fechamento** (RN7: "editável até o encerramento") —
  não foi discutido nesta fase e não está em DRAW-01..10. O comportamento atual permite
  editar sempre. Se for considerado um gap de RN7, cabe num `/gsd:quick` ou na Fase 5;
  **não ampliar o escopo desta fase por isso.**
- **Sinalizar no dashboard quais grupos já foram sorteados** (badge de status nos cards de
  `/dashboard`) — melhoria de UX levantada ao mapear D-11, mas GRP-09 não pede e nenhum
  indicador ganha. Backlog.
- **Animação CSS 3D do flip** (`rotateY` + `backface-visibility`) — rejeitada em D-06 por
  conflitar com `@defer`. Se for desejada depois, exige revisitar D-06 e tratar
  `prefers-reduced-motion` na auditoria WCAG da Fase 5.
- **Remover a migration `0005`** agora que D-01 insere o admin em `participant` — tentador,
  mas **errado**: grupos criados antes desta fase continuam sem a linha do admin. Manter.

</deferred>

---

*Phase: 04-sorteio-e-revela-o*
*Context gathered: 2026-10-15*
