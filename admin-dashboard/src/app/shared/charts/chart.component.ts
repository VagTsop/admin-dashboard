import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { PerfService } from '../../core/services/perf.service';
import { ThemeService } from '../../core/services/theme.service';
import { EChartsOption, EChartsType, echarts } from './echarts.setup';

/**
 * Thin, framework-correct wrapper around an ECharts instance.
 *
 * Responsibilities kept deliberately narrow:
 *  - own the instance lifecycle (create after render, dispose on destroy);
 *  - re-apply options whenever the `option` input changes;
 *  - re-theme when the app theme flips, without recreating the chart;
 *  - resize from a `ResizeObserver` rather than a window listener, so charts
 *    inside a collapsing sidebar or a grid reflow correctly.
 *
 * There is no `NgZone` juggling here because the application runs zoneless —
 * ECharts' internal rAF loop simply never triggers change detection.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<figure #host [style.height.px]="height()" aria-hidden="true"></figure>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    figure {
      margin: 0;
      width: 100%;
    }
  `,
})
export class ChartComponent implements OnDestroy {
  private readonly theme = inject(ThemeService);
  private readonly perf = inject(PerfService);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  readonly option = input.required<EChartsOption>();
  readonly height = input(280);
  /** Accessible summary; charts themselves are `aria-hidden`. */
  readonly label = input<string>('');

  private chart?: EChartsType;
  private observer?: ResizeObserver;

  constructor() {
    afterNextRender(() => this.create());

    // Re-apply on option *or* theme change. `notMerge: false` lets ECharts
    // diff series in place, which keeps the live tail animating smoothly.
    effect(() => {
      const option = this.option();
      this.theme.theme();
      if (!this.chart) return;
      this.chart.setOption(option, { notMerge: false, lazyUpdate: true });
    });
  }

  private create(): void {
    const el = this.host().nativeElement;
    const started = performance.now();

    this.chart = echarts.init(el, undefined, {
      renderer: 'canvas',
      useDirtyRect: true,
    });
    this.chart.setOption(this.option());

    this.perf.recordChartInit(performance.now() - started);

    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.chart?.dispose();
  }
}
