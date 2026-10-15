/**
 * Algoritmo de sorteio: Fisher-Yates + pareamento circular (DRAW-05).
 *
 * ESPELHO: `supabase/functions/run-draw/draw-algorithm.ts` deve permanecer
 * BYTE-IDÊNTICO a este arquivo. Qualquer mudança aqui tem de ser copiada para lá
 * (e vice-versa).
 *
 * POR QUE A DUPLICAÇÃO: o algoritmo executa em Deno (runtime da Edge Function), que
 * resolve imports por `jsr:`/URL; o Vitest do Angular resolve por Node/Vite. Não há
 * como um único arquivo ser importado pelos dois sem um passo de build que este
 * projeto não tem e que nenhum indicador da rubrica recompensa. ENG-02 exige que o
 * algoritmo seja testável por `.spec.ts`, então a cópia em `src/app/core/` é a que o
 * Vitest importa. 20 linhas duplicadas com um comentário cruzado é deliberadamente
 * mais simples que um monorepo.
 *
 * ZERO IMPORTS neste arquivo, por construção: nada de `@angular/core`, nada de
 * `@supabase/supabase-js`, nada de `Deno`. É o que o torna válido nos dois runtimes.
 */

export interface DrawPair {
  giver_id: string;
  receiver_id: string;
}

/**
 * Fisher-Yates (embaralhamento uniforme). Devolve um array NOVO — não muta a entrada,
 * para que o chamador possa reusar a lista original.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pareamento circular sobre a permutação: `p[i]` dá para `p[(i + 1) % n]`.
 *
 * GARANTIA ESTRUTURAL, NÃO PROBABILÍSTICA, DE ZERO AUTOSSORTEIO (DRAW-05):
 * todos os elementos de `p` são distintos (é uma permutação de ids únicos), logo
 * `p[i] !== p[(i + 1) % n]` para todo `i` sempre que `n >= 2`. Não há tentativa e
 * repetição, não há caso de falha, não há laço de retry — o autossorteio é impossível
 * pela forma do pareamento. É esta propriedade que `draw-algorithm.spec.ts` verifica
 * (ENG-02 a) e que a constraint `draw_no_self_gift` do banco reforça.
 *
 * NOTA PARA A BANCA: um ciclo hamiltoniano único é um SUBCONJUNTO ESTRITO das
 * derangements — ele nunca produz pares mútuos A<->B (exceto quando n = 2, onde é o
 * único arranjo possível). Isso é desejável aqui, mas significa que a distribuição
 * não é uniforme sobre todas as derangements. Ver ARCHITECTURE.md ~linha 282.
 */
export function pairCircular(participantIds: readonly string[]): DrawPair[] {
  const ids = shuffle(participantIds);
  if (ids.length === 0) {
    return [];
  }
  return ids.map((giverId, i) => ({
    giver_id: giverId,
    receiver_id: ids[(i + 1) % ids.length],
  }));
}
