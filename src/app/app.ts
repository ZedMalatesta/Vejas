import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme/theme.service';
import { ErrorNotificationService } from './core/services/error-notification.service';
import { APP_BRAND, AppBrand } from './core/brand';

// The single place that names the product: change the brand here and the
// header, footer, page title and loaders all follow.
const BRAND: AppBrand = {
  name: 'Vejas',
  logoUrl: 'icons/logo.svg',
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  providers: [{ provide: APP_BRAND, useValue: BRAND }],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly theme = inject(ThemeService);
  protected readonly error = inject(ErrorNotificationService);

  constructor() {
    inject(Title).setTitle(BRAND.name);
  }
}
