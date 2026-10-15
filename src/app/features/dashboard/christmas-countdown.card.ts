import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { HolidayService } from '../../core/services/holiday.service';

/**
 * Card de contagem regressiva do Natal (API-02) — D-12.
 * Carregado dentro de um bloco `@defer (on viewport)` no dashboard (RA2-ID8).
 */
@Component({
  selector: 'app-christmas-countdown',
  imports: [DatePipe, HlmCard, HlmCardHeader, HlmCardTitle, HlmCardDescription, HlmCardContent],
  templateUrl: './christmas-countdown.card.html',
})
export class ChristmasCountdownCard {
  private readonly holidays = inject(HolidayService);

  // RA3-ID9: expõe os próprios signals do service, sem copiar para estado local.
  protected readonly dias = this.holidays.diasAteONatal;
  protected readonly natal = this.holidays.natal;
}
