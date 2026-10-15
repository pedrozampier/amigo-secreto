import type { Routes } from '@angular/router';
import { groupResolver } from '../../core/resolvers/group.resolver';

/**
 * RA5-ID17: rotas FILHAS aninhadas sob GroupLayoutPage, que tem <router-outlet>
 * próprio. Sem `canActivate` aqui — o authGuard está na rota pai de layout
 * autenticado em app.routes.ts e é herdado (D-07 / D-19 da Fase 2).
 */
export const groupRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./group-layout/group-layout.page').then((m) => m.GroupLayoutPage),
    children: [
      {
        path: 'create',
        loadComponent: () =>
          import('./create/create-group.page').then((m) => m.CreateGroupPage),
      },
      {
        // RA5-ID18: resolver funcional. Ele busca o grupo UMA vez e devolve um
        // UrlTree para /dashboard se quem navega não é o admin — a checagem de
        // admin vive no resolver porque guards rodam ANTES de resolvers na mesma
        // rota (desvio documentado de D-08, ver plan 03-03).
        path: ':id/manage',
        resolve: { group: groupResolver },
        loadComponent: () =>
          import('./manage/manage-group.page').then((m) => m.ManageGroupPage),
      },
    ],
  },
];
