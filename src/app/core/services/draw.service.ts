import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { GENERIC_DRAW_ERROR, translateDrawError } from '../draw-error-messages';
import type { DrawResult } from '../models/group.model';
import { SupabaseClientService } from './supabase-client.service';

/**
 * DRAW-01/02/03/04/06/07 (acionamento) + ENG-03. Único ponto do cliente que chama a
 * Edge Function `run-draw` — NENHUMA lógica de sorteio (shuffle, pareamento, lock) vive
 * aqui ou em qualquer componente. O cliente só invoca e traduz a resposta.
 */
@Injectable({ providedIn: 'root' })
export class DrawService {
  private readonly supabase = inject(SupabaseClientService).client;

  /**
   * Chama a Edge Function `run-draw`. D-12 — ARMADILHA DE IMPLEMENTAÇÃO: para resposta
   * não-2xx, `functions.invoke()` devolve um `FunctionsHttpError` cujo `.message` é uma
   * string genérica ("Edge Function returned a non-2xx status code"); o `code` estável só
   * está acessível via `await error.context.json()`, porque `.context` é o `Response` crú
   * da função. Ler só `.message` quebra toda a tradução D-12 silenciosamente.
   */
  async runDraw(groupId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.functions.invoke('run-draw', { body: { groupId } });
    if (!error) {
      return { error: null };
    }
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json();
      return { error: translateDrawError(body?.code) };
    }
    // FunctionsRelayError / FunctionsFetchError — falha de rede/infra, sem `code` para traduzir.
    return { error: GENERIC_DRAW_ERROR };
  }

  /**
   * D-07/DRAW-09: busca o par do usuário logado com nome e wishlist de quem ele tirou,
   * numa única query com join embedado. A FK é nomeada EXPLICITAMENTE
   * (`participant!draw_receiver_id_fkey`) porque `draw` tem DUAS foreign keys para
   * `participant` (giver_id e receiver_id) — `participant(...)` sozinho é ambíguo e o
   * supabase-js recusa a query.
   *
   * `.eq('group_id', groupId)` é redundante com a RLS (a policy de `draw` já restringe
   * a `giver_id in (select private.my_participant_ids())`), mas mantém a intenção
   * explícita e permite `.maybeSingle()` resolver corretamente quando o usuário está em
   * vários grupos — mesmo estilo de `updateWishList()` em `GroupService`.
   *
   * DRAW-10 não é tocado aqui: a privacidade vem inteiramente da policy de SELECT em
   * `draw` (0003_rls_policies.sql) — nunca adicionar um filtro extra "escondendo" o
   * próprio par do admin, isso já é garantido pelo banco.
   */
  async getMyResult(groupId: string): Promise<{ result: DrawResult | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('draw')
      .select('id, receiver:participant!draw_receiver_id_fkey(display_name, wish_list)')
      .eq('group_id', groupId)
      .maybeSingle();
    if (error) {
      return { result: null, error: 'Não foi possível carregar seu resultado.' };
    }
    return { result: data as DrawResult | null, error: null };
  }
}
