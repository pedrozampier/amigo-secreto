-- 0004_group_join_rpcs.sql — GRP-06, GRP-07, GRP-08
--
-- POR QUE ESTA MIGRATION EXISTE (descoberta da Fase 3):
-- As policies da 0003 NÃO permitem entrar num grupo por convite, e isso só aparece
-- ao ler as duas policies juntas:
--   1. `group` só tem SELECT para o admin ou para quem JÁ é participante. Quem abre
--      /join/:token não é nenhum dos dois — não consegue sequer ler o grupo para
--      resolver o token.
--   2. A policy de INSERT em `participant` valida
--      `group_id in (select g.id from public.group g where g.status = 'open')`, e esse
--      subquery é ELE MESMO filtrado por RLS — devolve zero linhas para um não-membro.
--      Resultado: o INSERT direto do cliente falha (42501) para todo convidado novo.
--
-- A solução (D-01/D-02): duas funções SECURITY DEFINER que rodam com os privilégios do
-- owner, logo veem a linha de `group` independentemente da RLS do chamador.
--
-- SCHEMA `public`, NÃO `private` (deliberado): estas duas funções precisam ser chamáveis
-- via supabase.rpc() pelo cliente autenticado, e só o schema `public` é exposto pela Data
-- API. Isso é SEGURO aqui — diferente das helpers da 0002 — porque o corpo de cada função
-- revalida tudo (token, status, membership) em vez de confiar no chamador.
-- `set search_path = ''` + nomes schema-qualificados continuam OBRIGATÓRIOS (0002).
--
-- NÃO remover a policy "participant: entrar em um grupo" da 0003: ela continua sendo a
-- garantia de base contra um INSERT direto fora do RPC. O RPC soma a validação de token
-- por cima dela, não a substitui.

-- === preview_group_by_token (D-02) ===
-- Devolve SOMENTE name e status. NUNCA participantes, NUNCA contagem de participantes,
-- NUNCA pares — devolver qualquer coisa sobre quem está no grupo transformaria o token
-- num vazamento de identidade (D-02 é uma linha dura).
create or replace function public.preview_group_by_token(p_token text)
returns table (name text, status text)
language sql
security definer
set search_path = ''
stable
as $$
  select g.name, g.status
  from public.group g
  where g.invite_token = p_token
$$;

revoke execute on function public.preview_group_by_token(text) from public;
grant execute on function public.preview_group_by_token(text) to authenticated;

-- === join_group_by_token (D-01, D-03, D-04) ===
-- Devolve json com um código estável EM INGLÊS (D-03): 'OK' | 'INVALID_TOKEN'
-- | 'GROUP_CLOSED' | 'ALREADY_MEMBER'. A tradução PT-BR vive no Angular
-- (src/app/core/join-error-messages.ts) — nenhuma string de UI dentro do banco.
create or replace function public.join_group_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group    public.group;
  v_profile  public.profile;
begin
  select * into v_group from public.group where invite_token = p_token;
  if v_group.id is null then
    return json_build_object('code', 'INVALID_TOKEN');
  end if;

  -- GRP-08: grupo que não está 'open' não aceita mais ninguém.
  if v_group.status <> 'open' then
    return json_build_object('code', 'GROUP_CLOSED');
  end if;

  -- GRP-07: checagem antecipada só para dar mensagem boa.
  if exists (
    select 1 from public.participant
    where group_id = v_group.id and user_id = (select auth.uid())
  ) then
    return json_build_object('code', 'ALREADY_MEMBER');
  end if;

  select * into v_profile from public.profile where id = (select auth.uid());

  begin
    insert into public.participant (group_id, user_id, display_name)
    values (v_group.id, (select auth.uid()), v_profile.display_name);
  exception when unique_violation then
    -- D-04: participant_group_user_unique é a rede de segurança REAL contra uma
    -- corrida entre duas abas. Traduzir para o mesmo código estável em vez de
    -- vazar o 23505 do Postgres.
    return json_build_object('code', 'ALREADY_MEMBER');
  end;

  return json_build_object('code', 'OK', 'group_id', v_group.id);
end;
$$;

revoke execute on function public.join_group_by_token(text) from public;
grant execute on function public.join_group_by_token(text) to authenticated;
