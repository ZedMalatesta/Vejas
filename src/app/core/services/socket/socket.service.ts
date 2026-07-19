import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

interface SocketEvent {
  event: string;
  payload: unknown;
}

export type SocketFactory = (
  url: string,
  opts?: Partial<ManagerOptions & SocketOptions>
) => Socket;

/**
 * The socket.io entry point behind a DI token, so tests substitute a fake
 * here instead of intercepting the module import (which breaks whenever
 * the builder resolves 'socket.io-client' differently in app vs. spec).
 */
export const SOCKET_FACTORY = new InjectionToken<SocketFactory>('SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => io,
});

/**
 * Thin wrapper over socket.io-client so components/services never touch
 * the raw socket. Connects lazily with our JWT access token.
 *
 * The token is supplied by a provider function, so automatic reconnects
 * always authenticate with the freshest token (it may have been rotated
 * by the HTTP refresh flow while the socket was down).
 *
 * Events are routed through an internal stream, so `on()` subscriptions
 * made before `connect()` still receive everything once connected.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly connected = signal(false);

  private readonly createSocket = inject(SOCKET_FACTORY);
  private socket: Socket | null = null;
  private readonly events$ = new Subject<SocketEvent>();

  connect(tokenProvider: () => string): void {
    if (this.socket) {
      return;
    }

    this.socket = this.createSocket(environment.socketUrl, {
      auth: (cb) => cb({ token: tokenProvider() }),
    });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', (reason) => {
      this.connected.set(false);
      // The server drops sockets with expired tokens; reconnect manually —
      // the auth callback above will pick up the refreshed token.
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });
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
