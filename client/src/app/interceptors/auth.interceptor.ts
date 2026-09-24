import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// A 401 from this endpoints means the credentials or the session are wrong,
// not that an access token expired, so they must never trigger a refresh.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

const isAuthEndpoint = (url: string) => AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

// Adds the access token to every request and, when the token has expired, exchanges
// the refresh token for a new one and repeats the original request.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRefresh = error.status === 401 && !isAuthEndpoint(req.url) && !!authService.getRefreshToken();

      if (!canRefresh) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap((accessToken) => next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }))),
        catchError((refreshError) => {
          // the session cannot be saved any more, drop it and ask for a login
          authService.clearSession();
          router.navigate(['/login']);

          return throwError(() => refreshError);
        })
      );
    })
  );
};

