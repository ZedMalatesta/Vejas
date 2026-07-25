import { Injectable } from '@nestjs/common';
import { PlaylistItem, RoomState } from './room.types';

@Injectable()
export class RoomStateService {
  private readonly rooms = new Map<string, RoomState>();

  getOrCreate(roomId: string): RoomState {
    let state = this.rooms.get(roomId);
    if (!state) {
      state = {
        playlist: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        messages: [],
      };
      this.rooms.set(roomId, state);
    }
    return state;
  }

  setPlayback(roomId: string, isPlaying: boolean, currentTime: number): void {
    const state = this.getOrCreate(roomId);
    state.isPlaying = isPlaying;
    state.currentTime = currentTime;
  }

  addMessage(roomId: string, author: string, text: string) {
    const state = this.getOrCreate(roomId);
    const message = {
      id: crypto.randomUUID(),
      author,
      text: text.trim(),
      sentAt: new Date().toISOString(),
    };
    state.messages.push(message);
    return message;
  }

  addPlaylistItem(roomId: string, videoId: string, url: string) {
    const state = this.getOrCreate(roomId);
    const item: PlaylistItem = { id: crypto.randomUUID(), videoId, url };
    state.playlist.push(item);
    if (state.playlist.length === 1) {
      state.currentIndex = 0;
    }
    return state;
  }

  selectPlaylistItem(roomId: string, index: number): RoomState {
    const state = this.getOrCreate(roomId);
    if (index >= 0 && index < state.playlist.length) {
      state.currentIndex = index;
    }
    return state;
  }

  removePlaylistItem(roomId: string, id: string): RoomState {
    const state = this.getOrCreate(roomId);
    const index = state.playlist.findIndex((item) => item.id === id);
    if (index === -1) return state;

    state.playlist = state.playlist.filter((item) => item.id !== id);
    if (index < state.currentIndex) {
      state.currentIndex -= 1;
    } else if (index === state.currentIndex) {
      state.currentIndex = Math.min(
        state.currentIndex,
        state.playlist.length - 1,
      );
    }
    return state;
  }
}
