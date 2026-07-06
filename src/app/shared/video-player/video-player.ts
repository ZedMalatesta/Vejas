import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { YOUTUBE_PLAYER_CONFIG } from './youtube-player-config.token';
import { loadYouTubeApi, YtPlayer } from './youtube-api';

export interface PlayerStateChange {
  isPlaying: boolean;
  currentTime: number;
}

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayer implements OnDestroy {
  private readonly config = inject(YOUTUBE_PLAYER_CONFIG);

  readonly videoId = input.required<string>();
  /** Admins control playback; viewers get a muted, sync-driven player. */
  readonly isAdmin = input(false);

  readonly stateChange = output<PlayerStateChange>();

  readonly ready = signal(false);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private player: YtPlayer | null = null;
  private currentId = '';
  private destroyed = false;

  constructor() {
    effect(() => {
      const id = this.videoId();
      const host = this.host();
      if (!id || !host || id === this.currentId) return;
      this.currentId = id;
      void this.showVideo(id, host.nativeElement);
    });
  }

  play(): void {
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seekTo(seconds: number): void {
    this.player?.seekTo(seconds, true);
  }

  currentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.player?.destroy();
    this.player = null;
  }

  private async showVideo(videoId: string, hostElement: HTMLElement): Promise<void> {
    if (this.player) {
      this.player.loadVideoById(videoId);
      return;
    }

    const yt = await loadYouTubeApi();
    if (this.destroyed) return;

    this.player = new yt.Player(hostElement, {
      videoId,
      playerVars: {
        autoplay: this.config.autoplay,
        controls: this.isAdmin() ? this.config.controls : 0,
        rel: this.config.rel,
        modestbranding: this.config.modestbranding,
        fs: this.config.fs,
        origin: location.origin,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          // Muted playback keeps browser autoplay policies from blocking
          // the sync-driven start for viewers.
          if (!this.isAdmin()) this.player?.mute();
          this.ready.set(true);
        },
        onStateChange: (event) => {
          if (!this.isAdmin() || !this.player) return;
          if (event.data === yt.PlayerState.PLAYING) {
            this.stateChange.emit({ isPlaying: true, currentTime: this.currentTime() });
          } else if (
            event.data === yt.PlayerState.PAUSED ||
            event.data === yt.PlayerState.ENDED
          ) {
            this.stateChange.emit({ isPlaying: false, currentTime: this.currentTime() });
          }
        },
      },
    });
  }
}
