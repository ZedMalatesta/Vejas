import { inject, Injectable, signal } from '@angular/core';
import { RoomChatMessage } from '../../models/room.model';
import { SocketService } from '../../core/services/socket.service';

/** Scoped per room via the Room component's providers. */
@Injectable()
export class ChatService {
  private readonly socket = inject(SocketService);

  readonly messages = signal<RoomChatMessage[]>([]);

  constructor() {
    this.socket.on<{ state: { messages: RoomChatMessage[] } }>('roomState', ({ state }) => {
      this.messages.set(state.messages);
    });

    this.socket.on<RoomChatMessage>('chatMessage', (message) => {
      this.messages.update((list) => [...list, message]);
    });
  }

  applySnapshot(messages: RoomChatMessage[]): void {
    this.messages.set(messages);
  }

  /** Author is resolved server-side from the authenticated socket, not sent by the client. */
  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.socket.emit('chatMessage', { text: trimmed });
  }
}
