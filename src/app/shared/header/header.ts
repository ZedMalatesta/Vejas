import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme/theme.service';
import { RouterLink } from '@angular/router';
import { APP_BRAND } from '../../core/brand';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly brand = inject(APP_BRAND);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);

  readonly user = this.authService.user;
  /** Full accounts only — guests see the login/signup actions instead. */
  readonly isAuthorized = computed(() => {
    const user = this.user();
    return user !== null && !user.isGuest;
  });
  readonly guestName = computed(() => {
    const user = this.user();
    return user?.isGuest ? user.login : null;
  });
  readonly theme = this.themeService.theme;

  signOut(): void {
    this.authService.signOut();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
