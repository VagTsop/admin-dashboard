import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { RevenuePoint } from '../../core/models/analytics.model';
import { AnalyticsStore } from '../../core/services/analytics.store';
import { ThemeService } from '../../core/services/theme.service';
import { fmt } from '../../core/utils/format';
import { ChartComponent } from '../../shared/charts/chart.component';
import {
  baseOption,
  categoryAxis,
  readChartTokens,
  valueAxis,
  withAlpha,
} from '../../shared/charts/chart-theme';
import { EChartsOption } from '../../shared/charts/echarts.setup';

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head rise">
      <div>
        <h1>Revenue</h1>
        <p>Where recurring revenue came from, and where it leaked.</p>
      </div>
    </header>

    <section class="movement rise" aria-label="Revenue movement">
      @for (item of movement(); track item.label) {
        <article class="card mv">
          <span class="mv-label">{{ item.label }}</span>
          <strong class="mv-value" [style.color]="item.color">
            {{ item.value >= 0 ? '+' : '−'
            }}{{ fmt.currencyCompact(absolute(item.value)) }}
          </strong>
          <span class="mv-share">{{ item.share }} of starting MRR</span>
          <span class="mv-bar" aria-hidden="true">
            <span
              [style.width.%]="item.width"
              [style.background]="item.color"
            ></span>
          </span>
        </article>
      }
    </section>

    <section class="grid">
      <article class="card span-2">
        <div class="card-head">
          <div>
            <h2 class="card-title">MRR movement</h2>
            <p class="card-subtitle">
              New, expansion, contraction and churn per day
            </p>
          </div>
        </div>
        <div class="card-body">
          <app-chart [option]="movementOption()" [height]="320" />
        </div>
      </article>

      <article class="card span-2">
        <div class="card-head">
          <div>
            <h2 class="card-title">Cohort retention</h2>
            <p class="card-subtitle">
              Share of each signup cohort still paying, by month
            </p>
          </div>
        </div>
        <div class="card-body">
          <app-chart [option]="cohortOption()" [height]="360" />
        </div>
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

    .movement {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: var(--sp-4);
      margin-bottom: var(--sp-4);
    }

    .mv {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      padding: var(--sp-4) var(--sp-5);
    }

    .mv-label {
      font-size: var(--text-xs);
      color: var(--fg-muted);
      font-weight: 500;
    }

    .mv-value {
      font-size: var(--text-xl);
      font-weight: 650;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }

    .mv-share {
      font-size: var(--text-2xs);
      color: var(--fg-subtle);
    }

    .mv-bar {
      display: block;
      height: 3px;
      margin-top: var(--sp-2);
      border-radius: 2px;
      background: var(--surface-active);
      overflow: hidden;
    }

    .mv-bar > span {
      display: block;
      height: 100%;
      border-radius: 2px;
      transition: width var(--dur-slow) var(--ease-out);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-4);
    }

    .span-2 {
      grid-column: span 2;
    }

    .card-body {
      padding: var(--sp-4) var(--sp-3) var(--sp-3);
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
export class RevenueComponent {
  protected readonly store = inject(AnalyticsStore);
  private readonly theme = inject(ThemeService);
  protected readonly fmt = fmt;

  private readonly tokens = computed(() => {
    this.theme.theme();
    return readChartTokens();
  });

  protected readonly movement = computed(() => {
    const t = this.tokens();
    const series = this.store.series();
    if (!series.length) return [];

    const base = series[0].mrr || 1;
    const totals = {
      newBiz: sum(series, 'newBiz'),
      expansion: sum(series, 'expansion'),
      contraction: sum(series, 'contraction'),
      churn: sum(series, 'churn'),
    };

    const peak = Math.max(...Object.values(totals).map(Math.abs)) || 1;

    return [
      { label: 'New business', value: totals.newBiz, color: t.viz[0] },
      { label: 'Expansion', value: totals.expansion, color: t.viz[4] },
      { label: 'Contraction', value: totals.contraction, color: t.warning },
      { label: 'Churn', value: totals.churn, color: t.negative },
    ].map((item) => ({
      ...item,
      share: fmt.percent(Math.abs(item.value) / base),
      width: (Math.abs(item.value) / peak) * 100,
    }));
  });

  protected readonly movementOption = computed<EChartsOption>(() => {
    const t = this.tokens();
    const series = this.store.series();
    const labels = series.map((p) => fmt.day(p.t));

    const bar = (
      name: string,
      key: 'newBiz' | 'expansion' | 'contraction' | 'churn',
      color: string
    ) => ({
      name,
      type: 'bar' as const,
      stack: 'movement',
      barMaxWidth: 16,
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
      data: series.map((p) => p[key]),
    });

    return {
      ...baseOption(t),
      tooltip: {
        ...(baseOption(t).tooltip as object),
        valueFormatter: ((v: number) => fmt.currency(v)) as never,
      },
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
      grid: { left: 4, right: 4, top: 24, bottom: 4, containLabel: true },
      xAxis: { ...categoryAxis(t, labels), boundaryGap: true },
      yAxis: valueAxis(t, (v) => fmt.currencyCompact(v)),
      series: [
        bar('New', 'newBiz', t.viz[0]),
        bar('Expansion', 'expansion', t.viz[4]),
        bar('Contraction', 'contraction', t.warning),
        bar('Churn', 'churn', t.negative),
        {
          name: 'Net',
          type: 'line',
          smooth: 0.3,
          showSymbol: false,
          lineStyle: { width: 1.5, color: t.fgMuted, type: 'dashed' },
          data: series.map(
            (p) => p.newBiz + p.expansion + p.contraction + p.churn
          ),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: t.border, width: 1 },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
        },
      ],
    };
  });

  protected readonly cohortOption = computed<EChartsOption>(() => {
    const t = this.tokens();
    const { labels, cells, sizes } = this.store.cohorts();

    const months = Array.from({ length: labels.length }, (_, i) => `M${i}`);
    const data: [number, number, number][] = [];

    cells.forEach((row, cohortIndex) => {
      row.forEach((value, monthIndex) => {
        data.push([monthIndex, cohortIndex, Math.round(value * 1000) / 10]);
      });
    });

    return {
      ...baseOption(t),
      grid: { left: 4, right: 8, top: 10, bottom: 52, containLabel: true },
      tooltip: {
        ...(baseOption(t).tooltip as object),
        trigger: 'item',
        formatter: ((p: { value: [number, number, number] }) => {
          const [month, cohort, value] = p.value;
          return `<strong>${labels[cohort]}</strong> · ${fmt.number(
            sizes[cohort]
          )} accounts<br/>Month ${month}: <strong>${value}%</strong> retained`;
        }) as never,
      },
      xAxis: {
        type: 'category',
        data: months,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.fgSubtle, fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.fgSubtle, fontSize: 10 },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 4,
        itemWidth: 10,
        itemHeight: 90,
        text: ['100%', '0%'],
        textStyle: { color: t.fgSubtle, fontSize: 10 },
        inRange: {
          color: [
            withAlpha(t.viz[0], 0.06),
            withAlpha(t.viz[0], 0.42),
            t.viz[0],
          ],
        },
      },
      series: [
        {
          type: 'heatmap',
          data,
          itemStyle: { borderRadius: 3, borderColor: t.surface, borderWidth: 2 },
          emphasis: {
            itemStyle: { borderColor: t.fg, borderWidth: 1.5 },
          },
          progressive: 0,
        },
      ],
    };
  });

  protected absolute(value: number): number {
    return Math.abs(value);
  }
}

function sum(
  points: readonly RevenuePoint[],
  key: 'newBiz' | 'expansion' | 'contraction' | 'churn'
): number {
  let total = 0;
  for (const p of points) total += p[key];
  return total;
}
