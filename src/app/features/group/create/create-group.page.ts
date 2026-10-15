import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { GroupService } from '../../../core/services/group.service';
import type { Group } from '../../../core/models/group.model';

/**
 * GRP-01/GRP-02/GRP-03: Reactive Form validado (3-60 caracteres, espelhando o
 * CHECK do banco) e, após o sucesso, o link de convite copiável.
 */
@Component({
  selector: 'app-create-group',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    HlmInput,
    HlmLabel,
  ],
  templateUrl: './create-group.page.html',
})
export class CreateGroupPage {
  private readonly groups = inject(GroupService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Espelha exatamente `check (char_length(name) between 3 and 60)` (0001_schema.sql),
  // para o cliente e o banco nunca discordarem.
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
  });

  protected readonly submetido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erroApi = signal<string | null>(null);
  protected readonly grupoCriado = signal<Group | null>(null);
  protected readonly copiado = signal(false);

  // D-19: window.location.origin em runtime, nunca um appUrl em environment.ts
  // (o arquivo é git-ignored e gerado no build, e a URL de produção da Vercel
  // é por-deployment).
  protected readonly linkConvite = computed(() => {
    const g = this.grupoCriado();
    return g ? `${window.location.origin}/join/${g.invite_token}` : null;
  });

  protected async enviar(): Promise<void> {
    this.submetido.set(true);
    this.erroApi.set(null);

    if (this.form.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    const { name } = this.form.getRawValue();
    const { group, error } = await this.groups.createGroup(name);
    this.enviando.set(false);

    if (error) {
      this.erroApi.set(error);
      return;
    }

    // GRP-03: não navega — a tela passa a exibir o link de convite.
    this.grupoCriado.set(group);
  }

  protected async copiarLink(): Promise<void> {
    const link = this.linkConvite();
    if (!link) {
      return;
    }
    await navigator.clipboard.writeText(link);
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  protected async irParaGerenciar(): Promise<void> {
    const grupo = this.grupoCriado();
    if (!grupo) {
      return;
    }
    await this.router.navigate(['/group', grupo.id, 'manage']);
  }
}
