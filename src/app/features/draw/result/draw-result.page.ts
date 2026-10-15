import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import type { DrawResultState } from '../../../core/resolvers/draw-result.resolver';

/**
 * DRAW-08/09: a revelação do par. `groupId` chega por `withComponentInputBinding`
 * (RA5-ID16) e `resultado` chega pelo `resolve: { resultado: drawResultResolver }`
 * (RA5-ID18) — SEM `effect()` e sem a armadilha de `input.required()` documentada em
 * `group-view.page.ts`/`manage-group.page.ts`, porque o resolver já entrega o dado
 * pronto antes do componente existir.
 */
@Component({
  selector: 'app-draw-result',
  imports: [
    RouterLink,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
  ],
  templateUrl: './draw-result.page.html',
})
export class DrawResultPage {
  readonly groupId = input.required<string>();
  readonly resultado = input.required<DrawResultState>();

  /**
   * Narrowing explícito do discriminated union fora do template: interpolação não
   * faz narrowing automático de `resultado().status === 'ready'` dentro de um
   * `@defer`, então em vez de repetir a checagem várias vezes (ou recorrer a um
   * cast inseguro para tipo `any`, terminantemente proibido neste projeto), este
   * `computed()` devolve o `DrawResult` só quando pronto.
   */
  readonly resultadoPronto = computed(() => {
    const r = this.resultado();
    return r.status === 'ready' ? r.result : null;
  });
}
