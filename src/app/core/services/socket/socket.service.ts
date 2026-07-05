/* eslint-disable @typescript-eslint/no-unused-vars -- TDD skeleton, remove with implementation */
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Thin wrapper over socket.io-client so components/services never touch
 * the raw socket. Connects lazily with the Supabase access token.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  readonly connected = signal(false);

  connect(_token: string): void {
    // TODO(TDD): implement
  }

  disconnect(): void {
    // TODO(TDD): implement
  }

  joinRoom(_roomId: string): void {
    // TODO(TDD): implement
  }

  emit(_event: string, _payload: Record<string, unknown> = {}): void {
    // TODO(TDD): implement
  }

  on<T>(_event: string): Observable<T> {
    // TODO(TDD): implement
    return new Observable<T>();
  }
}
