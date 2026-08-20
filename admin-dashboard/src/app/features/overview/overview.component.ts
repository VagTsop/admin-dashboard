import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AnalyticsStore } from '../../core/services/analytics.store';
import { ThemeService } from '../../core/services/theme.service';
import { fmt } from '../../core/utils/format';
import { ChartComponent } from '../../shared/charts/chart.component';
import {
  areaFade,
  baseOption,
  categoryAxis,
  readChartTokens,
  valueAxis,
  withAlpha,
} from '../../shared/charts/chart-theme';
import { EChartsOption } from '../../shared/charts/echarts.setup';
import { IconComponent, IconName } from '../../shared/ui/icon.component';
import { StatCardComponent } from '../../shared/ui/stat-card.component';
import { EventKind, ForecastPoint } from '../../core/models/analytics.model';

const EVENT_ICON: Record<EventKind, IconName> = {
  signup: 'users',
  upgrade: 'arrow-up',
  downgrade: 'arrow-down',
  churn: 'x',
  payment: 'wallet',
  incident: 'bolt',
};

const EVENT_TONE: Record<EventKind, string> = {
  signup: 'accent',
  upgrade: 'positive',
  downgrade: 'warning',
  churn: 'negative',
  payment: 'positive',
  incident: 'warning',
};

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [ChartComponent, StatCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head rise">
      <div>
        <h1>Overview</h1>
        <p>
          Recurring revenue, retention and account health across
          {{ fmt.number(store.customers().length) }} accounts.
        </p>
      </div>
      <span class="chip">
        <app-icon name="activity" [size]="12" />
        Updated {{ store.live() ? 'live' : 'paused' }}
      </span>
    </header>

    <section class="kpis" aria-label="Key metrics">
      @for (kpi of store.kpis(); track kpi.id) {
        <app-stat-card [kpi]="kpi" class="rise" />
      }
    </section>

    <section class="grid">
      <article class="card span-2">
        <div class="card-head">
          <div>
            <h2 class="card-title">Recurring revenue</h2>
            <p class="card-subtitle">
              MRR with new business overlaid &middot; {{ rangeLabel() }}
            </p>
          </div>
          <strong class="headline">{{ fmt.currency(latestMrr()) }}</strong>
        </div>
        <div class="card-body">
          <app-chart [option]="revenueOption()" [height]="300" />
        </div>
      </article>

      <article class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Plan mix</h2>
            <p class="card-subtitle">Share of active revenue</p>
          </div>
        </div>
        <div class="card-body">
          <app-chart [option]="planOption()" [height]="300" />
        </div>
      </article>

      <article class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Acquisition</h2>
            <p class="card-subtitle">New business vs. trials started</p>
          </div>
        </div>
        <div class="card-body">
          <app-chart [option]="acquisitionOption()" [height]="260" />
        </div>
      </article>

      <article class="card span-2 feed-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Activity</h2>
            <p class="card-subtitle">Last 8 hours</p>
          </div>
        </div>
        <ul class="feed">
          @for (event of store.events().slice(0, 9); track event.id) {
            <li>
              <span class="feed-icon" [attr.data-tone]="tone(event.kind)">
                <app-icon [name]="icon(event.kind)" [size]="12" />
              </span>
              <span class="feed-body">
                <span class="feed-title">{{ event.customer }}</span>
                <span class="feed-detail">{{ event.detail }}</span>
              </span>
              @if (event.amount !== null) {
                <span class="feed-amount">{{ fmt.currency(event.amount) }}</span>
              }
              <time class="feed-time">{{ fmt.relative(event.t) }}</time>
            </li>
          }
        </ul>
      </article>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1480px;
      margin: 0 auto;
    }

    .page-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-4);
      margin-bottom: var(--sp-6);
    }

    h1 {
      font-size: var(--text-lg);
      font-weight: 650;
      letter-spacing: -0.02em;
    }

    .page-head p {
      margin-top: 2px;
      font-size: var(--text-sm);
      color: var(--fg-muted);
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
      gap: var(--sp-4);
      margin-bottom: var(--sp-4);
    }

    /* Stagger the entrance so the row assembles rather than snapping in. */
    .kpis > :nth-child(1) { animation-delay: 0ms; }
    .kpis > :nth-child(2) { animation-delay: 45ms; }
    .kpis > :nth-child(3) { animation-delay: 90ms; }
    .kpis > :nth-child(4) { animation-delay: 135ms; }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--sp-4);
    }

    .span-2 {
      grid-column: span 2;
    }

    .card-body {
      padding: var(--sp-4) var(--sp-3) var(--sp-3);
    }

    .headline {
      font-size: var(--text-md);
      font-weight: 650;
      letter-spacing: -0.015em;
    }

    /* ── Activity feed ── */

    .feed-card .card-head {
      border-bottom: 1px solid var(--border);
    }

    .feed {
      list-style: none;
      margin: 0;
      padding: var(--sp-2) 0;
      max-height: 300px;
      overflow-y: auto;
    }

    .feed li {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-5);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .feed li:hover {
      background: var(--surface-hover);
    }

    .feed-icon {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 7px;
      flex: none;
    }

    .feed-icon[data-tone='accent'] {
      background: var(--accent-soft);
      color: var(--accent);
    }

    .feed-icon[data-tone='positive'] {
      background: var(--positive-soft);
      color: var(--positive);
    }

    .feed-icon[data-tone='negative'] {
      background: var(--negative-soft);
      color: var(--negative);
    }

    .feed-icon[data-tone='warning'] {
      background: var(--warning-soft);
      color: var(--warning);
    }

    .feed-body {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .feed-title {
      font-size: var(--text-sm);
      font-weight: 550;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .feed-detail {
      font-size: var(--text-2xs);
      color: var(--fg-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .feed-amount {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--fg-muted);
      flex: none;
    }

    .feed-time {
      font-size: var(--text-2xs);
      color: var(--fg-subtle);
      flex: none;
      min-width: 54px;
      text-align: right;
    }

    @media (max-width: 1180px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .span-2 {
        grid-column: span 1;
      }
    }
  `,
})
export class OverviewComponent {
  protected readonly store = inject(AnalyticsStore);
  private readonly theme = inject(ThemeService);
  protected readonly fmt = fmt;

  /** Reading the theme signal makes every option below re-derive on a flip. */
  private readonly tokens = computed(() => {
    this.theme.theme();
    return readChartTokens();
  });

  protected readonly latestMrr = computed(() => {
    const s = this.store.series();
    return s.length ? s[s.length - 1].mrr : 0;
  });

  protected readonly rangeLabel = computed(() => {
    const s = this.store.series();
    if (!s.length) return '';
    return `${fmt.day(s[0].t)} – ${fmt.day(s[s.length - 1].t)}`;
  });

  protected readonly revenueOption = computed<EChartsOption>(() => {
    const t = this.tokens();
    const series = this.store.series();
    const forecast = this.store.forecast();
    const labels = [...series.map((p) => fmt.day(p.t)), ...forecast.map((p) => fmt.day(p.t))];

    // Every projected series is padded with nulls across the measured days, so
    // the dashes begin exactly where the solid line stops. The last real point
    // is repeated as the first projected one, or the two would not join up.
    const pad = new Array<number | null>(Math.max(0, series.length - 1)).fill(null);
    const lastMrr = series.length ? series[series.length - 1].mrr : null;
    const project = (pick: (p: ForecastPoint) => number) =>
      forecast.length ? [...pad, lastMrr, ...forecast.map(pick)] : [];

    return {
      ...baseOption(t),
      grid: { left: 8, right: 8, top: 22, bottom: 4, containLabel: true },
      legend: {
        show: true,
        right: 0,
        top: -2,
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        icon: 'roundRect',
        textStyle: { color: t.fgSubtle, fontSize: 11 },
        // The invisible floor of the band is scaffolding, not a series anyone
        // should be offered to toggle.
        data: ['MRR', 'New business', 'Projection'],
      },
      xAxis: categoryAxis(t, labels),
      yAxis: [
        valueAxis(t, (v) => fmt.currencyCompact(v)),
        {
          ...valueAxis(t, (v) => fmt.numberCompact(v)),
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'MRR',
          type: 'line',
          smooth: 0.35,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: t.viz[0] },
          itemStyle: { color: t.viz[0] },
          areaStyle: { color: areaFade(t.viz[0]) },
          data: series.map((p) => p.mrr),
        },
        {
          name: 'New business',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 10,
          itemStyle: {
            color: withAlpha(t.viz[1], 0.55),
            borderRadius: [2, 2, 0, 0],
          },
          data: series.map((p) => p.newBiz),
        },
        // The band is drawn as two stacked areas: an invisible one lifting the
        // floor to the lower bound, then the span between the bounds. Stacking
        // is what keeps the shaded part between them rather than under both.
        {
          name: 'band-floor',
          type: 'line',
          stack: 'forecast-band',
          silent: true,
          showSymbol: false,
          legendHoverLink: false,
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          tooltip: { show: false },
          data: project((p) => p.lower),
        },
        {
          name: 'Projected range',
          type: 'line',
          stack: 'forecast-band',
          silent: true,
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { color: withAlpha(t.viz[0], 0.12) },
          tooltip: { show: false },
          data: project((p) => p.upper - p.lower),
        },
        {
          name: 'Projection',
          type: 'line',
          smooth: 0.35,
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed', color: t.viz[0], opacity: 0.75 },
          itemStyle: { color: t.viz[0] },
          data: project((p) => p.mrr),
        },
      ],
    };
  });

  protected readonly planOption = computed<EChartsOption>(() => {
    const t = this.tokens();
    const plans = this.store.plans();

    return {
      ...baseOption(t),
      tooltip: {
        ...(baseOption(t).tooltip as object),
        trigger: 'item',
        formatter: ((p: { name: string; value: number; percent: number }) =>
          `<strong>${p.name}</strong><br/>${fmt.currency(
            p.value
          )} · ${p.percent.toFixed(1)}%`) as never,
      },
      legend: {
        bottom: 0,
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
        icon: 'circle',
        textStyle: { color: t.fgSubtle, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '82%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderRadius: 6, borderWidth: 0 },
          label: {
            show: true,
            position: 'center',
            formatter: () => `${fmt.currencyCompact(totalMrr(plans))}\nMRR`,
            color: t.fg,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 18,
          },
          emphasis: {
            label: { show: true },
            scaleSize: 6,
          },
          data: plans.map((p, i) => ({
            name: p.label,
            value: p.mrr,
            itemStyle: { color: t.viz[i % t.viz.length] },
          })),
        },
      ],
    };
  });

  protected readonly acquisitionOption = computed<EChartsOption>(() => {
    const t = this.tokens();
    const series = this.store.series();
    const labels = series.map((p) => fmt.day(p.t));

    return {
      ...baseOption(t),
      legend: {
        show: true,
        right: 0,
        top: -2,
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        icon: 'roundRect',
        textStyle: { color: t.fgSubtle, fontSize: 11 },
      },
      grid: { left: 4, right: 4, top: 22, bottom: 4, containLabel: true },
      xAxis: categoryAxis(t, labels),
      yAxis: valueAxis(t, (v) => fmt.numberCompact(v)),
      series: [
        {
          name: 'New business',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: t.viz[4] },
          areaStyle: { color: areaFade(t.viz[4], 0.22) },
          data: series.map((p) => p.newBiz),
        },
        {
          name: 'Trials',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: t.viz[2], type: 'dashed' },
          data: series.map((p) => p.trials),
        },
      ],
    };
  });

  protected icon(kind: EventKind): IconName {
    return EVENT_ICON[kind];
  }

  protected tone(kind: EventKind): string {
    return EVENT_TONE[kind];
  }
}

function totalMrr(plans: readonly { mrr: number }[]): number {
  return plans.reduce((sum, p) => sum + p.mrr, 0);
}
