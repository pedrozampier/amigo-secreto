import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { memberGuard } from './core/guards/member.guard';
import { drawResultResolver } from './core/resolvers/draw-result.resolver';

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
      // D-07 / RA5-ID17: bloco /group com rotas filhas aninhadas.
      {
        path: 'group',
        loadChildren: () =>
          import('./features/group/group.routes').then((m) => m.groupRoutes),
      },
      // D-07: /join/:token fica FLAT, não sob /group — quem abre o convite ainda
      // não é membro, e renderizar o layout de um grupo que a pessoa não integra
      // seria incoerente. Continua dentro do layout autenticado, então o authGuard
      // (com returnUrl, D-21 da Fase 2) cobre o deep link de quem não está logado.
      {
        path: 'join/:token',
        loadComponent: () =>
          import('./features/group/join/join-group.page').then((m) => m.JoinGroupPage),
      },
      // D-08 / RA5-ID17-ID18: a revelação do par, fora de /group (path diferente:
      // começa com draw, não group). O memberGuard (generalizado nesta fase para
      // ler :groupId além de :id) barra quem não é membro; drawResultResolver
      // carrega o estado ready/not-drawn/missing.
      {
        path: 'draw/:groupId/result',
        canActivate: [memberGuard],
        resolve: { resultado: drawResultResolver },
        loadComponent: () =>
          import('./features/draw/result/draw-result.page').then((m) => m.DrawResultPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
