-- 0002_private_helpers.sql — DB-05
-- Essas funções são a base de TODAS as policies. Precisam existir antes de qualquer
-- CREATE POLICY. Ficam em schema `private` (nunca `public`) porque qualquer função em
-- schema exposto pela Data API é chamável diretamente por qualquer cliente autenticado.
-- search_path vazio (ver abaixo) + nomes schema-qualificados é obrigatório em SECURITY DEFINER.

create schema if not exists private;

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
