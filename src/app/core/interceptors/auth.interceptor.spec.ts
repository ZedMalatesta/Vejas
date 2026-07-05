import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { SUPABASE_CLIENT } from '../supabase/supabase-client.token';

const getSession = vi.fn();

function sessionWith(token: string | null): { data: { session: { access_token: string } | null } } {
  return { data: { session: token ? { access_token: token } : null } };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SUPABASE_CLIENT, useValue: { auth: { getSession } } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    getSession.mockReset();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds a Bearer token to API requests when a session exists', async () => {
    getSession.mockResolvedValue(sessionWith('token-123'));

    http.get(`${environment.apiUrl}/rooms`).subscribe();
    await new Promise((resolve) => setTimeout(resolve));

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush([]);
  });

  it('sends API requests without a header when there is no session', async () => {
    getSession.mockResolvedValue(sessionWith(null));

    http.get(`${environment.apiUrl}/rooms`).subscribe();
    await new Promise((resolve) => setTimeout(resolve));

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not touch non-API requests at all', () => {
    http.get('https://example.com/data').subscribe();

    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(getSession).not.toHaveBeenCalled();
    req.flush({});
  });
});
