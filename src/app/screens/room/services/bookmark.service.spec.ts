import { TestBed } from '@angular/core/testing';
import { Bookmark } from '../../../models/bookmark.model';
import { installLocalStorageStub } from '../../../testing/room-test-utils';
import { BookmarkService } from './bookmark.service';

const STORAGE_KEY = 'bookmarks';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bookmark-1',
    roomId: 'room-1',
    title: 'Intro',
    time: 12,
    createdAt: '2026-07-05T10:00:00.000Z',
    ...overrides,
  };
}

function createService(seed: Record<string, string> = {}): {
  service: BookmarkService;
  store: Map<string, string>;
} {
  const store = installLocalStorageStub(seed);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [BookmarkService] });
  return { service: TestBed.inject(BookmarkService), store };
}

function storedBookmarks(store: Map<string, string>): Bookmark[] {
  return JSON.parse(store.get(STORAGE_KEY) ?? '[]') as Bookmark[];
}

describe('BookmarkService', () => {
  describe('loading from storage', () => {
    it('starts empty when nothing was persisted', () => {
      const { service } = createService();

      expect(service.bookmarks()).toEqual([]);
    });

    it('restores persisted bookmarks', () => {
      const persisted = [makeBookmark()];
      const { service } = createService({ [STORAGE_KEY]: JSON.stringify(persisted) });

      expect(service.bookmarks()).toEqual(persisted);
    });

    it('falls back to empty on corrupt JSON instead of throwing', () => {
      const { service } = createService({ [STORAGE_KEY]: '{not json' });

      expect(service.bookmarks()).toEqual([]);
    });

    it('starts with no room selected', () => {
      const { service } = createService();

      expect(service.roomId()).toBe('');
    });
  });

  describe('room scoping', () => {
    it('setRoom selects the active room', () => {
      const { service } = createService();

      service.setRoom('room-9');

      expect(service.roomId()).toBe('room-9');
    });

    it('roomBookmarks only exposes the active room', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([
          makeBookmark({ id: 'a', roomId: 'room-1' }),
          makeBookmark({ id: 'b', roomId: 'room-2' }),
        ]),
      });

      service.setRoom('room-1');

      expect(service.roomBookmarks().map((b) => b.id)).toEqual(['a']);
    });

    it('roomBookmarks is empty while no room is selected', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ roomId: 'room-1' })]),
      });

      expect(service.roomBookmarks()).toEqual([]);
    });

    it('count reflects only the active room', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([
          makeBookmark({ id: 'a', roomId: 'room-1' }),
          makeBookmark({ id: 'b', roomId: 'room-1' }),
          makeBookmark({ id: 'c', roomId: 'room-2' }),
        ]),
      });

      service.setRoom('room-1');

      expect(service.count()).toBe(2);
    });

    it('recomputes when the active room changes', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([
          makeBookmark({ id: 'a', roomId: 'room-1' }),
          makeBookmark({ id: 'c', roomId: 'room-2' }),
        ]),
      });

      service.setRoom('room-1');
      expect(service.count()).toBe(1);

      service.setRoom('room-2');
      expect(service.roomBookmarks().map((b) => b.id)).toEqual(['c']);
    });
  });

  describe('addBookmark', () => {
    it('adds a bookmark for the active room', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('Chorus', 61.5);

      expect(service.roomBookmarks()).toHaveLength(1);
    });

    it('stores the title and time it was given', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('Chorus', 61.5);

      expect(service.roomBookmarks()[0]).toMatchObject({
        roomId: 'room-1',
        title: 'Chorus',
        time: 61.5,
      });
    });

    it('assigns an id and a creation timestamp', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('Chorus', 61.5);

      const bookmark = service.roomBookmarks()[0];
      expect(bookmark.id).toBeTruthy();
      expect(Number.isNaN(Date.parse(bookmark.createdAt))).toBe(false);
    });

    it('trims the title', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('  Chorus  ', 10);

      expect(service.roomBookmarks()[0].title).toBe('Chorus');
    });

    it('ignores an empty title', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('', 10);

      expect(service.bookmarks()).toEqual([]);
    });

    it('ignores a whitespace-only title', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('   ', 10);

      expect(service.bookmarks()).toEqual([]);
    });

    it('ignores the call when no room is selected', () => {
      const { service } = createService();

      service.addBookmark('Chorus', 10);

      expect(service.bookmarks()).toEqual([]);
    });

    it('accepts time 0', () => {
      const { service } = createService();
      service.setRoom('room-1');

      service.addBookmark('Start', 0);

      expect(service.roomBookmarks()[0].time).toBe(0);
    });

    it('persists to localStorage', () => {
      const { service, store } = createService();
      service.setRoom('room-1');

      service.addBookmark('Chorus', 10);

      expect(storedBookmarks(store)).toHaveLength(1);
    });

    it('keeps bookmarks of other rooms in storage', () => {
      const { service, store } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'other', roomId: 'room-2' })]),
      });
      service.setRoom('room-1');

      service.addBookmark('Chorus', 10);

      expect(storedBookmarks(store).map((b) => b.roomId).sort()).toEqual(['room-1', 'room-2']);
    });
  });

  describe('removeBookmark', () => {
    it('removes the matching bookmark', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'a' }), makeBookmark({ id: 'b' })]),
      });

      service.removeBookmark('a');

      expect(service.bookmarks().map((b) => b.id)).toEqual(['b']);
    });

    it('is a no-op for an unknown id', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'a' })]),
      });

      service.removeBookmark('nope');

      expect(service.bookmarks()).toHaveLength(1);
    });

    it('persists the removal', () => {
      const { service, store } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'a' })]),
      });

      service.removeBookmark('a');

      expect(storedBookmarks(store)).toEqual([]);
    });
  });

  describe('clearRoomBookmarks', () => {
    it('clears only the active room', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([
          makeBookmark({ id: 'a', roomId: 'room-1' }),
          makeBookmark({ id: 'b', roomId: 'room-2' }),
        ]),
      });
      service.setRoom('room-1');

      service.clearRoomBookmarks();

      expect(service.bookmarks().map((b) => b.id)).toEqual(['b']);
    });

    it('leaves the active room with no bookmarks', () => {
      const { service } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'a', roomId: 'room-1' })]),
      });
      service.setRoom('room-1');

      service.clearRoomBookmarks();

      expect(service.count()).toBe(0);
    });

    it('persists the cleared list', () => {
      const { service, store } = createService({
        [STORAGE_KEY]: JSON.stringify([makeBookmark({ id: 'a', roomId: 'room-1' })]),
      });
      service.setRoom('room-1');

      service.clearRoomBookmarks();

      expect(storedBookmarks(store)).toEqual([]);
    });
  });
});
