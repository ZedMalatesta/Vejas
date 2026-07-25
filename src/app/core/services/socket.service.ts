import { inject, Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Scoped per room via the Room component's providers, so navigating
 * between rooms tears down the old socket instead of reusing one tied
 * to a hardcoded room id.
 */
@Injectable()
export class SocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly roomId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  private readonly socket: Socket = io(environment.socketUrl, {
    auth: (cb) => cb({ token: this.auth.accessToken() ?? '' }),
  });

  constructor() {
    this.socket.emit('joinRoom', { roomId: this.roomId });

    // The server drops sockets with expired tokens; reconnect manually --
    // the auth callback above picks up the refreshed token on retry.
    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });
  }

  emit(event: string, payload: Record<string, unknown> = {}): void {
    this.socket.emit(event, { roomId: this.roomId, ...payload });
  }

  on<T>(event: string, callback: (payload: T) => void): void {
    this.socket.on(event, callback);
  }

  off(event: string): void {
    this.socket.off(event);
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
