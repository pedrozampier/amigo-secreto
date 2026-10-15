import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  selector: 'app-register',
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
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // D-12: 3 campos, sem confirmação de senha.
  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly submetido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erroApi = signal<string | null>(null);

  protected async enviar(): Promise<void> {
    this.submetido.set(true);
    this.erroApi.set(null);

    if (this.form.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    const { nome, email, senha } = this.form.getRawValue();
    // D-13: `nome` chega ao AuthService, que o envia em
    // `options.data.display_name` — a chave exata que o trigger handle_new_user lê.
    const { error } = await this.auth.signUp(nome.trim(), email, senha);
    this.enviando.set(false);

    if (error) {
      this.erroApi.set(error);
      return;
    }

    // D-20: "Confirm email" desabilitado ⇒ signUp já devolve sessão ⇒ entra direto.
    await this.router.navigateByUrl('/dashboard');
  }
}
