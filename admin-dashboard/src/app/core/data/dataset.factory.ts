import {
  ActivityEvent,
  CohortGrid,
  Customer,
  CustomerStatus,
  Dataset,
  EventKind,
  PLANS,
  PlanId,
  PlanSlice,
  RevenuePoint,
} from '../models/analytics.model';

/**
 * Deterministic dataset factory.
 *
 * Everything below is derived from a single integer seed, so the demo renders
 * identical numbers on every machine and every reload — screenshots stay
 * reproducible and the virtualised table can be benchmarked against a stable
 * baseline. Swap this file for real HTTP calls and nothing else changes: the
 * store and the components only ever see `Dataset`.
 */

const DAY = 86_400_000;
const HISTORY_DAYS = 730;
const CUSTOMER_COUNT = 50_000;

/** mulberry32 — small, fast, good enough distribution for synthetic data. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const PREFIX = [
  'North', 'Bright', 'Iron', 'Cobalt', 'Vertex', 'Lumen', 'Quanta', 'Ember',
  'Orbit', 'Nimbus', 'Cedar', 'Harbor', 'Summit', 'Delta', 'Pioneer', 'Vector',
  'Atlas', 'Beacon', 'Cipher', 'Drift', 'Echo', 'Forge', 'Glacier', 'Helix',
];

const SUFFIX = [
  'Labs', 'Works', 'Systems', 'Digital', 'Group', 'Collective', 'Studio',
  'Analytics', 'Robotics', 'Health', 'Logistics', 'Financial', 'Media',
  'Networks', 'Interactive', 'Dynamics',
];

const TLD = ['com', 'io', 'co', 'dev', 'ai', 'net'];

const COUNTRIES = [
  'US', 'GB', 'DE', 'FR', 'NL', 'ES', 'IT', 'GR', 'SE', 'PL', 'CA', 'AU',
  'BR', 'IN', 'JP', 'SG',
];

/**
 * Self-serve tiers dominate the account count while enterprise stays rare —
 * roughly the shape of a product-led SaaS at this scale. The revenue split that
 * falls out (enterprise being ~1.5% of accounts but a large share of MRR) is
 * the point of the plan-mix chart.
 */
const PLAN_WEIGHTS: readonly [PlanId, number][] = [
  ['starter', 0.62],
  ['growth', 0.28],
  ['scale', 0.085],
  ['enterprise', 0.015],
];

/** Seat counts per tier: `base + pow(r, curve) * spread`, long-tailed. */
const SEAT_SHAPE: Record<PlanId, { base: number; spread: number; curve: number }> =
  {
    starter: { base: 1, spread: 6, curve: 2.4 },
    growth: { base: 2, spread: 14, curve: 2.4 },
    scale: { base: 5, spread: 30, curve: 2.4 },
    enterprise: { base: 15, spread: 90, curve: 2.4 },
  };

const STATUS_WEIGHTS: readonly [CustomerStatus, number][] = [
  ['active', 0.78],
  ['trial', 0.09],
  ['past_due', 0.05],
  ['churned', 0.08],
];

function weighted<T>(pairs: readonly [T, number][], r: number): T {
  let acc = 0;
  for (const [value, weight] of pairs) {
    acc += weight;
    if (r < acc) return value;
  }
  return pairs[pairs.length - 1][0];
}

/**
 * Revenue history with a compounding growth trend, weekly seasonality (weekend
 * dips), and two deliberate anomalies — a churn spike and a launch bump — so
 * the charts have something worth looking at rather than a smooth line.
 *
 * The series is generated as a *shape* and then scaled so its final value
 * equals the MRR actually held by the customer list. Without that anchor the
 * headline MRR and the plan-mix chart would disagree, which is the first thing
 * anyone who reads dashboards for a living would notice.
 *
 * Movement rates are daily fractions of MRR chosen to land on believable
 * monthly figures: ~4.2% new, ~3.2% expansion, ~0.8% contraction, ~1.5% churn —
 * which puts net revenue retention slightly above 100%, where a healthy
 * product-led SaaS sits.
 */
function buildRevenue(
  rand: () => number,
  today: number,
  targetEndMrr: number
): RevenuePoint[] {
  const points: RevenuePoint[] = new Array(HISTORY_DAYS);
  let mrr = 214_000;
  let activeUsers = 18_400;

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const t = today - (HISTORY_DAYS - 1 - i) * DAY;
    const dow = new Date(t).getUTCDay();
    const weekend = dow === 0 || dow === 6;

    // Slow compounding growth with noise.
    const trend = 0.0021 + (rand() - 0.5) * 0.0014;

    // Day 470: pricing-page relaunch. Day 600: a payment-provider outage.
    const launch = i > 470 && i < 500 ? 0.0038 : 0;
    const outage = i > 598 && i < 606 ? -0.0092 : 0;

    const seasonal = weekend ? -0.0009 : 0.0004;
    mrr = Math.max(60_000, mrr * (1 + trend + launch + outage + seasonal));

    const newBiz = Math.round(
      mrr * (0.00118 + rand() * 0.00048) * (weekend ? 0.45 : 1)
    );
    const expansion = Math.round(mrr * (0.00092 + rand() * 0.00026));
    const contraction = -Math.round(mrr * (0.00021 + rand() * 0.00012));
    const churn = -Math.round(
      mrr * (0.00042 + rand() * 0.00019) * (outage ? 2.4 : 1)
    );

    activeUsers = Math.max(
      2_000,
      activeUsers * (1 + trend * 1.4 + (weekend ? -0.012 : 0.004) + (rand() - 0.5) * 0.006)
    );

    points[i] = {
      t,
      mrr: Math.round(mrr),
      newBiz,
      expansion,
      contraction,
      churn,
      activeUsers: Math.round(activeUsers),
      trials: Math.round(140 + rand() * 90 - (weekend ? 55 : 0)),
    };
  }

  // Anchor the series to the customer book so headline MRR and plan mix agree.
  const scale = targetEndMrr / points[points.length - 1].mrr;

  return points.map((p) => ({
    ...p,
    mrr: Math.round(p.mrr * scale),
    newBiz: Math.round(p.newBiz * scale),
    expansion: Math.round(p.expansion * scale),
    contraction: Math.round(p.contraction * scale),
    churn: Math.round(p.churn * scale),
  }));
}

function buildCustomers(rand: () => number, today: number): Customer[] {
  const list: Customer[] = new Array(CUSTOMER_COUNT);

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const prefix = PREFIX[(rand() * PREFIX.length) | 0];
    const suffix = SUFFIX[(rand() * SUFFIX.length) | 0];
    const name = `${prefix} ${suffix}`;
    const plan = weighted(PLAN_WEIGHTS, rand());
    const status = weighted(STATUS_WEIGHTS, rand());
    const seatPrice = PLANS.find((p) => p.id === plan)!.seatPrice;

    // Seat counts follow a long tail within each tier: many small teams, a few
    // very large ones, and no starter account with 400 seats.
    const shape = SEAT_SHAPE[plan];
    const seats =
      shape.base + Math.floor(Math.pow(rand(), shape.curve) * shape.spread);

    // Health correlates with status — a past-due account is rarely thriving.
    const healthBase =
      status === 'active' ? 68 : status === 'trial' ? 54 : status === 'past_due' ? 32 : 18;

    const signedUp = today - Math.round(rand() * HISTORY_DAYS) * DAY;

    list[i] = {
      id: 100_000 + i,
      name,
      domain: `${prefix.toLowerCase()}${suffix.toLowerCase()}.${
        TLD[(rand() * TLD.length) | 0]
      }`,
      plan,
      status,
      seats,
      mrr: status === 'churned' ? 0 : seats * seatPrice,
      health: Math.min(100, Math.max(1, Math.round(healthBase + (rand() - 0.4) * 46))),
      country: COUNTRIES[(rand() * COUNTRIES.length) | 0],
      signedUp,
      lastSeen:
        status === 'churned'
          ? signedUp + Math.round(rand() * 90) * DAY
          : today - Math.round(rand() * 14) * DAY,
    };
  }

  return list;
}

function buildPlans(customers: readonly Customer[]): PlanSlice[] {
  return PLANS.map((plan) => {
    let count = 0;
    let mrr = 0;
    for (const c of customers) {
      if (c.plan === plan.id && c.status !== 'churned') {
        count++;
        mrr += c.mrr;
      }
    }
    return { plan: plan.id, label: plan.label, customers: count, mrr };
  });
}

/** 12 monthly cohorts × 12 months of retention, decaying with a plateau. */
function buildCohorts(rand: () => number, today: number): CohortGrid {
  const labels: string[] = [];
  const sizes: number[] = [];
  const cells: number[][] = [];
  const fmt = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });

  for (let c = 11; c >= 0; c--) {
    const d = new Date(today);
    d.setUTCMonth(d.getUTCMonth() - c, 1);
    labels.push(fmt.format(d));
    sizes.push(Math.round(380 + rand() * 520));

    const row: number[] = [];
    const plateau = 0.44 + rand() * 0.16;
    for (let m = 0; m <= c; m++) {
      // Exponential decay towards a per-cohort plateau, plus a little noise.
      const decay = plateau + (1 - plateau) * Math.exp(-m / 2.6);
      row.push(m === 0 ? 1 : Math.min(1, Math.max(0.05, decay + (rand() - 0.5) * 0.05)));
    }
    cells.push(row);
  }

  return { labels, sizes, cells };
}

const EVENT_KINDS: readonly EventKind[] = [
  'signup', 'upgrade', 'payment', 'downgrade', 'churn', 'incident',
];

function buildEvents(
  rand: () => number,
  customers: readonly Customer[],
  now: number
): ActivityEvent[] {
  const detail: Record<EventKind, (c: Customer) => string> = {
    signup: (c) => `Started a ${c.plan} trial · ${c.seats} seats`,
    upgrade: (c) => `Upgraded to ${c.plan}`,
    downgrade: (c) => `Moved down to ${c.plan}`,
    churn: () => 'Cancelled at period end',
    payment: (c) => `Invoice settled · ${c.country}`,
    incident: () => 'Webhook delivery failing',
  };

  const events: ActivityEvent[] = [];
  for (let i = 0; i < 40; i++) {
    const c = customers[(rand() * customers.length) | 0];
    const kind = EVENT_KINDS[(rand() * EVENT_KINDS.length) | 0];
    events.push({
      id: i,
      kind,
      customer: c.name,
      detail: detail[kind](c),
      amount: kind === 'payment' || kind === 'upgrade' ? c.mrr : null,
      // Relative to the actual clock, not the UTC-midnight anchor, so the feed
      // reads "12m ago" rather than "16h ago" the moment the page opens.
      t: now - Math.round(rand() * 8 * 3_600_000),
    });
  }

  return events.sort((a, b) => b.t - a.t);
}

/** Builds the full dataset. Cost is measured so the UI can report it honestly. */
export function createDataset(seed = 20_260_803): Dataset {
  const started = performance.now();
  const rand = rng(seed);

  const now = Date.now();
  // Anchor day-grained data to UTC midnight so the series is stable within a day.
  const today = Math.floor(now / DAY) * DAY;

  // Customers first: their combined MRR is what the revenue series scales to.
  const customers = buildCustomers(rand, today);
  const plans = buildPlans(customers);
  const bookedMrr = plans.reduce((total, p) => total + p.mrr, 0);

  return {
    revenue: buildRevenue(rand, today, bookedMrr),
    customers,
    plans,
    cohorts: buildCohorts(rand, today),
    events: buildEvents(rand, customers, now),
    buildMs: Math.round((performance.now() - started) * 10) / 10,
  };
}

export const DATASET_META = {
  customerCount: CUSTOMER_COUNT,
  historyDays: HISTORY_DAYS,
} as const;
