import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { translateAuthError } from '../auth-error-messages';
import { SupabaseClientService } from './supabase-client.service';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthResult {
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseClientService).client;

  /** Única fonte de verdade escrita (D-04). Todo o resto é derivado. */
  private readonly _session = signal<Session | null>(null);

  /** Vira false quando `initialize()` resolve — é o que distingue 'loading'. */
  private readonly _resolved = signal(false);

  readonly session = this._session.asReadonly();

  readonly status = computed<AuthStatus>(() => {
    if (!this._resolved()) {
      return 'loading';
    }
    return this._session() !== null ? 'authenticated' : 'unauthenticated';
  });

  readonly user = computed<User | null>(() => this._session()?.user ?? null);

  readonly isAuthenticated = computed(() => this.status() === 'authenticated');

  /** Nome vindo da sessão — sem query extra no boot (D-06). */
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (!currentUser) {
      return null;
    }
    const metadata = currentUser.user_metadata as
      | { display_name?: string }
      | undefined;
    return metadata?.display_name ?? currentUser.email ?? null;
  });

  readonly email = computed(() => this.user()?.email ?? null);

  constructor() {
    // D-02: subscription registrada UMA ÚNICA VEZ, aqui, nunca em componentes
    // (PITFALLS.md Pitfall 8). Mantém o signal em sincronia com login,
    // logout e refresh automático de token.
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this._resolved.set(true);
    });
  }

  /**
   * Resolve a sessão persistida no localStorage.
   * Chamada por `provideAppInitializer` no `app.config.ts` ANTES da primeira
   * navegação (D-01) — é isso que elimina o flash de /login no F5 e permite
   * que o `authGuard` seja síncrono.
   */
  async initialize(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._session.set(data.session);
    this._resolved.set(true);
  }

  /**
   * D-13 — CRÍTICO: `options.data.display_name` é EXATAMENTE a chave que o trigger
   * `handle_new_user` lê (`raw_user_meta_data ->> 'display_name'`).
   * Errar esse nome NÃO gera erro: o trigger cai no fallback
   * `split_part(email, '@', 1)` e grava nomes feios em `profile.display_name`.
   */
  async signUp(nome: string, email: string, senha: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { display_name: nome } },
    });
    return { error: error ? translateAuthError(error.message) : null };
  }

  async signIn(email: string, senha: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return { error: error ? translateAuthError(error.message) : null };
  }

  async signOut(): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signOut();
    return { error: error ? translateAuthError(error.message) : null };
  }
}
