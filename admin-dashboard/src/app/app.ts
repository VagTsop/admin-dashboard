import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

import { RANGES } from './core/models/analytics.model';
import { AnalyticsStore } from './core/services/analytics.store';
import { PerfService } from './core/services/perf.service';
import { ThemeService } from './core/services/theme.service';
import { DATASET_META } from './core/data/dataset.factory';
import { IconComponent, IconName } from './shared/ui/icon.component';
import { fmt } from './core/utils/format';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly hint: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly theme = inject(ThemeService);
  protected readonly store = inject(AnalyticsStore);
  protected readonly perf = inject(PerfService);

  protected readonly ranges = RANGES;
  protected readonly datasetMeta = DATASET_META;
  protected readonly fmt = fmt;

  protected readonly navItems: readonly NavItem[] = [
    {
      path: '/overview',
      label: 'Overview',
      icon: 'grid',
      hint: 'Headline metrics',
    },
    {
      path: '/revenue',
      label: 'Revenue',
      icon: 'wallet',
      hint: 'MRR movement & retention',
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: 'users',
      hint: `${DATASET_META.customerCount.toLocaleString('en-US')} accounts`,
    },
  ];

  protected readonly navOpen = signal(false);

  // Not `required`: the first NavigationEnd fires before the view exists, and a
  // required query would throw NG0951 on the very first navigation.
  private readonly scrollArea =
    viewChild<ElementRef<HTMLElement>>('scrollArea');

  constructor() {
    // The scroll container is `.main`, not the document, so route changes have
    // to reset it explicitly or a new page opens part-way down.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.scrollArea()?.nativeElement.scrollTo({ top: 0 }));
  }

  protected readonly isDark = computed(() => this.theme.theme() === 'dark');

  /** Frame health drives the colour of the FPS readout. */
  protected readonly fpsTone = computed(() => {
    const fps = this.perf.fps();
    if (fps >= 55) return 'good';
    return fps >= 30 ? 'warn' : 'bad';
  });

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }
}
