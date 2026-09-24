import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
}

export interface AuthSession extends AuthUser {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  status: string;
  data: AuthSession;
}

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // Several requests can hit a 401 at the same time, they all share one refresh
  private refreshRequest?: Observable<string>;

  constructor(private http: HttpClient) {}

  // Register a new user
  register(userData: { username: string; email: string; password: string }): Observable<AuthSession> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      map((response) => response.data),
      tap((session) => this.saveSession(session))
    );
  }

  // Login existing user
  login(credentials: { email: string; password: string }): Observable<AuthSession> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      map((response) => response.data),
      tap((session) => this.saveSession(session))
    );
  }

  // Exchanges the refresh token for a fresh pair, used when the access token expires
  refresh(): Observable<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('There is no refresh token to exchange'));
    }

    this.refreshRequest ??= this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      map((response) => response.data),
      tap((session) => this.saveSession(session)),
      map((session) => session.accessToken),
      finalize(() => (this.refreshRequest = undefined)),
      shareReplay(1)
    );

    return this.refreshRequest;
  }

  // Ends the session: the API revokes the refresh token, the browser forgets everything
  logout(): void {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      // fire and forget, the local session is dropped either way
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }

    this.clearSession();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(USER_KEY);

    return user ? JSON.parse(user) : null;
  }

  // Used when the refresh token is gone as well, the whole session has to start over
  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.refreshRequest = undefined;
  }

  private saveSession(session: AuthSession): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ _id: session._id, username: session.username, email: session.email })
    );
  }
}
