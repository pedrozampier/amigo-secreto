import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { GENERIC_DRAW_ERROR, translateDrawError } from '../draw-error-messages';
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
}
