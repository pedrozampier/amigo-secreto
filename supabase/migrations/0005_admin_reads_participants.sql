-- 0005_admin_reads_participants.sql — GRP-04, GRP-05
--
-- POR QUE ESTA MIGRATION EXISTE (descoberta na verificação manual da Fase 3):
-- A única policy de SELECT em `participant` criada pela 0003 é
--
--   using (group_id in (select private.my_group_ids()))
--
-- e `private.my_group_ids()` (0002) é, literalmente,
--
--   select group_id from public.participant where user_id = (select auth.uid())
--
-- ou seja: devolve os grupos em que o usuário É PARTICIPANTE. Nenhuma policy de
-- `participant` menciona `admin_id`.
--
-- Consequência observada em produção: um administrador que criou um grupo mas nunca
-- entrou nele (o fluxo normal — criar grupo não insere o criador em `participant`)
-- tem zero linhas em `participant`, portanto `my_group_ids()` não devolve o grupo
-- dele, portanto ele lê ZERO participantes do próprio grupo. A tela de gestão abre
-- com a lista vazia mesmo havendo participantes, e GRP-04 fica impossível.
--
-- ISTO NÃO AFETA A REGRA DE PRIVACIDADE DO PROJETO. A regra é que o admin não vê os
-- PARES SORTEADOS (tabela `draw`), e ela continua intacta: nenhuma policy de `draw`
-- é tocada aqui, e `draw` segue com uma única policy de SELECT por `giver_id`, sem
-- qualquer referência a `admin_id`. Ver quem está no grupo é explicitamente GRP-04;
-- ver quem tirou quem é explicitamente proibido. São coisas diferentes.
--
-- Esta policy SOMA-SE à "participant: ver colegas do grupo" da 0003 (policies
-- permissivas são OR). Um participante continua vendo os colegas; o admin passa a
-- ver os participantes do grupo que administra, mesmo não sendo um deles.
--
-- `(select auth.uid())` entre parênteses é proposital: faz o planner avaliar uma vez
-- por query em vez de uma vez por linha (mesmo padrão das policies da 0003).

create policy "participant: admin ve participantes do seu grupo"
on public.participant
for select
to authenticated
using (
  group_id in (
    select g.id from public.group g
    where g.admin_id = (select auth.uid())
  )
);
