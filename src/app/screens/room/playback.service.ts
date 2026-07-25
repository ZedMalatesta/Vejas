import { inject, Injectable, signal } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
}

@Injectable()
export class PlaybackService {
  private readonly socket = inject(SocketService);

  readonly remoteUpdate = signal<PlaybackState | null>(null);

  isApplyingRemote = false;

  constructor() {
    this.socket.on<PlaybackState>('playbackUpdate', (state) => {
      this.applyRemote(state);
    });

    this.socket.on<{ state: { playback: PlaybackState } }>('roomState', ({ state }) => {
      this.applyRemote(state.playback);
    });
  }

  applySnapshot(isPlaying: boolean, currentTime: number): void {
    this.remoteUpdate.set({ isPlaying, currentTime });
  }

  reportLocal(isPlaying: boolean, currentTime: number): void {
    if (this.isApplyingRemote) return;
    this.socket.emit('playbackUpdate', { isPlaying, currentTime });
  }

  private applyRemote(state: PlaybackState): void {
    this.isApplyingRemote = true;
    this.remoteUpdate.set(state);
    setTimeout(() => {
      this.isApplyingRemote = false;
    }, 300);
  }
}
