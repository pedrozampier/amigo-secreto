import { describe, it, expect } from 'vitest';
import { shuffle, pairCircular } from './draw-algorithm';

/** Gera `n` ids determinísticos (`p0`, `p1`, ...) para os testes de propriedade. */
function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i}`);
}

describe('shuffle', () => {
  it('devolve um array NOVO e não muta a entrada original', () => {
    const original = ids(5);
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it('preserva o multiset de elementos (mesma composição, ordem pode mudar)', () => {
    const original = ids(8);
    const result = shuffle(original);
    expect([...result].sort()).toEqual([...original].sort());
  });
});

describe('pairCircular', () => {
  it('devolve exatamente n pares para uma entrada de n ids', () => {
    const result = pairCircular(ids(6));
    expect(result).toHaveLength(6);
  });

  it('ENG-02 (a): nunca produz autossorteio, para n de 2 a 12, em 200 execuções cada', () => {
    for (let n = 2; n <= 12; n++) {
      const participantIds = ids(n);
      for (let run = 0; run < 200; run++) {
        const pairs = pairCircular(participantIds);
        for (const pair of pairs) {
          expect(pair.giver_id).not.toBe(pair.receiver_id);
        }
      }
    }
  });

  it('ENG-02 (b): produz perfect matching — cada id aparece exatamente uma vez como giver e uma vez como receiver, para n de 2 a 12, em 200 execuções cada', () => {
    for (let n = 2; n <= 12; n++) {
      const participantIds = ids(n);
      const sortedInput = [...participantIds].sort();
      for (let run = 0; run < 200; run++) {
        const pairs = pairCircular(participantIds);
        const givers = pairs.map((p) => p.giver_id).sort();
        const receivers = pairs.map((p) => p.receiver_id).sort();
        expect(givers).toEqual(sortedInput);
        expect(receivers).toEqual(sortedInput);
      }
    }
  });

  it('com n = 2 produz a troca mútua (a->b, b->a) — o único caso em que pares mútuos ocorrem, e é esperado e inevitável', () => {
    const [a, b] = ids(2);
    const pairs = pairCircular([a, b]);
    const byGiver = new Map(pairs.map((p) => [p.giver_id, p.receiver_id]));
    expect(byGiver.get(a)).toBe(b);
    expect(byGiver.get(b)).toBe(a);
  });

  it('com array vazio devolve [] e não lança (guarda contra divisão por zero no % 0)', () => {
    expect(() => pairCircular([])).not.toThrow();
    expect(pairCircular([])).toEqual([]);
  });
});
