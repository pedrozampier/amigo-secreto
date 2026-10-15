import { TestBed } from '@angular/core/testing';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { describe, it, expect, vi } from 'vitest';
import { DrawService } from './draw.service';
import { SupabaseClientService } from './supabase-client.service';
import { GENERIC_DRAW_ERROR } from '../draw-error-messages';

function criarMock() {
  const functions = {
    invoke: vi.fn(),
  };
  return { client: { functions }, functions };
}

function criarService(mock: { client: unknown }) {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseClientService, useValue: mock }],
  });
  return TestBed.inject(DrawService);
}

describe('DrawService', () => {
  it('runDraw() chama functions.invoke com run-draw e { groupId } no body', async () => {
    const mock = criarMock();
    mock.functions.invoke.mockResolvedValue({
      data: { success: true, pairs: 3 },
      error: null,
    });
    const service = criarService(mock);

    await service.runDraw('grupo-1');

    expect(mock.functions.invoke).toHaveBeenCalledWith('run-draw', {
      body: { groupId: 'grupo-1' },
    });
  });

  it('runDraw() devolve { error: null } em caso de sucesso', async () => {
    const mock = criarMock();
    mock.functions.invoke.mockResolvedValue({
      data: { success: true, pairs: 3 },
      error: null,
    });
    const service = criarService(mock);

    const resultado = await service.runDraw('grupo-1');

    expect(resultado).toEqual({ error: null });
  });

  it('ENG-03: traduz a rejeição ALREADY_DRAWN da segunda invocação via error.context.json()', async () => {
    const mock = criarMock();
    const context = { json: vi.fn().mockResolvedValue({ code: 'ALREADY_DRAWN' }) };
    const erro = new FunctionsHttpError(context);
    mock.functions.invoke.mockResolvedValue({ data: null, error: erro });
    const service = criarService(mock);

    const resultado = await service.runDraw('grupo-1');

    expect(resultado).toEqual({ error: 'O sorteio deste grupo já foi realizado.' });
    expect(context.json).toHaveBeenCalled();
  });

  it('runDraw() devolve o fallback genérico para erro sem .context (falha de rede)', async () => {
    const mock = criarMock();
    const erro = new FunctionsFetchError({ message: 'network down' });
    mock.functions.invoke.mockResolvedValue({ data: null, error: erro });
    const service = criarService(mock);

    const resultado = await service.runDraw('grupo-1');

    expect(resultado).toEqual({ error: GENERIC_DRAW_ERROR });
  });
});
