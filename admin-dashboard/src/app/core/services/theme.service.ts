import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'atlas.theme';

/**
 * Owns the single source of truth for the active theme.
 *
 * The DOM write lives in one `effect` rather than being scattered through
 * components, so anything that needs to react to a theme change (the ECharts
 * instances, for example) can just read the signal.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Resolved by the inline boot script in index.html before first paint. */
  readonly theme = signal<Theme>(
    (document.documentElement.dataset['theme'] as Theme) ?? 'dark'
  );

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.dataset['theme'] = theme;
      document
        .querySelector('meta[name=theme-color]')
        ?.setAttribute('content', theme === 'light' ? '#f7f8fa' : '#08090c');

      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Private browsing: the in-memory signal is still correct.
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
