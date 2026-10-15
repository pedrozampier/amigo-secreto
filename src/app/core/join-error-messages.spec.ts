import { describe, it, expect } from 'vitest';
import { translateJoinError, GENERIC_JOIN_ERROR } from './join-error-messages';

describe('translateJoinError', () => {
  it("traduz 'ALREADY_MEMBER' para a mensagem de já ser membro", () => {
    expect(translateJoinError('ALREADY_MEMBER')).toBe('Você já faz parte deste grupo.');
  });

  it("traduz 'GROUP_CLOSED' para a mensagem de grupo fechado", () => {
    expect(translateJoinError('GROUP_CLOSED')).toBe(
      'Este grupo não está mais aceitando participantes.',
    );
  });

  it("traduz 'INVALID_TOKEN' para a mensagem de convite inválido", () => {
    expect(translateJoinError('INVALID_TOKEN')).toBe('Este convite não é válido.');
  });

  it('cai no fallback genérico para um código desconhecido', () => {
    expect(translateJoinError('CODIGO_DESCONHECIDO')).toBe(GENERIC_JOIN_ERROR);
  });

  it('cai no fallback genérico para undefined e null', () => {
    expect(translateJoinError(undefined)).toBe(GENERIC_JOIN_ERROR);
    expect(translateJoinError(null)).toBe(GENERIC_JOIN_ERROR);
  });

  it("cai no fallback genérico para 'OK', que não é um código de erro", () => {
    expect(translateJoinError('OK')).toBe(GENERIC_JOIN_ERROR);
  });
});
