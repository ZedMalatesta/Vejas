import { Component, computed, effect, inject, ChangeDetectionStrategy, signal, viewChild, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VideoPlayer, PlayerStateChange } from '../../shared/video-player/video-player';
import { LinkInput } from '../../shared/link-input/link-input';
import { Playlist } from '../../shared/playlist/playlist';
import { Chat } from '../../shared/chat/chat';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { Bookmarks } from './components/bookmarks/bookmarks';
import { BookmarkService } from './services/bookmark.service';
import { PlaylistService } from './playlist.service';
import { ChatService } from './chat.service';
import { PlaybackService } from './playback.service';
import { SocketService } from '../../core/services/socket.service';
import { RoomsService } from '../../core/services/rooms/rooms.service';
import { AuthService } from '../../core/services/auth.service';
import { ViewersPipe } from '../../core/pipes/viewers-pipe';
import { APP_BRAND } from '../../core/brand';
import { shouldSeek } from '../../utils/playback-sync';
import type { Room as RoomModel } from '../../models/room.model';

const HEARTBEAT_MS = 5000;

@Component({
  selector: 'app-room',
  imports: [VideoPlayer, LinkInput, Playlist, Chat, RouterLink, ViewersPipe, Header, Footer, Bookmarks],
  templateUrl: './room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './room.scss',
  providers: [SocketService, PlaylistService, ChatService, PlaybackService],
})
export class Room implements OnInit, OnDestroy {
  protected readonly brand = inject(APP_BRAND);
  protected readonly playlist = inject(PlaylistService);
  protected readonly bookmarkService = inject(BookmarkService);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<'not-found' | 'failed' | null>(null);
  protected readonly room = signal<RoomModel | null>(null);

  protected readonly isAdmin = computed(() => {
    const room = this.room();
    const user = this.auth.user();
    return !!room && !!user && room.adminId === user.id;
  });

  protected readonly canControl = computed(
    () => this.isAdmin() || !!this.room()?.allowGuestControl
  );

  private readonly route = inject(ActivatedRoute);
  private readonly rooms = inject(RoomsService);
  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  private readonly playback = inject(PlaybackService);
  private readonly player = viewChild(VideoPlayer);
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const state = this.playback.remoteUpdate();
      const player = this.player();
      if (!state || !player?.ready()) return;

      if (shouldSeek(player.currentTime(), state.currentTime)) {
        player.seekTo(state.currentTime);
      }
      if (state.isPlaying && !player.isPlaying()) {
        player.play();
      } else if (!state.isPlaying && player.isPlaying()) {
        player.pause();
      }
    });

    effect(() => {
      if (this.canControl()) {
        this.startHeartbeat();
      } else {
        this.stopHeartbeat();
      }
    });
  }

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.bookmarkService.setRoom(roomId);

    this.rooms.getRoom(roomId).subscribe({
      next: ({ state, ...room }) => {
        this.room.set(room);
        this.chat.applySnapshot(state.messages);
        this.playlist.applySnapshot(state.playlist, state.currentIndex);
        this.playback.applySnapshot(state.playback.isPlaying, state.playback.currentTime);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.status === 404 ? 'not-found' : 'failed');
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
  }

  onPlayerState({ isPlaying, currentTime }: PlayerStateChange): void {
    this.playback.reportLocal(isPlaying, currentTime);
  }

  addBookmark(): void {
    const player = this.player();
    if (!player) return;
    this.bookmarkService.addBookmark(
      `Bookmark ${this.bookmarkService.count() + 1}`,
      player.currentTime(),
    );
  }

  seekToBookmark(time: number): void {
    this.player()?.seekTo(time);
  }

  private startHeartbeat(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      const player = this.player();
      if (player?.ready() && player.isPlaying()) {
        this.playback.reportLocal(true, player.currentTime());
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }
}
