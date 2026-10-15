import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  // D-19 / RA5-ID17: rota PAI de layout com <router-outlet> próprio, envolvendo
  // todas as rotas autenticadas. O authGuard é aplicado AQUI, uma única vez —
  // qualquer página futura herda guard + header sem precisar lembrar de nada.
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/authenticated-layout.page').then(
        (m) => m.AuthenticatedLayoutPage,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
