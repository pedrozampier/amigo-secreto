-- 0003_rls_policies.sql — DB-06, DB-07, DB-08
-- Depende de 0002_private_helpers.sql (as funções private.* precisam existir antes).

-- === DB-06: habilitar RLS nas 4 tabelas ===
alter table public.profile     enable row level security;
alter table public.group       enable row level security;
alter table public.participant enable row level security;
alter table public.draw        enable row level security;

-- === profile ===
create policy "profile: ver o proprio perfil" on public.profile
for select to authenticated
using ( id = (select auth.uid()) );

create policy "profile: editar o proprio perfil" on public.profile
for update to authenticated
using ( id = (select auth.uid()) )
with check ( id = (select auth.uid()) );
-- INSERT em profile é feito pelo trigger handle_new_user (SECURITY DEFINER),
-- nunca pelo cliente — por isso não existe policy de INSERT aqui.

-- === group ===
create policy "group: admin le seus grupos" on public.group
for select to authenticated
using ( admin_id = (select auth.uid()) );

create policy "group: participante le grupos onde esta" on public.group
for select to authenticated
using ( id in (select private.my_group_ids()) );

create policy "group: admin cria grupo" on public.group
for insert to authenticated
with check ( admin_id = (select auth.uid()) );

create policy "group: admin atualiza seu grupo" on public.group
for update to authenticated
using ( admin_id = (select auth.uid()) )
with check ( admin_id = (select auth.uid()) );

-- === participant ===
create policy "participant: ver colegas do grupo" on public.participant
for select to authenticated
using ( group_id in (select private.my_group_ids()) );

create policy "participant: editar os proprios dados" on public.participant
for update to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy "participant: entrar em um grupo" on public.participant
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and group_id in (select g.id from public.group g where g.status = 'open')
);

create policy "participant: admin remove participante" on public.participant
for delete to authenticated
using (
  group_id in (select g.id from public.group g where g.admin_id = (select auth.uid()))
);

-- === draw — A POLÍTICA CRÍTICA DO PROJETO (DB-07, DB-08) ===
-- ÚNICA leitura permitida: a própria linha, como giver. SEM exceção para admin.
-- Se alguém algum dia adicionar `or ... admin_id ...` aqui, o core value do projeto morre.
create policy "draw: ver apenas meu proprio par" on public.draw
for select to authenticated
using ( giver_id in (select private.my_participant_ids()) );

-- DB-08: NENHUMA policy de INSERT/UPDATE/DELETE em draw para `authenticated`.
-- A ausência é deliberada e é o mecanismo: a única escrita vem da Edge Function
-- autenticada com a service_role/secret key, que bypassa RLS por design.
-- NÃO adicionar policy de escrita aqui em nenhuma fase futura.
