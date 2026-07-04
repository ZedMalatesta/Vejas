import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { supabase } from '../supabase/supabase';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data: { session } }) => {
      if (!session) {
        return next(req);
      }
      return next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${session.access_token}` },
        })
      );
    })
  );
};
