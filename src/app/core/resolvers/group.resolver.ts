import { inject } from '@angular/core';
import { Router, type ResolveFn, type UrlTree } from '@angular/router';
import type { Group } from '../models/group.model';
import { GroupService } from '../services/group.service';

/**
 * Resolver funcional de /group/:id/manage (RA5-ID18): carrega o grupo para a tela.
 *
 * A checagem de admin NÃO vive mais aqui — ela está em `adminGuard`
 * (core/guards/admin.guard.ts). Um `UrlTree` devolvido por um `ResolveFn` não
 * redireciona: ele vira o valor em `route.data`, e o componente acabava recebendo
 * um `UrlTree` onde esperava um `Group`. Ver o comentário em admin.guard.ts.
 *
 * O guard roda antes e já barrou quem não é admin, então quando este resolver
 * executa o grupo existe e pertence ao usuário. O `UrlTree` daqui cobre apenas o
 * caso degenerado (rota sem `:id`, ou grupo que sumiu entre o guard e o resolver).
 */
export const groupResolver: ResolveFn<Group | UrlTree> = async (route) => {
  const groups = inject(GroupService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (!id) {
    return router.createUrlTree(['/dashboard']);
  }

  const { group } = await groups.loadGroup(id);
  if (!group) {
    return router.createUrlTree(['/dashboard']);
  }

  return group;
};
