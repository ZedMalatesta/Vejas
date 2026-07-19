import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { DEFAULT_THEME_CONFIG, THEME_CONFIG } from './core/services/theme/theme.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Order matters: authInterceptor must see 401s before errorInterceptor,
    // so a silent token refresh does not flash an error notification.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    { provide: THEME_CONFIG, useValue: DEFAULT_THEME_CONFIG },
  ],
};
