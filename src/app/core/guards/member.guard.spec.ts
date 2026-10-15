import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { memberGuard } from './member.guard';
import type { Group } from '../models/group.model';
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

function configurar(options: { group: Group | null }) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: GroupService,
        useValue: { loadGroup: vi.fn().mockResolvedValue({ group: options.group, error: null }) },
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
  return TestBed.runInInjectionContext(() => memberGuard(route, state));
}

@Component({ selector: 'app-dummy-group-view', template: '' })
class DummyGroupViewComponent {}

@Component({ selector: 'app-dummy-dashboard', template: '' })
class DummyDashboardComponent {}

describe('memberGuard', () => {
  describe('retorno do guard', () => {
    it('libera a rota quando o usuário é o admin do grupo', async () => {
      configurar({ group: GRUPO_BASE });

      const resultado = await executar(criarRota('g1'));

      expect(resultado).toBe(true);
    });

    it('libera a rota quando o usuário é membro não-admin do grupo', async () => {
      // GRUPO_BASE.admin_id é 'admin-1' — a RLS já filtrou o que loadGroup devolve,
      // então receber a linha de volta é o suficiente para provar que o chamador é
      // admin OU participante, sem o guard precisar saber qual dos dois.
      configurar({ group: GRUPO_BASE });

      const resultado = await executar(criarRota('g1'));

      expect(resultado).toBe(true);
    });

    it('bloqueia e redireciona quando o grupo é null (inexistente ou invisível pela RLS)', async () => {
      const router = configurar({ group: null });

      const resultado = await executar(criarRota('g1'));

      expect(resultado).not.toBe(true);
      const serializado = router.serializeUrl(
        resultado as Parameters<typeof router.serializeUrl>[0],
      );
      expect(serializado.startsWith('/dashboard')).toBe(true);
    });

    it('bloqueia quando a rota não traz o parâmetro :id', async () => {
      const router = configurar({ group: GRUPO_BASE });

      const resultado = await executar(criarRota(null));

      expect(resultado).not.toBe(true);
      const serializado = router.serializeUrl(
        resultado as Parameters<typeof router.serializeUrl>[0],
      );
      expect(serializado.startsWith('/dashboard')).toBe(true);
    });

    it('libera a rota quando o param se chama groupId em vez de id (rota /draw/:groupId/result)', async () => {
      configurar({ group: GRUPO_BASE });

      const route = {
        paramMap: convertToParamMap({ groupId: 'g1' }),
      } as ActivatedRouteSnapshot;
      const resultado = await executar(route);

      expect(resultado).toBe(true);
    });
  });

  /**
   * Bloco B — a lição desta fase: provar que o Router AGE sobre o bloqueio
   * (navegação real via RouterTestingHarness), não apenas que o guard devolveu um
   * UrlTree. Foi exatamente essa lacuna que deixou um não-admin abrir
   * /group/:id/manage de um grupo alheio antes de admin.guard.ts existir.
   */
  describe('navegação real (RouterTestingHarness)', () => {
    it('redireciona de verdade para /dashboard e NÃO instancia o componente de grupo quando o usuário não é membro', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'group/:id',
              canActivate: [memberGuard],
              component: DummyGroupViewComponent,
            },
            { path: 'dashboard', component: DummyDashboardComponent },
          ]),
          {
            provide: GroupService,
            useValue: { loadGroup: vi.fn().mockResolvedValue({ group: null, error: null }) },
          },
        ],
      });

      const harness = await RouterTestingHarness.create();
      const activatedComponent = await harness.navigateByUrl('/group/g1');

      // O guard redireciona para /dashboard, que precisa de rota própria para o
      // Router conseguir completar a navegação — mas o outlet nunca ativa o
      // componente de GRUPO, só o de dashboard. É essa troca de componente que
      // prova que o Router AGIU sobre o bloqueio, não apenas que o guard devolveu
      // um UrlTree.
      expect(activatedComponent).not.toBeInstanceOf(DummyGroupViewComponent);
      expect(activatedComponent).toBeInstanceOf(DummyDashboardComponent);
      const router = TestBed.inject(Router);
      expect(router.url).toContain('/dashboard');
    });

    it('chega em /group/:id e instancia o componente de grupo quando o usuário é membro não-admin', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'group/:id',
              canActivate: [memberGuard],
              component: DummyGroupViewComponent,
            },
            { path: 'dashboard', component: DummyDashboardComponent },
          ]),
          {
            provide: GroupService,
            useValue: {
              loadGroup: vi.fn().mockResolvedValue({ group: GRUPO_BASE, error: null }),
            },
          },
        ],
      });

      const harness = await RouterTestingHarness.create();
      const activatedComponent = await harness.navigateByUrl('/group/g1');

      expect(activatedComponent).toBeInstanceOf(DummyGroupViewComponent);
      const router = TestBed.inject(Router);
      expect(router.url).toBe('/group/g1');
    });

    it('chega na rota e instancia o componente quando o path usa :groupId em vez de :id', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'draw/:groupId/result',
              canActivate: [memberGuard],
              component: DummyGroupViewComponent,
            },
            { path: 'dashboard', component: DummyDashboardComponent },
          ]),
          {
            provide: GroupService,
            useValue: {
              loadGroup: vi.fn().mockResolvedValue({ group: GRUPO_BASE, error: null }),
            },
          },
        ],
      });

      const harness = await RouterTestingHarness.create();
      const activatedComponent = await harness.navigateByUrl('/draw/g1/result');

      expect(activatedComponent).toBeInstanceOf(DummyGroupViewComponent);
      const router = TestBed.inject(Router);
      expect(router.url).toBe('/draw/g1/result');
    });
  });
});
