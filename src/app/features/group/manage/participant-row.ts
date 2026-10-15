import { Component, input, output } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import type { Participant } from '../../../core/models/group.model';

/**
 * Item da lista de participantes (RA4-ID13): recebe dados por `input()` e emite o
 * pedido de remoção por `output()` — funções, nunca os decorators @Input/@Output
 * (o ESLint quebra o build neles).
 *
 * Confirmação em dois passos INLINE, controlada pelo input `confirmando`: o pai
 * decide qual linha está em confirmação. Nenhum dialog — a primitiva Spartan
 * `dialog` puxaria @ng-icons, ausente do SDD §2.
 */
@Component({
  selector: 'app-participant-row',
  imports: [HlmButton],
  templateUrl: './participant-row.html',
})
export class ParticipantRow {
  readonly participant = input.required<Participant>();
  /** true quando o pai está aguardando a confirmação de remoção DESTA linha. */
  readonly confirmando = input(false);
  /** Mostra os controles de remoção apenas para o admin do grupo. */
  readonly podeRemover = input(false);

  readonly pedirRemocao = output<string>();
  readonly confirmarRemocao = output<string>();
  readonly cancelarRemocao = output<void>();
}
