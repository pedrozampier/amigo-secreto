import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { drawResultResolver } from './draw-result.resolver';
import type { DrawResult, Group } from '../models/group.model';
import { DrawService } from '../services/draw.service';
import { GroupService } from '../services/group.service';

const GRUPO_ABERTO: Group = {
  id: 'g1',
  name: 'Natal da firma',
  admin_id: 'admin-1',
  status: 'open',
  invite_token: 'tok',
  min_participants: 3,
  created_at: '2026-01-01T00:00:00Z',
};

const GRUPO_FECHADO: Group = { ...GRUPO_ABERTO, status: 'closed' };

const RESULTADO: DrawResult = {
  id: 'd1',
  receiver: { display_name: 'Maria', wish_list: 'Um livro' },
};

function configurar(options: {
  group: Group | null;
  result?: DrawResult | null;
}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: GroupService,
        useValue: { loadGroup: vi.fn().mockResolvedValue({ group: options.group, error: null }) },
      },
      {
        provide: DrawService,
        useValue: {
          getMyResult: vi
            .fn()
            .mockResolvedValue({ result: options.result ?? null, error: null }),
        },
      },
    ],
  });
  return TestBed.inject(Router);
}

function criarRota(groupId: string | null) {
  return { paramMap: convertToParamMap(groupId ? { groupId } : {}) } as ActivatedRouteSnapshot;
}

function executar(route: ActivatedRouteSnapshot) {
  const state = {} as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => drawResultResolver(route, state));
}

describe('drawResultResolver', () => {
  it('devolve { status: "ready", result } quando o grupo está closed e getMyResult encontra uma linha', async () => {
    configurar({ group: GRUPO_FECHADO, result: RESULTADO });

    const resultado = await executar(criarRota('g1'));

    expect(resultado).toEqual({ status: 'ready', result: RESULTADO });
  });

  it('devolve { status: "not-drawn" } quando o grupo existe mas status !== closed, sem chamar getMyResult', async () => {
    configurar({ group: GRUPO_ABERTO });
    const draw = TestBed.inject(DrawService);

    const resultado = await executar(criarRota('g1'));

    expect(resultado).toEqual({ status: 'not-drawn' });
    expect(draw.getMyResult).not.toHaveBeenCalled();
  });

  it('devolve { status: "missing" } quando o grupo está closed mas getMyResult devolve null', async () => {
    configurar({ group: GRUPO_FECHADO, result: null });

    const resultado = await executar(criarRota('g1'));

    expect(resultado).toEqual({ status: 'missing' });
  });

  it('devolve um UrlTree para /dashboard quando a rota não tem :groupId', async () => {
    const router = configurar({ group: GRUPO_FECHADO, result: RESULTADO });

    const resultado = await executar(criarRota(null));

    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });

  it('devolve um UrlTree para /dashboard quando loadGroup devolve group: null', async () => {
    const router = configurar({ group: null });

    const resultado = await executar(criarRota('g1'));

    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });
});
