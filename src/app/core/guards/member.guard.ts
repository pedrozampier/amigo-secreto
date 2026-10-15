import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { GroupService } from '../services/group.service';

/**
 * RA5-ID18: guard funcional de /group/:id — a tela do PARTICIPANTE.
 *
 * POR QUE BASTA CHECAR `group !== null`: as duas policies de SELECT em `group`
 * (migration 0003_rls_policies.sql) são ORed pela RLS — admin (`admin_id =
 * auth.uid()`) OU membro (`id in (select private.my_group_ids())`). Logo "a RLS
 * me devolveu a linha" já é exatamente equivalente a "sou admin ou participante".
 * Um estranho ao grupo recebe `null` e é barrado, sem precisar de uma segunda
 * query em `participant` — a mesma economia que `adminGuard` já faz, sem
 * reintroduzir recursão de policy.
 *
 * POR QUE É UM `CanActivateFn` E NÃO UM RESOLVER: um `UrlTree` devolvido por um
 * `ResolveFn` não redireciona, só vira `route.data` — foi assim que um não-admin
 * chegou a abrir a tela de gestão de grupo alheio nesta mesma fase (ver
 * `admin.guard.ts`). Toda checagem de acesso vai em `CanActivateFn`.
 *
 * DIFERENÇA EM RELAÇÃO AO `adminGuard`: este guard admite QUALQUER membro; o
 * `adminGuard` exige `admin_id === auth.uid()`. `/group/:id` usa este,
 * `/group/:id/manage` continua usando aquele, e os dois coexistem sem se
 * sobrepor.
 */
export const memberGuard: CanActivateFn = async (route) => {
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

  return true;
};
