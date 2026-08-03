import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Inline SVG icon set.
 *
 * Replaces the 26 MB of webfonts the project previously shipped — those were
 * copied into `dist` wholesale and cost a render-blocking request for glyphs
 * the dashboard never used. These paths add roughly 2 KB to the bundle, need no
 * network request at all, and inherit `currentColor` so they theme for free.
 */
export type IconName =
  | 'activity'
  | 'arrow-down'
  | 'arrow-up'
  | 'bolt'
  | 'chevron-down'
  | 'chevron-right'
  | 'dot'
  | 'gauge'
  | 'grid'
  | 'layers'
  | 'moon'
  | 'pause'
  | 'play'
  | 'search'
  | 'sun'
  | 'trend'
  | 'users'
  | 'wallet'
  | 'x';

const PATHS: Record<IconName, string> = {
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  dot: 'M12 12h.01',
  gauge: 'M12 14l4-4M20.6 17a9 9 0 1 0-17.2 0',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  layers: 'm12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  pause: 'M10 4v16M14 4v16',
  play: 'M6 4l14 8-14 8V4Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4h-4Z',
  x: 'M18 6 6 18M6 6l12 12',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    svg {
      display: block;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly strokeWidth = input(1.75);

  protected readonly path = computed(() => PATHS[this.name()]);
}
