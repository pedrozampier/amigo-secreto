// run-draw — Edge Function do sorteio (DRAW-02, DRAW-03, DRAW-05, DRAW-06, DRAW-07).
//
// POR QUE ESTA FUNÇÃO EXISTE E POR QUE A service_role AQUI NÃO É FALHA DE SEGURANÇA:
// a tabela `draw` NÃO TEM policy de INSERT/UPDATE/DELETE para `authenticated`
// (0003_rls_policies.sql) — a ausência é deliberada e é o mecanismo do core value.
// Logo nenhum cliente, nem o do admin, consegue escrever em `draw`. O único escritor
// é esta função, que roda no servidor do Supabase com a service_role injetada em
// Deno.env e que NUNCA chega a um navegador. É isso que torna "o admin não vê os
// pares" uma garantia de banco e não de UI.
//
// LIMITE ACEITO (material de banca): a RLS protege contra o admin da APLICAÇÃO, não
// contra o operador da INFRAESTRUTURA (quem tem a service_role no dashboard do
// Supabase). Ver ARCHITECTURE.md ~linha 254.
//
// DÉBITO TÉCNICO CONHECIDO — V2-01, DOCUMENTADO E NÃO CORRIGIDO NESTA FASE: o insert
// dos pares (passo 6) e o `status='closed'` (passo 7) não são atômicos entre si. Se o
// processo morrer exatamente entre os dois, o grupo fica em 'drawing' com os pares já
// gravados. O `catch` abaixo devolve o grupo para 'open' nos erros que ele vê, mas não
// cobre uma morte abrupta do runtime. A correção é uma RPC plpgsql transacional,
// registrada como V2-01 em .planning/REQUIREMENTS.md.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { pairCircular } from './draw-algorithm.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let groupId: string | undefined;
  try {
    const body = await req.json();
    groupId = body?.groupId;
  } catch {
    return json({ code: 'GROUP_NOT_FOUND' }, 400);
  }
  if (!groupId) {
    return json({ code: 'GROUP_NOT_FOUND' }, 400);
  }

  // DRAW-03 (parte 1): quem está chamando? Cliente com escopo DE USUÁRIO, repassando
  // o Authorization recebido. Não decodificar o JWT à mão — getUser() valida assinatura
  // e expiração contra a config de auth do projeto.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ code: 'NOT_ADMIN' }, 401);
  }

  // Cliente privilegiado: bypassa RLS por design. A partir daqui, toda leitura/escrita
  // é feita com ele — é o único jeito de escrever em `draw`.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: group } = await adminClient
    .from('group')
    .select('id, admin_id, status, min_participants')
    .eq('id', groupId)
    .maybeSingle();

  if (!group) {
    return json({ code: 'GROUP_NOT_FOUND' }, 404);
  }
  // DRAW-03 (parte 2): só o admin do grupo sorteia.
  if (group.admin_id !== userData.user.id) {
    return json({ code: 'NOT_ADMIN' }, 403);
  }

  // DRAW-06 — LOCK OTIMISTA. Este UPDATE condicional é a ÚNICA proteção contra a
  // segunda invocação, e é suficiente: o MVCC do Postgres serializa UPDATEs
  // concorrentes na MESMA linha, então de dois cliques simultâneos exatamente um vê
  // `status = 'open'` e muda a linha; o outro casa com zero linhas. Sem
  // SELECT ... FOR UPDATE, sem mutex de aplicação, sem Redis.
  // NÃO trocar por "ler o status e depois atualizar" — isso reintroduz a corrida.
  const { data: locked } = await adminClient
    .from('group')
    .update({ status: 'drawing' })
    .eq('id', groupId)
    .eq('status', 'open')
    .select('id');

  if (!locked || locked.length === 0) {
    return json({ code: 'ALREADY_DRAWN' }, 409);
  }

  try {
    const { data: participants } = await adminClient
      .from('participant')
      .select('id')
      .eq('group_id', groupId);

    // DRAW-04 / RN1. D-03: conta TODOS os participantes, inclusive o admin (que a
    // migration 0006 insere na criação do grupo). Nenhum caso especial.
    if (!participants || participants.length < group.min_participants) {
      throw { code: 'NOT_ENOUGH_PARTICIPANTS' };
    }

    // DRAW-05: zero autossorteio por garantia estrutural. Ver draw-algorithm.ts.
    const pairs = pairCircular(participants.map((p) => p.id)).map((pair) => ({
      group_id: groupId,
      giver_id: pair.giver_id,
      receiver_id: pair.receiver_id,
    }));

    // Insert multi-linha único. As constraints draw_giver_unique/draw_receiver_unique
    // são a rede de segurança de banco para o perfect matching.
    const { error: insertErr } = await adminClient.from('draw').insert(pairs);
    if (insertErr) {
      throw insertErr;
    }

    // DRAW-07.
    const { error: closeErr } = await adminClient
      .from('group')
      .update({ status: 'closed' })
      .eq('id', groupId);
    if (closeErr) {
      throw closeErr;
    }

    return json({ success: true, pairs: pairs.length }, 200);
  } catch (err) {
    // Rollback do lock: devolve o grupo para 'open' para que o admin possa tentar de
    // novo depois de corrigir o problema (tipicamente: convidar mais gente).
    await adminClient
      .from('group')
      .update({ status: 'open' })
      .eq('id', groupId)
      .eq('status', 'drawing');

    const code = (err as { code?: string })?.code ?? 'UNKNOWN_ERROR';
    return json({ code }, code === 'NOT_ENOUGH_PARTICIPANTS' ? 409 : 500);
  }
});
