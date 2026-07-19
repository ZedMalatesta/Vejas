import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
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
  readonly user = this.authService.user;
  readonly isAuthorized = computed(() => this.user() !== null);

  signOut(): void {
    this.authService.signOut();
  }
}
