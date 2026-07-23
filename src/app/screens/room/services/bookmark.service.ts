import {computed, Injectable, signal} from '@angular/core';
import {Bookmark} from '../../../models/bookmark.model';

@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  readonly bookmarks = signal<Bookmark[]>([]);
  readonly roomId = signal<string>('');
  readonly roomBookmarks = computed(() =>
    this.bookmarks().filter(
      (bookmark) => bookmark.roomId === this.roomId(),
    ),
  );
  readonly count = computed(() => this.roomBookmarks().length);
  private readonly storageKey = 'bookmarks';

  constructor() {
    this.loadBookmarks();
  }

  setRoom(roomId: string): void {
    this.roomId.set(roomId);
  }

  addBookmark(title: string, time: number): void {
    const trimmedTitle = title.trim();

    if (!trimmedTitle || !this.roomId()) {
      return;
    }

    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      roomId: this.roomId(),
      title: trimmedTitle,
      time,
      createdAt: new Date().toISOString(),
    };

    this.bookmarks.update((bookmarks) => [...bookmarks, bookmark]);

    this.saveBookmarks();
  }

  removeBookmark(id: string): void {
    this.bookmarks.update((bookmarks) =>
      bookmarks.filter((bookmark) => bookmark.id !== id),
    );

    this.saveBookmarks();
  }

  clearRoomBookmarks(): void {
    this.bookmarks.update((bookmarks) =>
      bookmarks.filter(
        (bookmark) => bookmark.roomId !== this.roomId(),
      ),
    );

    this.saveBookmarks();
  }

  private loadBookmarks(): void {
    const data = localStorage.getItem(this.storageKey);

    if (!data) {
      return;
    }

    try {
      this.bookmarks.set(JSON.parse(data) as Bookmark[]);
    } catch {
      this.bookmarks.set([]);
    }
  }

  private saveBookmarks(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.bookmarks()),
    );
  }
}