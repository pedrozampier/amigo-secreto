import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { ChristmasCountdownCard } from './christmas-countdown.card';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    ChristmasCountdownCard,
  ],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly groups = inject(GroupService);

  // RA3-ID9: lido direto do computed do service, sem copiar para estado local.
  protected readonly displayName = this.auth.displayName;
  protected readonly email = this.auth.email;

  // GRP-09: signals expostos diretamente do GroupService (D-05), sem parênteses
  // de chamada — são as referências reativas, não valores lidos uma vez.
  protected readonly administrados = this.groups.administered;
  protected readonly participados = this.groups.participated;

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    void this.carregar();
  }

  private async carregar(): Promise<void> {
    const { error } = await this.groups.refreshDashboard();
    this.erro.set(error);
    this.carregando.set(false);
  }
}
