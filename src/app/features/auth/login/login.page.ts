import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    HlmInput,
    HlmLabel,
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  /** D-21: o authGuard preserva a URL pretendida aqui. */
  private readonly returnUrl =
    this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    // D-15: mínimo 6 — exatamente o mínimo do Supabase Auth, para cliente e
    // servidor concordarem e nunca aparecer erro de servidor que o form deixou passar.
    senha: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** D-16: junto com `touched`, controla quando a mensagem de erro aparece. */
  protected readonly submetido = signal(false);
  /** D-18: trava o botão durante o envio, prevenindo duplo clique. */
  protected readonly enviando = signal(false);
  protected readonly erroApi = signal<string | null>(null);

  protected async enviar(): Promise<void> {
    this.submetido.set(true);
    this.erroApi.set(null);

    if (this.form.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    const { email, senha } = this.form.getRawValue();
    const { error } = await this.auth.signIn(email, senha);
    this.enviando.set(false);

    if (error) {
      // Já vem traduzido para PT-BR pelo AuthService (D-17).
      this.erroApi.set(error);
      return;
    }

    await this.router.navigateByUrl(this.returnUrl);
  }
}
