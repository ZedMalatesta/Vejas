import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../models/auth.model';
import { Room } from '../../models/room.model';
import { Profile } from './profile';

const PROFILE: UserProfile = {
  id: 'user-1',
  login: 'alex@test.com',
  nickname: null,
  avatarUrl: null,
};

const MY_ROOM: Room = {
  id: 'room-1',
  name: 'My room',
  description: '',
  coverUrl: null,
  adminId: 'user-1',
  adminName: 'alex',
  createdAt: '2026-07-06T10:00:00.000Z',
  viewersCount: 2,
};

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let httpMock: HttpTestingController;

  const flushInitialRequests = (
    profile: UserProfile = PROFILE,
    rooms: Room[] = [MY_ROOM]
  ): void => {
    httpMock.expectOne(`${environment.apiUrl}/user/me`).flush(profile);
    httpMock.expectOne(`${environment.apiUrl}/rooms?adminId=user-1`).flush(rooms);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: 'user-1', login: 'alex@test.com' }),
            accessToken: () => 'token',
            signOut: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the profile and prefills the edit form', async () => {
    await fixture.whenStable();
    flushInitialRequests({ ...PROFILE, nickname: 'CoolAlex' });
    await fixture.whenStable();

    expect(component.form.value.nickname).toBe('CoolAlex');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('CoolAlex');
  });

  it('shows the login prefix when no nickname is set', async () => {
    await fixture.whenStable();
    flushInitialRequests();
    await fixture.whenStable();

    expect(component.displayName()).toBe('alex');
  });

  it('saves the nickname via PATCH /user/me', async () => {
    await fixture.whenStable();
    flushInitialRequests();

    component.form.controls.nickname.setValue('NewNick');
    component.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/user/me`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nickname: 'NewNick' });
    req.flush({ ...PROFILE, nickname: 'NewNick' });
    await fixture.whenStable();

    expect(component.profile()?.nickname).toBe('NewNick');
    expect(component.saveMessage()).toBe('Profile saved');
  });

  it('shows a save error when the update fails', async () => {
    await fixture.whenStable();
    flushInitialRequests();

    component.form.controls.nickname.setValue('NewNick');
    component.save();

    httpMock
      .expectOne(`${environment.apiUrl}/user/me`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(component.saveError()).toContain('Could not save');
    expect(component.saving()).toBe(false);
  });

  it('lists the rooms owned by the user', async () => {
    await fixture.whenStable();
    flushInitialRequests();
    await fixture.whenStable();

    expect(component.rooms()).toEqual([MY_ROOM]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My room');
  });

  it('deletes a room after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await fixture.whenStable();
    flushInitialRequests();

    component.deleteRoom(MY_ROOM);

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms/room-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(component.rooms()).toEqual([]);
  });

  it('does not delete a room when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await fixture.whenStable();
    flushInitialRequests();

    component.deleteRoom(MY_ROOM);

    httpMock.expectNone(`${environment.apiUrl}/rooms/room-1`);
    expect(component.rooms()).toEqual([MY_ROOM]);
  });
});
