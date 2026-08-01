import { Injectable, OnDestroy } from '@angular/core';
import { PlaylistItem } from '../shared/playlist/playlist-item.model';
import { Room, RoomChatMessage, RoomWithState } from '../models/room.model';

export interface EmittedEvent {
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Stands in for SocketService: records outgoing emits and lets a test push
 * server events into the handlers the services registered.
 */
@Injectable()
export class FakeSocketService implements OnDestroy {
  readonly emitted: EmittedEvent[] = [];
  readonly disconnected = { count: 0 };

  private readonly handlers = new Map<string, ((payload: unknown) => void)[]>();

  emit(event: string, payload: Record<string, unknown> = {}): void {
    this.emitted.push({ event, payload });
  }

  on<T>(event: string, callback: (payload: T) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(callback as (payload: unknown) => void);
    this.handlers.set(event, list);
  }

  off(event: string): void {
    this.handlers.delete(event);
  }

  ngOnDestroy(): void {
    this.disconnected.count += 1;
  }

  /** Simulate the server pushing an event to this client. */
  push<T>(event: string, payload: T): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload);
    }
  }

  hasHandler(event: string): boolean {
    return (this.handlers.get(event) ?? []).length > 0;
  }

  emitsOf(event: string): EmittedEvent[] {
    return this.emitted.filter((entry) => entry.event === event);
  }

  lastEmitOf(event: string): EmittedEvent | undefined {
    return this.emitsOf(event).at(-1);
  }

  reset(): void {
    this.emitted.length = 0;
  }
}

/** Node 25 exposes a non-functional `localStorage` global that shadows jsdom's. */
export function installLocalStorageStub(seed: Record<string, string> = {}): Map<string, string> {
  const store = new Map<string, string>(Object.entries(seed));

  const stub: Storage = {
    get length(): number {
      return store.size;
    },
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => [...store.keys()][index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key);
    },
    setItem: (key: string, value: string): void => {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: stub,
    configurable: true,
    writable: true,
  });

  return store;
}

export function makePlaylistItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'item-1',
    videoId: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ...overrides,
  };
}

export function makeChatMessage(overrides: Partial<RoomChatMessage> = {}): RoomChatMessage {
  return {
    id: 'msg-1',
    authorId: 'user-1',
    author: 'Alex',
    text: 'hello',
    sentAt: '2026-07-05T10:00:00.000Z',
    ...overrides,
  };
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Movie night',
    description: 'Chill',
    coverUrl: null,
    adminId: 'admin-1',
    adminName: 'Alex',
    allowGuestControl: false,
    createdAt: '2026-07-05T10:00:00.000Z',
    viewersCount: 3,
    ...overrides,
  };
}

export function makeRoomWithState(
  room: Partial<Room> = {},
  state: Partial<RoomWithState['state']> = {}
): RoomWithState {
  return {
    ...makeRoom(room),
    state: {
      playlist: [],
      currentIndex: 0,
      playback: { isPlaying: false, currentTime: 0, updatedAt: '2026-07-05T10:00:00.000Z' },
      messages: [],
      ...state,
    },
  };
}
