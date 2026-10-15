import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';

/**
 * RA5-ID18: guard funcional de /group/:id/manage.
 *
 * POR QUE ESTE GUARD EXISTE (descoberto na verificação manual da Fase 3):
 * a checagem de admin vivia dentro do `groupResolver`, devolvendo um `UrlTree`.
 * Isso NÃO redireciona: ao contrário de `CanActivateFn`, onde o `UrlTree` é o
 * contrato oficial de redirecionamento, o valor devolvido por um `ResolveFn` é
 * apenas colocado em `route.data`. O resultado observado foi um não-admin ABRINDO
 * a tela de gestão de um grupo alheio, com o componente recebendo um `UrlTree`
 * onde esperava um `Group` — daí o cabeçalho em branco (`group().name` era
 * `undefined`).
 *
 * A checagem precisa estar aqui. O guard roda ANTES do resolver na mesma rota, o
 * que era exatamente a objeção levantada em D-08 — mas a objeção era sobre o guard
 * LER o resultado do resolver, e não é o que acontece: o guard faz sua própria
 * chamada a `loadGroup`. O custo é uma segunda query por navegação; `loadGroup`
 * popula o mesmo signal em `GroupService`, então a segunda chamada é redundante
 * mas inofensiva. Corretude antes de economia de query.
 *
 * Tanto "grupo não existe" quanto "a RLS não me deixa vê-lo" chegam como
 * `group: null` e levam ao mesmo redirect, sem revelar ao usuário qual dos dois é.
 */
export const adminGuard: CanActivateFn = async (route) => {
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

  return true;
};
