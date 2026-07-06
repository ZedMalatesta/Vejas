import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorNotificationService } from '../services/error-notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'A network error occurred. Please try again.';
      notifications.show(message);
      return throwError(() => err);
    }),
  );
};
