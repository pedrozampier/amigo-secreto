import { describe, it, expect } from 'vitest';
import { podeVerResultadoDoSorteio } from './group-view.page';

describe('podeVerResultadoDoSorteio', () => {
  it('libera o link para um participante de grupo já sorteado', () => {
    expect(podeVerResultadoDoSorteio('closed', true)).toBe(true);
  });

  it('esconde o link enquanto o grupo está aberto', () => {
    expect(podeVerResultadoDoSorteio('open', true)).toBe(false);
  });

  it('esconde o link enquanto o sorteio está em andamento', () => {
    expect(podeVerResultadoDoSorteio('drawing', true)).toBe(false);
  });

  it('esconde o link de quem não é participante, mesmo com o grupo fechado', () => {
    // O admin que não participa do próprio grupo: o memberGuard o deixa entrar em
    // /group/:id, mas o drawResultResolver devolveria `missing` para ele.
    expect(podeVerResultadoDoSorteio('closed', false)).toBe(false);
  });

  it('esconde o link enquanto o grupo ainda não carregou', () => {
    expect(podeVerResultadoDoSorteio(undefined, true)).toBe(false);
  });
});
