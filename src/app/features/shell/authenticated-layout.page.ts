import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '../../core/services/auth.service';
import { ConnectivityService } from '../../core/services/connectivity.service';

/**
 * Layout das rotas autenticadas (D-19). A rota PAI aplica o authGuard uma única
 * vez e este componente fornece o header + <router-outlet> próprio — a hierarquia
 * de layout que o RA5-ID17 pede. Qualquer página autenticada futura (Fase 3)
 * herda header e proteção sem configuração extra.
 */
@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterOutlet, HlmButton],
  templateUrl: './authenticated-layout.page.html',
})
export class AuthenticatedLayoutPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly connectivity = inject(ConnectivityService);

  protected readonly online = this.connectivity.online;

  protected readonly displayName = this.auth.displayName;
  protected readonly saindo = signal(false);

  constructor() {
    // RA3-ID12: efeito colateral reativo. Se a sessão cair por qualquer motivo
    // (logout em outra aba, refresh token expirado — ambos chegam via
    // onAuthStateChange), o usuário é levado a /login sem ficar olhando um
    // layout autenticado vazio. O guard só roda na navegação; isto cobre a
    // perda de sessão DURANTE a permanência na página.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        void this.router.navigate(['/login']);
      }
    });
  }

  protected async sair(): Promise<void> {
    this.saindo.set(true);
    await this.auth.signOut();
    this.saindo.set(false);
    await this.router.navigate(['/login']);
  }
}
