import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Kpi } from '../../core/models/analytics.model';
import { fmt, formatKpi } from '../../core/utils/format';
import { IconComponent } from './icon.component';

/**
 * KPI tile with an inline sparkline.
 *
 * The sparkline is hand-rolled SVG rather than a charting instance on purpose:
 * four ECharts canvases above the fold would cost four contexts and four
 * resize observers to draw what amounts to a single `<path>`.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card tile">
      <header>
        <span class="label">{{ kpi().label }}</span>
        <span class="delta" [class]="deltaClass()">
          <app-icon [name]="rising() ? 'arrow-up' : 'arrow-down'" [size]="11" />
          {{ deltaText() }}
        </span>
      </header>

      <div class="value-row">
        <strong class="value">{{ value() }}</strong>

        <svg
          class="spark"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient [attr.id]="gradientId()" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="tone()" stop-opacity="0.28" />
              <stop offset="100%" [attr.stop-color]="tone()" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId() + ')'" />
          <path
            [attr.d]="linePath()"
            fill="none"
            [attr.stroke]="tone()"
            stroke-width="1.75"
            vector-effect="non-scaling-stroke"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
      </div>

      <p class="hint">{{ kpi().hint }}</p>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .tile {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      padding: var(--sp-4) var(--sp-5) var(--sp-4);
      height: 100%;
      position: relative;
      overflow: hidden;
      transition: border-color var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-out);
    }

    .tile:hover {
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-3);
    }

    .label {
      font-size: var(--text-xs);
      color: var(--fg-muted);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--sp-4);
    }

    .value {
      font-size: var(--text-xl);
      font-weight: 650;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .spark {
      width: 96px;
      height: 32px;
      flex: none;
      opacity: 0.9;
    }

    .hint {
      font-size: var(--text-2xs);
      color: var(--fg-subtle);
      line-height: 1.45;
    }
  `,
})
export class StatCardComponent {
  readonly kpi = input.required<Kpi>();

  protected readonly value = computed(() =>
    formatKpi(this.kpi().value, this.kpi().format)
  );

  protected readonly rising = computed(() => this.kpi().delta >= 0);

  /** A rising churn rate is bad news, so tone follows intent, not direction. */
  protected readonly good = computed(() => {
    const k = this.kpi();
    return k.inverse ? k.delta < 0 : k.delta >= 0;
  });

  protected readonly deltaClass = computed(() =>
    Math.abs(this.kpi().delta) < 0.0005
      ? 'is-flat'
      : this.good()
        ? 'is-up'
        : 'is-down'
  );

  protected readonly deltaText = computed(() => fmt.delta(this.kpi().delta));

  protected readonly tone = computed(() =>
    this.good() ? 'var(--positive)' : 'var(--negative)'
  );

  protected readonly gradientId = computed(() => `spark-${this.kpi().id}`);

  private readonly points = computed(() => {
    const values = this.kpi().spark;
    if (values.length < 2) return [];

    // Downsample to at most 60 points — beyond that the extra path commands are
    // invisible at 96px wide but still cost parse time.
    const step = Math.max(1, Math.ceil(values.length / 60));
    const sampled: number[] = [];
    for (let i = 0; i < values.length; i += step) sampled.push(values[i]);
    sampled.push(values[values.length - 1]);

    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    const span = max - min || 1;

    return sampled.map((v, i) => ({
      x: (i / (sampled.length - 1)) * 100,
      y: 30 - ((v - min) / span) * 28,
    }));
  });

  protected readonly linePath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
  });

  protected readonly areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return `${this.linePath()} L100,32 L0,32 Z`;
  });
}
