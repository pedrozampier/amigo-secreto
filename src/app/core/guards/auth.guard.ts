import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional (RA5-ID18).
 *
 * É SÍNCRONO de propósito: `provideAppInitializer` no `app.config.ts` já resolveu
 * a sessão antes da primeira navegação (D-01), então `status()` nunca é 'loading'
 * aqui. Um guard assíncrono esperando o signal sair de 'loading' foi rejeitado —
 * obrigaria todo guard futuro (ex. o adminGuard da Fase 3) a repetir a espera.
 *
 * Retorna `UrlTree` em vez de `router.navigate()` + `false` (D-09): cancela a
 * navegação e redireciona atomicamente, numa única entrada de histórico.
 *
 * Preserva a URL pretendida em `returnUrl` (D-21) para que, na Fase 3, abrir um
 * link de convite /join/:token sem estar logado leve ao grupo após o login.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
