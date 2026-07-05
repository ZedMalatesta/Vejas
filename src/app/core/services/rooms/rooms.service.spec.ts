import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Room } from '../../../models/room.model';
import { RoomsService } from './rooms.service';

const ROOM: Room = {
  id: 'room-1',
  name: 'Movie night',
  description: 'Chill',
  coverUrl: null,
  adminId: 'user-1',
  adminName: 'Alex',
  createdAt: '2026-07-05T10:00:00.000Z',
  viewersCount: 3,
};

describe('RoomsService', () => {
  let service: RoomsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoomsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches the room list with GET', () => {
    let result: Room[] | undefined;
    service.getRooms().subscribe((rooms) => (result = rooms));

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.method).toBe('GET');
    req.flush([ROOM]);

    expect(result).toEqual([ROOM]);
  });

  it('passes the search query as a param', () => {
    service.getRooms('movie').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms?search=movie`);
    expect(req.request.params.get('search')).toBe('movie');
    req.flush([]);
  });

  it('fetches a single room by id', () => {
    service.getRoom('room-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms/room-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...ROOM, state: null });
  });

  it('creates a room with POST and the form payload', () => {
    let created: Room | undefined;
    service.createRoom({ name: 'Movie night' }).subscribe((room) => (created = room));

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Movie night' });
    req.flush(ROOM);

    expect(created).toEqual(ROOM);
  });

  it('deletes a room with DELETE', () => {
    service.deleteRoom('room-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms/room-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates server errors to the subscriber', () => {
    let failed = false;
    service.getRooms().subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne(`${environment.apiUrl}/rooms`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(failed).toBe(true);
  });
});
