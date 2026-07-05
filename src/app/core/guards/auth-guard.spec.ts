import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const isAuthenticated = vi.fn();

  const executeGuard = (): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        ) as Promise<boolean | UrlTree>
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated } },
      ],
    });
    isAuthenticated.mockReset();
  });

  it('allows navigation for an authenticated user', async () => {
    isAuthenticated.mockResolvedValue(true);
    await expect(executeGuard()).resolves.toBe(true);
  });

  it('redirects an anonymous user to the login page', async () => {
    isAuthenticated.mockResolvedValue(false);

    const result = await executeGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/auth/login');
  });
});
