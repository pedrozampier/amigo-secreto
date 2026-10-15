import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { AuthService } from '../../../core/services/auth.service';
import { GroupService } from '../../../core/services/group.service';
import type { Group } from '../../../core/models/group.model';
import { ParticipantRow } from './participant-row';

/**
 * GRP-03/04/05 + WISH-01/02: lista de participantes do admin, remoção em dois
 * passos (sem dialog — ver participant-row.ts) e a wishlist do próprio usuário
 * logado, com two-way binding por `model()` (RA3-ID11/D-11).
 *
 * `id` chega pelo param de rota e `group` pelo `resolve: { group }` do
 * groupResolver — ambos via withComponentInputBinding (RA5-ID16).
 */
@Component({
  selector: 'app-manage-group',
  imports: [
    FormsModule,
    ParticipantRow,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    HlmInput,
    HlmLabel,
  ],
  templateUrl: './manage-group.page.html',
})
export class ManageGroupPage {
  private readonly groups = inject(GroupService);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly group = input.required<Group>();

  protected readonly participantes = this.groups.participants;
  protected readonly meuParticipante = this.groups.meuParticipante;
  protected readonly souAdmin = computed(() => this.group().admin_id === this.auth.user()?.id);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  /** O id do participante em confirmação de remoção (nenhum, se null). */
  protected readonly removendoId = signal<string | null>(null);
  protected readonly copiado = signal(false);
  protected readonly salvandoWishlist = signal(false);
  protected readonly wishlistSalva = signal(false);

  /**
   * RA3-ID11: two-way binding. A wishlist é um controle simples e autônomo, NÃO
   * parte de um Reactive Form — é exatamente por isso que `model()` + [(ngModel)]
   * se aplica aqui (misturar os dois no mesmo controle não funciona).
   */
  protected readonly wishList = model<string>('');

  private semeado = false;

  // D-19: window.location.origin em runtime, replicado de create-group.page.ts —
  // GRP-03 também vale na tela de gestão, para o admin recuperar o link depois.
  protected readonly linkConvite = computed(
    () => `${window.location.origin}/join/${this.group().invite_token}`,
  );

  constructor() {
    void this.carregar();

    effect(() => {
      const p = this.meuParticipante();
      if (p && !this.semeado) {
        this.semeado = true;
        this.wishList.set(p.wish_list ?? '');
      }
    });
  }

  private async carregar(): Promise<void> {
    const { error } = await this.groups.refreshParticipants(this.id());
    if (error) {
      this.erro.set(error);
    }
    this.carregando.set(false);
  }

  protected async salvarWishList(): Promise<void> {
    const p = this.meuParticipante();
    if (!p) {
      return;
    }
    this.salvandoWishlist.set(true);
    const { error } = await this.groups.updateWishList(p.id, this.wishList(), this.id());
    this.salvandoWishlist.set(false);
    if (error) {
      this.erro.set(error);
      return;
    }
    this.wishlistSalva.set(true);
    setTimeout(() => this.wishlistSalva.set(false), 2000);
  }

  protected pedirRemocao(id: string): void {
    this.removendoId.set(id);
  }

  protected cancelarRemocao(): void {
    this.removendoId.set(null);
  }

  protected async confirmarRemocao(id: string): Promise<void> {
    const { error } = await this.groups.removeParticipant(id, this.id());
    if (error) {
      this.erro.set(error);
    }
    this.removendoId.set(null);
  }

  protected async copiarLink(): Promise<void> {
    await navigator.clipboard.writeText(this.linkConvite());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }
}
