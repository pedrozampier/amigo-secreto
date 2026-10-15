import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { adminGuard } from './admin.guard';
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

function executar(route: ActivatedRouteSnapshot) {
  const state = {} as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => adminGuard(route, state));
}

describe('adminGuard', () => {
  it('libera a rota quando admin_id é igual ao usuário logado', async () => {
    configurar({ group: GRUPO_BASE, userId: 'admin-1' });

    const resultado = await executar(criarRota('g1'));

    expect(resultado).toBe(true);
  });

  /**
   * O caso que a tela de gestão expôs: um participante não-admin chegava a ABRIR
   * /group/:id/manage de um grupo alheio, porque a checagem vivia num resolver e
   * um UrlTree devolvido por resolver não redireciona.
   */
  it('bloqueia e redireciona quando o usuário não é o admin do grupo', async () => {
    const router = configurar({ group: GRUPO_BASE, userId: 'outro-usuario' });

    const resultado = await executar(criarRota('g1'));

    expect(resultado).not.toBe(true);
    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });

  it('bloqueia quando o grupo é null (inexistente ou invisível pela RLS)', async () => {
    const router = configurar({ group: null, userId: 'admin-1' });

    const resultado = await executar(criarRota('g1'));

    expect(resultado).not.toBe(true);
    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });

  it('bloqueia quando a rota não traz o parâmetro :id', async () => {
    const router = configurar({ group: GRUPO_BASE, userId: 'admin-1' });

    const resultado = await executar(criarRota(null));

    expect(resultado).not.toBe(true);
    const serializado = router.serializeUrl(
      resultado as Parameters<typeof router.serializeUrl>[0],
    );
    expect(serializado.startsWith('/dashboard')).toBe(true);
  });
});
