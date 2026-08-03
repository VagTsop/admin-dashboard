import { DATASET_META, createDataset } from './dataset.factory';

describe('createDataset', () => {
  it('is deterministic for a given seed', () => {
    const a = createDataset(42);
    const b = createDataset(42);

    expect(a.revenue).toEqual(b.revenue);
    expect(a.customers[0]).toEqual(b.customers[0]);
    expect(a.customers.at(-1)).toEqual(b.customers.at(-1));
  });

  it('produces different data for a different seed', () => {
    const a = createDataset(1);
    const b = createDataset(2);

    expect(a.revenue[0].mrr).not.toBe(b.revenue[0].mrr);
  });

  it('builds the advertised volume', () => {
    const data = createDataset();

    expect(data.customers.length).toBe(DATASET_META.customerCount);
    expect(data.revenue.length).toBe(DATASET_META.historyDays);
  });

  it('keeps revenue movement directionally coherent', () => {
    const { revenue } = createDataset();

    for (const point of revenue) {
      expect(point.mrr).toBeGreaterThan(0);
      expect(point.newBiz).toBeGreaterThanOrEqual(0);
      expect(point.expansion).toBeGreaterThanOrEqual(0);
      // Contraction and churn are always losses.
      expect(point.contraction).toBeLessThanOrEqual(0);
      expect(point.churn).toBeLessThanOrEqual(0);
    }
  });

  it('zeroes MRR for churned accounts only', () => {
    const { customers } = createDataset();
    const churned = customers.filter((c) => c.status === 'churned');
    const live = customers.filter((c) => c.status !== 'churned');

    expect(churned.length).toBeGreaterThan(0);
    expect(churned.every((c) => c.mrr === 0)).toBeTrue();
    expect(live.every((c) => c.mrr > 0)).toBeTrue();
  });

  it('retention never rises above the cohort it started from', () => {
    const { cohorts } = createDataset();

    for (const row of cohorts.cells) {
      expect(row[0]).toBe(1);
      expect(Math.max(...row)).toBeLessThanOrEqual(1);
    }
  });
});
