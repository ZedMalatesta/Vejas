import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile/profile.service';
import { RoomsService } from '../../core/services/rooms/rooms.service';
import { UserProfile } from '../../models/auth.model';
import { Room } from '../../models/room.model';
import { Footer } from '../../shared/footer/footer';
import { Header } from '../../shared/header/header';
import { ViewersPipe } from '../../core/pipes/viewers-pipe';

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, Header, Footer, ViewersPipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly roomsService = inject(RoomsService);
  private readonly fb = inject(FormBuilder);

  readonly profile = signal<UserProfile | null>(null);
  readonly profileError = signal(false);
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal('');

  readonly rooms = signal<Room[]>([]);
  readonly roomsLoading = signal(true);
  readonly roomsError = signal(false);

  readonly form = this.fb.group({
    nickname: ['', [Validators.minLength(2), Validators.maxLength(30)]],
    avatarUrl: ['', [Validators.pattern(URL_PATTERN)]],
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadRooms();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nickname, avatarUrl } = this.form.getRawValue();
    this.saving.set(true);
    this.saveMessage.set('');
    this.saveError.set('');

    this.profileService
      .updateMe({
        nickname: nickname || undefined,
        avatarUrl: avatarUrl || undefined,
      })
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.saving.set(false);
          this.saveMessage.set('Profile saved');
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set('Could not save the profile. Please try again.');
        },
      });
  }

  deleteRoom(room: Room): void {
    if (!confirm(`Delete the room "${room.name}"? This cannot be undone.`)) {
      return;
    }

    this.roomsService.deleteRoom(room.id).subscribe({
      next: () => this.rooms.update((list) => list.filter((r) => r.id !== room.id)),
      error: () => this.roomsError.set(true),
    });
  }

  retryRooms(): void {
    this.loadRooms();
  }

  displayName(): string {
    const profile = this.profile();
    return profile?.nickname ?? profile?.login.split('@')[0] ?? '?';
  }

  private loadProfile(): void {
    this.profileService.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form.patchValue({
          nickname: profile.nickname ?? '',
          avatarUrl: profile.avatarUrl ?? '',
        });
      },
      error: () => this.profileError.set(true),
    });
  }

  private loadRooms(): void {
    const userId = this.authService.user()?.id;
    if (!userId) {
      this.roomsLoading.set(false);
      return;
    }

    this.roomsLoading.set(true);
    this.roomsError.set(false);

    this.roomsService.getRoomsByAdmin(userId).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.roomsLoading.set(false);
      },
      error: () => {
        this.roomsLoading.set(false);
        this.roomsError.set(true);
      },
    });
  }
}
