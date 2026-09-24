import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const refreshedSession = {
    _id: '1',
    username: 'nate',
    email: 'nate@example.com',
    accessToken: 'new-access',
    refreshToken: 'new-refresh'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds the bearer token when a session exists', () => {
    localStorage.setItem('token', 'jwt-token');

    http.get('/api/v1/videos').subscribe();

    const req = httpMock.expectOne('/api/v1/videos');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({ status: 'success', data: [] });
  });

  it('leaves the request untouched when there is no token', () => {
    http.get('/api/v1/videos').subscribe();

    const req = httpMock.expectOne('/api/v1/videos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ status: 'success', data: [] });
  });

  it('refreshes the token and repeats the request when it has expired', () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-token');

    let received: unknown;
    http.get('/api/v1/videos/mine').subscribe((response) => (received = response));

    httpMock.expectOne('/api/v1/videos/mine').flush(null, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne('/api/v1/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-token' });
    refresh.flush({ status: 'success', data: refreshedSession });

    const retried = httpMock.expectOne('/api/v1/videos/mine');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new-access');
    retried.flush({ status: 'success', data: ['video'] });

    expect(received).toEqual({ status: 'success', data: ['video'] });
    expect(localStorage.getItem('token')).toBe('new-access');
  });

  it('refreshes once when several requests expire together', () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-token');

    http.get('/api/v1/videos/mine').subscribe();
    http.get('/api/v1/comments/v1').subscribe();

    httpMock.expectOne('/api/v1/videos/mine').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/v1/comments/v1').flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshes = httpMock.match('/api/v1/auth/refresh');
    expect(refreshes.length).toBe(1);
    refreshes[0].flush({ status: 'success', data: refreshedSession });

    httpMock.expectOne('/api/v1/videos/mine').flush({ status: 'success', data: [] });
    httpMock.expectOne('/api/v1/comments/v1').flush({ status: 'success', data: [] });
  });

  it('drops the session and asks for a login when the refresh fails', () => {
    localStorage.setItem('token', 'old-access');
    localStorage.setItem('refreshToken', 'stale-refresh');

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    let failed = false;
    http.get('/api/v1/videos/mine').subscribe({ error: () => (failed = true) });

    httpMock.expectOne('/api/v1/videos/mine').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne('/api/v1/auth/refresh')
      .flush({ status: 'fail', message: 'The session has expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('does not refresh when the credentials themselves are rejected', () => {
    localStorage.setItem('token', 'access');
    localStorage.setItem('refreshToken', 'refresh');

    let status: number | undefined;
    http.post('/api/v1/auth/login', { email: 'nate@example.com', password: 'wrong' }).subscribe({
      error: (error) => (status = error.status)
    });

    httpMock
      .expectOne('/api/v1/auth/login')
      .flush({ status: 'fail', message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(httpMock.match('/api/v1/auth/refresh').length).toBe(0);
  });
});

