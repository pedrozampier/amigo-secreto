/**
 * Tradução PT-BR dos códigos estáveis devolvidos pela Edge Function `run-draw`
 * (supabase/functions/run-draw/index.ts, plan 04-01) — D-12.
 *
 * Os códigos são EM INGLÊS no servidor e a string de UI vive só aqui: o CLAUDE.md manda
 * manter código/entidades em inglês e UI em PT-BR. Mesmo padrão de `join-error-messages.ts`
 * (D-03 da Fase 3).
 */
const DRAW_ERROR_MESSAGES: Record<string, string> = {
  NOT_ENOUGH_PARTICIPANTS: 'É preciso ter pelo menos 3 participantes para sortear.',
  ALREADY_DRAWN: 'O sorteio deste grupo já foi realizado.',
  NOT_ADMIN: 'Você não tem permissão para sortear este grupo.',
  GROUP_NOT_FOUND: 'Grupo não encontrado.',
};

export const GENERIC_DRAW_ERROR =
  'Não foi possível realizar o sorteio. Tente novamente.';

/**
 * Converte o código da Edge Function em texto PT-BR exibível. Código desconhecido
 * (incluindo o `UNKNOWN_ERROR` que a função devolve no catch genérico) cai no fallback,
 * para não engolir silenciosamente um caso novo.
 */
export function translateDrawError(code: string | undefined | null): string {
  if (!code) {
    return GENERIC_DRAW_ERROR;
  }
  return DRAW_ERROR_MESSAGES[code] ?? GENERIC_DRAW_ERROR;
}
