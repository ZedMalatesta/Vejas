import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_BRAND } from '../../core/brand';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly brand = inject(APP_BRAND);
  readonly year = new Date().getFullYear();
}
