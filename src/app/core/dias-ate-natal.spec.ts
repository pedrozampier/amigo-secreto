import { describe, it, expect } from 'vitest';
import { diasAteNatal } from './dias-ate-natal';

describe('diasAteNatal', () => {
  it('devolve 5 quando faltam 5 dias para o Natal', () => {
    expect(diasAteNatal(new Date(2026, 11, 20), 2026)).toBe(5);
  });

  it('devolve 0 no próprio dia do Natal', () => {
    expect(diasAteNatal(new Date(2026, 11, 25), 2026)).toBe(0);
  });

  it('devolve 0 no Natal independente da hora do dia', () => {
    expect(diasAteNatal(new Date(2026, 11, 25, 23, 59), 2026)).toBe(0);
  });

  it('devolve -1 quando o Natal já passou', () => {
    expect(diasAteNatal(new Date(2026, 11, 26), 2026)).toBe(-1);
  });

  it('devolve 358 em 1 de janeiro de 2026 (ano não bissexto)', () => {
    expect(diasAteNatal(new Date(2026, 0, 1), 2026)).toBe(358);
  });
});
