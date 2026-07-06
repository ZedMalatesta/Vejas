import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { Room } from '../../../../models/room.model';
import { RoomList } from './room-list';

const ROOM: Room = {
  id: 'room-1',
  name: 'Movie night',
  description: 'Chill',
  coverUrl: null,
  adminId: 'user-1',
  adminName: 'Alex',
  allowGuestControl: false,
  createdAt: '2026-07-05T10:00:00.000Z',
  viewersCount: 3,
};

describe('RoomList', () => {
  let fixture: ComponentFixture<RoomList>;
  let component: RoomList;
  let httpMock: HttpTestingController;

  const flushInitialRequest = (rooms: Room[] | 'error' = []): void => {
    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    if (rooms === 'error') {
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    } else {
      req.flush(rooms);
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: () => null } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the loading state while the first request is in flight', async () => {
    await fixture.whenStable();

    expect(component.loading()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading');

    flushInitialRequest();
  });

  it('renders room cards after a successful load', async () => {
    await fixture.whenStable();
    flushInitialRequest([ROOM]);
    await fixture.whenStable();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('app-room-card');
    expect(cards.length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('shows the empty state when there are no rooms', async () => {
    await fixture.whenStable();
    flushInitialRequest([]);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No rooms yet');
  });

  it('shows the error state with a retry button when the request fails', async () => {
    await fixture.whenStable();
    flushInitialRequest('error');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(component.error()).toBe(true);
    expect(host.textContent).toContain('Could not load rooms');
    expect(host.querySelector('button')).toBeTruthy();
  });

  it('retries the request when Retry is clicked', async () => {
    await fixture.whenStable();
    flushInitialRequest('error');
    await fixture.whenStable();

    component.retry();
    flushInitialRequest([ROOM]);
    await fixture.whenStable();

    expect(component.error()).toBe(false);
    expect(component.rooms()).toEqual([ROOM]);
  });

  it('debounces search input and sends it as a query param', async () => {
    await fixture.whenStable();
    flushInitialRequest();

    component.searchControl.setValue('mov');
    component.searchControl.setValue('movie');

    // Nothing before the debounce window elapses…
    httpMock.expectNone(`${environment.apiUrl}/rooms?search=movie`);
    await new Promise((resolve) => setTimeout(resolve, 350));

    // …one request (for the latest value only) after it.
    const req = httpMock.expectOne(`${environment.apiUrl}/rooms?search=movie`);
    req.flush([ROOM]);

    expect(component.rooms()).toEqual([ROOM]);
  });

  it('hides the create-room link for anonymous users', async () => {
    await fixture.whenStable();
    flushInitialRequest();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/rooms/new"]')).toBeNull();
  });
});
