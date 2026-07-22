import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SOCKET_FACTORY, SocketService } from './socket.service';

interface Handler {
  (payload: unknown): void;
}

function makeFakeSocket(): {
  connected: boolean;
  emit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  onAny: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  trigger(event: string, payload: unknown): void;
} {
  const handlers = new Map<string, Handler[]>();
  const anyHandlers: ((event: string, payload: unknown) => void)[] = [];
  return {
    connected: false,
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn((event: string, cb: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb]);
    }),
    onAny: vi.fn((cb: (event: string, payload: unknown) => void) => {
      anyHandlers.push(cb);
    }),
    off: vi.fn(),
    trigger(event: string, payload: unknown): void {
      for (const cb of handlers.get(event) ?? []) cb(payload);
      for (const cb of anyHandlers) cb(event, payload);
    },
  };
}

describe('SocketService', () => {
  let service: SocketService;
  let fakeSocket: ReturnType<typeof makeFakeSocket>;
  let ioMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fakeSocket = makeFakeSocket();
    ioMock = vi.fn(() => fakeSocket);
    TestBed.configureTestingModule({
      providers: [{ provide: SOCKET_FACTORY, useValue: ioMock }],
    });
    service = TestBed.inject(SocketService);
  });

  it('connects to the configured socket URL with an auth callback that reads a fresh token', () => {
    service.connect(() => 'token-123');

    expect(ioMock).toHaveBeenCalledWith(
      environment.socketUrl,
      expect.objectContaining({ auth: expect.any(Function) })
    );

    const options = ioMock.mock.calls[0][1] as {
      auth: (cb: (data: object) => void) => void;
    };
    let sent: object | undefined;
    options.auth((data) => (sent = data));
    expect(sent).toEqual({ token: 'token-123' });
  });

  it('reconnects manually when the server drops the socket', () => {
    service.connect(() => 'token-123');

    fakeSocket.trigger('disconnect', 'io server disconnect');

    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it('does not open a second connection when already connected', () => {
    service.connect(() => 'token-123');
    service.connect(() => 'token-123');

    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it('emits joinRoom with the room id', () => {
    service.connect(() => 'token-123');
    service.joinRoom('room-1');

    expect(fakeSocket.emit).toHaveBeenCalledWith('joinRoom', { roomId: 'room-1' });
  });

  it('forwards custom events with their payload', () => {
    service.connect(() => 'token-123');
    service.emit('chatMessage', { roomId: 'room-1', text: 'hi' });

    expect(fakeSocket.emit).toHaveBeenCalledWith('chatMessage', {
      roomId: 'room-1',
      text: 'hi',
    });
  });

  it('streams socket events through on() as an observable', () => {
    service.connect(() => 'token-123');

    const received: unknown[] = [];
    const sub = service.on<{ text: string }>('chatMessage').subscribe((m) => received.push(m));

    fakeSocket.trigger('chatMessage', { text: 'hello' });
    expect(received).toEqual([{ text: 'hello' }]);

    sub.unsubscribe();
    fakeSocket.trigger('chatMessage', { text: 'after unsubscribe' });
    expect(received).toHaveLength(1);
  });

  it('delivers events to subscriptions made before connect()', () => {
    const received: unknown[] = [];
    service.on<{ text: string }>('chatMessage').subscribe((m) => received.push(m));

    service.connect(() => 'token-123');
    fakeSocket.trigger('chatMessage', { text: 'early bird' });

    expect(received).toEqual([{ text: 'early bird' }]);
  });

  it('tears the socket down on disconnect()', () => {
    service.connect(() => 'token-123');
    service.disconnect();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
