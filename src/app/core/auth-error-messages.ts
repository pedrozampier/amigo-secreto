/**
 * Tradução PT-BR das mensagens do Supabase Auth (D-17).
 * Casos conhecidos recebem texto claro; qualquer outro cai no fallback genérico,
 * para não engolir erros inesperados.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'Password should be at least 6 characters.':
    'A senha precisa ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Informe um e-mail válido.',
  'For security purposes, you can only request this after 60 seconds.':
    'Aguarde um momento antes de tentar novamente.',
};

export const GENERIC_AUTH_ERROR =
  'Não foi possível concluir a operação. Tente novamente.';

/**
 * Converte a mensagem crua da API Supabase em texto PT-BR exibível.
 * Usa correspondência exata e, em seguida, `startsWith` — o Supabase às vezes
 * acrescenta detalhes ao final da mensagem.
 */
export function translateAuthError(message: string | undefined | null): string {
  if (!message) {
    return GENERIC_AUTH_ERROR;
  }

  const exact = AUTH_ERROR_MESSAGES[message];
  if (exact) {
    return exact;
  }

  for (const [key, translated] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.startsWith(key)) {
      return translated;
    }
  }

  return GENERIC_AUTH_ERROR;
}
