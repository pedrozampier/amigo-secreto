# Verificação de RLS com Dois Usuários (DB-10)

**Data da execução:** 2026-10-15
**Projeto:** Supabase (instância real, criada no Dashboard)
**Objetivo:** provar, com evidência executada (não apenas leitura de código), que a
privacidade do sorteio é garantida pelo banco de dados — e não pela interface — conforme
o core value do UTF-Secret e o requisito DB-10.

As migrations `0001_schema.sql`, `0002_private_helpers.sql` e `0003_rls_policies.sql` foram
aplicadas nessa ordem no SQL Editor do projeto, cada uma retornando `Success. No rows
returned`. Dois usuários de teste foram criados via **Authentication → Users → Add user**
(nunca por `INSERT` direto em `auth.users`, conforme o PRD exige), com "Auto Confirm User"
marcado:

- Usuário A (admin do grupo), UUID mascarado: `f41aaa98...`
- Usuário B (participante comum), UUID mascarado: `6b8baaa2...`

## Parte B — Seed de dados (executado como `postgres`, bypassa RLS por propósito)

O trigger `handle_new_user` (criado em `0001_schema.sql`) populou `public.profile`
automaticamente ao criar os dois usuários via Auth. O seed manual inseriu, como `postgres`:

- 1 grupo: `Grupo Teste RLS`, com `admin_id` = usuário A
- 2 participantes: A e B, ambos no mesmo grupo
- 1 par de sorteio (`draw`): A é o `giver`, B é o `receiver`

Resultado confirmado: 1 linha em `group`, 2 linhas em `participant`, 1 linha em `draw`.

> Nota: a saída específica de `select id, email, display_name from public.profile` (que
> confirmaria visualmente as 2 linhas de profile) não foi capturada nesta rodada — **não
> capturado**. O resultado agregado da Parte C (abaixo), que conta `group_count = 1` e
> `participant_count = 2` sob o usuário A, confirma indiretamente que o seed funcionou.

## Parte C — Leitura como Usuário A (admin, dono do par)

Impersonação via SQL Editor, dentro de `begin ... rollback`, com
`set local role authenticated` e `set local request.jwt.claims` apontando para o `sub` do
usuário A.

Query executada:

```sql
select 'A (admin)' as usuario,
       (select count(*) from public.draw)        as draw_count,
       (select count(*) from public.participant) as participant_count,
       (select count(*) from public.group)       as group_count;
```

Saída observada (1 linha):

| usuario   | draw_count | participant_count | group_count |
|-----------|------------|--------------------|--------------|
| A (admin) | 1          | 2                  | 1            |

**Interpretação:** o usuário A, como `giver_id` do par inserido no seed, lê exatamente a
própria linha em `draw` (1), os 2 participantes do grupo onde está, e o grupo onde é admin.
Nenhuma linha extra, nenhuma linha faltando. Comportamento esperado.

## Parte D — Leitura como Usuário B (participante) — O CRITÉRIO CENTRAL DE DB-10

Mesmo procedimento de impersonação, agora com o `sub` do usuário B.

Query executada (mesmo formato da Parte C):

Saída observada (1 linha):

| usuario          | draw_count | participant_count | group_count |
|------------------|------------|--------------------|--------------|
| B (participante) | 0          | 2                  | 1            |

**Interpretação:** o usuário B lê **0 (zero) linhas** de `draw` — o par sorteado para A
(onde A é `giver_id`) é completamente invisível para B, mesmo que B esteja no mesmo grupo e
apareça na tabela `participant`. B continua lendo normalmente os 2 colegas do grupo e o 1
grupo onde participa (ambos esperados e corretos — não é isso que precisa ser restrito).

**Resultado: PASS.** Este é o teste que prova a regra de negócio central do projeto ("o
admin do grupo nunca vê os pares sorteados" generaliza para "nenhum usuário vê o par de
outro usuário") — garantida pela policy de `SELECT` em `draw`
(`giver_id in (select private.my_participant_ids())`), no nível do banco, não da interface.

## Parte E — Teste negativo de escrita (prova DB-08)

Ainda impersonando o usuário A — o **admin** do grupo — tentativa de `INSERT` direto em
`public.draw`, dentro de `begin ... rollback`:

```sql
insert into public.draw (group_id, giver_id, receiver_id)
select pa.group_id, pb.id, pa.id
from public.participant pa, public.participant pb
where pa.user_id = '<UUID_A>' and pb.user_id = '<UUID_B>' and pa.group_id = pb.group_id;
```

Erro observado, verbatim:

```
Error: Failed to run sql query: ERROR: 42501: new row violates row-level security policy for table "draw"
```

**Resultado: PASS (DB-08).** Mesmo sendo o admin do grupo — a pessoa que criou o convite e
administra os participantes — o usuário A **não consegue inserir** uma linha em `draw`. Isso
confirma que `0003_rls_policies.sql` não criou nenhuma policy de `INSERT`/`UPDATE`/`DELETE`
em `draw` para o role `authenticated`: a única escrita possível nessa tabela vem da Edge
Function autenticada com a chave de privilégio elevado do servidor, que nunca chega ao navegador do usuário.

## Parte F — Provas mecânicas de DB-06 e ausência de `using (true)`

**Query 1** — RLS habilitada nas 4 tabelas:

```sql
select tablename, rowsecurity from pg_tables where schemaname='public'
and tablename in ('profile','group','participant','draw');
```

Saída observada (4 linhas):

| tablename   | rowsecurity |
|-------------|-------------|
| draw        | true        |
| group       | true        |
| participant | true        |
| profile     | true        |

Todas as 4 tabelas têm `rowsecurity = true`. **DB-06: PASS.**

**Query 2** — listagem completa de policies:

```sql
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname='public' order by tablename, cmd;
```

Saída observada (11 linhas no total):

| tablename   | policyname                                | cmd    | qual (resumo)                                                     | with_check (resumo)             |
|-------------|--------------------------------------------|--------|---------------------------------------------------------------------|----------------------------------|
| draw        | draw: ver apenas meu proprio par           | SELECT | `giver_id IN (SELECT private.my_participant_ids())`                 | NULL                             |
| group       | group: admin cria grupo                    | INSERT | NULL                                                                 | `admin_id = (SELECT auth.uid())` |
| group       | group: admin le seus grupos                | SELECT | `admin_id = (SELECT auth.uid())`                                     | NULL                             |
| group       | group: participante le grupos onde esta    | SELECT | `id IN (SELECT private.my_group_ids())`                              | NULL                             |
| group       | group: admin atualiza seu grupo            | UPDATE | `admin_id = (SELECT auth.uid())`                                     | `admin_id = (SELECT auth.uid())` |
| participant | participant: admin remove participante     | DELETE | `group_id IN (SELECT g.id FROM "group" g WHERE (g.admin_id = ...))` *(truncado na UI do Supabase)* | NULL |
| participant | participant: entrar em um grupo            | INSERT | NULL                                                                 | `(user_id = (SELECT auth.uid())) AND (group_id IN (SELECT g.id FROM ...))` *(truncado na UI do Supabase)* |
| participant | participant: ver colegas do grupo          | SELECT | `group_id IN (SELECT private.my_group_ids())`                        | NULL                             |
| participant | participant: editar os proprios dados      | UPDATE | `user_id = (SELECT auth.uid())`                                      | `user_id = (SELECT auth.uid())`  |
| profile     | profile: ver o proprio perfil              | SELECT | `id = (SELECT auth.uid())`                                           | NULL                             |
| profile     | profile: editar o proprio perfil           | UPDATE | `id = (SELECT auth.uid())`                                           | `id = (SELECT auth.uid())`       |

> Duas células (`qual` de `participant: admin remove participante` e `with_check` de
> `participant: entrar em um grupo`) foram visualmente truncadas pelo grid do Supabase SQL
> Editor e estão marcadas acima como "truncado na UI do Supabase". O texto autoritativo e
> completo dessas duas policies está versionado em
> `supabase/migrations/0003_rls_policies.sql`:
>
> ```sql
> create policy "participant: entrar em um grupo" on public.participant
> for insert to authenticated
> with check (
>   user_id = (select auth.uid())
>   and group_id in (select g.id from public.group g where g.status = 'open')
> );
>
> create policy "participant: admin remove participante" on public.participant
> for delete to authenticated
> using (
>   group_id in (select g.id from public.group g where g.admin_id = (select auth.uid()))
> );
> ```

**Fatos derivados da listagem acima, todos verificáveis:**

- Existe **exatamente uma** policy na tabela `draw`, e seu `cmd` é `SELECT`.
- **Não existe** nenhuma policy de `INSERT`, `UPDATE` ou `DELETE` em `draw` para
  `authenticated`.
- Nenhuma policy em `draw` menciona `admin_id`.
- Nenhum `qual` ou `with_check` de toda a listagem é literalmente `true`.

**DB-07 / DB-08 / regra "nenhum `using (true)`": PASS.**

## Parte G — Ausência de recursão `42P17`

Nenhuma das queries executadas nas Partes C, D e E retornou o erro
`ERROR: 42P17 infinite recursion detected in policy for relation ...`. As funções
`SECURITY DEFINER` `private.my_group_ids()` e `private.my_participant_ids()` (definidas em
`0002_private_helpers.sql`, com `set search_path = ''` e nomes schema-qualificados) evitam
exatamente esse problema: como são `SECURITY DEFINER`, a leitura que fazem em
`public.participant` dentro do corpo da função não reavalia a policy de RLS de
`public.participant` — se as policies consultassem `participant` diretamente (em vez de
passar por essas funções), uma policy de `SELECT` em `participant` que faz `SELECT` em
`participant` provocaria recursão infinita e o Postgres abortaria com `42P17`.

**Nenhum erro 42P17 observado em nenhuma query.**

## Resumo por requisito

| Requisito | Descrição                                                              | Resultado |
|-----------|-------------------------------------------------------------------------|-----------|
| DB-06     | RLS habilitada nas 4 tabelas (`rowsecurity = true`)                     | PASS      |
| DB-07     | Única policy de leitura em `draw`, por `giver_id`, sem referência a `admin_id` | PASS      |
| DB-08     | Nenhuma escrita em `draw` permitida a `authenticated` (nem o admin)      | PASS      |
| DB-10     | Usuário B não lê o par cujo `giver_id` é do usuário A (isolamento real, dois usuários) | PASS      |
| —         | Ausência de recursão `42P17` nas policies baseadas em `private.*`       | PASS      |

## Itens não capturados nesta rodada

- A saída de `select id, email, display_name from public.profile` da Parte B (seed) não foi
  colada nesta verificação — **não capturado**.
- `SUPABASE_URL` e o esquema de chave pública emitido pelo projeto (novo formato "publicável"
  vs. o legado `anon`) ainda não foram fornecidos; pertencem ao setup das plans 01-03/01-04,
  não a este documento de verificação de RLS.

## Verificação da migration 0004 (Fase 3)

**Data da execução:** 2026-10-15
**Projeto:** Supabase remoto real (project ref `ccruvfblgdvnjxenezuh`), via CLI linkada
**Objetivo:** provar que `public.join_group_by_token` e `public.preview_group_by_token`
(migration `0004_group_join_rpcs.sql`) destravam a entrada por convite sem reabrir a RLS
direta sobre `public.group` — GRP-06, GRP-07, GRP-08.

**Diferença de método em relação às verificações anteriores:** as Partes A–G acima foram
executadas pelo usuário no SQL Editor do painel Supabase, alternando sessões manualmente.
Esta seção foi executada pelo orquestrador diretamente contra o banco de produção, usando
`npx supabase db query --linked` após o projeto Supabase ter sido linkado via CLI. Nenhum
`supabase db push` foi necessário — a migration `0004` **já estava aplicada no banco remoto
antes desta sessão**, tendo sido criada manualmente via SQL Editor em algum momento
anterior (mesmo padrão de aplicação manual das migrations `0001`–`0003`; ver seção
"Itens não capturados" abaixo para a dívida de processo associada).

Usuários reais usados (já existentes em `auth.users` no projeto):

| Papel | UUID | E-mail |
|-------|------|--------|
| A (admin, cria o grupo) | `f41aaa98-fdc2-45dd-9941-af6616c7ae57` | `test-admin@utfsecret.dev` |
| B (joiner, entra pelo convite) | `6b8baaa2-5342-45a4-a524-a46d76b67163` | `test-participant@utfsecret.dev` |
| C (terceiro usuário, testa grupo fechado) | `5e21548f-0228-4a7b-af51-4e70148bf732` | `teste-fase2@exemplo.com` |

### Passo 1 — as funções existem como SECURITY DEFINER

Query executada:

```sql
select p.proname, p.prosecdef, array_to_string(p.proconfig,',') as cfg
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('join_group_by_token','preview_group_by_token');
```

Saída observada (2 linhas):

```json
[
  { "proname": "join_group_by_token",    "prosecdef": true, "cfg": "search_path=\"\"" },
  { "proname": "preview_group_by_token", "prosecdef": true, "cfg": "search_path=\"\"" }
]
```

**Interpretação:** ambas as funções existem no schema `public`, com `prosecdef = true`
(equivalente a `security definer`) e `search_path` travado em string vazia — exatamente o
padrão exigido desde `0002_private_helpers.sql` para evitar sequestro de `search_path`.

### Passo 2 — criar grupo como A

Query executada:

```sql
insert into public.group (name, admin_id)
values ('Grupo Teste 0004', 'f41aaa98-fdc2-45dd-9941-af6616c7ae57')
returning id, name, status, invite_token;
```

Saída observada:

```json
[{ "id": "53ed7d73-1bd5-4cb1-a080-0f4c3118d449",
   "name": "Grupo Teste 0004",
   "status": "open",
   "invite_token": "c844819f57dcbdebb439d4b88e6e82d7" }]
```

### Passo 3a — `preview_group_by_token` como B (via RPC)

Query executada:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"6b8baaa2-5342-45a4-a524-a46d76b67163","role":"authenticated"}';
select 'preview_rpc' as teste, name, status
from public.preview_group_by_token('c844819f57dcbdebb439d4b88e6e82d7');
commit;
```

Saída observada:

```json
[{ "teste": "preview_rpc", "name": "Grupo Teste 0004", "status": "open" }]
```

### Passo 3b — SELECT direto na tabela `group` como B (o critério central)

Query executada:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"6b8baaa2-5342-45a4-a524-a46d76b67163","role":"authenticated"}';
select count(*) as linhas_visiveis_direto
from public.group where invite_token = 'c844819f57dcbdebb439d4b88e6e82d7';
commit;
```

Saída observada:

```json
[{ "linhas_visiveis_direto": 0 }]
```

**Interpretação (prova central da 0004):** a RLS continua bloqueando a leitura direta de
`public.group` por um não-membro — exatamente como as Partes F e G provam para o restante
do schema. Somente o `SECURITY DEFINER` atravessa esse bloqueio. É a premissa que justifica
toda a migration `0004`: sem ela, B não teria como nem ler o nome do grupo para decidir se
quer entrar.

### Passo 4a — `join_group_by_token` como B

Query executada (mesma transação com role `authenticated` e claims de B):

```sql
select public.join_group_by_token('c844819f57dcbdebb439d4b88e6e82d7') as resultado;
```

Saída observada:

```json
[{ "resultado": { "code": "OK", "group_id": "53ed7d73-1bd5-4cb1-a080-0f4c3118d449" } }]
```

### Passo 4b — linha de `participant` criada com `display_name` não vazio

Query executada:

```sql
select id, user_id, display_name from public.participant
where group_id = '53ed7d73-1bd5-4cb1-a080-0f4c3118d449';
```

Saída observada:

```json
[{ "id": "e587f290-bd69-4fae-9125-a039fb88c9fd",
   "user_id": "6b8baaa2-5342-45a4-a524-a46d76b67163",
   "display_name": "test-participant" }]
```

**Interpretação (Passos 4a/4b):** B — que não tinha acesso de leitura direto à linha de
`group` — consegue entrar no grupo via RPC, e a linha de `participant` resultante carrega o
`display_name` copiado de `profile`, não nulo nem vazio. GRP-06 comprovado de ponta a ponta.

### Passo 5 — GRP-07, join repetido como B

Query executada:

```sql
select public.join_group_by_token('c844819f57dcbdebb439d4b88e6e82d7') as resultado;
```

Saída observada:

```json
[{ "resultado": { "code": "ALREADY_MEMBER" } }]
```

**Interpretação:** código estável devolvido, sem vazar o erro `23505` (unique_violation) do
Postgres por trás. GRP-07 comprovado.

### Passo 6 — GRP-08, grupo fechado, join como terceiro usuário C

Queries executadas:

```sql
update public.group set status = 'closed' where id = '53ed7d73-1bd5-4cb1-a080-0f4c3118d449';

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"5e21548f-0228-4a7b-af51-4e70148bf732","role":"authenticated"}';
select public.join_group_by_token('c844819f57dcbdebb439d4b88e6e82d7') as resultado;
commit;
```

Saída observada:

```json
[{ "resultado": { "code": "GROUP_CLOSED" } }]
```

**Interpretação:** um grupo que não está `open` não aceita mais ninguém, nem um usuário que
nunca havia tentado entrar antes. GRP-08 comprovado.

### Passo 7 — token inexistente

Query executada:

```sql
select public.join_group_by_token('naoexiste') as resultado;
```

Saída observada:

```json
[{ "resultado": { "code": "INVALID_TOKEN" } }]
```

### Passo 8 — limpeza e confirmação

Queries executadas:

```sql
delete from public.group where name = 'Grupo Teste 0004';

select
  (select count(*) from public.group where name = 'Grupo Teste 0004') as grupos_restantes,
  (select count(*) from public.participant where group_id = '53ed7d73-1bd5-4cb1-a080-0f4c3118d449') as participantes_restantes;
```

Saída observada:

```json
[{ "grupos_restantes": 0, "participantes_restantes": 0 }]
```

**Interpretação:** o `on delete cascade` de `participant.group_id` funcionou — nenhum
resíduo do teste permanece no banco de produção.

### Resumo por requisito

| Requisito | Descrição | Resultado |
|-----------|-----------|-----------|
| GRP-06 | Não-membro descobre nome+status pelo token (`preview_group_by_token`) e entra no grupo (`join_group_by_token`), com a linha de `participant` resultante carregando `display_name` não vazio — tudo isso sem que a RLS direta sobre `group` seja reaberta (Passo 3b confirma 0 linhas no SELECT direto) | PASS |
| GRP-07 | Join duplicado devolve `ALREADY_MEMBER` em vez do erro cru `23505` do Postgres | PASS |
| GRP-08 | Grupo fora de `status = 'open'` rejeita qualquer novo join com `GROUP_CLOSED` | PASS |

### Itens não capturados / dívida de processo

- **As migrations `0001`–`0004` foram todas aplicadas manualmente via SQL Editor do painel
  Supabase, nunca por `npx supabase db push`.** Consequência direta: a tabela
  `supabase_migrations.schema_migrations` **não existe** no projeto remoto, e
  `npx supabase migration list` mostra a coluna `remote` vazia para as 4 migrations, mesmo
  todas estando de fato aplicadas e verificadas em produção (como provam os Passos 1–8
  acima). O histórico de migrations da CLI está, portanto, dissociado do estado real do
  banco. Nenhum `db push` foi executado nesta sessão — a `0004` já estava aplicada quando a
  verificação começou.
- Esta é dívida de processo documentada, não um bloqueio funcional: o schema real e as RLS
  policies reais foram verificados diretamente via `pg_proc`/`pg_policies` e via execução
  das funções, independentemente do que a CLI de migrations acredita estar sincronizado.
  Recomendação para sessões futuras: rodar `npx supabase db push` (ou
  `npx supabase migration repair`) ao menos uma vez para reconciliar o histórico da CLI com
  o estado real do banco, antes que a divergência cresça mais.
