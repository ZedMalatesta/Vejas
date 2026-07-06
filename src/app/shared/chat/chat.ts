import {DatePipe} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../core/services/auth.service';
import {ChatService} from '../../screens/room/chat.service';

@Component({
  selector: 'app-chat',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements AfterViewInit {
  readonly messageControl = new FormControl('', [Validators.required]);
  private readonly chatService = inject(ChatService);
  readonly messages = this.chatService.messages;
  private readonly authService = inject(AuthService);
  readonly author = computed(() => this.authService.user()?.login ?? 'Guest');
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

  onSubmit(): void {
    if (this.messageControl.invalid) return;
    this.chatService.send(this.messageControl.value!, this.author());
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
