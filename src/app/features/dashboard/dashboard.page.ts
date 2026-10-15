import { Component, inject } from '@angular/core';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { AuthService } from '../../core/services/auth.service';
import { ChristmasCountdownCard } from './christmas-countdown.card';

@Component({
  selector: 'app-dashboard',
  imports: [
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

  // RA3-ID9: lido direto do computed do service, sem copiar para estado local.
  protected readonly displayName = this.auth.displayName;
  protected readonly email = this.auth.email;
}
