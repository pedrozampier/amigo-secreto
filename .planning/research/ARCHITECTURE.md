# Architecture Research

**Domain:** PWA Angular 17+ / Supabase (Postgres + Auth + RLS + Edge Functions) — Amigo Secreto com privacidade garantida no banco
**Researched:** 2026-10-14
**Confidence:** HIGH (RLS, recursão e service_role verificados contra docs oficiais do Supabase e discussões recentes de 2026; algoritmo de sorteio é matemática verificável, não depende de fontes externas)

---

## Resumo Executivo

O SDD já acerta a decisão estrutural mais importante — RLS como mecanismo de privacidade, sorteio em Edge Function — mas descreve a camada de banco apenas em prosa. Esta pesquisa converte essa prosa em SQL executável e aponta três problemas reais no modelo de dados atual que, se não corrigidos, comprometem exatamente o core value do projeto (o admin não poder ler os pares) ou violam uma regra de negócio explícita do PRD (RN5, convite de uso único por e-mail).

O ponto mais crítico tecnicamente é a **recursão em RLS**: qualquer política em `participant` que pergunte "este usuário pertence ao mesmo grupo?" fazendo um `SELECT` em `participant` dispara `ERROR 42P17: infinite recursion detected in policy`. A solução padrão (e a única aceita pela documentação oficial do Supabase) é extrair essa pergunta para uma função `SECURITY DEFINER` em um schema privado, nunca em `public`. Essa função é o alicerce de praticamente todas as políticas das quatro tabelas — vale desenhá-la primeiro, antes de qualquer outra política.

O segundo ponto crítico é que o sorteio **precisa** rodar com a `service_role key` dentro da Edge Function, e isso **não é uma falha de segurança — é a única forma correta de inserir pares em `draw` sem que nenhum participante (nem o admin) tenha permissão de INSERT nessa tabela**. RLS em `draw` concede apenas SELECT a quem é o `giver`; ninguém tem INSERT. A Edge Function, autenticada como `service_role`, bypassa RLS por design para fazer exatamente essa única escrita privilegiada — e só essa.

---

## Problemas no Modelo de Dados Atual (SDD §3.2, §4)

### Problema 1 — `draw.giver_id`/`receiver_id` apontam para `participant.id`: correto, mas precisa ser explícito sobre o porquê

O SDD aponta `giver_id`/`receiver_id` para `participant.id`, não para `profile.id` (= `auth.users.id`). **Isso está certo e deve ser mantido** — mas o SDD não explica por quê, e a escolha errada aqui simplificaria a política de RLS de forma ilusória e introduziria um bug.

Se `draw` apontasse direto para `user_id`/`profile.id`:
- A política de SELECT em `draw` ficaria `giver_id = (select auth.uid())` — mais simples textualmente.
- Mas o sorteio é por `group_id`. Nada impediria (sem lógica extra) que o mesmo `user_id` participe de dois grupos diferentes e a política vazasse pares de um grupo ao consultar outro, exigindo sempre um filtro adicional por `group_id` em toda query.
- Pior: a unicidade "uma pessoa por grupo" já é garantida em `participant` (ver Problema 3). Se `draw` referenciasse `user_id` diretamente, essa garantia teria que ser duplicada na própria tabela `draw`.

Apontando para `participant.id`, cada linha de `draw` já está inerentemente escopada a um grupo (pois `participant.group_id` é fixo), e a política de SELECT fica:

```sql
using (
  giver_id in (select private.my_participant_ids())
)
```

— uma função auxiliar que devolve todos os `participant.id` do usuário autenticado (geralmente um só, mas o schema permite múltiplos grupos). **Decisão confirmada: manter `participant.id` como FK em `draw`.**

### Problema 2 — RN5 do PRD ("convite de uso único por e-mail") não é implementável com o schema atual

O PRD, regra de negócio 5: *"Um participante só pode pertencer a um grupo por convite; o link de convite é de uso único por e-mail."*

O schema do SDD tem só `group.invite_token` — um token por grupo, não por convite individual. Com esse desenho:

- **Não há como saber que e-mail já "gastou" o token**, porque o token não é vinculado a e-mail nenhum — é compartilhado por todos os convidados do grupo.
- "Uso único por e-mail" fica, na prática, "uso único por `user_id`" — o que já é garantido de outra forma (ver Problema 3, unique constraint em `participant`).

**Veredito:** a regra do PRD, lida literalmente, pede um fluxo de convite nominal (um token por e-mail convidado) que o MVP não precisa modelar — isso seria sobre-engenharia para um projeto que o próprio PROJECT.md pede "simples, poucas fases, fácil de explicar". A interpretação correta e suficiente para o MVP é: **o link de convite é único por grupo (não por pessoa), mas cada `user_id` só pode entrar uma vez no mesmo grupo** — que é exatamente o que a constraint `UNIQUE (group_id, user_id)` em `participant` entrega. Isso cobre o problema real que a regra de negócio protege (ninguém entra duas vezes, ninguém "sobra" com duas linhas de participante) sem precisar de uma tabela de convites nominais.

**Recomendação para o roadmap:** registrar esta reinterpretação explicitamente na fase de banco de dados (ela diverge do texto literal do PRD) e não criar tabela de convites. Se o professor exigir a leitura literal na banca, a resposta defensável é "a unicidade por `(group_id, user_id)` entrega a mesma garantia de negócio com menos uma tabela — golpe de simplicidade, não omissão".

### Problema 3 — Faltam de fato: unique constraint, CHECK anti-autossorteio, e índices

O SDD não lista nenhuma constraint além das PKs/FKs implícitas no ER. Isso é subespecificação real. Mínimo necessário:

```sql
-- um usuário não pode ter duas linhas de participante no mesmo grupo
alter table public.participant
  add constraint participant_group_user_unique unique (group_id, user_id);

-- ninguém pode tirar a si mesmo (defesa em profundidade: a Edge Function já garante
-- isso algoritmicamente, mas o banco não deve confiar só na aplicação)
alter table public.draw
  add constraint draw_no_self_gift check (giver_id <> receiver_id);

-- um giver só pode aparecer uma vez por grupo (perfect matching: cada participante
-- dá presente exatamente uma vez)
alter table public.draw
  add constraint draw_giver_unique unique (group_id, giver_id);

-- e só pode RECEBER uma vez por grupo também (perfect matching nos dois sentidos)
alter table public.draw
  add constraint draw_receiver_unique unique (group_id, receiver_id);

-- índices usados pelas policies (ver seção RLS) — Postgres não cria índice
-- automático em FK, e toda policy filtra por essas colunas
create index idx_participant_group_id on public.participant (group_id);
create index idx_participant_user_id on public.participant (user_id);
create index idx_draw_group_id on public.draw (group_id);
create index idx_draw_giver_id on public.draw (giver_id);
create index idx_group_admin_id on public.group (admin_id);
```

As duas constraints `UNIQUE (group_id, giver_id)` e `UNIQUE (group_id, receiver_id)` juntas são o que prova, a nível de banco, que o resultado é um **perfect matching** (bijeção): toda pessoa dá presente exatamente uma vez e recebe exatamente uma vez dentro do grupo. Isso é mais forte — e mais fácil de defender na banca — do que confiar apenas no algoritmo.

### Problema 4 — o estado intermediário `drawing` é necessário e resolve uma race condition real, mas o SDD não explica como

O SDD define `open | drawing | closed` mas não diz por que `drawing` existe. A resposta: **sem ele, dois cliques simultâneos no botão "iniciar sorteio" (ou um clique duplo por lentidão de rede) disparam duas invocações concorrentes da Edge Function, e ambas veem `status = 'open'` antes que a primeira termine de escrever — resultando em pares duplicados/conflitantes em `draw`.**

A sequência correta dentro da Edge Function (ver §"Edge Function" abaixo) é um `UPDATE ... WHERE status = 'open'` atômico que transiciona `open → drawing` e retorna a contagem de linhas afetadas. Se vier `0`, outra invocação já tomou a corrida — a segunda função aborta sem gerar pares. Isso é um **optimistic lock de uma única coluna**, muito mais simples que lock explícito, e dispensa `SELECT ... FOR UPDATE`. Ao final do sorteio, `drawing → closed`. Então `drawing` não é um estado "visível" de UI relevante — é puramente o mecanismo que impede o double-draw. Isso deve ser explicitado no roadmap como requisito funcional da Edge Function, não como só um valor de enum.

---

## RLS — Políticas Concretas

### A fundação: por que recursão acontece e a função auxiliar que resolve tudo

Toda política em `participant`, `group` e `draw` precisa, em algum momento, responder "este usuário (`auth.uid()`) está neste grupo?". A tentação natural é escrever isso como um `SELECT` dentro da própria tabela `participant`:

```sql
-- NUNCA FAÇA ISSO — dispara ERROR 42P17: infinite recursion detected in policy
create policy "ver participantes do meu grupo" on public.participant
for select using (
  group_id in (select group_id from public.participant where user_id = auth.uid())
);
```

O Postgres avalia a política de SELECT em `participant` reabrindo um SELECT em `participant`, que reavalia a mesma política, indefinidamente. A documentação oficial do Supabase e múltiplas fontes de 2026 confirmam que a única solução correta é mover essa pergunta para uma **função `SECURITY DEFINER`**, que executa com os privilégios do dono (o Postgres `postgres` role, dono da tabela), bypassando RLS *apenas dentro da função* — e por isso não reaciona a própria política.

Dois cuidados obrigatórios, confirmados pela doc oficial:
1. **`set search_path = ''`** dentro da função, com todos os nomes qualificados por schema (`public.participant`, não `participant`). Sem isso, um invasor pode criar um objeto com o mesmo nome em um schema anterior no seu `search_path` e a função roda esse objeto malicioso com os privilégios do dono. É o footgun clássico de `SECURITY DEFINER`.
2. **A função deve morar em um schema privado**, não em `public` — porque qualquer função em schema exposto pela API REST do Supabase é chamável diretamente via Data API com os privilégios do criador. Criar o helper em `public` o transforma, sem querer, num endpoint que qualquer cliente autenticado pode invocar para extrair a lista de grupos de outra pessoa.

```sql
-- schema privado, nunca exposto na Data API do Supabase
create schema if not exists private;

-- devolve os participant.id do usuário autenticado (normalmente um por grupo)
create or replace function private.my_participant_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.participant
  where user_id = (select auth.uid())
$$;

-- devolve os group_id em que o usuário autenticado é participante
create or replace function private.my_group_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select group_id from public.participant
  where user_id = (select auth.uid())
$$;

revoke execute on function private.my_participant_ids() from public;
revoke execute on function private.my_group_ids() from public;
grant usage on schema private to authenticated;
grant execute on function private.my_participant_ids() to authenticated;
grant execute on function private.my_group_ids() to authenticated;
```

Essas duas funções são a base de **todas** as políticas abaixo. Devem ser a primeira migration do projeto, antes de qualquer `CREATE POLICY`.

> Nota de performance (doc oficial): envolver `auth.uid()` em `(select auth.uid())` — em vez de chamar a função diretamente — permite ao otimizador do Postgres cachear o resultado por statement (`initPlan`) em vez de reavaliar por linha. Aplicado consistentemente abaixo.

### Habilitar RLS em todas as tabelas

```sql
alter table public.profile enable row level security;
alter table public.group enable row level security;
alter table public.participant enable row level security;
alter table public.draw enable row level security;
```

### `profile`

```sql
create policy "profile: ver o próprio perfil" on public.profile
for select to authenticated
using ( id = (select auth.uid()) );

create policy "profile: editar o próprio perfil" on public.profile
for update to authenticated
using ( id = (select auth.uid()) )
with check ( id = (select auth.uid()) );

-- inserção normalmente feita por trigger em auth.users (handle_new_user),
-- não diretamente pelo cliente — não precisa de policy de INSERT para o usuário final.
```

**Nota:** como está, um participante NÃO consegue ver o `display_name`/`avatar_url` de outros membros do grupo via `profile` direto — só via `participant` (que guarda seu próprio `display_name` denormalizado, conforme o ER). Isso é, na verdade, desejável: evita que qualquer usuário autenticado monte uma lista de todos os perfis do sistema. Se a UI precisar exibir nome de outro participante, usa o `display_name` já denormalizado em `participant`, não um join em `profile`.

### `group`

```sql
-- Admin lê os grupos que administra
create policy "group: admin lê seus grupos" on public.group
for select to authenticated
using ( admin_id = (select auth.uid()) );

-- Participante lê os grupos em que está (via função auxiliar — evita recursão
-- cruzada entre group e participant)
create policy "group: participante lê grupos onde está" on public.group
for select to authenticated
using ( id in (select private.my_group_ids()) );

-- Só o admin cria grupo (admin_id tem que ser o próprio usuário)
create policy "group: admin cria grupo" on public.group
for insert to authenticated
with check ( admin_id = (select auth.uid()) );

-- Só o admin atualiza o grupo que administra (nome, status, min_participants)
create policy "group: admin atualiza seu grupo" on public.group
for update to authenticated
using ( admin_id = (select auth.uid()) )
with check ( admin_id = (select auth.uid()) );
```

**Atenção:** a política de UPDATE acima permite que o admin, via cliente, mude `status` livremente — inclusive forçar `open → closed` sem sorteio, ou tentar reabrir um grupo `closed`. Como o MVP não modela regras de transição de estado na política (isso exigiria uma função ou trigger adicional), a recomendação é **restringir no formulário/serviço de frontend quais campos são editáveis e em qual estado**, e — crucialmente — garantir que a transição `open → drawing → closed` do sorteio só ocorra dentro da Edge Function com `service_role`, nunca pelo cliente autenticado. Se se quiser reforçar isso no banco, um trigger `BEFORE UPDATE` validando transições de `status` é a extensão natural, mas não é necessário para o MVP.

### `participant`

```sql
-- Qualquer membro do grupo vê todos os participantes do(s) mesmo(s) grupo(s)
create policy "participant: ver colegas do grupo" on public.participant
for select to authenticated
using ( group_id in (select private.my_group_ids()) );

-- Usuário edita apenas sua própria linha (ex.: display_name, wish_list)
create policy "participant: editar os próprios dados" on public.participant
for update to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

-- Usuário entra em um grupo (insere a si mesmo) — a validação de que o grupo
-- ainda está 'open' e que o token de convite é válido é feita no serviço/RPC
-- de frontend antes do insert; a policy garante apenas que ninguém insere
-- participante em nome de outro usuário.
create policy "participant: entrar em um grupo" on public.participant
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and group_id in (select g.id from public.group g where g.status = 'open')
);

-- Admin remove participantes do(s) grupo(s) que administra
create policy "participant: admin remove participante" on public.participant
for delete to authenticated
using (
  group_id in (select g.id from public.group g where g.admin_id = (select auth.uid()))
);
```

Note que a policy de INSERT faz `select g.id from public.group g where g.status = 'open'` — isso é um SELECT em `group`, não em `participant`, então **não** cai na trap de recursão (a trap é só quando a tabela consulta a si mesma dentro da própria policy). É seguro.

### `draw` — a política crítica do projeto

```sql
-- ÚNICA leitura permitida: a própria linha, como giver. Sem exceção para admin.
create policy "draw: ver apenas meu próprio par" on public.draw
for select to authenticated
using ( giver_id in (select private.my_participant_ids()) );

-- Nenhuma policy de INSERT/UPDATE/DELETE é criada para authenticated.
-- Isso significa: nenhum usuário comum — nem o admin do grupo — tem qualquer
-- permissão de escrita em `draw`. A única via de escrita é a Edge Function
-- autenticada com a service_role key, que bypassa RLS inteiramente.
```

**Isto é a prova de ponta a ponta do core value.** Rastreando:
1. O admin autentica com seu JWT normal (role `authenticated`), igual qualquer outro usuário — não existe "modo admin" no banco.
2. Não há policy de SELECT em `draw` que mencione `admin_id` ou `group.admin_id` em qualquer forma. A única condição de leitura é `giver_id in (select private.my_participant_ids())` — e `my_participant_ids()` só devolve os `participant.id` cujo `user_id = auth.uid()`. O admin só vê a própria linha se ele também for participante do próprio grupo (um `giver`), nunca a dos outros.
3. Como não há policy de INSERT/UPDATE/DELETE para `authenticated`, mesmo que o admin tentasse, via `supabase-js`, um `.from('draw').select('*')` sem filtro, o Postgres aplicaria a policy e devolveria **apenas** a própria linha (ou nenhuma, se ele não for participante). Um `.insert()` seria rejeitado com erro de permissão (`new row violates row-level security policy`), porque não existe policy de INSERT que cubra `authenticated`.
4. A única identidade que escreve em `draw` é a Edge Function usando a `service_role key` (ou, com as chaves novas pós-2026, a `secret key` prefixada `sb_secret_`) — essa chave nunca chega ao navegador do admin, fica só na variável de ambiente da função serverless. Portanto o par nunca passa pela máquina do admin, nem pelo seu token JWT.

**Conclusão demonstrável na banca:** mesmo com acesso total ao console SQL do Supabase Studio usando sua própria sessão JWT (não o painel de admin do projeto), o administrador do grupo não consegue ler os pares de outros participantes — a policy não faz exceção para `admin_id`. Só quem tem a `service_role key` do projeto (o desenvolvedor/operador da infraestrutura, não um usuário da aplicação) poderia contornar isso — e esse é um limite aceito e documentado de qualquer sistema RLS: RLS protege contra o *admin da aplicação*, não contra o *operador da infraestrutura*. É a mesma garantia que qualquer sistema real oferece.

### Como o participante vê a wish list de quem ele tirou, sem acesso à tabela `draw` inteira

Esse é o ponto mais sutil do design. O fluxo:

1. O cliente lê a própria linha em `draw` (permitido pela policy de SELECT acima) — obtém `receiver_id`.
2. Com esse `receiver_id` (que é um `participant.id`), o cliente faz um segundo SELECT em `participant` filtrando por `id = receiver_id`.
3. A policy de SELECT em `participant` ("ver colegas do grupo") já permite isso: `group_id in (select private.my_group_ids())` — e o `receiver_id` pertence ao mesmo grupo em que o próprio usuário é participante. Então o `wish_list` e `display_name` do sorteado ficam visíveis **através da policy de `participant`**, não de uma policy especial em `draw`.

Ou seja: **`draw` nunca expõe `wish_list`** — ele só expõe o par de IDs. Quem expõe o conteúdo da lista de desejos é a policy já existente de `participant`, que de qualquer forma libera a visão de todos os colegas de grupo (necessário para a própria entrada do PRD: "participante vê a lista de desejos de quem tirou" é só um caso particular de "participante vê os dados dos colegas do grupo").

No frontend, isso é um **join client-side em duas chamadas** (ou um `select` do Supabase com relação embutida `draw.select('receiver_id, participant:receiver_id(display_name, wish_list)')`), nunca uma única query "flat" que varreria `draw`.

---

## O Algoritmo de Sorteio, Rigorosamente

### A pergunta: Fisher-Yates + pareamento circular garante ausência de autossorteio?

**Sim, matematicamente garantido — não probabilístico, não por retry.** A prova:

1. Fisher-Yates embaralha os `n` participantes em uma permutação uniformemente aleatória `p[0..n-1]`.
2. O pareamento circular define `giver = p[i]`, `receiver = p[(i+1) mod n]` para todo `i`.
3. Para haver autossorteio seria preciso `p[i] = p[(i+1) mod n]` para algum `i` — impossível, porque `p` é uma permutação (todos os elementos são distintos) e, para `n ≥ 2`, `i ≠ (i+1) mod n`. Logo `p[i] ≠ p[(i+1) mod n]` sempre.

Isso vale para qualquer `n ≥ 2` (o PRD exige `n ≥ 3`, então a margem é confortável). **Não há necessidade de verificação pós-sorteio nem de retry** — a garantia é estrutural, veio da própria construção do ciclo, não de sorte. O `CHECK (giver_id <> receiver_id)` do Problema 3 é redundante com essa prova, mas vale manter como defesa em profundidade (ex.: contra um bug futuro na implementação do algoritmo).

### É uma derangement uniformemente aleatória? Isso importa aqui?

**Não é uma derangement uniforme — e isso não importa para este projeto.** Uma *derangement* é qualquer permutação sem pontos fixos (não necessariamente um único ciclo); o espaço de derangements de tamanho `n` é muito maior que o espaço de ciclos únicos de tamanho `n` — por exemplo, para `n = 4` existem 9 derangements, mas apenas `(4-1)! = 6` ciclos únicos (e nem todo ciclo é uma permutação diferente de todo derangement-não-ciclo). O pareamento circular do SDD gera sempre **um único ciclo hamiltoniano** sobre os `n` participantes (A→B→C→D→A), que é um subconjunto estrito das derangements possíveis (exclui, por exemplo, dois ciclos menores como A↔B e C↔D).

Isso tem uma consequência prática que vale documentar: com pareamento circular de ciclo único, **é estruturalmente impossível formar sub-pares reflexivos** (A tira B e B tira A simultaneamente) — o que, para um Amigo Secreto, é geralmente uma propriedade *desejável* (evita a sensação de "troca combinada" entre dois amigos e preserva mais a surpresa coletiva), embora o PRD não exija isso explicitamente. Não é um defeito do algoritmo — é uma escolha de design que restringe o espaço amostral de forma inofensiva e até benéfica para o caso de uso. **Confirma-se a decisão do SDD, com a ressalva de que "ciclo único" é mais restrito que "derangement geral" — e isso deve ser mencionado explicitamente caso o professor pergunte sobre uniformidade na banca.**

### Lógica da Edge Function (Deno/TypeScript)

```typescript
// supabase/functions/run-draw/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const { groupId } = await req.json()

  // Cliente autenticado como o usuário que chamou a função (para validar
  // que quem está chamando é de fato o admin do grupo)
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  // Cliente privilegiado — só dentro desta função, nunca enviado ao cliente
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Valida que o chamador é o admin do grupo
  const { data: group, error: groupErr } = await adminClient
    .from('group')
    .select('id, admin_id, status, min_participants')
    .eq('id', groupId)
    .single()

  if (groupErr || !group) {
    return new Response(JSON.stringify({ error: 'group not found' }), { status: 404 })
  }
  if (group.admin_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  // 2. Lock otimista: open -> drawing. Se affected rows = 0, outra chamada
  //    já ganhou a corrida (ou o grupo já não está 'open') — aborta.
  const { data: locked, error: lockErr } = await adminClient
    .from('group')
    .update({ status: 'drawing' })
    .eq('id', groupId)
    .eq('status', 'open')
    .select('id')

  if (lockErr) {
    return new Response(JSON.stringify({ error: 'lock failed' }), { status: 500 })
  }
  if (!locked || locked.length === 0) {
    return new Response(
      JSON.stringify({ error: 'draw already started or group not open' }),
      { status: 409 },
    )
  }

  try {
    // 3. Busca participantes
    const { data: participants, error: partErr } = await adminClient
      .from('participant')
      .select('id')
      .eq('group_id', groupId)

    if (partErr) throw partErr
    if (!participants || participants.length < group.min_participants) {
      throw new Error('not enough participants')
    }

    // 4. Fisher-Yates
    const ids = participants.map((p) => p.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }

    // 5. Pareamento circular — garantia estrutural de ausência de autossorteio
    const rows = ids.map((giverId, i) => ({
      group_id: groupId,
      giver_id: giverId,
      receiver_id: ids[(i + 1) % ids.length],
    }))

    // 6. Insere todos os pares de uma vez (operação atômica — um único INSERT
    //    com múltiplas linhas; se falhar, nada é inserido)
    const { error: insertErr } = await adminClient.from('draw').insert(rows)
    if (insertErr) throw insertErr

    // 7. Fecha o grupo
    const { error: closeErr } = await adminClient
      .from('group')
      .update({ status: 'closed' })
      .eq('id', groupId)
    if (closeErr) throw closeErr

    return new Response(JSON.stringify({ success: true, pairs: rows.length }), { status: 200 })
  } catch (err) {
    // Rollback manual do lock: volta para 'open' para permitir nova tentativa,
    // já que não houve escrita de pares bem-sucedida.
    await adminClient.from('group').update({ status: 'open' }).eq('id', groupId).eq('status', 'drawing')
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

**Como rejeita uma segunda invocação (RN6 — sorteio só uma vez):** o `UPDATE ... WHERE status = 'open'` no passo 2 é a trava. Postgres garante que `UPDATE` é atômico por linha; se duas invocações da função chegam "ao mesmo tempo", o banco serializa as duas escritas — uma delas vê `status` já `'drawing'` (ou `'closed'`) e seu `UPDATE` afeta zero linhas. Essa invocação recebe `locked.length === 0` e aborta com `409`, sem jamais chegar ao Fisher-Yates ou ao insert. Não é preciso `SELECT ... FOR UPDATE` nem transação explícita multi-statement — o próprio `WHERE status = 'open'` é a condição de corrida resolvida atomicamente pelo MVCC do Postgres.

**Nota sobre atomicidade do passo 6:** um único `INSERT` com array de linhas é atômico por padrão no Postgres (todas as linhas ou nenhuma, dentro da transação implícita do próprio `INSERT`) — não é necessário envolver em `BEGIN/COMMIT` explícito para este caso, embora seja mais seguro combinar os passos 6 e 7 em uma única chamada RPC/função Postgres transacional se quiser atomicidade cross-statement garantida (ver observação abaixo).

**Risco residual identificado:** entre o passo 6 (insert dos pares) e o passo 7 (fecha o grupo), se a função Edge cair exatamente nesse intervalo, o grupo fica em `drawing` com pares já gravados, mas não fechado — um estado inconsistente, porém recuperável (a lógica de rollback do `catch` cobre falha antes do insert, mas não falha *entre* o insert e o close, já que nesse ponto o `try` já passou do insert). **Recomendação para o roadmap:** mover os passos 6 e 7 para dentro de uma função Postgres (`plpgsql`) chamada via RPC a partir da Edge Function, envolvendo ambos num único `BEGIN/COMMIT` real de banco — isso é a forma correta de garantir atomicidade completa entre "inserir os pares" e "fechar o grupo". Para o MVP, o risco é aceitável e documentável (grupos têm poucos participantes, a chance de falha exatamente nesse milissegundo é residual), mas deve constar como débito técnico conhecido.

---

## Arquitetura Frontend

### Estrutura de pastas (validação da §5.1 do SDD)

A estrutura proposta no SDD (`core/`, `features/`, `shared/`) é o padrão de mercado para Angular standalone e está correta. Um ajuste necessário: falta um lugar explícito para **resolvers**, que o checklist (ID18) exige, e falta o client do Supabase.

```
src/
├── app/
│   ├── core/
│   │   ├── supabase.client.ts        # instância única do SupabaseClient (NOVO — faltava)
│   │   ├── services/
│   │   │   ├── auth.service.ts       # sessão como Signal
│   │   │   ├── group.service.ts
│   │   │   ├── draw.service.ts
│   │   │   └── wishlist.service.ts   # opcional: isolar CRUD de wish_list
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── admin.guard.ts        # NOVO — SDD menciona mas não lista o arquivo
│   │   ├── resolvers/                # NOVO — faltava no SDD, exigido pelo ID18
│   │   │   ├── group.resolver.ts
│   │   │   └── draw-result.resolver.ts
│   │   └── interceptors/
│   │       └── error.interceptor.ts  # só se cobrir a chamada HttpClient do ID19
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── group/
│   │   │   ├── group.routes.ts       # rotas filhas aninhadas (ID17)
│   │   │   ├── group-layout/         # layout com <router-outlet> para create/manage/join
│   │   │   ├── create/
│   │   │   ├── manage/
│   │   │   └── join/
│   │   └── draw/
│   │       └── result/
│   └── shared/
│       ├── components/
│       └── pipes/
├── environments/
└── styles/
```

### Onde vive o client do Supabase e como a sessão é exposta como Signal

O client do `supabase-js` deve ser **uma única instância global**, criada fora de qualquer componente, e injetada via token/factory — não recriada por serviço. Padrão recomendado:

```typescript
// core/supabase.client.ts
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
```

```typescript
// core/services/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { supabase } from '../supabase.client';
import type { Session, User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(null);
  readonly session = this._session.asReadonly();
  readonly user = computed<User | null>(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  constructor() {
    supabase.auth.getSession().then(({ data }) => this._session.set(data.session));
    supabase.auth.onAuthStateChange((_event, session) => this._session.set(session));
  }

  login(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  logout() {
    return supabase.auth.signOut();
  }
}
```

`AuthService` é injetado com `inject()` (ID14) em guards funcionais e em componentes. `isAuthenticated` e `user` são `computed()` (ID9) lidos diretamente nos templates e nos guards — nenhuma lógica de estado de sessão fica espalhada em componentes.

### Rotas aninhadas (ID17) — onde o layout filho se encaixa naturalmente

O mapa de rotas do SDD (§5.2) é totalmente flat — cada rota é uma folha isolada. Isso não demonstra ID17. O encaixe natural, sem forçar a feature, é dentro de **`/group`**: hoje já existem três sub-rotas relacionadas ao mesmo recurso (`create`, `manage/:id`, `join/:token`) que fazem sentido sob um layout comum (ex.: cabeçalho com nome do grupo, breadcrumb, navegação entre abas de gestão).

```typescript
// features/group/group.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { adminGuard } from '../../core/guards/admin.guard';
import { groupResolver } from '../../core/resolvers/group.resolver';

export const groupRoutes: Routes = [
  {
    path: 'group',
    canActivate: [authGuard],
    loadComponent: () => import('./group-layout/group-layout.page').then(m => m.GroupLayoutPage),
    children: [
      { path: 'create', loadComponent: () => import('./create/create-group.page').then(m => m.CreateGroupPage) },
      {
        path: ':id/manage',
        canActivate: [adminGuard],
        resolve: { group: groupResolver },
        loadComponent: () => import('./manage/manage-group.page').then(m => m.ManageGroupPage),
      },
      { path: 'join/:token', loadComponent: () => import('./join/join-group.page').then(m => m.JoinGroupPage) },
    ],
  },
];
```

`GroupLayoutPage` tem um `<router-outlet>` próprio — essa é a hierarquia de layout que o ID17 pede. As rotas `/login`, `/register`, `/dashboard`, `/draw/:groupId/result` continuam flat (não há benefício algo em forçar aninhamento onde não há layout compartilhado real).

### Guards vs. Resolvers (ID18) — onde cada um entra

| Mecanismo | Onde | Por quê |
|-----------|------|---------|
| `authGuard` (`CanActivateFn`) | `/dashboard`, `/group/**`, `/draw/:groupId/result` | Verifica `authService.isAuthenticated()`; redireciona para `/login` se falso. Decisão binária de acesso — não busca dados. |
| `adminGuard` (`CanActivateFn`) | `/group/:id/manage` | Verifica se `group.admin_id === user.id` antes de permitir entrada na tela de gestão. Pode reusar o resolver via `inject()` ou fazer sua própria query leve. |
| `groupResolver` (`ResolveFn`) | `/group/:id/manage` | Pré-carrega os dados do grupo (nome, status, lista de participantes) ANTES da navegação completar — a tela já renderiza com dados, sem spinner de carregamento inicial. |
| `drawResultResolver` (`ResolveFn`) | `/draw/:groupId/result` | Pré-carrega o par sorteado do usuário (via `DrawService`) antes de mostrar a tela de revelação — evita "flash" de estado vazio. |

A distinção correta: **guard decide SE a navegação pode ocorrer** (controle de acesso); **resolver decide O QUE já deve estar pronto QUANDO ela ocorrer** (pré-carregamento de dados). Nunca usar um resolver para controle de acesso (ele não bloqueia a navegação da forma que um guard bloqueia — resolvers que rejeitam normalmente precisam de tratamento de erro extra) nem um guard para carregar dados que serão exibidos (ele não entrega os dados ao componente via `ActivatedRoute.data` do mesmo jeito que um resolver).

### O conflito do ID22 — Interceptors funcionais vs. supabase-js

**Isto é um conflito real, não uma falha de leitura do SDD, e precisa ser resolvido explicitamente.** `supabase-js` v2 usa `fetch` nativo internamente para toda comunicação com a API REST/Auth/Storage/Realtime do Supabase — ele **não passa pelo `HttpClient` do Angular**. Interceptors funcionais do Angular (`HttpInterceptorFn`, registrados via `provideHttpClient(withInterceptors([...]))`) só enxergam requisições feitas através do `HttpClient` injetado. Logo: **qualquer interceptor registrado dessa forma é inerentemente invisível para 100% do tráfego Supabase** (login, CRUD de grupos, participantes, draw, wish list) — não existe configuração de `supabase-js` que o faça usar `HttpClient` do Angular por baixo dos panos.

Isso significa que o ID22 ("Functional Interceptors para injetar token e tratar erros de forma centralizada") **não pode ser demonstrado em cima do tráfego Supabase**, porque esse tráfego:
1. Não precisa de injeção manual de token — `supabase-js` já anexa o JWT da sessão automaticamente a cada chamada internamente.
2. Não passa pelo `HttpClient`.

**Resolução:** o ID19 do checklist já exige, separadamente, "requisição GET a uma API pública" — ou seja, o projeto **precisa** de pelo menos uma chamada a uma API externa que não seja o Supabase. Essa é exatamente a chamada que deve passar pelo `HttpClient`, e é nela — e só nela — que os interceptors funcionais (token, se a API exigir; tratamento de erro centralizado) se aplicam legitimamente.

Sugestão concreta para o MVP, mantendo a simplicidade pedida: usar uma API pública simples e sem necessidade de chave (ex.: alguma API de feriados/CEP/cotação, ou algo tematicamente ligado ao domínio, como sugestões de presentes de uma API de produtos gratuita) para uma funcionalidade pequena e opcional (ex.: "sugestão de ideias de presente" na tela da wish list). O interceptor de erro centralizado (`error.interceptor.ts`, já previsto na estrutura do SDD) intercepta exclusivamente esse tráfego `HttpClient` — captura falhas de rede/HTTP dessa API pública e as reporta de forma uniforme (toast, log). Não há necessidade de um interceptor de token aqui se a API for pública sem chave; se a API exigir uma chave estática, o interceptor de token a injeta no header a partir de `environment`.

**Conclusão para o roadmap:** reservar uma fase/tarefa específica e pequena para "chamada GET a API pública com interceptors" — ela é estruturalmente desacoplada de todo o resto do sistema (Supabase) e deve ser tratada como uma feature isolada, não espalhada tentando (incorretamente) encapsular chamadas Supabase em `HttpClient`.

### Gerenciamento de estado — Signals simples em serviços, nada além disso

Dado o tamanho do projeto (4 entidades, CRUD simples, um algoritmo), **não há justificativa para NgRx, Akita ou qualquer store library**. O padrão correto e suficiente:

- Cada core service (`AuthService`, `GroupService`, `DrawService`) mantém seu próprio estado em `signal()` privado, exposto como `computed()` ou `.asReadonly()`.
- Comunicação entre componentes não relacionados passa exclusivamente por `inject()` desses services (ID14) — nunca `@Input()`/`@Output()` para dados cross-feature.
- `effect()` (ID12) é reservado para efeitos colaterais reais (ex.: sincronizar `localStorage`, disparar um toast quando `draw` resolve) — não para derivar estado (isso é papel do `computed()`).
- `toSignal()` (ID24) converte o `Observable` retornado por chamadas que usam RxJS (ex.: se o `HttpClient` da API pública do ID19 for consumido com `.pipe()`) para Signal, fazendo a ponte explícita exigida pelo checklist — útil justamente na mesma feature isolada do ID19/ID22, fechando três indicadores (19, 22, 24) numa única funcionalidade pequena e bem definida.

---

## Ordem de Construção (Build Order)

A dependência real do projeto é: **banco + RLS antes de qualquer feature de dados; autenticação antes de grupos; grupos antes de sorteio.** Isso sugere 5 fases grossas, conforme pedido no PROJECT.md (poucas fases, fácil de explicar):

### Fase 1 — Fundação: Scaffold + Banco + RLS
**Depende de:** nada.
**Entrega:** projeto Angular standalone rodando com Tailwind; projeto Supabase criado; schema completo (`profile`, `group`, `participant`, `draw`) com todas as constraints da seção "Problema 3"; função `handle_new_user` (trigger em `auth.users` → popula `profile`); as duas funções `SECURITY DEFINER` em `private`; **todas** as policies de RLS das quatro tabelas, testadas manualmente no SQL Editor do Supabase Studio com usuários diferentes antes de qualquer linha de frontend.
**Por que primeiro:** toda feature subsequente lê/escreve nessas tabelas — testar RLS depois da UI pronta é ordem invertida e dificulta isolar se um bug é de policy ou de código Angular. Pode-se, em paralelo, já configurar deploy Vercel + Gitflow (`main`/`develop`) nesta fase, pois é infraestrutura independente.

### Fase 2 — Autenticação end-to-end
**Depende de:** Fase 1 (precisa de `profile` e do trigger `handle_new_user`).
**Entrega:** `AuthService` com Signal de sessão; páginas de login/registro com Reactive Forms (ID23); `authGuard` funcional (ID18 parcial); roteamento base com `provideRouter` + `withComponentInputBinding` (ID15).
**Por que agora:** nenhuma feature de grupo faz sentido sem usuário autenticado — e o guard de autenticação é reusado por todas as rotas protegidas das fases seguintes.

### Fase 3 — Grupos e Participantes (CRUD)
**Depende de:** Fase 2 (precisa de usuário logado e de `authGuard`).
**Entrega:** `GroupService`, `adminGuard`, `groupResolver`; rotas aninhadas de `/group` (ID17); criar grupo, gerar/consumir invite token, listar/remover participantes, formulário de wish list (CRUD completo contra Supabase = ID21). Esta fase cobre a maior parte do CRUD do checklist e pode ser desenvolvida com a UI (Spartan UI/Tailwind) em paralelo à lógica de serviço, já que as policies da Fase 1 já garantem os limites de acesso.
**Pode rodar em paralelo com:** a feature isolada de API pública + interceptors (ID19/ID22/ID24, seção anterior) — ela não depende de grupo nem de autenticação Supabase, só de `HttpClient`, e pode ser um branch separado do Gitflow.

### Fase 4 — Sorteio (Edge Function) + Revelação
**Depende de:** Fase 3 (precisa de participantes num grupo `open` com `n ≥ 3`).
**Entrega:** Edge Function `run-draw` (lógica da seção "Edge Function" acima), deploy via Supabase CLI; `DrawService` chamando a função via `supabase.functions.invoke()`; página de resultado com revelação deliberada (ex.: `@defer` no componente de revelação para ID8, exibindo `wish_list` do sorteado via a policy de `participant`). Esta é a fase que prova o core value — deve incluir testes unitários (`.spec.ts`, ID32) cobrindo especificamente: ausência de autossorteio, rejeição de segunda invocação, e (idealmente) um teste de integração que tenta ler `draw` de outro participante e confirma que a RLS bloqueia.
**Por que por último:** é logicamente a última etapa do fluxo de negócio (grupo fechado = fim), e tecnicamente depende de tudo anterior já funcionar (sem grupo e participantes reais, não há o que sortear).

### Fase 5 — PWA, Polimento e Entrega
**Depende de:** Fases 2–4 funcionalmente completas (o manifest e o service worker não têm o que fazer sentido sem telas reais).
**Entrega:** `manifest.webmanifest`, ícones, splash screen, estado offline básico; responsividade mobile-first final e auditoria WCAG 2.1 AA; protótipo Figma linkado; README consolidando PRD + ER; Issues/Kanban no GitHub Projects (se ainda não mantido desde o início — idealmente isso roda em paralelo desde a Fase 1, não é uma tarefa de fechamento).
**Pode rodar em paralelo com:** a escrita de documentação (SDD/spec.md, ID30) e a configuração de MCP/Skills (ID31), que são artefatos de processo independentes do código.

### Resumo de dependências

```
Fase 1 (DB + RLS) ──┬──> Fase 2 (Auth) ──> Fase 3 (Grupos) ──> Fase 4 (Sorteio) ──> Fase 5 (PWA/Entrega)
                     │
                     └──> [paralelo: deploy Vercel, Gitflow setup]

Fase 3 ──> [paralelo: Fase "API pública + Interceptors" (ID19/22/24), sem dependência de Supabase]
```

---

## Anti-Patterns a Evitar

### Anti-Pattern 1 — Policy de `participant` consultando `participant`
**O que se faz por instinto:** escrever `group_id in (select group_id from participant where user_id = auth.uid())` diretamente na policy de `participant`.
**Por que é errado:** dispara `42P17 infinite recursion detected in policy` — o Postgres trava a avaliação.
**Fazer em vez disso:** extrair a pergunta para a função `private.my_group_ids()` (`SECURITY DEFINER`, `search_path = ''`, schema `private`) e chamá-la na policy.

### Anti-Pattern 2 — Dar ao admin uma policy especial em `draw`
**O que se faz por instinto:** "o admin precisa gerenciar o grupo, então deixa ele ver tudo" — adicionar `or group_id in (select id from group where admin_id = auth.uid())` à policy de SELECT de `draw`.
**Por que é errado:** destrói o core value do projeto inteiro. É o erro mais fácil de cometer sob pressão de "o admin reclamou que não vê nada" — e o mais caro de cometer neste projeto específico.
**Fazer em vez disso:** o admin nunca tem acesso privilegiado a `draw`. Qualquer necessidade de "o admin confirmar que o sorteio rodou" é satisfeita por `group.status = 'closed'` e uma contagem de linhas (`count(*) from draw where group_id = ...`, que RLS permite contar sem revelar quem é quem — mas cuidado: mesmo contagem deve ser feita com cautela; para o MVP, simplesmente mostrar "sorteio concluído" via `status` já basta, sem precisar contar `draw`).

### Anti-Pattern 3 — Tentar fazer `supabase-js` passar por um `HttpInterceptorFn`
**O que se faz por instinto:** envolver `supabase-js` numa camada que force suas chamadas a passarem pelo `HttpClient`, para "aproveitar" os interceptors no tráfego Supabase.
**Por que é errado:** não existe uma forma suportada/documentada de fazer isso — `supabase-js` usa `fetch` internamente, de forma independente do `HttpClient` do Angular, e forçar essa integração é trabalho desnecessário para um objetivo que pode ser cumprido de forma muito mais simples.
**Fazer em vez disso:** aceitar a separação. Interceptors cobrem exclusivamente a chamada à API pública do ID19. Supabase cuida do próprio token internamente.

---

## Sources

- [RLS policy causes infinite recursion · supabase · Discussion #47525](https://github.com/orgs/supabase/discussions/47525) — confirmação da causa raiz e do padrão de correção
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — fonte oficial: função `SECURITY DEFINER`, `search_path = ''`, schema privado, `(select auth.uid())` para performance
- [Supabase RLS SECURITY DEFINER: Preventing Infinite Recursion in Admin Policies](https://dev.to/kanta13jp1/supabase-rls-security-definer-preventing-infinite-recursion-in-admin-policies-4go2) — exemplo adicional do padrão (MEDIUM, consistente com doc oficial)
- [Fix: infinite recursion detected in policy (Supabase RLS)](https://www.guardlayer.io/blog/supabase-rls-infinite-recursion) — confirmação cruzada do erro `42P17`
- [Supabase Row Level Security Policies — guia 2026](https://gautamkhorana.com/blog/supabase-rls-guide-2026/) — padrões de policy atualizados
- [service_role key e Edge Functions — práticas 2026](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — confirma uso de `service_role`/chaves secretas em funções server-side e o aviso contra usá-la para "tapar buraco" de policy ausente
- [PostgreSQL Docs — Constraints (CHECK multi-coluna)](https://www.postgresql.org/docs/current/ddl-constraints.html) — sintaxe de `CHECK (giver_id <> receiver_id)` como constraint de tabela
- Prova matemática do ciclo único (ausência de autossorteio e distinção derangement vs. ciclo hamiltoniano) — raciocínio combinatório direto, não depende de fonte externa (HIGH confidence, verificável por inspeção)

---
*Architecture research for: UTF-Secret — Angular 17+/Supabase Secret Santa PWA*
*Researched: 2026-10-14*
