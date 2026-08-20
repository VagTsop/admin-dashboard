import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AnalyticsStore } from './analytics.store';

/**
 * The projection is drawn as a dashed continuation of a measured line, so a
 * reader will take it as seriously as the solid part. These pin the properties
 * that make that fair: it follows the trend, it widens with distance, and it
 * never pretends to be data.
 */
describe('AnalyticsStore forecast', () => {
  let store: AnalyticsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    store = TestBed.inject(AnalyticsStore);
    store.toggleLive(); // freeze the feed so the numbers hold still
  });

  it('projects a fifth of the visible window forward', () => {
    store.setRange('30d');
    expect(store.forecast().length).toBe(6);

    store.setRange('90d');
    expect(store.forecast().length).toBe(18);
  });

  it('starts after the last measured day and keeps its spacing', () => {
    store.setRange('30d');
    const series = store.series();
    const forecast = store.forecast();

    const step = series[1].t - series[0].t;
    expect(forecast[0].t).toBe(series.at(-1)!.t + step);
    expect(forecast[1].t - forecast[0].t).toBe(step);
  });

  it('brackets the projection with a band on both sides', () => {
    store.setRange('90d');
    for (const point of store.forecast()) {
      expect(point.lower).toBeLessThan(point.mrr);
      expect(point.upper).toBeGreaterThan(point.mrr);
    }
  });

  it('widens the band the further out it reaches', () => {
    store.setRange('90d');
    const forecast = store.forecast();
    const first = forecast[0].upper - forecast[0].lower;
    const last = forecast.at(-1)!.upper - forecast.at(-1)!.lower;
    expect(last).toBeGreaterThan(first);
  });

  it('continues the trend rather than restating the last value', () => {
    store.setRange('90d');
    const series = store.series();
    const forecast = store.forecast();

    const rising = series.at(-1)!.mrr > series[0].mrr;
    const projectedRising = forecast.at(-1)!.mrr > forecast[0].mrr;
    // Whatever direction the window is going, the dashes go the same way.
    expect(projectedRising).toBe(rising);
  });

  it('draws nothing when there is too little to fit a line to', () => {
    const bare = store as unknown as { series: () => readonly unknown[] };
    spyOn(bare, 'series').and.returnValue([]);
    expect(store.forecast().length).toBe(0);
  });
});
