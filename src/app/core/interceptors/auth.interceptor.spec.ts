import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

const accessToken = vi.fn<() => string | null>();

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    accessToken.mockReset();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds a Bearer token to API requests when a token is stored', () => {
    accessToken.mockReturnValue('token-123');

    http.get(`${environment.apiUrl}/rooms`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush([]);
  });

  it('sends API requests without a header when there is no token', () => {
    accessToken.mockReturnValue(null);

    http.get(`${environment.apiUrl}/rooms`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not touch non-API requests at all', () => {
    http.get('https://example.com/data').subscribe();

    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(accessToken).not.toHaveBeenCalled();
    req.flush({});
  });
});
