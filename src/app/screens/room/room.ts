import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chat } from '../../shared/chat/chat';
import { Footer } from '../../shared/footer/footer';
import { Header } from '../../shared/header/header';
import { LinkInput } from '../../shared/link-input/link-input';
import { Playlist } from '../../shared/playlist/playlist';
import { PlayerStateChange, VideoPlayer } from '../../shared/video-player/video-player';
import { ViewersPipe } from '../../core/pipes/viewers-pipe';
import { shouldSeek } from '../../utils/playback-sync';
import { RoomSessionService } from './room-session.service';

const HEARTBEAT_MS = 5000;

@Component({
  selector: 'app-room',
  imports: [VideoPlayer, LinkInput, Playlist, Chat, RouterLink, ViewersPipe, Header, Footer],
  templateUrl: './room.html',
  styleUrl: './room.scss',
  providers: [RoomSessionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Room implements OnInit, OnDestroy {
  protected readonly session = inject(RoomSessionService);
  private readonly route = inject(ActivatedRoute);

  private readonly player = viewChild(VideoPlayer);
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Viewers follow the admin's playback state.
    effect(() => {
      const playback = this.session.playback();
      const player = this.player();
      if (!player?.ready() || this.session.isAdmin()) return;

      // Extrapolate the admin position: the snapshot was taken at updatedAt.
      const elapsed = playback.isPlaying
        ? (Date.now() - new Date(playback.updatedAt).getTime()) / 1000
        : 0;
      const targetTime = playback.currentTime + elapsed;

      if (shouldSeek(player.currentTime(), targetTime)) {
        player.seekTo(targetTime);
      }
      if (playback.isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    });
  }

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.session.load(roomId);
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.session.leave();
  }

  onPlayerState({ isPlaying, currentTime }: PlayerStateChange): void {
    this.session.updatePlayback(isPlaying, currentTime);

    if (isPlaying) {
      this.startHeartbeat();
    } else {
      this.stopHeartbeat();
    }
  }

  /** While the admin is playing, keep broadcasting the position so
   *  late joiners and drifted viewers stay in sync. */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      const player = this.player();
      if (player?.ready()) {
        this.session.updatePlayback(true, player.currentTime());
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
