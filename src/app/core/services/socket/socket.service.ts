import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

/**
 * Thin wrapper over socket.io-client so components/services never touch
 * the raw socket. Connects lazily with our JWT access token.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly connected = signal(false);

  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket) {
      return;
    }

    this.socket = io(environment.socketUrl, { auth: { token } });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
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
    return new Observable<T>((subscriber) => {
      const handler = (payload: T): void => subscriber.next(payload);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }
}
