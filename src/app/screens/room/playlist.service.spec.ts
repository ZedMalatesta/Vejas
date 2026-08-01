import { TestBed } from '@angular/core/testing';
import { SocketService } from '../../core/services/socket.service';
import { FakeSocketService, makePlaylistItem } from '../../testing/room-test-utils';
import { PlaylistService } from './playlist.service';

describe('PlaylistService', () => {
  let socket: FakeSocketService;
  let service: PlaylistService;

  beforeEach(() => {
    socket = new FakeSocketService();
    TestBed.configureTestingModule({
      providers: [PlaylistService, { provide: SocketService, useValue: socket }],
    });
    service = TestBed.inject(PlaylistService);
  });

  describe('initial state', () => {
    it('starts with an empty playlist', () => {
      expect(service.playlist()).toEqual([]);
    });

    it('starts at index 0', () => {
      expect(service.currentIndex()).toBe(0);
    });

    it('exposes an empty videoId while nothing is queued', () => {
      expect(service.videoId()).toBe('');
    });

    it('subscribes to roomState on construction', () => {
      expect(socket.hasHandler('roomState')).toBe(true);
    });

    it('subscribes to playlistUpdate on construction', () => {
      expect(socket.hasHandler('playlistUpdate')).toBe(true);
    });

    it('emits nothing on construction', () => {
      expect(socket.emitted).toEqual([]);
    });
  });

  describe('videoId', () => {
    it('resolves the item at the current index', () => {
      service.applySnapshot(
        [makePlaylistItem({ id: 'a', videoId: 'aaaaaaaaaaa' }), makePlaylistItem({ id: 'b', videoId: 'bbbbbbbbbbb' })],
        1
      );
      expect(service.videoId()).toBe('bbbbbbbbbbb');
    });

    it('recomputes when the current index changes', () => {
      service.applySnapshot(
        [makePlaylistItem({ id: 'a', videoId: 'aaaaaaaaaaa' }), makePlaylistItem({ id: 'b', videoId: 'bbbbbbbbbbb' })],
        0
      );
      expect(service.videoId()).toBe('aaaaaaaaaaa');

      service.currentIndex.set(1);
      expect(service.videoId()).toBe('bbbbbbbbbbb');
    });

    it('falls back to an empty string when the index is out of range', () => {
      service.applySnapshot([makePlaylistItem()], 5);
      expect(service.videoId()).toBe('');
    });

    it('falls back to an empty string for a negative index', () => {
      service.applySnapshot([makePlaylistItem()], -1);
      expect(service.videoId()).toBe('');
    });
  });

  describe('applySnapshot', () => {
    it('replaces playlist and index together', () => {
      const items = [makePlaylistItem({ id: 'a' }), makePlaylistItem({ id: 'b' })];
      service.applySnapshot(items, 1);

      expect(service.playlist()).toEqual(items);
      expect(service.currentIndex()).toBe(1);
    });

    it('can reset the playlist back to empty', () => {
      service.applySnapshot([makePlaylistItem()], 0);
      service.applySnapshot([], 0);

      expect(service.playlist()).toEqual([]);
      expect(service.videoId()).toBe('');
    });
  });

  describe('incoming socket events', () => {
    it('applies the nested snapshot from roomState', () => {
      const items = [makePlaylistItem({ id: 'x', videoId: 'xxxxxxxxxxx' })];
      socket.push('roomState', { state: { playlist: items, currentIndex: 0 } });

      expect(service.playlist()).toEqual(items);
      expect(service.videoId()).toBe('xxxxxxxxxxx');
    });

    it('applies the flat payload from playlistUpdate', () => {
      const items = [makePlaylistItem({ id: 'y' }), makePlaylistItem({ id: 'z', videoId: 'zzzzzzzzzzz' })];
      socket.push('playlistUpdate', { playlist: items, currentIndex: 1 });

      expect(service.currentIndex()).toBe(1);
      expect(service.videoId()).toBe('zzzzzzzzzzz');
    });

    it('lets a later playlistUpdate override an earlier roomState', () => {
      socket.push('roomState', { state: { playlist: [makePlaylistItem({ id: 'a' })], currentIndex: 0 } });
      socket.push('playlistUpdate', { playlist: [], currentIndex: 0 });

      expect(service.playlist()).toEqual([]);
    });

    it('replaces the array instead of mutating the previous one', () => {
      const first = [makePlaylistItem({ id: 'a' })];
      service.applySnapshot(first, 0);
      socket.push('playlistUpdate', { playlist: [makePlaylistItem({ id: 'b' })], currentIndex: 0 });

      expect(first).toHaveLength(1);
      expect(service.playlist()).not.toBe(first);
    });
  });

  describe('add', () => {
    it('emits playlistAdd with the extracted video id and the original url', () => {
      service.add('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(socket.lastEmitOf('playlistAdd')?.payload).toEqual({
        videoId: 'dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
    });

    it('accepts youtu.be short links', () => {
      service.add('https://youtu.be/dQw4w9WgXcQ');

      expect(socket.lastEmitOf('playlistAdd')?.payload['videoId']).toBe('dQw4w9WgXcQ');
    });

    it('accepts embed links', () => {
      service.add('https://www.youtube.com/embed/dQw4w9WgXcQ');

      expect(socket.lastEmitOf('playlistAdd')?.payload['videoId']).toBe('dQw4w9WgXcQ');
    });

    it('ignores a url with no extractable video id', () => {
      service.add('https://example.com/not-a-video');

      expect(socket.emitsOf('playlistAdd')).toHaveLength(0);
    });

    it('ignores an empty url', () => {
      service.add('');

      expect(socket.emitted).toEqual([]);
    });

    it('does not optimistically append to the local playlist', () => {
      service.add('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(service.playlist()).toEqual([]);
    });
  });

  describe('select and remove', () => {
    it('emits playlistSelect with the index', () => {
      service.select(2);

      expect(socket.lastEmitOf('playlistSelect')?.payload).toEqual({ index: 2 });
    });

    it('does not move the local index before the server confirms', () => {
      service.applySnapshot([makePlaylistItem({ id: 'a' }), makePlaylistItem({ id: 'b' })], 0);
      service.select(1);

      expect(service.currentIndex()).toBe(0);
    });

    it('emits playlistRemove with the item id', () => {
      service.remove('item-7');

      expect(socket.lastEmitOf('playlistRemove')?.payload).toEqual({ id: 'item-7' });
    });

    it('does not remove the item locally before the server confirms', () => {
      const items = [makePlaylistItem({ id: 'item-7' })];
      service.applySnapshot(items, 0);
      service.remove('item-7');

      expect(service.playlist()).toEqual(items);
    });
  });
});
