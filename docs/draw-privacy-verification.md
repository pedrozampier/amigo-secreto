# Verificação de Privacidade do Sorteio — Admin Participante (DRAW-10, D-13)

**Data de criação do roteiro:** 2026-10-15
**Projeto:** Supabase (instância real, `ccruvfblgdvnjxenezuh`)
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
| A(a)  | `GET /rest/v1/draw?select=*` como admin | array com exatamente 1 objeto, `giver_id = participant.id` do admin | `[pendente]` |
| A(b)  | `GET /rest/v1/draw?select=*&giver_id=eq.<outro>` como admin | `[]` | `[pendente]` |

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

| Passo | Query | Esperado | Observado |
|-------|-------|----------|-----------|
| B(a)  | `select * from public.draw;` (sessão do admin) | 1 linha, `giver_id` = participant.id do admin | `[pendente]` |
| B(b)  | `select * from public.draw where giver_id = '<outro>';` (sessão do admin) | 0 linhas | `[pendente]` |

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
lugar dos placeholders `[pendente]`. Nenhuma saída deve ser inventada — se a execução
ficar pendente de uma pessoa (navegador real, duas contas reais), isso fica registrado
explicitamente como `[pendente]`, nunca com um valor fabricado.

- [ ] **Passo 1** — Confirmar um grupo real com `status = 'closed'` e `n >= 3`
      participantes, resultado de um sorteio executado via UI (`/group/:id/manage` →
      "Realizar sorteio"). Grupo usado: `[pendente]`.
- [ ] **Passo 2** — Executar Parte A(a)/A(b) no DevTools, autenticado como o admin deste
      grupo. Saída colada: `[pendente]`.
- [ ] **Passo 3** — Executar Parte B(a)/B(b) no SQL Editor, impersonando o `sub` do mesmo
      admin. Saída colada: `[pendente]`.
- [ ] **Passo 4** — Confirmar que o `giver_id` retornado em A(a)/B(a) é de fato o
      `participant.id` do admin (comparar com `select id from public.participant where
      user_id = '<uuid-do-admin>' and group_id = '<grupo>'`). `[pendente]`.

**Resultado final:** `[pendente]` — este roteiro foi redigido e versionado nesta plan
(04-05); a execução real contra o projeto Supabase de produção, com um sorteio
genuinamente disparado via UI (dependente do deploy da Edge Function `run-draw`, Task 2
desta mesma plan), fica registrada aqui quando executada por uma pessoa com acesso ao
navegador e a duas contas reais — mesmo padrão de `docs/db-rls-verification.md`, que também
tem notas "não capturado" onde a evidência bruta não foi colada na rodada em que o
documento foi escrito.

## Resumo por requisito

| Requisito | Descrição | Resultado |
|-----------|-----------|-----------|
| DRAW-10 (a) | O admin, participante do próprio sorteio (D-01), lê exatamente 1 de N linhas de `draw` — a própria, nunca 0, nunca mais de 1 | `[pendente]` |
| DRAW-10 (b) | O admin não lê nenhuma linha de `draw` cujo `giver_id` seja de outro participante do mesmo grupo | `[pendente]` |
| — | Policy de `draw` citada verbatim de `supabase/migrations/0003_rls_policies.sql`, sem referência a `admin_id` | PASS (verificado por leitura do arquivo) |
| — | Prova herdada da Fase 1 (`docs/db-rls-verification.md` Parte D) permanece válida pós-D-01/D-02 | PASS (citada, não reexecutada) |
