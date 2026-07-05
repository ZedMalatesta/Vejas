/* eslint-disable @typescript-eslint/no-unused-vars -- TDD skeleton, remove with implementation */
import { computed, Injectable, signal } from '@angular/core';
import {
  PlaybackState,
  PlaylistItemDto,
  RoomChatMessage,
  RoomWithState,
} from '../../models/room.model';

export type RoomSessionError = 'not-found' | 'failed' | null;

/**
 * Holds all realtime state of one room screen: HTTP snapshot + socket sync.
 * Provided at the Room component level (one instance per visited room).
 */
@Injectable()
export class RoomSessionService {
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

  readonly isAdmin = computed(() => false); // TODO(TDD): implement

  load(_roomId: string): void {
    // TODO(TDD): implement — HTTP fetch + socket join + subscriptions
  }

  leave(): void {
    // TODO(TDD): implement
  }

  sendMessage(_text: string): void {
    // TODO(TDD): implement
  }

  addToPlaylist(_url: string): void {
    // TODO(TDD): implement (admin only)
  }

  selectVideo(_index: number): void {
    // TODO(TDD): implement (admin only)
  }

  removeFromPlaylist(_itemId: string): void {
    // TODO(TDD): implement (admin only)
  }

  updatePlayback(_isPlaying: boolean, _currentTime: number): void {
    // TODO(TDD): implement (admin only)
  }
}
