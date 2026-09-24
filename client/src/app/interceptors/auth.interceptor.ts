import { HttpInterceptorFn } from '@angular/common/http';

// Attaches the JWT saved by AuthService to every outgoing request,
// so protected endpoints (upload, comment, like) can be called directly.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
