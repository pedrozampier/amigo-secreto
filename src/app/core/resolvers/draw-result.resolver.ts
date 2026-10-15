import { inject } from '@angular/core';
import { Router, type ResolveFn, type UrlTree } from '@angular/router';
import type { DrawResult } from '../models/group.model';
import { DrawService } from '../services/draw.service';
import { GroupService } from '../services/group.service';

/**
 * Estado resolvido para `/draw/:groupId/result` (D-08, ID18). Um discriminated union em
 * vez de só `DrawResult | null` porque a TELA precisa diferenciar "ainda não sorteou" de
 * "sorteou mas não achou resultado" — são duas mensagens PT-BR diferentes, não um erro.
 */
export type DrawResultState =
  | { status: 'ready'; result: DrawResult }
  | { status: 'not-drawn' }
  | { status: 'missing' };

/**
 * Resolver funcional de `/draw/:groupId/result` (RA5-ID18, D-08). O `memberGuard`
 * (`canActivate`) já roda ANTES na mesma rota e barra quem não é membro — este resolver
 * só carrega o par, nunca reimplementa a checagem de acesso (mesma separação de
 * responsabilidades que `admin.guard.ts`/`group.resolver.ts` já estabeleceram na Fase 3:
 * um `UrlTree` devolvido por um `ResolveFn` não redireciona, só vira `route.data`).
 *
 * Por que checar `group.status` ANTES de chamar `getMyResult()`: antes do sorteio não
 * existe linha de `draw` para ninguém — consultar `draw` primeiro devolveria sempre
 * `null` e obrigaria a tela a adivinhar o motivo. Checar o status primeiro permite a
 * mensagem certa ("o sorteio ainda não aconteceu") sem uma segunda query desnecessária.
 */
export const drawResultResolver: ResolveFn<DrawResultState | UrlTree> = async (route) => {
  const groups = inject(GroupService);
  const draw = inject(DrawService);
  const router = inject(Router);

  const groupId = route.paramMap.get('groupId');
  if (!groupId) {
    return router.createUrlTree(['/dashboard']);
  }

  const { group } = await groups.loadGroup(groupId);
  if (!group) {
    return router.createUrlTree(['/dashboard']);
  }

  if (group.status !== 'closed') {
    return { status: 'not-drawn' };
  }

  const { result } = await draw.getMyResult(groupId);
  if (!result) {
    return { status: 'missing' };
  }

  return { status: 'ready', result };
};
