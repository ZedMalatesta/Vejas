import { InjectionToken } from '@angular/core';

export interface AppBrand {
  /** Product name shown in the header, footer, titles and loaders. */
  name: string;
  /** App-relative path to the logo asset (same file the favicon uses). */
  logoUrl: string;
}

// Initialized once at the root (see app.ts); everything below the root
// component injects the token instead of hardcoding the product name.
export const APP_BRAND = new InjectionToken<AppBrand>('APP_BRAND');
