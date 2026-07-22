import { effect, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_THEME_CONFIG, THEME_CONFIG, Theme } from './theme.config';

const THEME_STORAGE_KEY = 'vejas.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Optional so TestBeds (and any host without the provider) fall back
  // to the default config instead of throwing at injection time.
  private readonly config = inject(THEME_CONFIG, { optional: true }) ?? DEFAULT_THEME_CONFIG;

  /** Current theme. Drives the DOM via the effect below. */
  readonly theme = signal<Theme>(this.guessFromTime());

  constructor() {
    // Truly reactive: the effect reads theme(), so any signal update re-applies it.
    effect(() => this.applyToDom(this.theme()));
    const stored = this.readStored();
    if (stored) {
      this.theme.set(stored);
    } else {
      this.initSystemSync();
    }
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  /** Manual switch from the UI: applies and persists the choice. */
  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode etc.) — theme still applies */
    }
  }

  private readStored(): Theme | null {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private applyToDom(theme: Theme): void {
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch {
      /* ignore when DOM not available (SSR) */
    }
  }

  private guessFromTime(): Theme {
    try {
      const h = new Date().getHours();
      return h >= this.config.dayStartHour && h < this.config.dayEndHour ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  /** Sync with the system preference and keep listening for changes. */
  private initSystemSync(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mq = window.matchMedia(this.config.darkMediaQuery);
    this.theme.set(mq.matches ? 'dark' : 'light');

    try {
      mq.addEventListener('change', (ev: MediaQueryListEvent) => {
        // A stored manual choice wins over later system flips.
        if (!this.readStored()) {
          this.theme.set(ev.matches ? 'dark' : 'light');
        }
      });
    } catch {
      /* older browsers without addEventListener on MediaQueryList */
    }
  }
}
