import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { GroupService } from '../../../core/services/group.service';
import type { GroupPreview } from '../../../core/models/group.model';

/**
 * GRP-06/07/08 (D-02): preview por token + confirmação explícita de entrada —
 * nunca entra automaticamente, para um F5 acidental não virar erro.
 *
 * `token` chega pelo param de rota via withComponentInputBinding (RA5-ID16).
 */
@Component({
  selector: 'app-join-group',
  imports: [RouterLink, HlmButton, HlmCard, HlmCardHeader, HlmCardTitle, HlmCardContent],
  templateUrl: './join-group.page.html',
})
export class JoinGroupPage {
  private readonly groups = inject(GroupService);
  private readonly router = inject(Router);

  readonly token = input.required<string>();

  protected readonly carregando = signal(true);
  protected readonly preview = signal<GroupPreview | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly entrando = signal(false);

  constructor() {
    // `effect` e nao o constructor: um `input.required()` ainda NAO esta
    // populado quando o constructor roda, entao `this.token()` lancaria ali e a
    // promise rejeitada (silenciada por `void`) deixaria `carregando` em true
    // para sempre. O effect roda depois dos inputs resolvidos e reexecuta se o
    // token mudar sem destruir o componente.
    effect(() => {
      void this.carregarPreview(this.token());
    });
  }

  private async carregarPreview(token: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    this.preview.set(null);
    const { preview, error } = await this.groups.previewByToken(token);
    if (error) {
      this.erro.set(error);
    } else if (!preview) {
      // Token inexistente: mesma mensagem que o RPC de join daria para INVALID_TOKEN.
      this.erro.set('Este convite não é válido.');
    } else if (preview.status !== 'open') {
      // GRP-08 antecipado na UI — o RPC rejeita de novo no clique, que é a garantia real.
      this.preview.set(preview);
      this.erro.set('Este grupo não está mais aceitando participantes.');
    } else {
      this.preview.set(preview);
    }
    this.carregando.set(false);
  }

  protected async confirmar(): Promise<void> {
    this.entrando.set(true);
    this.erro.set(null);
    // Já em PT-BR: GroupService traduziu o código do RPC (ALREADY_MEMBER,
    // GROUP_CLOSED, INVALID_TOKEN) via translateJoinError. GRP-07 e GRP-08.
    const { error } = await this.groups.joinByToken(this.token());
    this.entrando.set(false);
    if (error) {
      this.erro.set(error);
      return;
    }
    // O groupResolver barra quem não é admin, e quem acabou de entrar por
    // convite não é o admin — navegar para manage rebateria para /dashboard.
    await this.router.navigate(['/dashboard']);
  }
}
