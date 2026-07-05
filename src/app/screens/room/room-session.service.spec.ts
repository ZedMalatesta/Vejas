import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { RoomWithState } from '../../models/room.model';
import { RoomSessionService } from './room-session.service';

const ROOM: RoomWithState = {
  id: 'room-1',
  name: 'Movie night',
  description: 'Chill',
  coverUrl: null,
  adminId: 'admin-1',
  adminName: 'Alex',
  createdAt: '2026-07-05T10:00:00.000Z',
  viewersCount: 1,
  state: {
    playlist: [{ id: 'p1', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' }],
    currentIndex: 0,
    playback: { isPlaying: true, currentTime: 42, updatedAt: '2026-07-05T10:05:00.000Z' },
    messages: [
      { id: 'm1', authorId: 'admin-1', author: 'Alex', text: 'welcome', sentAt: '2026-07-05T10:01:00.000Z' },
    ],
  },
};

describe('RoomSessionService', () => {
  let service: RoomSessionService;
  let httpMock: HttpTestingController;

  const events = new Map<string, Subject<unknown>>();
  const socketMock = {
    connect: vi.fn(),
    joinRoom: vi.fn(),
    emit: vi.fn(),
    on: vi.fn((event: string) => {
      if (!events.has(event)) events.set(event, new Subject());
      return events.get(event)!.asObservable();
    }),
  };
  const currentUser = signal<{ id: string } | null>({ id: 'viewer-1' });

  const trigger = (event: string, payload: unknown): void => {
    events.get(event)?.next(payload);
  };

  const loadRoom = (room: RoomWithState = ROOM): void => {
    service.load(room.id);
    httpMock.expectOne(`${environment.apiUrl}/rooms/${room.id}`).flush(room);
  };

  beforeEach(() => {
    events.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RoomSessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SocketService, useValue: socketMock },
        { provide: AuthService, useValue: { user: currentUser } },
      ],
    });

    service = TestBed.inject(RoomSessionService);
    httpMock = TestBed.inject(HttpTestingController);
    currentUser.set({ id: 'viewer-1' });
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loading', () => {
    it('fetches the room over HTTP and applies the state snapshot', () => {
      loadRoom();

      expect(service.loading()).toBe(false);
      expect(service.room()?.name).toBe('Movie night');
      expect(service.playlist()).toHaveLength(1);
      expect(service.currentVideoId()).toBe('dQw4w9WgXcQ');
      expect(service.playback().currentTime).toBe(42);
      expect(service.messages()).toHaveLength(1);
    });

    it('joins the socket room after the snapshot arrives', () => {
      loadRoom();

      expect(socketMock.joinRoom).toHaveBeenCalledWith('room-1');
    });

    it('reports not-found for a 404 response', () => {
      service.load('missing');
      httpMock
        .expectOne(`${environment.apiUrl}/rooms/missing`)
        .flush('nope', { status: 404, statusText: 'Not Found' });

      expect(service.error()).toBe('not-found');
      expect(service.loading()).toBe(false);
      expect(socketMock.joinRoom).not.toHaveBeenCalled();
    });

    it('reports a generic failure for other errors', () => {
      service.load('room-1');
      httpMock
        .expectOne(`${environment.apiUrl}/rooms/room-1`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBe('failed');
    });
  });

  describe('live updates from the socket', () => {
    beforeEach(() => loadRoom());

    it('appends incoming chat messages', () => {
      trigger('chatMessage', {
        id: 'm2',
        authorId: 'viewer-1',
        author: 'Bob',
        text: 'hi all',
        sentAt: '2026-07-05T10:06:00.000Z',
      });

      expect(service.messages()).toHaveLength(2);
      expect(service.messages()[1].text).toBe('hi all');
    });

    it('applies playback updates', () => {
      trigger('playbackUpdate', { isPlaying: false, currentTime: 99 });

      expect(service.playback().isPlaying).toBe(false);
      expect(service.playback().currentTime).toBe(99);
    });

    it('applies playlist updates including the current index', () => {
      trigger('playlistUpdate', {
        playlist: [
          { id: 'p1', videoId: 'dQw4w9WgXcQ', url: 'u1' },
          { id: 'p2', videoId: 'abcdefghijk', url: 'u2' },
        ],
        currentIndex: 1,
      });

      expect(service.playlist()).toHaveLength(2);
      expect(service.currentVideoId()).toBe('abcdefghijk');
    });

    it('tracks the viewers count', () => {
      trigger('viewersCount', { count: 7 });

      expect(service.viewersCount()).toBe(7);
    });
  });

  describe('roles', () => {
    it('recognises the room admin', () => {
      currentUser.set({ id: 'admin-1' });
      loadRoom();

      expect(service.isAdmin()).toBe(true);
    });

    it('treats other users as viewers', () => {
      loadRoom();

      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('outgoing actions', () => {
    it('sends chat messages with the room id', () => {
      loadRoom();
      service.sendMessage('  hello  ');

      expect(socketMock.emit).toHaveBeenCalledWith('chatMessage', {
        roomId: 'room-1',
        text: 'hello',
      });
    });

    it('ignores blank chat messages', () => {
      loadRoom();
      service.sendMessage('   ');

      expect(socketMock.emit).not.toHaveBeenCalled();
    });

    it('lets the admin add a playlist item from a YouTube URL', () => {
      currentUser.set({ id: 'admin-1' });
      loadRoom();

      service.addToPlaylist('https://youtu.be/abcdefghijk');

      expect(socketMock.emit).toHaveBeenCalledWith('playlistAdd', {
        roomId: 'room-1',
        videoId: 'abcdefghijk',
        url: 'https://youtu.be/abcdefghijk',
      });
    });

    it('rejects invalid YouTube URLs without emitting', () => {
      currentUser.set({ id: 'admin-1' });
      loadRoom();

      service.addToPlaylist('https://vimeo.com/1');

      expect(socketMock.emit).not.toHaveBeenCalled();
    });

    it('lets the admin broadcast playback state', () => {
      currentUser.set({ id: 'admin-1' });
      loadRoom();

      service.updatePlayback(true, 120);

      expect(socketMock.emit).toHaveBeenCalledWith('playbackUpdate', {
        roomId: 'room-1',
        isPlaying: true,
        currentTime: 120,
      });
    });

    it('blocks playback and playlist actions for viewers on the client side', () => {
      loadRoom();

      service.updatePlayback(true, 120);
      service.addToPlaylist('https://youtu.be/abcdefghijk');
      service.selectVideo(1);
      service.removeFromPlaylist('p1');

      expect(socketMock.emit).not.toHaveBeenCalled();
    });
  });
});
