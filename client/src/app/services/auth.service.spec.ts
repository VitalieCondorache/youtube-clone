import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('posts the registration payload to /api/v1/auth/register and stores the returned token', () => {
    const payload = { username: 'nate', email: 'nate@example.com', password: 'secret123' };
    service.register(payload).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      status: 'success',
      data: { _id: '1', username: 'nate', email: 'nate@example.com', token: 'jwt-token' },
    });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.getCurrentUser().username).toBe('nate');
  });

  it('propagates the error status even when the response body is empty', () => {
    let status: number | undefined;
    service
      .login({ email: 'nate@example.com', password: 'wrong' })
      .subscribe({ error: (err) => (status = err.status) });

    httpMock.expectOne('/api/v1/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });

  it('clears the stored session on logout', () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify({ username: 'nate' }));

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });
});
