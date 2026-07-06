import { Injectable, signal } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

interface SocketEvent {
  event: string;
  payload: unknown;
}

/**
 * Thin wrapper over socket.io-client so components/services never touch
 * the raw socket. Connects lazily with our JWT access token.
 *
 * Events are routed through an internal stream, so `on()` subscriptions
 * made before `connect()` still receive everything once connected.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly connected = signal(false);

  private socket: Socket | null = null;
  private readonly events$ = new Subject<SocketEvent>();

  connect(token: string): void {
    if (this.socket) {
      return;
    }

    this.socket = io(environment.socketUrl, { auth: { token } });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.onAny((event: string, payload: unknown) =>
      this.events$.next({ event, payload })
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  joinRoom(roomId: string): void {
    this.emit('joinRoom', { roomId });
  }

  emit(event: string, payload: Record<string, unknown> = {}): void {
    this.socket?.emit(event, payload);
  }

  on<T>(event: string): Observable<T> {
    return this.events$.pipe(
      filter((socketEvent) => socketEvent.event === event),
      map((socketEvent) => socketEvent.payload as T)
    );
  }
}
