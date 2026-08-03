/** Domain model for the analytics workspace. */

export type PlanId = 'starter' | 'growth' | 'scale' | 'enterprise';

export type CustomerStatus = 'active' | 'trial' | 'past_due' | 'churned';

export const PLANS: readonly { id: PlanId; label: string; seatPrice: number }[] =
  [
    { id: 'starter', label: 'Starter', seatPrice: 12 },
    { id: 'growth', label: 'Growth', seatPrice: 29 },
    { id: 'scale', label: 'Scale', seatPrice: 79 },
    { id: 'enterprise', label: 'Enterprise', seatPrice: 180 },
  ];

/** One day of recurring-revenue movement. All amounts in whole dollars. */
export interface RevenuePoint {
  /** Epoch milliseconds, UTC midnight. */
  readonly t: number;
  readonly mrr: number;
  readonly newBiz: number;
  readonly expansion: number;
  readonly contraction: number;
  readonly churn: number;
  readonly activeUsers: number;
  readonly trials: number;
}

export interface PlanSlice {
  readonly plan: PlanId;
  readonly label: string;
  readonly customers: number;
  readonly mrr: number;
}

export interface Customer {
  readonly id: number;
  readonly name: string;
  readonly domain: string;
  readonly plan: PlanId;
  readonly status: CustomerStatus;
  readonly seats: number;
  readonly mrr: number;
  /** 0–100. Blend of usage, support load and payment history. */
  readonly health: number;
  readonly country: string;
  readonly signedUp: number;
  readonly lastSeen: number;
}

export type EventKind =
  | 'signup'
  | 'upgrade'
  | 'downgrade'
  | 'churn'
  | 'payment'
  | 'incident';

export interface ActivityEvent {
  readonly id: number;
  readonly kind: EventKind;
  readonly customer: string;
  readonly detail: string;
  readonly amount: number | null;
  readonly t: number;
}

/** Retention grid: `cells[cohortIndex][monthIndex]` as a 0–1 ratio. */
export interface CohortGrid {
  readonly labels: readonly string[];
  readonly sizes: readonly number[];
  readonly cells: readonly (readonly number[])[];
}

export interface Kpi {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly format: 'currency' | 'number' | 'percent';
  /** Period-over-period change as a ratio, e.g. `0.082` for +8.2%. */
  readonly delta: number;
  /** `true` when a falling value is the good outcome (churn, for instance). */
  readonly inverse: boolean;
  readonly spark: readonly number[];
  readonly hint: string;
}

export interface Dataset {
  readonly revenue: readonly RevenuePoint[];
  readonly customers: readonly Customer[];
  readonly plans: readonly PlanSlice[];
  readonly cohorts: CohortGrid;
  readonly events: readonly ActivityEvent[];
  /** Wall-clock milliseconds the generator spent building this dataset. */
  readonly buildMs: number;
}

export type RangeKey = '7d' | '30d' | '90d' | '12m';

export const RANGES: readonly { key: RangeKey; label: string; days: number }[] =
  [
    { key: '7d', label: '7D', days: 7 },
    { key: '30d', label: '30D', days: 30 },
    { key: '90d', label: '90D', days: 90 },
    { key: '12m', label: '12M', days: 365 },
  ];
