import {
  afterNextRender,
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
import { describeYtError, loadYouTubeApi, YtPlayer } from './youtube-api';

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
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly videoId = input.required<string>();
  /** Controllers drive playback; passive viewers get a muted, sync-driven player. */
  readonly canControl = input(false);

  readonly stateChange = output<PlayerStateChange>();

  readonly ready = signal(false);
  readonly playerError = signal('');
  /** True while the player is muted (passive viewers start muted so
   *  browsers allow the sync-driven autostart). */
  readonly muted = signal(false);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private player: YtPlayer | null = null;
  private playingStateCode = -2;
  private currentId = '';
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly onWindowResize = (): void => this.updateAvailableSize();

  constructor() {
    effect(() => {
      const id = this.videoId();
      const host = this.host();
      if (!id || !host || id === this.currentId) return;
      this.currentId = id;
      void this.showVideo(id, host.nativeElement);
    });

    // Measure how much of the viewport the 16:9 box may take instead of
    // guessing the page chrome height with a CSS constant. Re-measured
    // when the column resizes or surrounding content reflows (observing
    // the body catches chrome-height changes, e.g. a wrapping title).
    afterNextRender(() => {
      this.updateAvailableSize();
      this.resizeObserver = new ResizeObserver(() => this.updateAvailableSize());
      this.resizeObserver.observe(this.hostRef.nativeElement);
      this.resizeObserver.observe(document.body);
      window.addEventListener('resize', this.onWindowResize);
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

  isPlaying(): boolean {
    return this.player?.getPlayerState() === this.playingStateCode;
  }

  /** Called from a real user click, so the browser allows the sound. */
  unmute(): void {
    this.player?.unMute();
    this.muted.set(false);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.onWindowResize);
    this.player?.destroy();
    this.player = null;
  }

  /** Fit the whole 16:9 box on screen: cap its width so the height never
   *  exceeds the viewport space below the player's own top edge. */
  private updateAvailableSize(): void {
    const el = this.hostRef.nativeElement;
    // Position within the document, not the scrolled viewport — the cap
    // must not change while the user scrolls.
    const topInDocument = el.getBoundingClientRect().top + window.scrollY;
    const bottomGap = 16;
    const availableHeight = window.innerHeight - topInDocument - bottomGap;
    const maxWidth = Math.max(Math.round(availableHeight * (16 / 9)), 240);
    el.style.setProperty('--player-max-w', `${maxWidth}px`);
  }

  private async showVideo(videoId: string, hostElement: HTMLElement): Promise<void> {
    this.playerError.set('');

    if (this.player) {
      this.player.loadVideoById(videoId);
      return;
    }

    const yt = await loadYouTubeApi();
    if (this.destroyed) return;
    this.playingStateCode = yt.PlayerState.PLAYING;

    this.player = new yt.Player(hostElement, {
      videoId,
      // The API writes these onto the iframe it creates. Percentages keep
      // the iframe glued to .player-wrapper — component styles cannot
      // reach the iframe (it is created outside Angular's encapsulation).
      width: '100%',
      height: '100%',
      playerVars: {
        // Never autoplay: the admin starts playback with a real click
        // (browser gesture), viewers are driven by the sync effect.
        autoplay: 0,
        controls: this.canControl() ? this.config.controls : 0,
        rel: this.config.rel,
        modestbranding: this.config.modestbranding,
        fs: this.config.fs,
        origin: location.origin,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          // Muted playback keeps browser autoplay policies from blocking
          // the sync-driven start for viewers. They unmute with the
          // dedicated button (a real gesture), since controls are hidden.
          if (!this.canControl()) {
            this.player?.mute();
            this.muted.set(true);
          }
          this.ready.set(true);
        },
        onStateChange: (event) => {
          if (!this.canControl() || !this.player) return;
          if (event.data === yt.PlayerState.PLAYING) {
            this.stateChange.emit({ isPlaying: true, currentTime: this.currentTime() });
          } else if (
            event.data === yt.PlayerState.PAUSED ||
            event.data === yt.PlayerState.ENDED
          ) {
            this.stateChange.emit({ isPlaying: false, currentTime: this.currentTime() });
          }
        },
        onError: (event) => {
          this.playerError.set(describeYtError(event.data));
        },
      },
    });
  }
}
