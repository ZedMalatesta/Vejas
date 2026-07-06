import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Room } from '../../../../models/room.model';
import { ViewersPipe } from '../../../../core/pipes/viewers-pipe';

const FALLBACK_COVER = 'https://placehold.co/640x360?text=Vejas';

@Component({
  selector: 'app-room-card',
  imports: [RouterLink, ViewersPipe],
  templateUrl: './room-card.html',
  styleUrl: './room-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCard {
  readonly room = input.required<Room>();

  readonly coverUrl = computed(() => this.room().coverUrl ?? FALLBACK_COVER);
}
