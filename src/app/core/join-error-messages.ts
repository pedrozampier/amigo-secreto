/**
 * Tradução PT-BR dos códigos estáveis devolvidos pelos RPCs de convite
 * (`join_group_by_token` / `preview_group_by_token`, migration 0004) — D-03.
 *
 * Os códigos são EM INGLÊS no banco e a string de UI vive só aqui: o CLAUDE.md manda
 * manter código/entidades em inglês e UI em PT-BR. É este mapa que entrega a
 * "mensagem clara" exigida por GRP-07 e GRP-08.
 */
const JOIN_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_MEMBER: 'Você já faz parte deste grupo.',
  GROUP_CLOSED: 'Este grupo não está mais aceitando participantes.',
  INVALID_TOKEN: 'Este convite não é válido.',
};

export const GENERIC_JOIN_ERROR =
  'Não foi possível entrar no grupo. Tente novamente.';

/**
 * Converte o código do RPC em texto PT-BR exibível. Código desconhecido cai no
 * fallback genérico, para não engolir silenciosamente um caso novo.
 */
export function translateJoinError(code: string | undefined | null): string {
  if (!code) {
    return GENERIC_JOIN_ERROR;
  }
  return JOIN_ERROR_MESSAGES[code] ?? GENERIC_JOIN_ERROR;
}
