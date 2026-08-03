import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { createDataset } from '../data/dataset.factory';
import {
  Dataset,
  Kpi,
  RANGES,
  RangeKey,
  RevenuePoint,
} from '../models/analytics.model';

/** How often the live feed advances. One timer for the whole application. */
const TICK_MS = 2_000;

/** Days in the notional month used to normalise churn and retention. */
const MONTH_DAYS = 30;

/**
 * Application state for the analytics workspace.
 *
 * Two deliberate choices worth noting:
 *
 * 1. Everything derived is a `computed`, so a range change recalculates exactly
 *    the slices that depend on it and nothing else re-renders.
 * 2. The live feed is a *single* interval that advances one signal. The
 *    previous implementation ran 23 concurrent `interval()` streams, each
 *    re-fetching a static JSON file every few seconds; this does the same job
 *    with one timer and zero network traffic.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsStore {
  private readonly destroyRef = inject(DestroyRef);

  private readonly data = signal<Dataset>(createDataset());

  readonly range = signal<RangeKey>('90d');
  readonly live = signal(true);

  /** Increments on every live tick; exposed so views can show a pulse. */
  readonly ticks = signal(0);

  readonly buildMs = computed(() => this.data().buildMs);
  readonly plans = computed(() => this.data().plans);
  readonly cohorts = computed(() => this.data().cohorts);
  readonly events = computed(() => this.data().events);
  readonly customers = computed(() => this.data().customers);

  /** Revenue points inside the selected range. */
  readonly series = computed<readonly RevenuePoint[]>(() => {
    const all = this.data().revenue;
    const days = RANGES.find((r) => r.key === this.range())!.days;
    return all.slice(Math.max(0, all.length - days));
  });

  /** The equivalent window immediately before `series`, for delta maths. */
  private readonly previousSeries = computed<readonly RevenuePoint[]>(() => {
    const all = this.data().revenue;
    const days = RANGES.find((r) => r.key === this.range())!.days;
    const end = Math.max(0, all.length - days);
    return all.slice(Math.max(0, end - days), end);
  });

  readonly kpis = computed<readonly Kpi[]>(() => {
    const now = this.series();
    const prev = this.previousSeries();
    if (!now.length) return [];

    const last = now[now.length - 1];
    const prevLast = prev.length ? prev[prev.length - 1] : now[0];

    const churnRate = monthlyChurnRate(now);
    const prevChurnRate = prev.length ? monthlyChurnRate(prev) : churnRate;

    const nrr = netRevenueRetention(now);
    const prevNrr = prev.length ? netRevenueRetention(prev) : nrr;

    return [
      {
        id: 'mrr',
        label: 'Monthly recurring revenue',
        value: last.mrr,
        format: 'currency',
        delta: growth(prevLast.mrr, last.mrr),
        inverse: false,
        spark: now.map((p) => p.mrr),
        hint: 'Contracted revenue normalised to a 30-day month.',
      },
      {
        id: 'users',
        label: 'Active users',
        value: last.activeUsers,
        format: 'number',
        delta: growth(prevLast.activeUsers, last.activeUsers),
        inverse: false,
        spark: now.map((p) => p.activeUsers),
        hint: 'Signed in at least once in the trailing 24 hours.',
      },
      {
        id: 'nrr',
        label: 'Net revenue retention',
        value: nrr,
        format: 'percent',
        delta: growth(prevNrr, nrr),
        inverse: false,
        spark: now.map((p) =>
          ratio(
            p.mrr + (p.expansion + p.contraction + p.churn) * MONTH_DAYS,
            p.mrr
          )
        ),
        hint: 'Expansion less contraction and churn, per 30-day month.',
      },
      {
        id: 'churn',
        label: 'Revenue churn',
        value: churnRate,
        format: 'percent',
        delta: growth(prevChurnRate, churnRate),
        inverse: true,
        spark: now.map((p) => ratio(-p.churn * MONTH_DAYS, p.mrr)),
        hint: 'Recurring revenue lost, per 30-day month.',
      },
    ];
  });

  constructor() {
    const timer = setInterval(() => {
      if (!this.live()) return;
      this.advance();
      this.ticks.update((n) => n + 1);
    }, TICK_MS);

    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  setRange(range: RangeKey): void {
    this.range.set(range);
  }

  toggleLive(): void {
    this.live.update((v) => !v);
  }

  /**
   * Moves the most recent day forward. Only the tail is rewritten, so the
   * 730-point history stays referentially stable for the chart's diffing.
   */
  private advance(): void {
    this.data.update((d) => {
      const revenue = d.revenue.slice();
      const last = revenue[revenue.length - 1];
      const drift = 1 + (Math.random() - 0.46) * 0.0015;

      revenue[revenue.length - 1] = {
        ...last,
        mrr: Math.round(last.mrr * drift),
        activeUsers: Math.round(
          last.activeUsers * (1 + (Math.random() - 0.47) * 0.004)
        ),
        newBiz: Math.round(last.newBiz * (1 + (Math.random() - 0.5) * 0.05)),
      };

      return { ...d, revenue };
    });
  }
}

function sum(points: readonly RevenuePoint[], key: keyof RevenuePoint): number {
  let total = 0;
  for (const p of points) total += p[key] as number;
  return total;
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

function growth(from: number, to: number): number {
  return from === 0 ? 0 : (to - from) / Math.abs(from);
}

/**
 * Churn and retention are conventionally quoted per month. The selected range
 * can be 7 days or 12 months, so both are computed as a daily rate and then
 * normalised to a 30-day month — otherwise switching the range would silently
 * change what the number means.
 */
function monthlyChurnRate(points: readonly RevenuePoint[]): number {
  const avgMrr = sum(points, 'mrr') / points.length;
  const dailyChurn = -sum(points, 'churn') / points.length;
  return ratio(dailyChurn * MONTH_DAYS, avgMrr);
}

function netRevenueRetention(points: readonly RevenuePoint[]): number {
  const avgMrr = sum(points, 'mrr') / points.length;
  const dailyMovement =
    (sum(points, 'expansion') +
      sum(points, 'contraction') +
      sum(points, 'churn')) /
    points.length;
  return avgMrr === 0 ? 0 : 1 + (dailyMovement * MONTH_DAYS) / avgMrr;
}
