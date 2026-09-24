import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const session = {
    _id: '1',
    username: 'nate',
    email: 'nate@example.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('registers, then stores both tokens and the user', () => {
    const payload = { username: 'nate', email: 'nate@example.com', password: 'secret123' };
    service.register(payload).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: 'success', data: session });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.getToken()).toBe('access-token');
    expect(service.getRefreshToken()).toBe('refresh-token');
    expect(service.getCurrentUser()?.username).toBe('nate');
  });

  it('propagates the error status even when the response body is empty', () => {
    let status: number | undefined;
    service.login({ email: 'nate@example.com', password: 'wrong' }).subscribe({ error: (err) => (status = err.status) });

    httpMock.expectOne('/api/v1/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });

  it('exchanges the refresh token for a new pair', () => {
    localStorage.setItem('refreshToken', 'old-refresh');

    let accessToken: string | undefined;
    service.refresh().subscribe((token) => (accessToken = token));

    const req = httpMock.expectOne('/api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
    req.flush({ status: 'success', data: { ...session, accessToken: 'new-access', refreshToken: 'new-refresh' } });

    expect(accessToken).toBe('new-access');
    expect(service.getToken()).toBe('new-access');
    expect(service.getRefreshToken()).toBe('new-refresh');
  });

  it('shares a single refresh request between concurrent callers', () => {
    localStorage.setItem('refreshToken', 'old-refresh');

    service.refresh().subscribe();
    service.refresh().subscribe();

    const requests = httpMock.match('/api/v1/auth/refresh');
    expect(requests.length).toBe(1);
    requests[0].flush({ status: 'success', data: session });

    // once it is done a later call is allowed to ask again
    service.refresh().subscribe();
    httpMock.expectOne('/api/v1/auth/refresh').flush({ status: 'success', data: session });
  });

  it('refuses to refresh when there is no refresh token', () => {
    let failed = false;
    service.refresh().subscribe({ error: () => (failed = true) });

    expect(failed).toBe(true);
    expect(httpMock.match('/api/v1/auth/refresh').length).toBe(0);
  });

  it('revokes the session on the server and clears the browser', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('user', JSON.stringify({ username: 'nate' }));

    service.logout();

    const req = httpMock.expectOne('/api/v1/auth/logout');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-token' });
    req.flush({ status: 'success', data: {} });

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
  });

  it('clears the session without calling the server', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('refreshToken', 'refresh-token');

    service.clearSession();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getRefreshToken()).toBeNull();
    expect(httpMock.match('/api/v1/auth/logout').length).toBe(0);
  });
});

