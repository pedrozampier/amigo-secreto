import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function configurar(isAuthenticated: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } },
    ],
  });
  return TestBed.inject(Router);
}

describe('authGuard', () => {
  it('retorna true quando isAuthenticated() é true', () => {
    configurar(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const resultado = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(resultado).toBe(true);
  });

  it('retorna um UrlTree para /login quando isAuthenticated() é false', () => {
    const router = configurar(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const resultado = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(resultado).not.toBe(false);
    const serializado = router.serializeUrl(resultado as Parameters<typeof router.serializeUrl>[0]);
    expect(serializado.startsWith('/login')).toBe(true);
  });

  it('preserva a URL pretendida em returnUrl', () => {
    const router = configurar(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const resultado = TestBed.runInInjectionContext(() => authGuard(route, state));

    const serializado = router.serializeUrl(resultado as Parameters<typeof router.serializeUrl>[0]);
    expect(serializado).toContain('returnUrl=%2Fdashboard');
  });
});
