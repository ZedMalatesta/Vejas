import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

interface FakeIoSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: mocks.io }));

function createFakeIoSocket(): FakeIoSocket {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

/** Replays the handler SocketService registered for a socket.io event. */
function fireSocketEvent(socket: FakeIoSocket, event: string, ...args: unknown[]): void {
  for (const [name, handler] of socket.on.mock.calls) {
    if (name === event) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }
}

describe('SocketService', () => {
  let fakeSocket: FakeIoSocket;

  function setup(options: { roomId?: string | null; token?: string | null } = {}): SocketService {
    const { roomId = 'room-1', token = 'jwt-token' } = options;

    TestBed.configureTestingModule({
      providers: [
        SocketService,
        { provide: AuthService, useValue: { accessToken: () => token } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(roomId === null ? {} : { id: roomId }) },
          },
        },
      ],
    });

    return TestBed.inject(SocketService);
  }

  beforeEach(() => {
    fakeSocket = createFakeIoSocket();
    mocks.io.mockReset();
    mocks.io.mockReturnValue(fakeSocket);
  });

  describe('connection', () => {
    it('connects to the configured socket url', () => {
      setup();

      expect(mocks.io).toHaveBeenCalledWith(environment.socketUrl, expect.anything());
    });

    it('connects exactly once per instance', () => {
      setup();

      expect(mocks.io).toHaveBeenCalledTimes(1);
    });

    it('supplies the access token through the auth callback', () => {
      setup({ token: 'jwt-token' });
      const authCallback = mocks.io.mock.calls[0][1].auth as (cb: (data: unknown) => void) => void;

      let handed: unknown;
      authCallback((data) => (handed = data));

      expect(handed).toEqual({ token: 'jwt-token' });
    });

    it('hands an empty token when the user is not signed in', () => {
      setup({ token: null });
      const authCallback = mocks.io.mock.calls[0][1].auth as (cb: (data: unknown) => void) => void;

      let handed: unknown;
      authCallback((data) => (handed = data));

      expect(handed).toEqual({ token: '' });
    });

    it('re-reads the token on every auth callback invocation', () => {
      let current = 'first';
      TestBed.configureTestingModule({
        providers: [
          SocketService,
          { provide: AuthService, useValue: { accessToken: () => current } },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: convertToParamMap({ id: 'room-1' }) } },
          },
        ],
      });
      TestBed.inject(SocketService);

      const authCallback = mocks.io.mock.calls[0][1].auth as (cb: (data: unknown) => void) => void;
      current = 'refreshed';

      let handed: unknown;
      authCallback((data) => (handed = data));

      expect(handed).toEqual({ token: 'refreshed' });
    });
  });

  describe('joining', () => {
    it('emits joinRoom with the route room id on construction', () => {
      setup({ roomId: 'room-42' });

      expect(fakeSocket.emit).toHaveBeenCalledWith('joinRoom', { roomId: 'room-42' });
    });

    it('falls back to an empty room id when the route has no id param', () => {
      setup({ roomId: null });

      expect(fakeSocket.emit).toHaveBeenCalledWith('joinRoom', { roomId: '' });
    });
  });

  describe('emit', () => {
    it('stamps the room id onto every outgoing payload', () => {
      const service = setup({ roomId: 'room-42' });
      fakeSocket.emit.mockClear();

      service.emit('chatMessage', { text: 'hi' });

      expect(fakeSocket.emit).toHaveBeenCalledWith('chatMessage', {
        roomId: 'room-42',
        text: 'hi',
      });
    });

    it('sends just the room id when no payload is given', () => {
      const service = setup({ roomId: 'room-42' });
      fakeSocket.emit.mockClear();

      service.emit('leaveRoom');

      expect(fakeSocket.emit).toHaveBeenCalledWith('leaveRoom', { roomId: 'room-42' });
    });

    it('lets a caller-supplied roomId win over the route one', () => {
      const service = setup({ roomId: 'room-42' });
      fakeSocket.emit.mockClear();

      service.emit('chatMessage', { roomId: 'other-room', text: 'hi' });

      expect(fakeSocket.emit).toHaveBeenCalledWith('chatMessage', {
        roomId: 'other-room',
        text: 'hi',
      });
    });
  });

  describe('subscriptions', () => {
    it('registers the handler on the underlying socket', () => {
      const service = setup();
      const handler = vi.fn();

      service.on('chatMessage', handler);

      expect(fakeSocket.on).toHaveBeenCalledWith('chatMessage', handler);
    });

    it('passes the server payload straight through', () => {
      const service = setup();
      const handler = vi.fn();
      service.on<{ text: string }>('chatMessage', handler);

      fireSocketEvent(fakeSocket, 'chatMessage', { text: 'hello' });

      expect(handler).toHaveBeenCalledWith({ text: 'hello' });
    });

    it('unsubscribes through off', () => {
      const service = setup();

      service.off('chatMessage');

      expect(fakeSocket.off).toHaveBeenCalledWith('chatMessage');
    });
  });

  describe('reconnection', () => {
    it('registers a disconnect handler', () => {
      setup();

      expect(fakeSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('reconnects when the server dropped the socket', () => {
      setup();

      fireSocketEvent(fakeSocket, 'disconnect', 'io server disconnect');

      expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('does not reconnect on a transport-level drop', () => {
      setup();

      fireSocketEvent(fakeSocket, 'disconnect', 'transport close');

      expect(fakeSocket.connect).not.toHaveBeenCalled();
    });

    it('does not reconnect when the client disconnected on purpose', () => {
      setup();

      fireSocketEvent(fakeSocket, 'disconnect', 'io client disconnect');

      expect(fakeSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('disconnects the socket on destroy', () => {
      const service = setup();

      service.ngOnDestroy();

      expect(fakeSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('disconnects when the injector holding it is destroyed', () => {
      setup();

      TestBed.resetTestingModule();

      expect(fakeSocket.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
