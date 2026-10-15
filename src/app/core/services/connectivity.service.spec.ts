import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset['offline'];
  });

  it('online() inicia com navigator.onLine', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const service = TestBed.inject(ConnectivityService);
    expect(service.online()).toBe(false);
  });

  it('evento offline faz online() virar false', () => {
    const service = TestBed.inject(ConnectivityService);
    TestBed.tick();
    window.dispatchEvent(new Event('offline'));
    expect(service.online()).toBe(false);
  });

  it('evento online depois de offline volta para true', () => {
    const service = TestBed.inject(ConnectivityService);
    TestBed.tick();
    window.dispatchEvent(new Event('offline'));
    TestBed.tick();
    window.dispatchEvent(new Event('online'));
    TestBed.tick();
    expect(service.online()).toBe(true);
  });

  it('não expõe setter público', () => {
    const service = TestBed.inject(ConnectivityService);
    expect((service.online as unknown as { set?: unknown }).set).toBeUndefined();
  });

  it('effect define data-offline=true ao ficar offline', () => {
    TestBed.inject(ConnectivityService);
    TestBed.tick();
    window.dispatchEvent(new Event('offline'));
    TestBed.tick();
    expect(document.documentElement.dataset['offline']).toBe('true');
  });

  it('effect remove data-offline ao voltar online', () => {
    TestBed.inject(ConnectivityService);
    TestBed.tick();
    window.dispatchEvent(new Event('offline'));
    TestBed.tick();
    window.dispatchEvent(new Event('online'));
    TestBed.tick();
    expect(document.documentElement.dataset['offline']).toBeUndefined();
  });
});
