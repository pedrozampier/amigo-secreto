import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor funcional de erro centralizado (RA6-ID22).
 *
 * ESCOPO REAL, documentado deliberadamente (D-15): este interceptor cobre
 * EXCLUSIVAMENTE o tráfego do `HttpClient` do Angular — na prática, a chamada à
 * BrasilAPI. O `supabase-js` usa o `fetch` nativo próprio e NUNCA passa pelo
 * `HttpClient`, então nenhum erro de Supabase chega aqui. Isso não é uma limitação
 * a corrigir: é uma consequência da arquitetura (ARCHITECTURE.md, "o conflito do
 * ID22"), e o cliente Supabase já anexa o JWT sozinho — não há token a injetar.
 *
 * Responsabilidade: registrar a falha num ponto único e normalizá-la em
 * `HttpFalha`, de forma que cada chamador não precise reinterpretar status HTTP.
 * Re-lança o erro (não engole) para que o `catchError` do HolidayService ainda
 * decida o estado de UI — D-14: falhar na API não pode quebrar o dashboard.
 */
export interface HttpFalha {
  status: number;
  mensagem: string;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((erro: HttpErrorResponse) => {
      const falha: HttpFalha = {
        status: erro.status,
        mensagem:
          erro.status === 0
            ? 'Sem conexão com a internet.'
            : `A requisição falhou (HTTP ${erro.status}).`,
      };
      // Ponto único de observabilidade de falhas HTTP do projeto.
      console.error('[HTTP]', req.method, req.url, falha.status, falha.mensagem);
      return throwError(() => falha);
    }),
  );
