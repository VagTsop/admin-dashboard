import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AnalyticsStore } from './analytics.store';

describe('AnalyticsStore', () => {
  let store: AnalyticsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    store = TestBed.inject(AnalyticsStore);
  });

  it('slices the series to the selected range', () => {
    store.setRange('7d');
    expect(store.series().length).toBe(7);

    store.setRange('90d');
    expect(store.series().length).toBe(90);
  });

  it('always ends the window on the most recent day', () => {
    store.setRange('30d');
    const last30 = store.series().at(-1);

    store.setRange('12m');
    expect(store.series().at(-1)).toEqual(last30);
  });

  it('publishes one KPI per headline metric', () => {
    const ids = store.kpis().map((k) => k.id);
    expect(ids).toEqual(['mrr', 'users', 'nrr', 'churn']);
  });

  it('marks churn as an inverse metric so a rise reads as bad', () => {
    const churn = store.kpis().find((k) => k.id === 'churn');
    expect(churn?.inverse).toBeTrue();

    const mrr = store.kpis().find((k) => k.id === 'mrr');
    expect(mrr?.inverse).toBeFalse();
  });

  it('gives every KPI a sparkline matching the range length', () => {
    store.setRange('30d');
    for (const kpi of store.kpis()) {
      expect(kpi.spark.length).toBe(30);
    }
  });

  it('pauses and resumes the live feed', () => {
    expect(store.live()).toBeTrue();
    store.toggleLive();
    expect(store.live()).toBeFalse();
  });
});
