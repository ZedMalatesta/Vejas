import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PlaylistItem } from './playlist-item.model';
import { ScrollIntoViewDirective } from './scroll-into-view.directive';

@Component({
  selector: 'app-playlist',
  imports: [ScrollIntoViewDirective],
  templateUrl: './playlist.html',
  styleUrl: './playlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Playlist {
  readonly items = input<PlaylistItem[]>([]);
  readonly currentIndex = input<number>(0);
  /** Only the room admin may switch or remove items. */
  readonly canEdit = input<boolean>(true);

  readonly select = output<number>();
  readonly remove = output<string>();
}
