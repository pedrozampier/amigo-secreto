import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { HlmLabel } from '@spartan-ng/helm/label';
import { AuthService } from '../../../core/services/auth.service';
import { GroupService } from '../../../core/services/group.service';
import { ParticipantRow } from '../manage/participant-row';

/**
 * WISH-01/02 (fechamento de gap da Fase 3): a tela do PARTICIPANTE em
 * `/group/:id` — nome do grupo, status, lista de colegas e a própria wishlist.
 * Antes desta plan, a única wishlist do projeto vivia atrás do `adminGuard` em
 * `manage-group.page.ts`, então um participante não-admin não tinha NENHUMA rota
 * alcançável para cadastrar ou editar a própria lista.
 *
 * Por que um componente separado de `ManageGroupPage`, em vez de afrouxar o
 * `adminGuard`: dois papéis, dois componentes, sem `@if (souAdmin())` espalhado
 * decidindo o que cada um vê — decisão do usuário no gap closure da Fase 3. Esta
 * tela NÃO implementa remoção de participante nem link de convite; são
 * prerrogativas do admin e continuam em `manage-group.page.ts`.
 *
 * O caso admin-que-também-é-participante (exercitado no UAT desta fase): ele é
 * membro, então o `memberGuard` o libera e `/group/:id` abre normalmente — e é
 * desejável, porque é aqui que ele edita a própria wishlist. Nenhum redirect:
 * rebater o admin para `/manage` tornaria `/group/:id` inalcançável justamente
 * para o grupo dele. A tela mostra, só para ele, um link para `/group/:id/manage`.
 *
 * `id` chega pelo param de rota via withComponentInputBinding (RA5-ID16). Esta
 * rota NÃO usa `groupResolver`: o `memberGuard` já chamou `loadGroup(id)` na
 * mesma navegação, que populou `GroupService.currentGroup` — uma query por
 * navegação em vez de duas.
 */
@Component({
  selector: 'app-group-view',
  imports: [
    FormsModule,
    RouterLink,
    ParticipantRow,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    HlmLabel,
  ],
  templateUrl: './group-view.page.html',
})
export class GroupViewPage {
  private readonly groups = inject(GroupService);
  private readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly grupo = this.groups.currentGroup;
  protected readonly participantes = this.groups.participants;
  protected readonly meuParticipante = this.groups.meuParticipante;
  protected readonly souAdmin = computed(
    () => this.grupo()?.admin_id === this.auth.user()?.id,
  );

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly salvandoWishlist = signal(false);
  protected readonly wishlistSalva = signal(false);

  /** RA3-ID11: two-way binding, controle autônomo fora de um Reactive Form. */
  protected readonly wishList = model<string>('');

  private semeado = false;

  constructor() {
    // `effect` e nao o constructor: `id` e um input.required() e ainda nao esta
    // populado quando o constructor roda — le-lo ali lancaria, e a promise
    // rejeitada (silenciada por `void`) deixaria `carregando` em true para
    // sempre. Mesma licao de join-group.page.ts e manage-group.page.ts.
    effect(() => {
      void this.carregar(this.id());
    });

    // Semeia a textarea uma unica vez com o valor que veio do banco. A flag
    // `semeado` existe porque `updateWishList` chama refreshParticipants, o
    // que reemite `meuParticipante` — sem ela, o effect sobrescreveria o que
    // o usuario esta digitando.
    effect(() => {
      const p = this.meuParticipante();
      if (p && !this.semeado) {
        this.semeado = true;
        this.wishList.set(p.wish_list ?? '');
      }
    });
  }

  private async carregar(groupId: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    const { error } = await this.groups.refreshParticipants(groupId);
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
}
