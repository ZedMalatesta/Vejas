import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TextInput } from '../text-input/text-input';
import { Button } from '../button/button';
import { extractVideoId } from '../../utils/extract-video-id';

function youtubeUrlValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return extractVideoId(control.value) ? null : { invalidYoutubeUrl: true };
}

@Component({
  selector: 'app-link-input',
  imports: [TextInput, Button, ReactiveFormsModule],
  templateUrl: './link-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './link-input.scss',
})
export class LinkInput {
  readonly submit = output<string>();

  readonly form = new FormGroup({
    url: new FormControl('', [Validators.required, youtubeUrlValidator]),
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const url = this.form.value.url!.trim();
    this.submit.emit(url);
    this.form.reset({ url: '' });
  }
}
