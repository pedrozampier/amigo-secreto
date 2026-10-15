import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { AuthenticatedLayoutPage } from './authenticated-layout.page';

describe('AuthenticatedLayoutPage - skip link', () => {
  let fixture: ComponentFixture<AuthenticatedLayoutPage>;
  let router: Router;

  beforeEach(async () => {
    const mock = {
      displayName: signal('Teste'),
      isAuthenticated: signal(true),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [AuthenticatedLayoutPage],
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: AuthService, useValue: mock }],
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    fixture = TestBed.createComponent(AuthenticatedLayoutPage);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  function clicar(): MouseEvent {
    const link = fixture.nativeElement.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(ev);
    return ev;
  }

  it('o skip link é o primeiro elemento focável', () => {
    const primeiro = fixture.nativeElement.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) as HTMLElement;
    expect(primeiro.textContent).toContain('Pular para o conteúdo');
  });

  it('o clique chama preventDefault', () => {
    expect(clicar().defaultPrevented).toBe(true);
  });

  it('o foco vai para o <main id="main-content">', () => {
    clicar();
    const main = fixture.nativeElement.querySelector('main#main-content');
    expect(document.activeElement).toBe(main);
  });

  it('a URL não muda após o clique', () => {
    clicar();
    expect(router.url).toBe('/dashboard');
  });
});
