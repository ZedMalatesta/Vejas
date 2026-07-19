import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authGuard, roomGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../../models/auth.model';

describe('auth guards', () => {
  const user = vi.fn<() => AuthUser | null>();
  const signInAsGuest = vi.fn();

  const executeGuard = (guard: typeof authGuard, url = '/'): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        guard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot
        ) as Promise<boolean | UrlTree>
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user, signInAsGuest } },
      ],
    });
    user.mockReset();
    signInAsGuest.mockReset();
  });

  describe('authGuard', () => {
    it('allows navigation for a registered user', async () => {
      user.mockReturnValue({ id: '1', login: 'a@b.c', isGuest: false });
      await expect(executeGuard(authGuard)).resolves.toBe(true);
    });

    it('redirects an anonymous user to login, keeping the destination as returnUrl', async () => {
      user.mockReturnValue(null);

      const result = await executeGuard(authGuard, '/rooms/new');
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/auth/login?returnUrl=%2Frooms%2Fnew');
    });

    it('redirects a guest to the login page', async () => {
      user.mockReturnValue({ id: 'guest-1', login: 'calm-fox-11', isGuest: true });

      const result = await executeGuard(authGuard, '/profile');
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/auth/login?returnUrl=%2Fprofile');
    });
  });

  describe('roomGuard', () => {
    it('allows any existing session, including guests', async () => {
      user.mockReturnValue({ id: 'guest-1', login: 'calm-fox-11', isGuest: true });

      await expect(executeGuard(roomGuard)).resolves.toBe(true);
      expect(signInAsGuest).not.toHaveBeenCalled();
    });

    it('creates a silent guest session for anonymous visitors', async () => {
      user.mockReturnValue(null);
      signInAsGuest.mockResolvedValue({ error: null });

      await expect(executeGuard(roomGuard)).resolves.toBe(true);
      expect(signInAsGuest).toHaveBeenCalledTimes(1);
    });

    it('falls back to the login page when the guest sign-in fails', async () => {
      user.mockReturnValue(null);
      signInAsGuest.mockResolvedValue({ error: { message: 'down' } });

      const result = await executeGuard(roomGuard);
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/auth/login');
    });
  });
});
