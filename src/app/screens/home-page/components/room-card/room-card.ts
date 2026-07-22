import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Room } from '../../../../models/room.model';
import { ViewersPipe } from '../../../../core/pipes/viewers-pipe';
import { APP_BRAND } from '../../../../core/brand';

@Component({
  selector: 'app-room-card',
  imports: [RouterLink, ViewersPipe],
  templateUrl: './room-card.html',
  styleUrl: './room-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCard {
  private readonly brand = inject(APP_BRAND);

  readonly room = input.required<Room>();

  readonly coverUrl = computed(
    () =>
      this.room().coverUrl ??
      `https://placehold.co/640x360?text=${encodeURIComponent(this.brand.name)}`
  );
}
