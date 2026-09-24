import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
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
});
