import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { diasAteNatal } from '../dias-ate-natal';

export interface Holiday {
  /** 'YYYY-MM-DD' */
  date: string;
  name: string;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly http = inject(HttpClient);
  private readonly ano = new Date().getFullYear();

  /**
   * RA6-ID19 + RA6-ID24: GET real a uma API pública, atravessando a ponte
   * RxJS→Signals com `toSignal()`.
   *
   * Deliberadamente NÃO usa a função `http` + `Resource` do Angular 21 (a API de
   * resource baseada em fetch): o ID24 grada especificamente a ponte Observable→
   * Signal via `toSignal()`, e aquela outra API não a demonstra.
   *
   * Três estados distintos sem signal de loading separado:
   *   `undefined` = carregando · `null` = falhou · array = carregado.
   * O `catchError` → `of(null)` é o que cumpre D-14: a falha vira estado de UI em
   * vez de quebrar o dashboard. O interceptor já logou e normalizou a falha antes.
   */
  private readonly feriados = toSignal(
    this.http
      .get<Holiday[]>(`https://brasilapi.com.br/api/feriados/v1/${this.ano}`)
      .pipe(catchError(() => of(null))),
    { initialValue: undefined },
  );

  /** O feriado de Natal da resposta da API — fonte da data exibida com DatePipe (ID7). */
  readonly natal = computed<Holiday | null | undefined>(() => {
    const lista = this.feriados();
    if (lista === undefined) return undefined;
    if (lista === null) return null;
    return lista.find((f) => f.date === `${this.ano}-12-25`) ?? null;
  });

  /**
   * API-02. `undefined` enquanto carrega, `null` se a API falhou (ou não trouxe o
   * Natal), número quando pronto.
   *
   * O `ano` vem do campo `date` DA RESPOSTA, não de `new Date()` local — é o que
   * mantém o GET à API pública não-decorativo (D-14): sem a resposta, não há número.
   */
  readonly diasAteONatal = computed<number | null | undefined>(() => {
    const feriado = this.natal();
    if (feriado === undefined) return undefined;
    if (feriado === null) return null;
    const anoDaResposta = Number(feriado.date.slice(0, 4));
    return diasAteNatal(new Date(), anoDaResposta);
  });
}
