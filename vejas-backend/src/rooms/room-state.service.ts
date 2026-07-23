import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  ChatMessage,
  PlaylistItem,
  RoomLiveState,
} from './room.types';

const MESSAGES_KEPT_FOR_NEWCOMERS = 50;

const emptyState = (): Omit<RoomLiveState, 'messages'> => ({
  playlist: [],
  currentIndex: 0,
  playback: {
    isPlaying: false,
    currentTime: 0,
    updatedAt: new Date(0).toISOString(),
  },
});

/**
 * Live room state in Redis:
 *  - `room:{id}:state`    JSON of playlist/currentIndex/playback
 *  - `room:{id}:messages` list of the last 50 chat messages (newcomer context)
 *  - `room:{id}:viewers`  current viewer count
 */
@Injectable()
export class RoomStateService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getState(roomId: string): Promise<RoomLiveState> {
    const [stateJson, messageJsons] = await Promise.all([
      this.redis.get(this.stateKey(roomId)),
      this.redis.lrange(this.messagesKey(roomId), 0, -1),
    ]);

    const base = stateJson
      ? (JSON.parse(stateJson) as Omit<RoomLiveState, 'messages'>)
      : emptyState();

    return {
      ...base,
      messages: messageJsons.map((json) => JSON.parse(json) as ChatMessage),
    };
  }

  async setPlayback(
    roomId: string,
    isPlaying: boolean,
    currentTime: number,
  ): Promise<void> {
    const state = await this.baseState(roomId);
    state.playback = {
      isPlaying,
      currentTime,
      updatedAt: new Date().toISOString(),
    };
    await this.saveBase(roomId, state);
  }

  async addMessage(
    roomId: string,
    authorId: string,
    author: string,
    text: string,
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      authorId,
      author,
      text: text.trim(),
      sentAt: new Date().toISOString(),
    };

    await this.redis
      .multi()
      .rpush(this.messagesKey(roomId), JSON.stringify(message))
      .ltrim(this.messagesKey(roomId), -MESSAGES_KEPT_FOR_NEWCOMERS, -1)
      .exec();

    return message;
  }

  async addPlaylistItem(
    roomId: string,
    videoId: string,
    url: string,
  ): Promise<RoomLiveState> {
    const state = await this.baseState(roomId);
    const item: PlaylistItem = { id: randomUUID(), videoId, url };
    state.playlist.push(item);
    if (state.playlist.length === 1) {
      state.currentIndex = 0;
    }
    await this.saveBase(roomId, state);
    return this.getState(roomId);
  }

  async selectPlaylistItem(
    roomId: string,
    index: number,
  ): Promise<RoomLiveState> {
    const state = await this.baseState(roomId);
    if (index >= 0 && index < state.playlist.length) {
      state.currentIndex = index;
      await this.saveBase(roomId, state);
    }
    return this.getState(roomId);
  }

  async removePlaylistItem(
    roomId: string,
    itemId: string,
  ): Promise<RoomLiveState> {
    const state = await this.baseState(roomId);
    const index = state.playlist.findIndex((item) => item.id === itemId);
    if (index === -1) return this.getState(roomId);

    state.playlist = state.playlist.filter((item) => item.id !== itemId);
    if (index < state.currentIndex) {
      state.currentIndex -= 1;
    } else if (index === state.currentIndex) {
      state.currentIndex = Math.max(
        0,
        Math.min(state.currentIndex, state.playlist.length - 1),
      );
    }
    await this.saveBase(roomId, state);
    return this.getState(roomId);
  }

  async setViewersCount(roomId: string, count: number): Promise<void> {
    await this.redis.set(this.viewersKey(roomId), String(count));
  }

  async getViewersCount(roomId: string): Promise<number> {
    const value = await this.redis.get(this.viewersKey(roomId));
    return value ? parseInt(value, 10) : 0;
  }

  async clear(roomId: string): Promise<void> {
    await this.redis.del(
      this.stateKey(roomId),
      this.messagesKey(roomId),
      this.viewersKey(roomId),
    );
  }

  private async baseState(
    roomId: string,
  ): Promise<Omit<RoomLiveState, 'messages'>> {
    const json = await this.redis.get(this.stateKey(roomId));
    return json
      ? (JSON.parse(json) as Omit<RoomLiveState, 'messages'>)
      : emptyState();
  }

  private async saveBase(
    roomId: string,
    state: Omit<RoomLiveState, 'messages'>,
  ): Promise<void> {
    await this.redis.set(this.stateKey(roomId), JSON.stringify(state));
  }

  private stateKey(roomId: string): string {
    return `room:${roomId}:state`;
  }

  private messagesKey(roomId: string): string {
    return `room:${roomId}:messages`;
  }

  private viewersKey(roomId: string): string {
    return `room:${roomId}:viewers`;
  }
}
