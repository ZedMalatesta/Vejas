import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-input',
  imports: [ReactiveFormsModule],
  templateUrl: './text-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './text-input.scss',
})
export class TextInput {
  readonly placeholder = input('');
  readonly control = input.required<FormControl<string | null>>();
}
