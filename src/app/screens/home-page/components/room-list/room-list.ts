import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, merge, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RoomsService } from '../../../../core/services/rooms/rooms.service';
import { Room } from '../../../../models/room.model';
import { RoomCard } from '../room-card/room-card';

const LOAD_ERROR = null;

@Component({
  selector: 'app-room-list',
  imports: [ReactiveFormsModule, RouterLink, RoomCard],
  templateUrl: './room-list.html',
  styleUrl: './room-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomList {
  private readonly roomsService = inject(RoomsService);
  private readonly auth = inject(AuthService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly retry$ = new Subject<void>();

  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly user = this.auth.user;

  constructor() {
    merge(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.retry$.pipe(map(() => this.searchControl.value))
    )
      .pipe(
        startWith(''),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((query) =>
          this.roomsService.getRooms(query).pipe(catchError(() => of(LOAD_ERROR)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((rooms) => {
        this.loading.set(false);
        if (rooms === LOAD_ERROR) {
          this.error.set(true);
        } else {
          this.rooms.set(rooms);
        }
      });
  }

  retry(): void {
    this.retry$.next();
  }
}
