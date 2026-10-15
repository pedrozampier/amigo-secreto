import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { groupResolver } from './group.resolver';
import type { Group } from '../models/group.model';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';

const GRUPO_BASE: Group = {
  id: 'g1',
  name: 'Natal da firma',
  admin_id: 'admin-1',
  status: 'open',
  invite_token: 'tok',
  min_participants: 3,
  created_at: '2026-01-01T00:00:00Z',
};

function configurar(options: { group: Group | null; userId: string }) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: GroupService,
        useValue: { loadGroup: vi.fn().mockResolvedValue({ group: options.group, error: null }) },
      },
      {
        provide: AuthService,
        useValue: { user: () => ({ id: options.userId }) },
      },
    ],
  });
  return TestBed.inject(Router);
}

function criarRota(id: string | null) {
  return { paramMap: convertToParamMap(id ? { id } : {}) } as ActivatedRouteSnapshot;
}

describe('groupResolver', () => {
  it('devolve o Group quando o grupo existe', async () => {
    configurar({ group: GRUPO_BASE, userId: 'admin-1' });
    const route = criarRota('g1');
    const state = {} as RouterStateSnapshot;

    const resultado = await TestBed.runInInjectionContext(() => groupResolver(route, state));

    expect(resultado).toEqual(GRUPO_BASE);
  });

  // A checagem de admin saiu daqui para o `adminGuard` — ver admin.guard.spec.ts.
  // Um UrlTree devolvido por um ResolveFn nao redireciona, so vira route.data.

  it('devolve um UrlTree para /dashboard quando o grupo é null (inexistente ou invisível pela RLS)', async () => {
    const router = configurar({ group: null, userId: 'admin-1' });
    const route = criarRota('g1');
    const state = {} as RouterStateSnapshot;

    const resultado = await TestBed.runInInjectionContext(() => groupResolver(route, state));

    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });
});
