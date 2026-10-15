import { describe, it, expect } from 'vitest';
import { translateDrawError, GENERIC_DRAW_ERROR } from './draw-error-messages';

describe('translateDrawError', () => {
  it("traduz 'NOT_ENOUGH_PARTICIPANTS' mencionando o mínimo de participantes", () => {
    expect(translateDrawError('NOT_ENOUGH_PARTICIPANTS')).toBe(
      'É preciso ter pelo menos 3 participantes para sortear.',
    );
  });

  it("traduz 'ALREADY_DRAWN' dizendo que o sorteio já foi feito", () => {
    expect(translateDrawError('ALREADY_DRAWN')).toBe(
      'O sorteio deste grupo já foi realizado.',
    );
  });

  it("traduz 'NOT_ADMIN' para uma mensagem de permissão negada", () => {
    expect(translateDrawError('NOT_ADMIN')).toBe(
      'Você não tem permissão para sortear este grupo.',
    );
  });

  it("traduz 'GROUP_NOT_FOUND' para uma mensagem de grupo não encontrado", () => {
    expect(translateDrawError('GROUP_NOT_FOUND')).toBe('Grupo não encontrado.');
  });

  it('cai no fallback genérico para um código desconhecido', () => {
    expect(translateDrawError('CODIGO_DESCONHECIDO')).toBe(GENERIC_DRAW_ERROR);
  });

  it('cai no fallback genérico para undefined e null', () => {
    expect(translateDrawError(undefined)).toBe(GENERIC_DRAW_ERROR);
    expect(translateDrawError(null)).toBe(GENERIC_DRAW_ERROR);
  });

  it("cai no fallback genérico para 'UNKNOWN_ERROR', o catch-all da Edge Function", () => {
    expect(translateDrawError('UNKNOWN_ERROR')).toBe(GENERIC_DRAW_ERROR);
  });
});
