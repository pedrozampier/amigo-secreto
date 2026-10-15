import { DOCUMENT, DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

/**
 * Status de conexão (UI-05). O signal `online` é escrito apenas pelos listeners
 * `online`/`offline` do window.
 *
 * RA3-ID12: o `effect()` LÊ `online()` e espelha o estado no atributo
 * `data-offline` de <html> — efeito colateral reativo real, observável no DevTools
 * e via seletor CSS `html[data-offline]`; não é decorativo.
 *
 * Não usa `toSignal(fromEvent(...))`: o RA6-ID24 já é entregue pelo HolidayService
 * e o gate `npm run check:no-rxjs-state` mantém o estado em Signals.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly document = inject(DOCUMENT);
  private readonly _online = signal(navigator.onLine);
  readonly online = this._online.asReadonly();

  constructor() {
    const goOnline = () => this._online.set(true);
    const goOffline = () => this._online.set(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    });

    effect(() => {
      const offline = !this._online();
      const root = this.document.documentElement;
      if (offline) {
        root.dataset['offline'] = 'true';
      } else {
        delete root.dataset['offline'];
      }
    });
  }
}
