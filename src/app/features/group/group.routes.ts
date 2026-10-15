import type { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';
import { memberGuard } from '../../core/guards/member.guard';
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
        // RA5-ID18: guard funcional + resolver funcional. O `adminGuard` barra
        // quem não é admin ANTES de a rota ativar — um UrlTree devolvido por um
        // resolver não redireciona, só vira o valor em route.data (ver o
        // comentário em admin.guard.ts). O resolver então só carrega o grupo.
        path: ':id/manage',
        canActivate: [adminGuard],
        resolve: { group: groupResolver },
        loadComponent: () =>
          import('./manage/manage-group.page').then((m) => m.ManageGroupPage),
      },
      {
        // Gap closure WISH-01/02: a rota do PARTICIPANTE. `memberGuard` admite
        // admin OU participante — `adminGuard` (em :id/manage) continua exigindo
        // ser o admin. Sem resolver: o memberGuard ja chamou loadGroup na mesma
        // navegacao e o componente le GroupService.currentGroup.
        path: ':id',
        canActivate: [memberGuard],
        loadComponent: () =>
          import('./view/group-view.page').then((m) => m.GroupViewPage),
      },
    ],
  },
];
