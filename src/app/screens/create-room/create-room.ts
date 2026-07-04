import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoomsService } from '../../core/services/rooms/rooms.service';
import { CreateRoomRequest } from '../../models/room.model';

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-create-room',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-room.html',
  styleUrl: './create-room.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRoom {
  private readonly roomsService = inject(RoomsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    description: ['', [Validators.maxLength(300)]],
    coverUrl: ['', [Validators.pattern(URL_PATTERN)]],
  });

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, coverUrl } = this.form.getRawValue();
    const request: CreateRoomRequest = {
      name: name!,
      description: description || undefined,
      coverUrl: coverUrl || undefined,
    };

    this.submitting.set(true);
    this.errorMessage.set('');

    this.roomsService.createRoom(request).subscribe({
      next: (room) => void this.router.navigate(['/room', room.id]),
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Could not create the room. Please try again.');
      },
    });
  }
}
