import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UpdateProfileRequest, UserProfile } from '../../../models/auth.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/user/me`;

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.baseUrl);
  }

  updateMe(request: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.baseUrl, request);
  }
}
