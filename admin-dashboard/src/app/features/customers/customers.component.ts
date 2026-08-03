import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Customer,
  CustomerStatus,
  PLANS,
  PlanId,
} from '../../core/models/analytics.model';
import { AnalyticsStore } from '../../core/services/analytics.store';
import { PerfService } from '../../core/services/perf.service';
import { fmt } from '../../core/utils/format';
import { IconComponent } from '../../shared/ui/icon.component';

type SortKey = 'name' | 'plan' | 'seats' | 'mrr' | 'health' | 'lastSeen';

interface Column {
  readonly key: SortKey | null;
  readonly label: string;
  readonly align?: 'end';
}

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'Account' },
  { key: 'plan', label: 'Plan' },
  { key: null, label: 'Status' },
  { key: 'seats', label: 'Seats', align: 'end' },
  { key: 'mrr', label: 'MRR', align: 'end' },
  { key: 'health', label: 'Health' },
  { key: 'lastSeen', label: 'Last seen', align: 'end' },
];

const STATUS_LABEL: Record<CustomerStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  past_due: 'Past due',
  churned: 'Churned',
};

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [ScrollingModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head rise">
      <div>
        <h1>Customers</h1>
        <p>
          {{ fmt.number(total()) }} accounts held in memory, rendered through a
          virtual viewport.
        </p>
      </div>
    </header>

    <section class="toolbar card rise">
      <label class="search">
        <app-icon name="search" [size]="15" />
        <input
          type="search"
          placeholder="Search accounts or domains…"
          [value]="query()"
          (input)="onQuery($event)"
          aria-label="Search accounts"
        />
        @if (query()) {
          <button
            class="clear"
            type="button"
            (click)="clearQuery()"
            aria-label="Clear search"
          >
            <app-icon name="x" [size]="13" />
          </button>
        }
      </label>

      <div class="filters" role="group" aria-label="Filter by plan">
        <button
          class="btn"
          type="button"
          [class.is-active]="plan() === null"
          (click)="setPlan(null)"
        >
          All plans
        </button>
        @for (p of plans; track p.id) {
          <button
            class="btn"
            type="button"
            [class.is-active]="plan() === p.id"
            (click)="setPlan(p.id)"
          >
            {{ p.label }}
          </button>
        }
      </div>

      <p class="result-note">
        <strong>{{ fmt.number(rows().length) }}</strong> matched
        <span class="timing">· filtered in {{ filterMs() }} ms</span>
      </p>
    </section>

    <section class="card table-card">
      <div class="thead" role="row">
        @for (col of columns; track col.label) {
          <button
            class="th"
            type="button"
            [class.is-end]="col.align === 'end'"
            [class.is-sorted]="sort() === col.key"
            [disabled]="!col.key"
            (click)="col.key && toggleSort(col.key)"
          >
            {{ col.label }}
            @if (sort() === col.key) {
              <app-icon
                [name]="direction() === 'asc' ? 'arrow-up' : 'arrow-down'"
                [size]="11"
              />
            }
          </button>
        }
      </div>

      <cdk-virtual-scroll-viewport
        #viewport
        [itemSize]="rowHeight"
        minBufferPx="480"
        maxBufferPx="960"
        class="viewport"
      >
        <div
          class="tr"
          *cdkVirtualFor="let row of rows(); trackBy: trackById; templateCacheSize: 40"
        >
          <div class="td account">
            <span class="avatar" [style.background]="avatar(row.id)">
              {{ row.name.charAt(0) }}
            </span>
            <span class="account-text">
              <span class="account-name">{{ row.name }}</span>
              <span class="account-domain">{{ row.domain }}</span>
            </span>
          </div>

          <div class="td">
            <span class="plan-tag" [attr.data-plan]="row.plan">
              {{ planLabel(row.plan) }}
            </span>
          </div>

          <div class="td">
            <span class="status" [attr.data-status]="row.status">
              <i aria-hidden="true"></i>{{ statusLabel(row.status) }}
            </span>
          </div>

          <div class="td is-end mono">{{ fmt.number(row.seats) }}</div>

          <div class="td is-end mono strong">{{ fmt.currency(row.mrr) }}</div>

          <div class="td">
            <span class="health" [attr.title]="row.health + ' / 100'">
              <span
                class="health-fill"
                [style.width.%]="row.health"
                [attr.data-tone]="healthTone(row.health)"
              ></span>
            </span>
          </div>

          <div class="td is-end muted">{{ fmt.relative(row.lastSeen) }}</div>
        </div>

        @if (!rows().length) {
          <p class="empty">No accounts match “{{ query() }}”.</p>
        }
      </cdk-virtual-scroll-viewport>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1480px;
      margin: 0 auto;
    }

    .page-head {
      margin-bottom: var(--sp-5);
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

    /* ── Toolbar ── */

    .toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
      margin-bottom: var(--sp-4);
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex: 1;
      min-width: 220px;
      height: 34px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--fg-subtle);
      transition: border-color var(--dur-fast) var(--ease-out);
    }

    .search:focus-within {
      border-color: var(--accent);
      color: var(--accent);
    }

    .search input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: none;
      background: none;
      color: var(--fg);
      font: inherit;
      font-size: var(--text-sm);
    }

    .search input::placeholder {
      color: var(--fg-subtle);
    }

    .search input::-webkit-search-cancel-button {
      display: none;
    }

    .clear {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border: 0;
      border-radius: 50%;
      background: var(--surface-active);
      color: var(--fg-muted);
      cursor: pointer;
    }

    .filters {
      display: flex;
      gap: var(--sp-2);
      flex-wrap: wrap;
    }

    .result-note {
      font-size: var(--text-xs);
      color: var(--fg-muted);
      margin-left: auto;
      white-space: nowrap;
    }

    .timing {
      color: var(--fg-subtle);
      font-family: var(--font-mono);
      font-size: var(--text-2xs);
    }

    /* ── Table ──
       A CSS grid rather than <table>: the virtual scroller needs uniform,
       transform-positioned rows, which table layout cannot give us. */

    .table-card {
      overflow: hidden;
    }

    .thead,
    .tr {
      display: grid;
      grid-template-columns:
        minmax(220px, 2.2fr) 110px 116px 84px 116px
        minmax(96px, 1fr) 104px;
      align-items: center;
      gap: var(--sp-3);
      padding: 0 var(--sp-5);
    }

    .thead {
      height: 40px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-elevated);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .th {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 0;
      padding: 0;
      background: none;
      font-size: var(--text-2xs);
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fg-subtle);
      cursor: pointer;
      transition: color var(--dur-fast) var(--ease-out);
    }

    .th:disabled {
      cursor: default;
    }

    .th:not(:disabled):hover,
    .th.is-sorted {
      color: var(--fg);
    }

    .th.is-end {
      justify-content: flex-end;
    }

    .viewport {
      height: min(620px, calc(100dvh - 300px));
      contain: strict;
    }

    .tr {
      height: 52px;
      border-bottom: 1px solid var(--border);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .tr:hover {
      background: var(--surface-hover);
    }

    .td {
      min-width: 0;
      font-size: var(--text-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .td.is-end {
      text-align: right;
    }

    .mono {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--fg-muted);
    }

    .strong {
      color: var(--fg);
      font-weight: 600;
    }

    .muted {
      color: var(--fg-subtle);
      font-size: var(--text-xs);
    }

    .account {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
    }

    .avatar {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      flex: none;
      color: #fff;
      font-size: var(--text-xs);
      font-weight: 650;
    }

    .account-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.25;
    }

    .account-name {
      font-weight: 550;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-domain {
      font-size: var(--text-2xs);
      color: var(--fg-subtle);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .plan-tag {
      display: inline-block;
      padding: 2px var(--sp-2);
      border-radius: var(--radius-sm);
      font-size: var(--text-2xs);
      font-weight: 600;
      background: var(--surface-active);
      color: var(--fg-muted);
    }

    .plan-tag[data-plan='scale'] {
      background: var(--accent-soft);
      color: var(--accent);
    }

    .plan-tag[data-plan='enterprise'] {
      background: linear-gradient(135deg, var(--accent), #a855f7);
      color: #fff;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-xs);
      color: var(--fg-muted);
    }

    .status i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex: none;
      background: var(--fg-subtle);
    }

    .status[data-status='active'] i {
      background: var(--positive);
    }

    .status[data-status='trial'] i {
      background: var(--accent);
    }

    .status[data-status='past_due'] i {
      background: var(--warning);
    }

    .status[data-status='churned'] i {
      background: var(--negative);
    }

    .health {
      display: block;
      height: 5px;
      border-radius: 3px;
      background: var(--surface-active);
      overflow: hidden;
    }

    .health-fill {
      display: block;
      height: 100%;
      border-radius: 3px;
    }

    .health-fill[data-tone='good'] {
      background: var(--positive);
    }

    .health-fill[data-tone='warn'] {
      background: var(--warning);
    }

    .health-fill[data-tone='bad'] {
      background: var(--negative);
    }

    .empty {
      padding: var(--sp-10) var(--sp-5);
      text-align: center;
      color: var(--fg-subtle);
      font-size: var(--text-sm);
    }

    @media (max-width: 1024px) {
      .thead,
      .tr {
        grid-template-columns: minmax(180px, 2fr) 100px 110px 100px;
      }

      .td:nth-child(n + 5),
      .th:nth-child(n + 5) {
        display: none;
      }
    }
  `,
})
export class CustomersComponent {
  private readonly store = inject(AnalyticsStore);
  private readonly perf = inject(PerfService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fmt = fmt;
  protected readonly columns = COLUMNS;
  protected readonly plans = PLANS;
  protected readonly rowHeight = 52;

  protected readonly query = signal('');
  protected readonly plan = signal<PlanId | null>(null);
  protected readonly sort = signal<SortKey>('mrr');
  protected readonly direction = signal<'asc' | 'desc'>('desc');

  private readonly viewport =
    viewChild.required<CdkVirtualScrollViewport>('viewport');

  constructor() {
    // `renderedRangeStream` is a plain observable on the viewport, not an
    // output, so it has to be wired up rather than bound in the template.
    afterNextRender(() => {
      this.viewport()
        .renderedRangeStream.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((range) =>
          this.perf.renderedRows.set(range.end - range.start)
        );
    });
  }

  protected readonly total = computed(() => this.store.customers().length);

  /**
   * Filter and sort run over all 50,000 records on every keystroke.
   *
   * That is deliberate — it demonstrates that the work is cheap enough to do
   * synchronously (typically under 10 ms) when the data is held in memory and
   * the render layer is virtualised. The measured cost is displayed rather than
   * claimed.
   */
  private readonly result = computed<{ rows: readonly Customer[]; ms: number }>(
    () => {
      const started = performance.now();

      const all = this.store.customers();
      const q = this.query().trim().toLowerCase();
      const plan = this.plan();

      let rows = all;

      if (q || plan) {
        rows = all.filter((c) => {
          if (plan && c.plan !== plan) return false;
          if (!q) return true;
          return c.name.toLowerCase().includes(q) || c.domain.includes(q);
        });
      }

      const key = this.sort();
      const dir = this.direction() === 'asc' ? 1 : -1;

      // `slice()` first: never sort the array the store owns.
      rows = rows.slice().sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === 'string' && typeof bv === 'string') {
          return av.localeCompare(bv) * dir;
        }
        return ((av as number) - (bv as number)) * dir;
      });

      return {
        rows,
        ms: Math.round((performance.now() - started) * 10) / 10,
      };
    }
  );

  protected readonly rows = computed(() => this.result().rows);

  /** Cost of the last filter+sort pass, surfaced next to the result count. */
  protected readonly filterMs = computed(() => this.result().ms);

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearQuery(): void {
    this.query.set('');
  }

  protected setPlan(plan: PlanId | null): void {
    this.plan.set(plan);
  }

  protected toggleSort(key: SortKey): void {
    if (this.sort() === key) {
      this.direction.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sort.set(key);
      this.direction.set(key === 'name' ? 'asc' : 'desc');
    }
  }

  protected trackById(_: number, row: Customer): number {
    return row.id;
  }

  protected planLabel(plan: PlanId): string {
    return PLANS.find((p) => p.id === plan)?.label ?? plan;
  }

  protected statusLabel(status: CustomerStatus): string {
    return STATUS_LABEL[status];
  }

  protected healthTone(health: number): string {
    if (health >= 65) return 'good';
    return health >= 35 ? 'warn' : 'bad';
  }

  /** Deterministic avatar tint derived from the account id. */
  protected avatar(id: number): string {
    const hue = (id * 47) % 360;
    return `linear-gradient(135deg, hsl(${hue} 62% 52%), hsl(${
      (hue + 38) % 360
    } 62% 44%))`;
  }
}
