import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  readonly message = signal<string | null>(null);

  show(message: string): void {
    this.message.set(message);
    setTimeout(() => this.message.set(null), 5000);
  }

  dismiss(): void {
    this.message.set(null);
  }
}
