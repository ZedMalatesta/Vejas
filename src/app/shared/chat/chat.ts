import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoomChatMessage } from '../../models/room.model';

@Component({
  selector: 'app-chat',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements AfterViewInit {
  readonly messages = input<RoomChatMessage[]>([]);
  readonly send = output<string>();

  readonly messageControl = new FormControl('', [Validators.required]);

  private readonly messageList =
    viewChild<ElementRef<HTMLElement>>('messageList');

  constructor() {
    effect(() => {
      this.messages();
      this.scrollToBottom();
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  onSubmit(event: Event): void {
    // A bare <form> has no Angular form directive, so stop the native
    // submit from reloading the whole page.
    event.preventDefault();
    if (this.messageControl.invalid) return;
    this.send.emit(this.messageControl.value!);
    this.messageControl.reset();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const messageList = this.messageList();

      if (messageList) {
        messageList.nativeElement.scrollTop =
          messageList.nativeElement.scrollHeight;
      }
    });
  }
}
