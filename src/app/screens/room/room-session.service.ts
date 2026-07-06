import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { RoomsService } from '../../core/services/rooms/rooms.service';
import { SocketService } from '../../core/services/socket/socket.service';
import {
  PlaybackState,
  PlaylistItemDto,
  RoomChatMessage,
  RoomState,
  RoomWithState,
} from '../../models/room.model';
import { extractVideoId } from '../../utils/extract-video-id';

export type RoomSessionError = 'not-found' | 'failed' | null;

interface PlaylistUpdate {
  playlist: PlaylistItemDto[];
  currentIndex: number;
}

/**
 * Holds all realtime state of one room screen: HTTP snapshot + socket sync.
 * Provided at the Room component level (one instance per visited room).
 */
@Injectable()
export class RoomSessionService {
  private readonly roomsService = inject(RoomsService);
  private readonly socket = inject(SocketService);
  private readonly auth = inject(AuthService);

  readonly room = signal<RoomWithState | null>(null);
  readonly loading = signal(true);
  readonly error = signal<RoomSessionError>(null);

  readonly playlist = signal<PlaylistItemDto[]>([]);
  readonly currentIndex = signal(0);
  readonly playback = signal<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    updatedAt: new Date(0).toISOString(),
  });
  readonly messages = signal<RoomChatMessage[]>([]);
  readonly viewersCount = signal(0);

  readonly currentVideoId = computed(
    () => this.playlist()[this.currentIndex()]?.videoId ?? ''
  );

  readonly isAdmin = computed(() => {
    const room = this.room();
    const user = this.auth.user();
    return !!room && !!user && room.adminId === user.id;
  });

  /** Playback control: the admin always, everyone if the room allows it. */
  readonly canControl = computed(
    () => this.isAdmin() || !!this.room()?.allowGuestControl
  );

  private roomId = '';

  constructor() {
    this.socket
      .on<RoomChatMessage>('chatMessage')
      .pipe(takeUntilDestroyed())
      .subscribe((message) => this.messages.update((list) => [...list, message]));

    this.socket
      .on<Pick<PlaybackState, 'isPlaying' | 'currentTime'>>('playbackUpdate')
      .pipe(takeUntilDestroyed())
      .subscribe(({ isPlaying, currentTime }) =>
        this.playback.set({
          isPlaying,
          currentTime,
          updatedAt: new Date().toISOString(),
        })
      );

    this.socket
      .on<PlaylistUpdate>('playlistUpdate')
      .pipe(takeUntilDestroyed())
      .subscribe(({ playlist, currentIndex }) => {
        this.playlist.set(playlist);
        this.currentIndex.set(currentIndex);
      });

    this.socket
      .on<{ count: number }>('viewersCount')
      .pipe(takeUntilDestroyed())
      .subscribe(({ count }) => this.viewersCount.set(count));

    this.socket
      .on<RoomWithState>('roomState')
      .pipe(takeUntilDestroyed())
      .subscribe((room) => this.applySnapshot(room));
  }

  load(roomId: string): void {
    this.roomId = roomId;
    this.loading.set(true);
    this.error.set(null);

    this.roomsService.getRoom(roomId).subscribe({
      next: (room) => {
        this.applySnapshot(room);
        this.loading.set(false);

        this.socket.connect(this.auth.accessToken?.() ?? '');
        this.socket.joinRoom(roomId);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 404 ? 'not-found' : 'failed');
      },
    });
  }

  leave(): void {
    this.socket.emit('leaveRoom', { roomId: this.roomId });
  }

  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.socket.emit('chatMessage', { roomId: this.roomId, text: trimmed });
  }

  addToPlaylist(url: string): void {
    if (!this.isAdmin()) return;
    const videoId = extractVideoId(url);
    if (!videoId) return;
    this.socket.emit('playlistAdd', { roomId: this.roomId, videoId, url });
  }

  selectVideo(index: number): void {
    if (!this.isAdmin()) return;
    this.socket.emit('playlistSelect', { roomId: this.roomId, index });
  }

  removeFromPlaylist(itemId: string): void {
    if (!this.isAdmin()) return;
    this.socket.emit('playlistRemove', { roomId: this.roomId, id: itemId });
  }

  updatePlayback(isPlaying: boolean, currentTime: number): void {
    if (!this.canControl()) return;
    this.socket.emit('playbackUpdate', {
      roomId: this.roomId,
      isPlaying,
      currentTime,
    });
  }

  private applySnapshot(room: RoomWithState): void {
    this.room.set(room);
    this.applyState(room.state);
    this.viewersCount.set(room.viewersCount);
  }

  private applyState(state: RoomState): void {
    this.playlist.set(state.playlist);
    this.currentIndex.set(state.currentIndex);
    this.playback.set(state.playback);
    this.messages.set(state.messages);
  }
}
