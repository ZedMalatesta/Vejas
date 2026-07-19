import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the JWT to API requests and transparently recovers from an
 * expired access token: on 401 it refreshes the session once and retries
 * the original request. A failed refresh signs the user out and sends
 * them to the login screen.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const withToken = (request: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = auth.accessToken();
    return token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;
  };

  // Auth endpoints (login/signup/refresh) must never trigger a refresh loop.
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);

  return next(withToken(req)).pipe(
    catchError((error: unknown) => {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status !== 401 || isAuthEndpoint || !auth.refreshToken()) {
        return throwError(() => error);
      }

      return from(auth.refreshSession()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            void router.navigate(['/auth/login']);
            return throwError(() => error);
          }
          return next(withToken(req));
        })
      );
    })
  );
};
