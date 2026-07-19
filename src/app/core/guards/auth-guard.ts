import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Full accounts only — guests and anonymous visitors are bounced to login
 * (profile, room creation). The intended destination travels along as
 * `returnUrl`, so signing in lands the user where they were headed.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();

  return user && !user.isGuest
    ? true
    : router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
};

/**
 * Room access: anyone with a session passes; visitors without one get a
 * silent guest session so a shared room link "just works". Only a failed
 * guest sign-in (backend down) falls back to the login screen.
 */
export const roomGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.user()) {
    return true;
  }

  const { error } = await authService.signInAsGuest();
  return error ? router.createUrlTree(['/auth/login']) : true;
};
