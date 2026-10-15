import { inject } from '@angular/core';
import { Router, type ResolveFn, type UrlTree } from '@angular/router';
import type { Group } from '../models/group.model';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';

/**
 * Resolver funcional de /group/:id/manage (RA5-ID18).
 *
 * DESVIO DOCUMENTADO DE D-08: a decisão original previa um `adminGuard` separado
 * lendo o resultado deste resolver. O Angular Router roda os `canActivate` ANTES
 * dos `resolve` da MESMA rota, então o guard leria `undefined`. A checagem de admin
 * vive aqui, devolvendo um `UrlTree` — retorno oficialmente suportado por `ResolveFn`
 * — o que preserva o objetivo real de D-08: UMA query por navegação.
 *
 * Também cobre o caso "grupo não existe / a RLS não me deixa vê-lo": ambos chegam
 * como `group: null` e levam ao mesmo redirect, sem distinguir os dois para o
 * usuário (não vazar a existência de um grupo de outra pessoa).
 */
export const groupResolver: ResolveFn<Group | UrlTree> = async (route) => {
  const groups = inject(GroupService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (!id) {
    return router.createUrlTree(['/dashboard']);
  }

  const { group } = await groups.loadGroup(id);
  if (!group || group.admin_id !== auth.user()?.id) {
    return router.createUrlTree(['/dashboard']);
  }

  return group;
};
