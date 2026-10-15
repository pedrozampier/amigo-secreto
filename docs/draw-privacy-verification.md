# Verificação de Privacidade do Sorteio — Admin Participante (DRAW-10, D-13)

**Data de criação do roteiro:** 2026-10-15
**Data de execução real (Parte D):** 2026-10-15
**Projeto:** Supabase (instância real de produção, `ccruvfblgdvnjxenezuh`)
**Objetivo:** provar, com evidência executada (não apenas leitura de código), que o
administrador de um grupo — mesmo sendo agora participante do próprio sorteio (D-01) —
**não lê o par sorteado de nenhum outro participante**, conforme DRAW-10 e o core value do
UTF-Secret: a privacidade do sorteio é garantida pelo banco de dados (RLS), nunca pela UI.

**Importante — por que a asserção é dupla, não "volta vazio".** D-01 fez o administrador
participar do próprio sorteio: `create_group` (migration `0006`) insere o admin como
`participant` na mesma transação em que cria o `group`. Isso significa que o
`select('*').from('draw')` do admin **não volta vazio** — ele volta com **exatamente 1
linha, a dele, de N existentes**. Esta é uma prova **mais forte** que "volta vazio": o
admin tem acesso aos próprios dados, como qualquer participante, e ainda assim não acessa
os dos outros. A asserção correta tem duas partes:

- **(a)** o admin lê **1 de N** linhas de `draw` (a própria, nunca 0, nunca mais que 1);
- **(b)** um `select` filtrando por um `giver_id` de outro participante do mesmo grupo
  volta **vazio** (`[]`).

A policy testada é a única regra de `SELECT` em `public.draw`
(`supabase/migrations/0003_rls_policies.sql`, bloco "A POLÍTICA CRÍTICA DO PROJETO"):

```sql
-- === draw — A POLÍTICA CRÍTICA DO PROJETO (DB-07, DB-08) ===
-- ÚNICA leitura permitida: a própria linha, como giver. SEM exceção para admin.
-- Se alguém algum dia adicionar `or ... admin_id ...` aqui, o core value do projeto morre.
create policy "draw: ver apenas meu proprio par" on public.draw
for select to authenticated
using ( giver_id in (select private.my_participant_ids()) );
```

Nenhuma cláusula desta policy menciona `admin_id`. Não existe policy de
`INSERT`/`UPDATE`/`DELETE` em `draw` para `authenticated` — a única escrita vem da Edge
Function `run-draw`, autenticada com a `service_role` key, que nunca chega ao navegador.

## Parte A — Snippet para o console do DevTools, autenticado como admin

A aplicação **não expõe um `window.supabase` global** (`SupabaseClientService` é
injetável, nunca uma variável global) — então o snippet copiável abaixo usa `fetch`
diretamente contra o endpoint REST do PostgREST, lendo o token de sessão do próprio
`localStorage` do navegador (onde o `supabase-js` já guarda a sessão ativa).

**Procedimento:** autenticar no navegador como o **ADMIN** de um grupo já sorteado
(`status = 'closed'`), abrir o DevTools → Console, e colar:

```javascript
// Executar no console do DevTools, logado como o ADMIN de um grupo já sorteado.
// Lê a sessão ativa salva pelo supabase-js e repete a mesma chamada que
// DrawService.getMyResult() faria, mas sem filtro de group_id — para ver TODAS
// as linhas de draw que a RLS deixa este usuário ler, de qualquer grupo.
const SUPABASE_URL = 'https://ccruvfblgdvnjxenezuh.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_LF2GGRXzSKwMa8gH3PnCaQ_8QJPkl9Y'; // chave pública, segura no console
const sessaoChave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
const { access_token } = JSON.parse(localStorage.getItem(sessaoChave));

// (a) TODAS as linhas de draw visíveis para o admin — esperado: 1 linha, a própria.
const resp1 = await fetch(`${SUPABASE_URL}/rest/v1/draw?select=*`, {
  headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${access_token}` },
});
console.log('Parte A(a) — minhas linhas de draw:', await resp1.json());

// (b) filtrando por giver_id de OUTRO participante do mesmo grupo — esperado: [].
const OUTRO_PARTICIPANT_ID = 'cole-aqui-o-id-de-outro-participant';
const resp2 = await fetch(
  `${SUPABASE_URL}/rest/v1/draw?select=*&giver_id=eq.${OUTRO_PARTICIPANT_ID}`,
  { headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${access_token}` } },
);
console.log('Parte A(b) — linhas de outro participante (deve ser []):', await resp2.json());
```

**Critérios de PASS:**

- **(a)** `resp1.json()` devolve um array com **exatamente 1 objeto**, cujo `giver_id` é
  igual ao `participant.id` do próprio admin — não 0 (pós-D-01), não mais que 1 (perfect
  matching garante no máximo uma linha por `giver_id`, via `UNIQUE (group_id, giver_id)`);
- **(b)** `resp2.json()` devolve `[]` — nenhuma linha, mesmo sendo o admin do grupo.

| Passo | Query | Esperado | Observado |
|-------|-------|----------|-----------|
| A(a)  | `GET /rest/v1/draw?select=*` como admin | array com exatamente 1 objeto, `giver_id = participant.id` do admin | `[não executado via DevTools nesta rodada — a verificação real da asserção dupla foi feita via SQL impersonado, Parte B abaixo, que exercita a mesma policy de RLS pelo caminho do banco em vez do REST do PostgREST]` |
| A(b)  | `GET /rest/v1/draw?select=*&giver_id=eq.<outro>` como admin | `[]` | `[não executado via DevTools nesta rodada — ver Parte B]` |

## Parte B — SQL equivalente para o SQL Editor com duas sessões

Mesmo formato de `docs/db-rls-verification.md` Partes C/D: impersonação via
`begin ... rollback`, com `set local role authenticated` e `set local
request.jwt.claims` apontando para o `sub` do admin.

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-do-admin>","role":"authenticated"}';

-- (a) esperado: 1 linha, a própria.
select * from public.draw;

-- (b) esperado: 0 linhas.
select * from public.draw where giver_id = '<uuid-de-outro-participante>';

rollback;
```

**Execução real** (2026-10-15, projeto `ccruvfblgdvnjxenezuh`, banco de produção — ver nota
de ressalva na Parte D). Grupo "Teste2" (`id = 9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`),
sorteado de verdade via UI (`/group/:id/manage` → "Realizar sorteio"), 4 participantes:

| participant.id | display_name | papel |
|---|---|---|
| `5a17b141-0160-4842-b40f-62a536637c8d` | zampa | participante |
| `e02b9bf6-b7cb-425a-b16e-841e3aa52019` | Ana Júlia Souza | **admin** |
| `5dcd6441-7864-438e-8f49-e70f3a7db5fb` | Bruno Carvalho | participante |
| `18bfda62-158c-44cd-9803-21b0451a64db` | Carla Menezes | participante |

Variante executada: em vez do `select *` completo (que exporia o par de outrem em texto
cru no log de verificação), a contagem equivalente, impersonando a admin (`sub =
5e21548f-0228-4a7b-af51-4e70148bf732`, usuário da Ana Júlia):

```sql
-- B(a) — todas as linhas de draw visíveis para a admin, dentro do seu próprio grupo.
select count(*) from public.draw where group_id = '9e0b6421-23e6-43d2-bbcd-3e162e08c4ef';

-- B(b) — tentando ler especificamente o par de Bruno (outro participante).
select count(*) from public.draw where giver_id = '5dcd6441-7864-438e-8f49-e70f3a7db5fb';
```

| Passo | Query | Esperado | Observado |
|-------|-------|----------|-----------|
| B(a)  | `count(*) from public.draw where group_id = '9e0b6421-...'` (sessão da admin) | 1 (de 4 linhas existentes no grupo) | **1** — PASS |
| B(b)  | `count(*) from public.draw where giver_id = '5dcd6441-...'` (giver_id de Bruno, sessão da admin) | 0 | **0** — PASS |

**Prova complementar (não-admin lendo a própria linha):** impersonando Bruno
(`sub = e197369e-8610-4458-9698-df057d1649e8`), `select * from public.draw where giver_id =
'5dcd6441-...'` devolve exatamente 1 linha, com `receiver_id = 'e02b9bf6-...'` — que,
ao fazer join com `participant.display_name`, corresponde a "Ana Júlia Souza" (a admin).
Confirma que Bruno lê o próprio par (inclusive quando o receiver é a admin) e que a RLS não
trata a admin como um caso especial em nenhuma direção — nem como alguém que não pode ser
sorteado, nem como alguém que pode ver os pares dos outros.

## Parte C — Prova herdada da Fase 1 (citar, não reexecutar)

`docs/db-rls-verification.md`, **Parte D — "Leitura como Usuário B (participante) — O
CRITÉRIO CENTRAL DE DB-10"**, já prova que um participante comum (usuário B) lê **0 (zero)
linhas** de `draw` ao tentar acessar o par cujo `giver_id` é de outro usuário (usuário A,
que ali desempenhava o papel de admin), mesmo estando no mesmo grupo e aparecendo
normalmente em `participant`:

> "o usuário B lê **0 (zero) linhas** de `draw` — o par sorteado para A (onde A é
> `giver_id`) é completamente invisível para B, mesmo que B esteja no mesmo grupo e
> apareça na tabela `participant`. [...] **Resultado: PASS.**"

**Nota de validade pós-D-01/D-02:** aquele teste permanece válido porque antes da Fase 4 o
"admin" testado lá era um participante comum sob outro nome de papel — a Fase 1 não tinha
ainda a distinção entre "admin que participa" e "admin que não participa", simplesmente
testou dois participantes quaisquer de um mesmo grupo. A policy testada é a mesma, linha a
linha, inalterada por D-01/D-02 (`giver_id in (select private.my_participant_ids())`). As
Partes A e B deste documento adicionam o que a Fase 1 não podia provar ainda: que o
*próprio admin*, agora formalmente participante do seu grupo, lê exatamente a própria
linha (nunca 0, nunca mais de 1) e continua sem acesso às linhas de qualquer outro
participante.

## Parte D — Checklist de execução real

Esta seção registra a execução efetiva do roteiro acima, com a saída observada colada no
lugar dos placeholders originais. Nenhuma saída foi inventada.

- [x] **Passo 1** — Confirmado um grupo real com `status = 'closed'` e `n = 4`
      participantes, resultado de um sorteio executado via UI (`/group/:id/manage` →
      "Realizar sorteio"). Grupo usado: "Teste2",
      `id = 9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`. `public.draw` ficou com 4 linhas —
      perfect matching sobre os 4 participantes.
- [x] **Passo 2 (variante)** — A UI foi verificada ponta a ponta por uma pessoa, nos dois
      papéis: a admin autenticada chegou em `/draw/:groupId/result` e viu o próprio par
      revelado após clicar no cartão fechado; um participante não-admin (Bruno) também
      revelou o próprio par com sucesso. O snippet literal de DevTools da Parte A **não
      foi colado manualmente no console** nesta rodada — a asserção dupla foi verificada
      pelo caminho SQL equivalente (Parte B), que exercita a mesma policy de RLS. Ver nota
      na Parte A sobre esta substituição de método.
- [x] **Passo 3** — Executado Parte B(a)/B(b) via `npx supabase db query --linked`
      (impersonação de role/claims idêntica ao SQL Editor). Saída: B(a) = **1**, B(b) =
      **0** — ambos conforme esperado. Colado na Parte B acima.
- [x] **Passo 4** — Confirmado: o `giver_id` da linha lida pela admin em B(a) é
      `e02b9bf6-b7cb-425a-b16e-841e3aa52019`, que é o `participant.id` da própria Ana
      Júlia Souza (a admin) — não de nenhum outro participante.

**Resultado final: PASS.** A asserção dupla de D-13/DRAW-10 foi comprovada com dados reais
contra o projeto Supabase de produção (`ccruvfblgdvnjxenezuh`): a admin lê exatamente 1 de
4 linhas de `draw` (a própria), e 0 linhas ao filtrar pelo `giver_id` de outro participante
(Bruno). A verificação completa de UI (ambos os lados, admin e não-admin, revelação
funcionando em `/draw/:groupId/result`) também passou.

**Descoberta durante a verificação (não estava prevista nesta plan):** a primeira
tentativa de revelação como participante não-admin **falhou** — não havia nenhum link para
`/draw/:groupId/result` acessível a não-admins; o único link existia em
`manage-group.page.html`, atrás de uma checagem de admin. Corrigido por uma quick task
separada (`261015-mbk`, commits `ec415fa`/`f481d18`/`217aa9e`/`4781636`): novo predicado
puro exportado `podeVerResultadoDoSorteio(status, temParticipante)` + `computed()` em
`group-view.page.ts`, 5 specs novos (`group-view-reveal-link.spec.ts`), e um botão "Ver meu
amigo secreto" em `group-view.page.html`, condicionado a
`status === 'closed' && meuParticipante() !== null`. Suite completa 64/64, eslint e
`ng build` limpos. Este gap não bloqueou DRAW-08/09 (que já tinham sido entregues e
verificados na plan 04-04 via rota direta), mas bloqueava a verificação end-to-end real
desta plan — por isso foi corrigido antes de fechar 04-05, não apenas registrado como item
adiado.

**Ressalva de ambiente (registrar honestamente, não omitir):** esta execução rodou contra
o **banco de produção** (`--linked` aponta para o projeto principal, não um ambiente de
teste isolado). As 4 linhas de `participant` do grupo "Teste2" e os 2 usuários de teste
criados para esta verificação (`bruno-teste4@exemplo.com`, `carla-teste4@exemplo.com`) são
linhas reais, com **limpeza pendente** (não realizada nesta sessão). Além disso, **o
sorteio deste grupo específico é irreversível e já está `closed`** — repetir este roteiro
exige um grupo novo, não a reexecução deste mesmo grupo.

## Resumo por requisito

| Requisito | Descrição | Resultado |
|-----------|-----------|-----------|
| DRAW-10 (a) | O admin, participante do próprio sorteio (D-01), lê exatamente 1 de N linhas de `draw` — a própria, nunca 0, nunca mais de 1 | **PASS** — grupo "Teste2", 1 de 4 linhas |
| DRAW-10 (b) | O admin não lê nenhuma linha de `draw` cujo `giver_id` seja de outro participante do mesmo grupo | **PASS** — 0 linhas ao filtrar pelo `giver_id` de Bruno |
| — | Policy de `draw` citada verbatim de `supabase/migrations/0003_rls_policies.sql`, sem referência a `admin_id` | PASS (verificado por leitura do arquivo) |
| — | Prova herdada da Fase 1 (`docs/db-rls-verification.md` Parte D) permanece válida pós-D-01/D-02 | PASS (citada, não reexecutada) |
| — | Revelação end-to-end via UI, nos dois papéis (admin e não-admin), em `/draw/:groupId/result` | **PASS** — após correção do gap de link para não-admins (ver Parte D) |

**Limitações registradas honestamente:** a execução rodou contra o banco de produção
(limpeza das linhas de teste pendente) e o grupo usado está `closed` de forma irreversível
(não é reexecutável — um roteiro futuro precisa de um grupo novo). Ver Parte D para o
detalhe completo.
