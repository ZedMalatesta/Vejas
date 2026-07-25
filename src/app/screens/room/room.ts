import {ChangeDetectionStrategy, Component, effect, inject, OnDestroy, OnInit, viewChild,} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Chat} from '../../shared/chat/chat';
import {Header} from '../../shared/header/header';
import {LinkInput} from '../../shared/link-input/link-input';
import {Playlist} from '../../shared/playlist/playlist';
import {PlayerStateChange, VideoPlayer} from '../../shared/video-player/video-player';
import {ViewersPipe} from '../../core/pipes/viewers-pipe';
import {shouldSeek} from '../../utils/playback-sync';
import {RoomSessionService} from './room-session.service';
import {APP_BRAND} from '../../core/brand';
import {Bookmarks} from './components/bookmarks/bookmarks';
import {BookmarkService} from './services/bookmark.service';
import {Footer} from "../../shared/footer/footer";

const HEARTBEAT_MS = 5000;
/** Player events fired within this window after a programmatic remote
 *  apply are echoes, not user actions — they must not be re-broadcast. */
const REMOTE_ECHO_WINDOW_MS = 1200;

@Component({
  selector: 'app-room',
  imports: [VideoPlayer, LinkInput, Playlist, Chat, RouterLink, ViewersPipe, Header, Footer, Bookmarks],
  templateUrl: './room.html',
  styleUrl: './room.scss',
  providers: [RoomSessionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Room implements OnInit, OnDestroy {
  protected readonly brand = inject(APP_BRAND);
  protected readonly session = inject(RoomSessionService);
  protected readonly bookmarkService = inject(BookmarkService);
  private readonly route = inject(ActivatedRoute);
  private readonly player = viewChild(VideoPlayer);
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastRemoteApplyAt = 0;

  constructor() {
    // Everyone follows broadcast playback state. The server never echoes
    // an update back to its sender, so applying it here is always
    // "someone else changed playback" — including the host receiving
    // a viewer's pause in guest-control rooms.
    effect(() => {
      const playback = this.session.playback();
      const player = this.player();
      if (!player?.ready()) return;

      // Extrapolate the position: the snapshot was taken at updatedAt.
      const elapsed = playback.isPlaying
        ? (Date.now() - new Date(playback.updatedAt).getTime()) / 1000
        : 0;
      const targetTime = playback.currentTime + elapsed;

      // Only touch the player when reality differs from the target.
      // Blind pause() on a freshly cued (never started) player throws
      // YouTube into an "unstarted+paused" black screen.
      let applied = false;
      if (playback.isPlaying) {
        if (shouldSeek(player.currentTime(), targetTime)) {
          player.seekTo(targetTime);
          applied = true;
        }
        if (!player.isPlaying()) {
          player.play();
          applied = true;
        }
      } else if (player.isPlaying()) {
        player.pause();
        applied = true;
      }

      if (applied) {
        this.lastRemoteApplyAt = Date.now();
      }
    });

    // While a controller's video actually plays, keep broadcasting the
    // position so late joiners and drifted viewers stay in sync.
    effect(() => {
      if (this.session.canControl()) {
        this.startHeartbeat();
      } else {
        this.stopHeartbeat();
      }
    });
  }

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.session.load(roomId);
    this.bookmarkService.setRoom(roomId);
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.session.leave();
  }

  onPlayerState({isPlaying, currentTime}: PlayerStateChange): void {
    // A state change right after a remote apply is our own player
    // reacting to that apply — re-broadcasting it would ping-pong
    // play/pause between clients.
    if (Date.now() - this.lastRemoteApplyAt < REMOTE_ECHO_WINDOW_MS) {
      return;
    }
    this.session.updatePlayback(isPlaying, currentTime);
  }

  addBookmark(): void {
    const player = this.player();

    if (!player) {
      return;
    }

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
      // Only report reality: a paused player must not broadcast
      // isPlaying=true and resume everyone else.
      if (player?.ready() && player.isPlaying()) {
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
