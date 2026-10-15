# Phase 4: Sorteio e Revelação - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 04-sorteio-e-revela-o
**Areas discussed:** Admin participa do sorteio, Revelação (forma e rota), Acionamento e feedback, Prova prática de DRAW-10
**Areas delegated to Claude:** Estratégia dos testes (ENG-02/03), Deploy e segredos da Edge Function

---

## Seleção de áreas

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Admin participa do sorteio? | Bloqueador real: `createGroup()` não insere o admin em `participant` | ✓ |
| Revelação: forma e rota | DRAW-08/09 + ID8/ID13/ID16 — rota própria vs. card, flip, `@defer` | ✓ |
| Acionamento e feedback | DRAW-01/04/06/07 — botão, confirmação, <3 participantes, erros | ✓ |
| Estratégia dos testes | ENG-02/03 — algoritmo em Deno não importável pelo Vitest | |
| Prova prática de DRAW-10 | Critério 5 do ROADMAP — roteiro vs. UAT vs. teste automatizado | ✓ |
| Deploy e segredos da Edge Function | `supabase/functions/` inexistente, `SERVICE_ROLE_KEY` vs. gates de CI | |

**Notas:** o usuário selecionou 4 das 6 áreas; testes e deploy ficaram como Claude's
Discretion, com as restrições de contexto registradas no CONTEXT.md.

---

## Admin participa do sorteio

### Pergunta 1 — O administrador participa do sorteio do próprio grupo?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Sim — inserido na criação | `createGroup()` passa a inserir a linha de `participant` do admin; resolve o bug que motivou a `0005` e fortalece DRAW-10 | ✓ |
| Sim — entrando pelo próprio link | Zero código novo, mas passo manual fácil de esquecer; frágil numa demo ao vivo | |
| Não — organizador puro | Mais simples, mas exige 4 contas de teste e a tela do admin nunca mostra revelação | |

**User's choice:** Sim — inserido na criação
**Notes:** virou D-01. O argumento decisivo foi que o admin participando torna a prova de
DRAW-10 mais forte, não mais fraca: ele tem par, vê o próprio, e ainda assim não lê os outros.

### Pergunta 2 — Como inserir o admin como participante na criação?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| RPC transacional `create_group` | Migration nova, insere `group` + `participant` num único BEGIN/COMMIT; segue o padrão de D-01 da Fase 3 | ✓ |
| Duas chamadas no GroupService | Zero SQL novo, mas não atômico — se a segunda falhar, grupo sem o admin dentro | |
| Trigger AFTER INSERT em `group` | Atômico e impossível de esquecer, mas magia invisível no banco, pior de explicar oralmente | |

**User's choice:** RPC transacional `create_group`
**Notes:** virou D-02. Consistente com o precedente da Fase 3 (regra de negócio num RPC
nomeado, não espalhada no cliente nem escondida num trigger).

### Pergunta 3 — O mínimo de 3 (DRAW-04) conta o admin?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Sim — 3 linhas em `participant` | `count(participant) >= group.min_participants`, zero caso especial; 3 contas de teste | ✓ |
| Não — 3 convidados além do admin | Leitura mais conservadora da RN1, mas introduz caso especial na Edge Function e na UI, e exige 4 contas | |

**User's choice:** Sim — 3 linhas em `participant`
**Notes:** virou D-03. O código de referência da ARCHITECTURE.md já compara contra
`group.min_participants` — nenhuma mudança necessária ali.

### Pergunta 4 — O admin pode se remover do próprio grupo (GRP-05)?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Não — esconder o botão na própria linha | Uma linha de UI via o `podeRemover` já existente; limitação registrada, sem SQL novo | ✓ |
| Não — travar também no banco | Defesa em profundidade real, mas é a mesma classe de robustez já adiada como V2-02 | |
| Sim — permitir | Zero código, mas reabre silenciosamente o problema que D-01 fechou | |

**User's choice:** Não — esconder o botão na própria linha
**Notes:** virou D-04. O item (c) do V2-02 no CONTEXT.md registra a versão de banco como
trabalho futuro.

---

## Revelação: forma e rota

### Pergunta 1 — Onde vive a revelação do par?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Rota própria `/draw/:groupId/result` | Já no SDD §5.2 e na árvore de pastas; entrega ID16 e abre espaço para o resolver de ID18 | ✓ |
| Card dentro de `/group/:id` | Menos navegação, mas diverge do SDD, desperdiça o resolver e empilha 4 cards em 320px | |
| Rota filha `/group/:id/result` | Herda `memberGuard`, mas também diverge do SDD com ganho marginal | |

**User's choice:** Rota própria `/draw/:groupId/result`
**Notes:** virou D-05. Não exige atualizar o SDD — a rota já estava lá marcada "Fase 4".

### Pergunta 2 — Como funciona a revelação?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Signal + `@defer (on interaction)` | Entrega ID8 de forma honesta: o conteúdo realmente não é renderizado antes do clique | ✓ |
| Só Signal, `@defer (on viewport)` separado | Mais simples, mas o `@defer` fica decorativo e enfraquece a demonstração | |
| Flip com animação CSS 3D real | Mais bonito e literal, mas conflita com `@defer` (o verso precisa estar no DOM) e exige cuidar de `prefers-reduced-motion` | |

**User's choice:** Signal + `@defer (on interaction)`
**Notes:** virou D-06. Contexto que motivou a pergunta: o `@defer` do ID8 já estava gasto
no card da BrasilAPI (`dashboard.page.html:13`), e o ROADMAP mapeia ID8 também em DRAW-09.
A animação 3D ficou nos deferred ideas.

### Pergunta 3 — Como buscar o par + nome + wishlist de quem foi tirado?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Uma query com join embedado | RLS aplicada nas duas tabelas; uma roundtrip; coerente com D-08 da Fase 3 | ✓ |
| Duas queries sequenciais | Mais explícito, não depende da sintaxe de join, mas duas roundtrips | |
| Reusar `GroupService.participants` | Zero query extra, mas acopla a tela ao estado de outra e falha em deep link | |

**User's choice:** Uma query com join embedado
**Notes:** virou D-07, com a nota de que há duas FKs de `draw` para `participant`, então a
FK precisa ser nomeada (`participant!draw_receiver_id_fkey`).

### Pergunta 4 — O que a tela faz quando não há sorteio / o usuário não é membro?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| `drawResultResolver` + guard, estados na tela | Entrega ID18, reusa `memberGuard`, e explica em PT-BR em vez de errar | ✓ |
| Só guard, carregamento no componente | Consistente com `GroupViewPage`, mas deixa ID18 sem demonstração nova | |
| Redirecionar quando não há sorteio | Menos código, mas joga o usuário para outra tela sem explicação | |

**User's choice:** `drawResultResolver` + guard, com estados na tela
**Notes:** virou D-08. O resolver também evita a armadilha do `effect()` com
`input.required()` documentada em três páginas da Fase 3.

---

## Acionamento e feedback

### Pergunta 1 — Como o admin aciona o sorteio, dado que é irreversível?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Confirmação inline em dois passos | Mesmo padrão de `participant-row`; zero primitiva Spartan nova; funciona em 320px | ✓ |
| Dialog Spartan modal | Mais enfático para ação destrutiva, mas exige gerar primitiva nova e checar peers | |
| Botão direto, sem confirmação | Rápido de demonstrar, mas um clique acidental fecha o grupo para sempre | |

**User's choice:** Confirmação inline em dois passos
**Notes:** virou D-09. A Fase 3 já havia evitado `dialog` deliberadamente por causa de
peers ausentes do SDD §2.

### Pergunta 2 — Com menos de 3 participantes, o que a tela mostra?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Botão visível e desabilitado + explicação | DRAW-04 pede "mensagem explicativa"; contador reativo por `computed()` | ✓ |
| Botão oculto, só a mensagem | Mais limpo, mas o admin não vê que a ação existe (DRAW-01) | |
| Botão habilitado, erro ao clicar | A regra vive no servidor, mas oferece uma ação que vai falhar | |

**User's choice:** Botão visível e desabilitado + explicação
**Notes:** virou D-10, com a nota de que a Edge Function revalida de todo jeito — a UI é
conveniência.

### Pergunta 3 — Depois do sorteio, o que acontece na tela do admin?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Refetch + estado `closed` + link para o próprio resultado | Padrão de refetch-após-mutação (D-05 da Fase 3); prova visual de DRAW-07 e DRAW-10 | ✓ |
| Redirecionar direto para o resultado | Mais fluido, mas perde a tela de gestão no momento em que ela muda de estado | |
| Só mensagem de sucesso | Menos código, mas deixa a tela mentindo sobre o status até o F5 | |

**User's choice:** Refetch + estado `closed`, com link para o próprio resultado
**Notes:** virou D-11. O link "Ver meu amigo secreto" só é possível porque D-01 põe o admin
no sorteio.

### Pergunta 4 — Como os erros da Edge Function chegam traduzidos?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Códigos estáveis em inglês + mapa PT-BR | Padrão de `join-error-messages.ts` / `auth-error-messages.ts`; testável sem mock de rede | ✓ |
| Mensagens PT-BR direto da função | Menos código no cliente, mas põe string de UI no backend — rejeitado na Fase 3 pelo mesmo motivo | |
| Mapear pelo status HTTP | Simples, mas amarra a mensagem ao transporte e o 500 genérico engole tudo | |

**User's choice:** Códigos estáveis em inglês + mapa PT-BR
**Notes:** virou D-12. Registrada a armadilha do `functions.invoke()`: para status não-2xx
o corpo só é acessível via `await error.context.json()`.

---

## Prova prática de DRAW-10

### Pergunta 1 — Como DRAW-10 fica provado e versionado?

| Opção | Descrição | Selected |
|-------|-------------|----------|
| Roteiro versionado em `docs/` + item de UAT | Formato de `docs/db-rls-verification.md` da Fase 1; evidência reproduzível e linkável no README | ✓ |
| Só item de UAT humano | Menos artefato, mas a evidência fica em `.planning/`, que não é entregue | |
| Teste automatizado com duas sessões reais | Mais forte e repetível, mas exige credenciais no CI e vira teste de integração frágil | |

**User's choice:** Roteiro versionado em `docs/` + item de UAT
**Notes:** virou D-13. Durante a formulação da decisão apareceu uma consequência de D-01
que o ROADMAP não previa: com o admin participando, o `select('*')` dele **não volta vazio**
— volta com 1 linha de N. A asserção do roteiro foi redefinida como dupla (lê só a própria;
lê vazio ao filtrar pelo `giver_id` de outro), o que é uma prova mais forte que a redação
original do critério 5.

---

## Claude's Discretion

- **Estratégia dos testes ENG-02/ENG-03 (ID32)** — não discutida por escolha do usuário.
  CONTEXT.md registra as restrições: o algoritmo roda em Deno e não é importável pelo Vitest
  do Angular; o que precisa estar coberto (autossorteio, perfect matching, segunda
  invocação); e o precedente de D-20 da Fase 3 (testes só onde há regra real).
- **Deploy e segredos da Edge Function** — não discutido por escolha do usuário. CONTEXT.md
  registra o estado atual (CLI instalada e projeto linkado, mas sem `config.toml` nem
  `functions/`) e as restrições dos gates de secrets do CI.
- Nomes de arquivos/componentes em `features/draw/result/`; assinatura de retorno do RPC
  `create_group`; composição visual do cartão; `DrawService` separado vs. métodos no
  `GroupService`; organização em plans/waves e número de PRs.

## Deferred Ideas

- V2-01 (RPC transacional fechando a janela insert→close da Edge Function) — já registrado
  em REQUIREMENTS.md; documentar, não corrigir.
- V2-02 item (c): impedir no banco a remoção do admin de `participant` (D-04 trava só na UI).
- Bloquear a edição da wishlist após o fechamento (RN7) — não está em DRAW-01..10; cabe num
  `/gsd:quick` ou na Fase 5.
- Badge de status nos cards do dashboard sinalizando grupos já sorteados — GRP-09 não pede.
- Animação CSS 3D do flip — rejeitada em D-06; exigiria revisitar a decisão do `@defer`.
- Remover a migration `0005` — tentador após D-01, mas errado: grupos antigos continuam sem
  a linha do admin.
