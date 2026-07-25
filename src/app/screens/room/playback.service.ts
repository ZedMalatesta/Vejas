import { inject, Injectable, signal } from '@angular/core';
import { SocketService } from '../../core/services/socket.service';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
}

/** Scoped per room via the Room component's providers. */
@Injectable()
export class PlaybackService {
  private readonly socket = inject(SocketService);

  readonly remoteUpdate = signal<PlaybackState | null>(null);

  // Set while programmatically driving the player so local stateChange events
  // triggered by our own seek/play/pause calls are not echoed back to the server.
  isApplyingRemote = false;

  constructor() {
    this.socket.on<PlaybackState>('playbackUpdate', (state) => {
      this.applyRemote(state);
    });

    // joinRoom's ack nests the room's full live state under `state.playback`
    // (alongside playlist/currentIndex/messages and the room's own fields at
    // the top level) -- unlike playbackUpdate, which is just the flat
    // { isPlaying, currentTime }.
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
