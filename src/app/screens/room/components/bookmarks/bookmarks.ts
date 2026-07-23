import {ChangeDetectionStrategy, Component, computed, inject, output} from '@angular/core';

import {BookmarkService} from '../../services/bookmark.service';

@Component({
  selector: 'app-bookmarks',
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bookmarks {
  readonly seek = output<number>();
  readonly hasBookmarks = computed(() => this.count() > 0);
  private readonly bookmarkService = inject(BookmarkService);
  readonly bookmarks = this.bookmarkService.roomBookmarks;
  readonly count = this.bookmarkService.count;

  removeBookmark(id: string): void {
    this.bookmarkService.removeBookmark(id);
  }

  seekTo(time: number): void {
    this.seek.emit(time);
  }

  protected formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}