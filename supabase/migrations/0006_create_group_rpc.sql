-- 0006_create_group_rpc.sql — D-01, D-02 (Fase 4)
--
-- POR QUE ESTA MIGRATION EXISTE:
-- Até aqui, `GroupService.createGroup()` inseria SOMENTE a linha de `public.group`. O
-- criador do grupo NÃO tinha linha em `public.participant`. Consequências:
--   1. A Edge Function do sorteio busca `participant where group_id = X` — o admin
--      simplesmente não entrava no sorteio: não tirava ninguém e ninguém o tirava.
--   2. `private.my_group_ids()` devolvia zero grupos para o admin, que lia zero
--      participantes do PRÓPRIO grupo. É exatamente o bug que a
--      0005_admin_reads_participants.sql foi escrita para contornar.
--
-- A DECISÃO (D-01): o administrador PARTICIPA do sorteio do próprio grupo. É o
-- comportamento esperado de um amigo secreto real (quem organiza joga), resolve (2) na
-- raiz, e FORTALECE a demonstração de DRAW-10 — o admin tem um par, vê o próprio par, e
-- ainda assim não lê os pares dos outros.
--
-- POR QUE UM RPC E NÃO DUAS ESCRITAS DO CLIENTE (D-02): dois `.insert()` separados do
-- navegador não são atômicos. Se o segundo falhasse, sobraria um grupo sem o admin
-- dentro — o mesmo bug, só mais raro. Uma função plpgsql roda numa transação implícita
-- por chamada: se o segundo insert falhar, o primeiro é desfeito automaticamente (é o
-- mesmo mecanismo em que `join_group_by_token` da 0004 já confia).
--
-- POR QUE UM RPC E NÃO UM TRIGGER `AFTER INSERT` em `group`: um trigger seria atômico e
-- impossível de esquecer, mas é magia invisível — quem lê `createGroup()` não veria que o
-- admin entrou. Um RPC com nome óbvio é mais fácil de defender oralmente. Critério de
-- desempate do projeto: simplicidade defensável numa banca.
--
-- ⚠ NÃO REMOVER A 0005. Ela continua necessária para os grupos criados ANTES desta
-- migration, cujo admin não tem linha em `participant`. A 0006 corrige o futuro, não o
-- passado.
--
-- SCHEMA `public`, NÃO `private` (deliberado, mesma razão da 0004): esta função precisa
-- ser chamável via `supabase.rpc()` pelo cliente autenticado, e só o schema `public` é
-- exposto pela Data API. É seguro porque o corpo não confia em nada do chamador: o
-- `admin_id` vem de `(select auth.uid())`, nunca de um parâmetro.

create or replace function public.create_group(p_name text)
returns public.group
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group    public.group;
  v_profile  public.profile;
  v_uid      uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_profile from public.profile where id = v_uid;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  -- `invite_token`, `min_participants` e `status` NÃO são enviados: os defaults do
  -- schema (0001) já os preenchem — `encode(gen_random_bytes(16),'hex')`, 3 e 'open'.
  -- O check `char_length(name) between 3 and 60` continua valendo e rejeita nomes
  -- inválidos aqui dentro, igual ao `.insert()` que este RPC substitui.
  insert into public.group (name, admin_id)
  values (p_name, v_uid)
  returning * into v_group;

  -- D-01: o admin entra como participante do próprio grupo, na MESMA transação.
  insert into public.participant (group_id, user_id, display_name)
  values (v_group.id, v_uid, v_profile.display_name);

  return v_group;
end;
$$;

revoke execute on function public.create_group(text) from public;
grant execute on function public.create_group(text) to authenticated;
