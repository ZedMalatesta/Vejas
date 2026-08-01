import { TestBed } from '@angular/core/testing';
import { SocketService } from '../../core/services/socket.service';
import { FakeSocketService, makeChatMessage } from '../../testing/room-test-utils';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let socket: FakeSocketService;
  let service: ChatService;

  beforeEach(() => {
    socket = new FakeSocketService();
    TestBed.configureTestingModule({
      providers: [ChatService, { provide: SocketService, useValue: socket }],
    });
    service = TestBed.inject(ChatService);
  });

  describe('initial state', () => {
    it('starts with no messages', () => {
      expect(service.messages()).toEqual([]);
    });

    it('subscribes to roomState on construction', () => {
      expect(socket.hasHandler('roomState')).toBe(true);
    });

    it('subscribes to chatMessage on construction', () => {
      expect(socket.hasHandler('chatMessage')).toBe(true);
    });
  });

  describe('snapshots', () => {
    it('applySnapshot replaces the message list', () => {
      const messages = [makeChatMessage({ id: 'a' }), makeChatMessage({ id: 'b' })];
      service.applySnapshot(messages);

      expect(service.messages()).toEqual(messages);
    });

    it('applySnapshot can clear previously received messages', () => {
      service.applySnapshot([makeChatMessage()]);
      service.applySnapshot([]);

      expect(service.messages()).toEqual([]);
    });

    it('reads the nested list out of roomState', () => {
      const messages = [makeChatMessage({ id: 'a', text: 'from snapshot' })];
      socket.push('roomState', { state: { messages } });

      expect(service.messages()).toEqual(messages);
    });

    it('lets roomState overwrite messages appended earlier', () => {
      socket.push('chatMessage', makeChatMessage({ id: 'live' }));
      socket.push('roomState', { state: { messages: [] } });

      expect(service.messages()).toEqual([]);
    });
  });

  describe('incoming chatMessage', () => {
    it('appends a single message', () => {
      const message = makeChatMessage({ id: 'a', text: 'hi' });
      socket.push('chatMessage', message);

      expect(service.messages()).toEqual([message]);
    });

    it('keeps arrival order across several messages', () => {
      socket.push('chatMessage', makeChatMessage({ id: 'a', text: 'first' }));
      socket.push('chatMessage', makeChatMessage({ id: 'b', text: 'second' }));

      expect(service.messages().map((m) => m.text)).toEqual(['first', 'second']);
    });

    it('appends after a snapshot instead of replacing it', () => {
      service.applySnapshot([makeChatMessage({ id: 'a' })]);
      socket.push('chatMessage', makeChatMessage({ id: 'b' }));

      expect(service.messages().map((m) => m.id)).toEqual(['a', 'b']);
    });

    it('produces a new array rather than mutating the previous one', () => {
      const initial = [makeChatMessage({ id: 'a' })];
      service.applySnapshot(initial);
      socket.push('chatMessage', makeChatMessage({ id: 'b' }));

      expect(initial).toHaveLength(1);
      expect(service.messages()).not.toBe(initial);
    });
  });

  describe('send', () => {
    it('emits chatMessage with the text', () => {
      service.send('hello world');

      expect(socket.lastEmitOf('chatMessage')?.payload).toEqual({ text: 'hello world' });
    });

    it('trims surrounding whitespace before sending', () => {
      service.send('   padded   ');

      expect(socket.lastEmitOf('chatMessage')?.payload).toEqual({ text: 'padded' });
    });

    it('ignores an empty string', () => {
      service.send('');

      expect(socket.emitted).toEqual([]);
    });

    it('ignores a whitespace-only string', () => {
      service.send('   \n\t ');

      expect(socket.emitted).toEqual([]);
    });

    it('does not append the message locally — the server echoes it back', () => {
      service.send('hello');

      expect(service.messages()).toEqual([]);
    });

    it('does not send an author — the server resolves it from the socket', () => {
      service.send('hello');

      expect(Object.keys(socket.lastEmitOf('chatMessage')?.payload ?? {})).toEqual(['text']);
    });
  });
});
