import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { APP_BRAND } from '../../core/brand';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthUser } from '../../models/auth.model';
import { RoomWithState } from '../../models/room.model';
import { LinkInput } from '../../shared/link-input/link-input';
import { Playlist } from '../../shared/playlist/playlist';
import { VideoPlayer } from '../../shared/video-player/video-player';
import {
  FakeSocketService,
  installLocalStorageStub,
  makeChatMessage,
  makePlaylistItem,
  makeRoomWithState,
} from '../../testing/room-test-utils';
import { ChatService } from './chat.service';
import { PlaybackService } from './playback.service';
import { PlaylistService } from './playlist.service';
import { Room } from './room';
import { BookmarkService } from './services/bookmark.service';

const HEARTBEAT_MS = 5000;
const ECHO_WINDOW_MS = 300;

/** A scriptable stand-in for the YouTube IFrame player. */
class FakeYtPlayer {
  static last: FakeYtPlayer | null = null;

  currentTime = 0;
  state = 2;
  readonly seeks: number[] = [];
  readonly calls: string[] = [];
  destroyed = false;

  constructor(readonly emitStateChange: (event: { data: number }) => void) {
    FakeYtPlayer.last = this;
  }

  loadVideoById(): void {
    this.calls.push('loadVideoById');
  }
  cueVideoById(): void {
    this.calls.push('cueVideoById');
  }
  playVideo(): void {
    this.calls.push('play');
    this.state = 1;
  }
  pauseVideo(): void {
    this.calls.push('pause');
    this.state = 2;
  }
  seekTo(seconds: number): void {
    this.seeks.push(seconds);
    this.currentTime = seconds;
  }
  getCurrentTime(): number {
    return this.currentTime;
  }
  getPlayerState(): number {
    return this.state;
  }
  mute(): void {
    this.calls.push('mute');
  }
  unMute(): void {
    this.calls.push('unMute');
  }
  destroy(): void {
    this.destroyed = true;
  }
}

interface FakePlayerOptions {
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
  };
}

function FakePlayerConstructor(_host: HTMLElement, options: FakePlayerOptions): FakeYtPlayer {
  const player = new FakeYtPlayer(options.events.onStateChange);
  // The real API fires onReady asynchronously, after the constructor returned.
  void Promise.resolve().then(() => options.events.onReady());
  return player;
}

/**
 * `loadYouTubeApi()` resolves immediately when `window.YT` is already present,
 * so seeding it here keeps the real VideoPlayer in the tree without loading
 * the remote IFrame API. One stable namespace object, because the loader
 * memoises whatever it resolved first.
 */
const FAKE_YT_NAMESPACE = {
  PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
  Player: FakePlayerConstructor,
};

const ADMIN: AuthUser = { id: 'admin-1', login: 'alex', isGuest: false };
const GUEST: AuthUser = { id: 'guest-9', login: 'sam', isGuest: true };

/** Drains pending microtasks without touching (possibly faked) timers. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('Room (integration)', () => {
  let socket: FakeSocketService;
  let http: HttpTestingController | undefined;
  let fixture: ComponentFixture<Room>;
  let component: Room;

  async function setup(options: { user?: AuthUser | null; roomId?: string } = {}): Promise<void> {
    const { user = ADMIN, roomId = 'room-1' } = options;

    installLocalStorageStub();
    socket = new FakeSocketService();
    FakeYtPlayer.last = null;

    await TestBed.configureTestingModule({
      imports: [Room],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_BRAND, useValue: { name: 'Vejas', logoUrl: '/logo.svg' } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: roomId }) } },
        },
        {
          provide: AuthService,
          useValue: { user: () => user, accessToken: () => 'token', signOut: () => undefined },
        },
      ],
    })
      // Only the socket transport is faked; the room's own services stay real,
      // which is what makes these integration rather than unit tests.
      .overrideComponent(Room, {
        set: {
          providers: [
            { provide: SocketService, useValue: socket },
            PlaylistService,
            ChatService,
            PlaybackService,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Room);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  }

  function flushRoom(response: RoomWithState = makeRoomWithState()): void {
    fixture.detectChanges();
    http!.expectOne(`${environment.apiUrl}/rooms/room-1`).flush(response);
    fixture.detectChanges();
  }

  function failRoom(status: number): void {
    fixture.detectChanges();
    http!
      .expectOne(`${environment.apiUrl}/rooms/room-1`)
      .flush({ message: 'nope' }, { status, statusText: 'Error' });
    fixture.detectChanges();
  }

  /** Loads a room that already has a video queued, so a player exists. */
  async function setupWithPlayer(
    options: { user?: AuthUser | null; allowGuestControl?: boolean } = {}
  ): Promise<FakeYtPlayer> {
    const { user = ADMIN, allowGuestControl = false } = options;
    await setup({ user });
    flushRoom(
      makeRoomWithState(
        { adminId: ADMIN.id, allowGuestControl },
        { playlist: [makePlaylistItem({ videoId: 'aaaaaaaaaaa' })] }
      )
    );
    await flushMicrotasks();
    fixture.detectChanges();
    return FakeYtPlayer.last!;
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    (window as unknown as { YT: unknown }).YT = FAKE_YT_NAMESPACE;
    // jsdom ships no layout engine, so the active-item directive has nothing to call.
    Element.prototype.scrollIntoView ??= function scrollIntoView(): void {};
  });

  afterEach(() => {
    http?.verify();
    http = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('loading and error states', () => {
    it('shows a loading state before the room resolves', async () => {
      await setup();
      fixture.detectChanges();

      expect(text()).toContain('Loading room...');
      http!.expectOne(`${environment.apiUrl}/rooms/room-1`).flush(makeRoomWithState());
    });

    it('requests the room named in the route', async () => {
      await setup({ roomId: 'room-1' });
      fixture.detectChanges();

      const request = http!.expectOne(`${environment.apiUrl}/rooms/room-1`);
      expect(request.request.method).toBe('GET');
      request.flush(makeRoomWithState());
    });

    it('renders the room name once loaded', async () => {
      await setup();
      flushRoom(makeRoomWithState({ name: 'Movie night' }));

      expect(text()).toContain('Movie night');
    });

    it('leaves the loading state once loaded', async () => {
      await setup();
      flushRoom();

      expect(text()).not.toContain('Loading room...');
    });

    it('renders a 404 message when the room is gone', async () => {
      await setup();
      failRoom(404);

      expect(text()).toContain('This room does not exist');
    });

    it('renders a generic message for other failures', async () => {
      await setup();
      failRoom(500);

      expect(text()).toContain('Could not load the room');
    });

    it('leaves the loading state on failure', async () => {
      await setup();
      failRoom(500);

      expect(text()).not.toContain('Loading room...');
    });

    it('does not render the player when loading failed', async () => {
      await setup();
      failRoom(404);

      expect(fixture.debugElement.query(By.directive(VideoPlayer))).toBeNull();
    });

    it('offers a way back to the room list after a failure', async () => {
      await setup();
      failRoom(404);

      expect(text()).toContain('Back to rooms');
    });
  });

  describe('room header', () => {
    it('marks the admin as the host', async () => {
      await setup({ user: ADMIN });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      expect(text()).toContain('You are the host');
    });

    it('names the host for a non-admin viewer', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id, adminName: 'Alex' }));

      expect(text()).toContain('Hosted by Alex');
    });

    it('shows the viewer count', async () => {
      await setup();
      flushRoom(makeRoomWithState({ viewersCount: 3 }));

      expect(text()).toContain('3 viewers');
    });

    it('treats a signed-out visitor as a non-admin', async () => {
      await setup({ user: null });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      expect(text()).toContain('Hosted by');
    });

    it('renders the singular form for a lone viewer', async () => {
      await setup();
      flushRoom(makeRoomWithState({ viewersCount: 1 }));

      expect(text()).toContain('1 viewer');
    });

    /**
     * Known gap, pinned so a fix shows up as a failure here: the gateway
     * broadcasts `viewersCount` on join/leave, but nothing on the client
     * subscribes, so the header keeps the number from the initial GET.
     * See development-notes/room-test-findings.md (finding 2).
     */
    it('ignores the viewersCount broadcast — known gap, see room-test-findings.md', async () => {
      await setup();
      flushRoom(makeRoomWithState({ viewersCount: 3 }));

      socket.push('viewersCount', { count: 12 });
      fixture.detectChanges();

      expect(text()).toContain('3 viewers');
      expect(text()).not.toContain('12 viewers');
    });
  });

  describe('snapshot application', () => {
    it('renders the chat messages from the snapshot', async () => {
      await setup();
      flushRoom(makeRoomWithState({}, { messages: [makeChatMessage({ text: 'from snapshot' })] }));

      expect(text()).toContain('from snapshot');
    });

    it('renders the playlist from the snapshot', async () => {
      await setup();
      flushRoom(
        makeRoomWithState({}, { playlist: [makePlaylistItem({ url: 'https://youtu.be/abc' })] })
      );

      expect(text()).toContain('https://youtu.be/abc');
    });

    it('reports the queued count', async () => {
      await setup();
      flushRoom(
        makeRoomWithState(
          {},
          { playlist: [makePlaylistItem({ id: 'a' }), makePlaylistItem({ id: 'b' })] }
        )
      );

      expect(text()).toContain('Queue (2)');
    });

    it('shows the empty-queue hint when nothing is queued', async () => {
      await setup();
      flushRoom();

      expect(text()).toContain('No videos queued');
    });

    it('scopes bookmarks to the room from the route', async () => {
      await setup({ roomId: 'room-1' });
      flushRoom();

      expect(TestBed.inject(BookmarkService).roomId()).toBe('room-1');
    });

    it('passes the current video to the player', async () => {
      await setup();
      flushRoom(makeRoomWithState({}, { playlist: [makePlaylistItem({ videoId: 'aaaaaaaaaaa' })] }));

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.videoId()).toBe('aaaaaaaaaaa');
    });

    it('honours a non-zero current index from the snapshot', async () => {
      await setup();
      flushRoom(
        makeRoomWithState(
          {},
          {
            playlist: [
              makePlaylistItem({ id: 'a', videoId: 'aaaaaaaaaaa' }),
              makePlaylistItem({ id: 'b', videoId: 'bbbbbbbbbbb' }),
            ],
            currentIndex: 1,
          }
        )
      );

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.videoId()).toBe('bbbbbbbbbbb');
    });
  });

  describe('permissions', () => {
    it('offers the link input to the admin', async () => {
      await setup({ user: ADMIN });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      expect(fixture.debugElement.query(By.directive(LinkInput))).not.toBeNull();
    });

    it('hides the link input from a guest', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      expect(fixture.debugElement.query(By.directive(LinkInput))).toBeNull();
    });

    it('lets the admin edit the playlist', async () => {
      await setup({ user: ADMIN });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      const playlist = fixture.debugElement.query(By.directive(Playlist));
      expect(playlist.componentInstance.canEdit()).toBe(true);
    });

    it('does not let a guest edit the playlist', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      const playlist = fixture.debugElement.query(By.directive(Playlist));
      expect(playlist.componentInstance.canEdit()).toBe(false);
    });

    it('gives the admin playback control', async () => {
      await setup({ user: ADMIN });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id, allowGuestControl: false }));

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.canControl()).toBe(true);
    });

    it('gives a guest playback control when the room allows it', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id, allowGuestControl: true }));

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.canControl()).toBe(true);
    });

    it('denies a guest playback control in a locked room', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id, allowGuestControl: false }));

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.canControl()).toBe(false);
    });

    it('keeps playlist editing admin-only even when guests may control playback', async () => {
      await setup({ user: GUEST });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id, allowGuestControl: true }));

      const playlist = fixture.debugElement.query(By.directive(Playlist));
      expect(playlist.componentInstance.canEdit()).toBe(false);
    });
  });

  describe('playlist interaction over the socket', () => {
    it('sends playlistAdd when the admin submits a link', async () => {
      await setup({ user: ADMIN });
      flushRoom(makeRoomWithState({ adminId: ADMIN.id }));

      fixture.debugElement
        .query(By.directive(LinkInput))
        .componentInstance.submit.emit('https://youtu.be/dQw4w9WgXcQ');

      expect(socket.lastEmitOf('playlistAdd')?.payload).toEqual({
        videoId: 'dQw4w9WgXcQ',
        url: 'https://youtu.be/dQw4w9WgXcQ',
      });
    });

    it('sends playlistSelect when an item is chosen', async () => {
      await setup();
      flushRoom(
        makeRoomWithState(
          {},
          { playlist: [makePlaylistItem({ id: 'a' }), makePlaylistItem({ id: 'b' })] }
        )
      );

      fixture.debugElement.query(By.directive(Playlist)).componentInstance.select.emit(1);

      expect(socket.lastEmitOf('playlistSelect')?.payload).toEqual({ index: 1 });
    });

    it('sends playlistRemove when an item is removed', async () => {
      await setup();
      flushRoom(makeRoomWithState({}, { playlist: [makePlaylistItem({ id: 'a' })] }));

      fixture.debugElement.query(By.directive(Playlist)).componentInstance.remove.emit('a');

      expect(socket.lastEmitOf('playlistRemove')?.payload).toEqual({ id: 'a' });
    });

    it('re-renders the queue when the server pushes playlistUpdate', async () => {
      await setup();
      flushRoom();

      socket.push('playlistUpdate', {
        playlist: [makePlaylistItem({ url: 'https://youtu.be/pushed' })],
        currentIndex: 0,
      });
      fixture.detectChanges();

      expect(text()).toContain('https://youtu.be/pushed');
    });

    it('switches the played video when the server moves the index', async () => {
      const playlist = [
        makePlaylistItem({ id: 'a', videoId: 'aaaaaaaaaaa' }),
        makePlaylistItem({ id: 'b', videoId: 'bbbbbbbbbbb' }),
      ];
      await setup();
      flushRoom(makeRoomWithState({}, { playlist }));

      socket.push('playlistUpdate', { playlist, currentIndex: 1 });
      fixture.detectChanges();

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.videoId()).toBe('bbbbbbbbbbb');
    });

    it('drops the video when the server empties the queue', async () => {
      await setup();
      flushRoom(makeRoomWithState({}, { playlist: [makePlaylistItem()] }));

      socket.push('playlistUpdate', { playlist: [], currentIndex: 0 });
      fixture.detectChanges();

      const player = fixture.debugElement.query(By.directive(VideoPlayer));
      expect(player.componentInstance.videoId()).toBe('');
    });
  });

  describe('chat interaction over the socket', () => {
    it('renders a chat message pushed by the server', async () => {
      await setup();
      flushRoom();

      socket.push('chatMessage', makeChatMessage({ id: 'live', text: 'live message' }));
      fixture.detectChanges();

      expect(text()).toContain('live message');
    });

    it('shows the message author', async () => {
      await setup();
      flushRoom();

      socket.push('chatMessage', makeChatMessage({ author: 'Sam', text: 'yo' }));
      fixture.detectChanges();

      expect(text()).toContain('Sam');
    });

    function typeMessage(value: string): void {
      const input = fixture.nativeElement.querySelector('.chat__input') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function submitChat(eventName: 'submit' | 'ngSubmit'): void {
      (fixture.nativeElement.querySelector('.chat__form') as HTMLFormElement).dispatchEvent(
        new Event(eventName)
      );
    }

    it('sends a typed message through the socket', async () => {
      await setup();
      flushRoom();
      typeMessage('hello room');

      submitChat('ngSubmit');

      expect(socket.lastEmitOf('chatMessage')?.payload).toEqual({ text: 'hello room' });
    });

    it('does not send an empty message', async () => {
      await setup();
      flushRoom();

      submitChat('ngSubmit');

      expect(socket.emitsOf('chatMessage')).toHaveLength(0);
    });

    it('clears the input after sending', async () => {
      await setup();
      flushRoom();
      typeMessage('hello room');

      submitChat('ngSubmit');
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('.chat__input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    /**
     * Known defect, pinned so a fix shows up as a failure here:
     * the chat <form> carries no [formGroup], so `(ngSubmit)` compiles to a
     * listener for a DOM event literally named "ngSubmit" instead of the
     * FormGroupDirective output. A real browser submit therefore never sends.
     * See development-notes/room-test-findings.md (finding 1).
     */
    it('ignores a native form submit — known defect, see room-test-findings.md', async () => {
      await setup();
      flushRoom();
      typeMessage('hello room');

      submitChat('submit');

      expect(socket.emitsOf('chatMessage')).toHaveLength(0);
    });

    it('keeps snapshot messages when a live one arrives', async () => {
      await setup();
      flushRoom(
        makeRoomWithState({}, { messages: [makeChatMessage({ id: 'old', text: 'older' })] })
      );

      socket.push('chatMessage', makeChatMessage({ id: 'new', text: 'newer' }));
      fixture.detectChanges();

      expect(text()).toContain('older');
      expect(text()).toContain('newer');
    });
  });

  describe('playback synchronisation', () => {
    it('creates the underlying player once a video is queued', async () => {
      const player = await setupWithPlayer();

      expect(player).toBeTruthy();
    });

    it('seeks when the remote position diverges beyond the threshold', async () => {
      const player = await setupWithPlayer();
      player.currentTime = 0;

      socket.push('playbackUpdate', { isPlaying: false, currentTime: 30 });
      fixture.detectChanges();

      expect(player.seeks).toContain(30);
    });

    it('does not seek for drift inside the tolerance', async () => {
      const player = await setupWithPlayer();
      player.currentTime = 10;

      socket.push('playbackUpdate', { isPlaying: false, currentTime: 11 });
      fixture.detectChanges();

      expect(player.seeks).toEqual([]);
    });

    it('starts playback when the remote state is playing', async () => {
      const player = await setupWithPlayer();
      player.state = 2;

      socket.push('playbackUpdate', { isPlaying: true, currentTime: 0 });
      fixture.detectChanges();

      expect(player.calls).toContain('play');
    });

    it('pauses when the remote state is paused', async () => {
      const player = await setupWithPlayer();
      player.state = 1;

      socket.push('playbackUpdate', { isPlaying: false, currentTime: 0 });
      fixture.detectChanges();

      expect(player.calls).toContain('pause');
    });

    it('does not re-issue play when already playing', async () => {
      const player = await setupWithPlayer();
      player.state = 1;

      socket.push('playbackUpdate', { isPlaying: true, currentTime: 0 });
      fixture.detectChanges();

      expect(player.calls.filter((call) => call === 'play')).toHaveLength(0);
    });

    it('applies the playback snapshot from the initial load', async () => {
      await setup();
      flushRoom(
        makeRoomWithState(
          {},
          {
            playlist: [makePlaylistItem()],
            playback: { isPlaying: false, currentTime: 90, updatedAt: '2026-07-05T10:00:00.000Z' },
          }
        )
      );
      await flushMicrotasks();
      fixture.detectChanges();

      expect(FakeYtPlayer.last?.seeks).toContain(90);
    });

    /**
     * Known gap, pinned so a fix shows up as a failure here: `applySnapshot`
     * publishes a remote state without opening the echo-suppression window,
     * so the player movement it causes on join is reported straight back.
     * See development-notes/room-test-findings.md (finding 4).
     */
    it('echoes the joining seek back to the server — known gap, see room-test-findings.md', async () => {
      await setup();
      flushRoom(
        makeRoomWithState(
          {},
          {
            playlist: [makePlaylistItem()],
            playback: { isPlaying: true, currentTime: 90, updatedAt: '2026-07-05T10:00:00.000Z' },
          }
        )
      );
      await flushMicrotasks();
      fixture.detectChanges();
      socket.reset();

      // What the player reports right after the join-driven seek.
      component.onPlayerState({ isPlaying: true, currentTime: 90 });

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(1);
    });

    it('forwards a local player state change to the server', async () => {
      await setupWithPlayer();
      socket.reset();

      component.onPlayerState({ isPlaying: true, currentTime: 12 });

      expect(socket.lastEmitOf('playbackUpdate')?.payload).toEqual({
        isPlaying: true,
        currentTime: 12,
      });
    });

    it('suppresses the echo of a remote update', async () => {
      vi.useFakeTimers();
      await setupWithPlayer();
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 0 });
      fixture.detectChanges();
      socket.reset();

      component.onPlayerState({ isPlaying: true, currentTime: 0 });

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(0);
    });

    it('reports local changes again once the echo window closes', async () => {
      vi.useFakeTimers();
      await setupWithPlayer();
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 0 });
      fixture.detectChanges();
      socket.reset();
      vi.advanceTimersByTime(ECHO_WINDOW_MS);

      component.onPlayerState({ isPlaying: true, currentTime: 1 });

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(1);
    });
  });

  describe('heartbeat', () => {
    it('broadcasts the position while a controller is playing', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: ADMIN });
      player.state = 1;
      player.currentTime = 40;
      socket.reset();

      vi.advanceTimersByTime(HEARTBEAT_MS);

      expect(socket.lastEmitOf('playbackUpdate')?.payload).toEqual({
        isPlaying: true,
        currentTime: 40,
      });
    });

    it('keeps broadcasting on every interval tick', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: ADMIN });
      player.state = 1;
      socket.reset();

      vi.advanceTimersByTime(HEARTBEAT_MS * 3);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(3);
    });

    it('stays silent while the player is paused', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: ADMIN });
      player.state = 2;
      socket.reset();

      vi.advanceTimersByTime(HEARTBEAT_MS * 3);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(0);
    });

    it('stays silent for a viewer without control', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: GUEST, allowGuestControl: false });
      player.state = 1;
      socket.reset();

      vi.advanceTimersByTime(HEARTBEAT_MS * 3);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(0);
    });

    it('runs for a guest once the room allows guest control', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: GUEST, allowGuestControl: true });
      player.state = 1;
      socket.reset();

      vi.advanceTimersByTime(HEARTBEAT_MS);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(1);
    });

    it('stops broadcasting after the component is destroyed', async () => {
      vi.useFakeTimers();
      const player = await setupWithPlayer({ user: ADMIN });
      player.state = 1;

      fixture.destroy();
      socket.reset();
      vi.advanceTimersByTime(HEARTBEAT_MS * 3);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(0);
    });
  });

  describe('bookmarks', () => {
    it('adds a bookmark at the current player position', async () => {
      const player = await setupWithPlayer();
      player.currentTime = 75;

      component.addBookmark();

      expect(TestBed.inject(BookmarkService).roomBookmarks()[0]).toMatchObject({
        roomId: 'room-1',
        time: 75,
      });
    });

    it('numbers new bookmarks sequentially', async () => {
      await setupWithPlayer();

      component.addBookmark();
      component.addBookmark();

      expect(
        TestBed.inject(BookmarkService)
          .roomBookmarks()
          .map((bookmark) => bookmark.title)
      ).toEqual(['Bookmark 1', 'Bookmark 2']);
    });

    it('renders an added bookmark', async () => {
      await setupWithPlayer();

      component.addBookmark();
      fixture.detectChanges();

      expect(text()).toContain('Bookmark 1');
    });

    it('seeks the player to a bookmark', async () => {
      const player = await setupWithPlayer();

      component.seekToBookmark(120);

      expect(player.seeks).toContain(120);
    });

    it('does not throw when seeking with no player mounted', async () => {
      await setup();
      failRoom(404);

      expect(() => component.seekToBookmark(120)).not.toThrow();
    });
  });
});
