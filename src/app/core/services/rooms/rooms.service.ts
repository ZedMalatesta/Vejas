import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateRoomRequest, Room, RoomWithState } from '../../../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rooms`;

  getRooms(search = ''): Observable<Room[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<Room[]>(this.baseUrl, { params });
  }

  getRoomsByAdmin(adminId: string): Observable<Room[]> {
    const params = new HttpParams().set('adminId', adminId);
    return this.http.get<Room[]>(this.baseUrl, { params });
  }

  getRoom(id: string): Observable<RoomWithState> {
    return this.http.get<RoomWithState>(`${this.baseUrl}/${id}`);
  }

  createRoom(request: CreateRoomRequest): Observable<Room> {
    return this.http.post<Room>(this.baseUrl, request);
  }

  deleteRoom(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
