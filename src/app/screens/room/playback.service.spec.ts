import { TestBed } from '@angular/core/testing';
import { SocketService } from '../../core/services/socket.service';
import { FakeSocketService } from '../../testing/room-test-utils';
import { PlaybackService } from './playback.service';

const ECHO_WINDOW_MS = 300;

describe('PlaybackService', () => {
  let socket: FakeSocketService;
  let service: PlaybackService;

  beforeEach(() => {
    vi.useFakeTimers();
    socket = new FakeSocketService();
    TestBed.configureTestingModule({
      providers: [PlaybackService, { provide: SocketService, useValue: socket }],
    });
    service = TestBed.inject(PlaybackService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has no remote update yet', () => {
      expect(service.remoteUpdate()).toBeNull();
    });

    it('is not applying a remote update', () => {
      expect(service.isApplyingRemote).toBe(false);
    });

    it('subscribes to playbackUpdate on construction', () => {
      expect(socket.hasHandler('playbackUpdate')).toBe(true);
    });

    it('subscribes to roomState on construction', () => {
      expect(socket.hasHandler('roomState')).toBe(true);
    });
  });

  describe('applySnapshot', () => {
    it('publishes the snapshot as a remote update', () => {
      service.applySnapshot(true, 42);

      expect(service.remoteUpdate()).toEqual({ isPlaying: true, currentTime: 42 });
    });

    it('does not open the echo-suppression window', () => {
      service.applySnapshot(true, 42);

      expect(service.isApplyingRemote).toBe(false);
    });

    it('can be called repeatedly, keeping the latest value', () => {
      service.applySnapshot(true, 10);
      service.applySnapshot(false, 20);

      expect(service.remoteUpdate()).toEqual({ isPlaying: false, currentTime: 20 });
    });
  });

  describe('incoming playbackUpdate', () => {
    it('publishes the flat payload as a remote update', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 12.5 });

      expect(service.remoteUpdate()).toEqual({ isPlaying: true, currentTime: 12.5 });
    });

    it('opens the echo-suppression window', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 12.5 });

      expect(service.isApplyingRemote).toBe(true);
    });

    it('closes the window after the echo timeout', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 12.5 });
      vi.advanceTimersByTime(ECHO_WINDOW_MS);

      expect(service.isApplyingRemote).toBe(false);
    });

    it('keeps the window open just before the timeout elapses', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 12.5 });
      vi.advanceTimersByTime(ECHO_WINDOW_MS - 1);

      expect(service.isApplyingRemote).toBe(true);
    });

    it('keeps the remote update after the window closes', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 12.5 });
      vi.advanceTimersByTime(ECHO_WINDOW_MS);

      expect(service.remoteUpdate()).toEqual({ isPlaying: true, currentTime: 12.5 });
    });
  });

  describe('incoming roomState', () => {
    it('reads playback out of the nested snapshot', () => {
      socket.push('roomState', { state: { playback: { isPlaying: false, currentTime: 7 } } });

      expect(service.remoteUpdate()).toEqual({ isPlaying: false, currentTime: 7 });
    });

    it('opens the echo-suppression window like playbackUpdate does', () => {
      socket.push('roomState', { state: { playback: { isPlaying: false, currentTime: 7 } } });

      expect(service.isApplyingRemote).toBe(true);
    });
  });

  describe('reportLocal', () => {
    it('emits playbackUpdate with the local state', () => {
      service.reportLocal(true, 33);

      expect(socket.lastEmitOf('playbackUpdate')?.payload).toEqual({
        isPlaying: true,
        currentTime: 33,
      });
    });

    it('emits a paused state too', () => {
      service.reportLocal(false, 33);

      expect(socket.lastEmitOf('playbackUpdate')?.payload).toEqual({
        isPlaying: false,
        currentTime: 33,
      });
    });

    it('is suppressed while a remote update is being applied', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 5 });
      service.reportLocal(true, 5);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(0);
    });

    it('resumes emitting once the echo window closes', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 5 });
      vi.advanceTimersByTime(ECHO_WINDOW_MS);
      service.reportLocal(true, 6);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(1);
    });

    it('does not update the local remote-state signal', () => {
      service.reportLocal(true, 33);

      expect(service.remoteUpdate()).toBeNull();
    });

    it('emits every call while unsuppressed', () => {
      service.reportLocal(true, 1);
      service.reportLocal(true, 2);
      service.reportLocal(true, 3);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(3);
    });
  });

  describe('overlapping remote updates', () => {
    it('reopens the window on each remote update', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 1 });
      vi.advanceTimersByTime(200);
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 2 });

      expect(service.isApplyingRemote).toBe(true);
    });

    /**
     * Each remote update schedules its own independent timeout, so the FIRST
     * one closes the window even though a newer update just reopened it.
     * Documented as-is; see development-notes/room-test-findings.md.
     */
    it('closes the window on the oldest pending timeout, not the newest', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 1 });
      vi.advanceTimersByTime(200);
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 2 });
      vi.advanceTimersByTime(100);

      expect(service.isApplyingRemote).toBe(false);
    });

    it('lets a local report escape early because of that stale timeout', () => {
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 1 });
      vi.advanceTimersByTime(200);
      socket.push('playbackUpdate', { isPlaying: true, currentTime: 2 });
      vi.advanceTimersByTime(100);
      service.reportLocal(true, 2);

      expect(socket.emitsOf('playbackUpdate')).toHaveLength(1);
    });
  });
});
