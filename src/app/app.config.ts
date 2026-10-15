import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // D-15 / RA6-ID22: primeiro e único HttpClient do projeto. O tráfego da BrasilAPI
    // é o único interceptável — supabase-js usa fetch próprio e não passa por aqui.
    provideHttpClient(withInterceptors([errorInterceptor])),
    // D-08 / RA5-ID15: withComponentInputBinding entrega parâmetros de rota como
    // inputs de componente — consumido pelas rotas da Fase 3 (/join/:token).
    provideRouter(routes, withComponentInputBinding()),
    // D-01: a aplicação não inicializa até getSession() resolver, então quando a
    // primeira navegação ocorre o estado já é 'authenticated' ou 'unauthenticated'.
    // É isto que elimina o flash de /login no F5 (PITFALLS.md Pitfall 8) e permite
    // que o authGuard seja um `if` síncrono.
    provideAppInitializer(() => inject(AuthService).initialize()),
  ],
};
