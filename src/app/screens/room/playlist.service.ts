import { computed, inject, Injectable, signal } from '@angular/core';
import { PlaylistItem } from '../../shared/playlist/playlist-item.model';
import { extractVideoId } from '../../utils/extract-video-id';
import { SocketService } from '../../core/services/socket.service';

interface PlaylistStatePayload {
  playlist: PlaylistItem[];
  currentIndex: number;
}

/** Scoped per room via the Room component's providers. */
@Injectable()
export class PlaylistService {
  private readonly socket = inject(SocketService);

  readonly playlist = signal<PlaylistItem[]>([]);
  readonly currentIndex = signal<number>(0);

  readonly videoId = computed(
    () => this.playlist()[this.currentIndex()]?.videoId ?? ''
  );

  constructor() {
    const applyState = ({ playlist, currentIndex }: PlaylistStatePayload): void => {
      this.playlist.set(playlist);
      this.currentIndex.set(currentIndex);
    };

    this.socket.on<{ state: PlaylistStatePayload }>('roomState', ({ state }) => applyState(state));
    this.socket.on<PlaylistStatePayload>('playlistUpdate', applyState);
  }

  applySnapshot(playlist: PlaylistItem[], currentIndex: number): void {
    this.playlist.set(playlist);
    this.currentIndex.set(currentIndex);
  }

  add(url: string): void {
    const videoId = extractVideoId(url);
    if (!videoId) return;

    this.socket.emit('playlistAdd', { videoId, url });
  }

  select(index: number): void {
    this.socket.emit('playlistSelect', { index });
  }

  remove(id: string): void {
    this.socket.emit('playlistRemove', { id });
  }
}
