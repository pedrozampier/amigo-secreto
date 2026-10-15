import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

type AuthChangeCallback = (event: string, session: unknown) => void;

function criarMock() {
  let callback: AuthChangeCallback | undefined;
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((cb: AuthChangeCallback) => {
      callback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  return { client: { auth }, auth, disparar: (s: unknown) => callback?.('SIGNED_IN', s) };
}

function criarService(mock: { client: unknown }) {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseClientService, useValue: mock }],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  it('status() é loading e isAuthenticated() é false antes de initialize()', () => {
    const mock = criarMock();
    const service = criarService(mock);

    expect(service.status()).toBe('loading');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('status() é unauthenticated depois de initialize() sem sessão', async () => {
    const mock = criarMock();
    mock.auth.getSession.mockResolvedValue({ data: { session: null } });
    const service = criarService(mock);

    await service.initialize();

    expect(service.status()).toBe('unauthenticated');
  });

  it('status()/user()/displayName() refletem a sessão depois de initialize()', async () => {
    const mock = criarMock();
    const sessaoFake = {
      access_token: 'x',
      user: { id: 'u1', email: 'a@b.com', user_metadata: { display_name: 'Ana' } },
    };
    mock.auth.getSession.mockResolvedValue({ data: { session: sessaoFake } });
    const service = criarService(mock);

    await service.initialize();

    expect(service.status()).toBe('authenticated');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('a@b.com');
    expect(service.displayName()).toBe('Ana');
  });

  it('signUp() envia options.data.display_name com o nome digitado', async () => {
    const mock = criarMock();
    const service = criarService(mock);

    await service.signUp('Ana', 'a@b.com', 'senha123');

    expect(mock.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'senha123',
      options: { data: { display_name: 'Ana' } },
    });
  });

  it('signIn() traduz "Invalid login credentials" para PT-BR', async () => {
    const mock = criarMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    const service = criarService(mock);

    const resultado = await service.signIn('a@b.com', 'errada');

    expect(resultado.error).toBe('E-mail ou senha incorretos.');
  });

  it('onAuthStateChange é registrado exatamente 1 vez e atualiza status() ao disparar', () => {
    const mock = criarMock();
    const service = criarService(mock);

    expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1);

    mock.disparar({
      access_token: 'x',
      user: { id: 'u1', email: 'a@b.com', user_metadata: {} },
    });

    expect(service.status()).toBe('authenticated');
  });
});
