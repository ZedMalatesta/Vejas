import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, interval, map, merge, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RoomsService } from '../../../../core/services/rooms/rooms.service';
import { Room } from '../../../../models/room.model';
import { RoomCard } from '../room-card/room-card';

const LOAD_ERROR = null;
/** Silent refresh keeps viewer counters live without any loading flicker. */
const REFRESH_INTERVAL_MS = 15_000;

interface LoadRequest {
  query: string;
  silent: boolean;
}

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
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map((query): LoadRequest => ({ query, silent: false }))
      ),
      this.retry$.pipe(
        map((): LoadRequest => ({ query: this.searchControl.value, silent: false }))
      ),
      interval(REFRESH_INTERVAL_MS).pipe(
        map((): LoadRequest => ({ query: this.searchControl.value, silent: true }))
      )
    )
      .pipe(
        startWith({ query: '', silent: false } as LoadRequest),
        tap(({ silent }) => {
          if (!silent) {
            this.loading.set(true);
            this.error.set(false);
          }
        }),
        switchMap(({ query, silent }) =>
          this.roomsService.getRooms(query).pipe(
            map((rooms) => ({ rooms, silent })),
            catchError(() => of({ rooms: LOAD_ERROR, silent }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ rooms, silent }) => {
        if (rooms === LOAD_ERROR) {
          // A failed background refresh keeps the last good list on screen.
          if (!silent) {
            this.loading.set(false);
            this.error.set(true);
          }
          return;
        }
        this.loading.set(false);
        this.error.set(false);
        this.rooms.set(rooms);
      });
  }

  retry(): void {
    this.retry$.next();
  }
}
