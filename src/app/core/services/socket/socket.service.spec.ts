import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SocketService } from './socket.service';
import { io } from 'socket.io-client';

interface Handler {
  (payload: unknown): void;
}

const { fakeSocket } = vi.hoisted(() => {
  const handlers = new Map<string, Handler[]>();
  const fakeSocket = {
    connected: false,
    emit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn((event: string, cb: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb]);
    }),
    off: vi.fn((event: string, cb?: Handler) => {
      if (!cb) {
        handlers.delete(event);
        return;
      }
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== cb));
    }),
    trigger(event: string, payload: unknown): void {
      for (const cb of handlers.get(event) ?? []) cb(payload);
    },
    handlers,
  };
  return { fakeSocket };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}));

const ioMock = io as unknown as ReturnType<typeof vi.fn>;

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SocketService);
    vi.clearAllMocks();
    fakeSocket.handlers.clear();
  });

  it('connects to the configured socket URL passing the auth token', () => {
    service.connect('token-123');

    expect(ioMock).toHaveBeenCalledWith(
      environment.socketUrl,
      expect.objectContaining({ auth: { token: 'token-123' } })
    );
  });

  it('does not open a second connection when already connected', () => {
    service.connect('token-123');
    service.connect('token-123');

    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it('emits joinRoom with the room id', () => {
    service.connect('token-123');
    service.joinRoom('room-1');

    expect(fakeSocket.emit).toHaveBeenCalledWith('joinRoom', { roomId: 'room-1' });
  });

  it('forwards custom events with their payload', () => {
    service.connect('token-123');
    service.emit('chatMessage', { roomId: 'room-1', text: 'hi' });

    expect(fakeSocket.emit).toHaveBeenCalledWith('chatMessage', {
      roomId: 'room-1',
      text: 'hi',
    });
  });

  it('streams socket events through on() as an observable', () => {
    service.connect('token-123');

    const received: unknown[] = [];
    const sub = service.on<{ text: string }>('chatMessage').subscribe((m) => received.push(m));

    fakeSocket.trigger('chatMessage', { text: 'hello' });
    expect(received).toEqual([{ text: 'hello' }]);

    sub.unsubscribe();
    fakeSocket.trigger('chatMessage', { text: 'after unsubscribe' });
    expect(received).toHaveLength(1);
  });

  it('tears the socket down on disconnect()', () => {
    service.connect('token-123');
    service.disconnect();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
