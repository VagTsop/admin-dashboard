import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AnalyticsStore } from './analytics.store';
import { AssistantService } from './assistant.service';
import { CustomersView } from './customers-view';

/**
 * These cover the seams rather than the answers: what the model is allowed to
 * do to the dashboard, and how the panel behaves when the proxy misbehaves.
 */
describe('AssistantService', () => {
  let assistant: AssistantService;
  let store: AnalyticsStore;
  let view: CustomersView;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    assistant = TestBed.inject(AssistantService);
    store = TestBed.inject(AnalyticsStore);
    view = TestBed.inject(CustomersView);
  });

  /** The tool runner is private on purpose; the seam is exercised, not exposed. */
  const run = (name: string, args: Record<string, unknown> = {}) =>
    (assistant as unknown as { runTool(id: string, call: unknown): void }).runTool('m1', {
      name,
      args,
    });

  it('switches the range when asked for a window that exists', () => {
    run('setRange', { range: '7d' });
    expect(store.range()).toBe('7d');
  });

  it('ignores a window that does not exist rather than emptying the screen', () => {
    store.setRange('90d');
    run('setRange', { range: '5y' });
    expect(store.range()).toBe('90d');
  });

  it('filters the customers table to a real plan', () => {
    run('filterCustomers', { plan: 'enterprise' });
    expect(view.plan()).toBe('enterprise');
  });

  it('ignores an invented plan, leaving the table as it was', () => {
    view.setPlan('scale');
    run('filterCustomers', { plan: 'platinum' });
    expect(view.plan()).toBe('scale');
  });

  it('clears the plan filter on "all"', () => {
    view.setPlan('growth');
    run('filterCustomers', { plan: 'all' });
    expect(view.plan()).toBeNull();
  });

  it('caps a runaway search term instead of pasting it into the box', () => {
    run('filterCustomers', { query: 'x'.repeat(500) });
    expect(view.query().length).toBe(60);
  });

  it('sorts only by columns the table actually has', () => {
    view.sortBy('mrr', 'desc');
    run('filterCustomers', { sort: 'revenue_per_seat' });
    expect(view.sort()).toBe('mrr');

    run('filterCustomers', { sort: 'health', direction: 'asc' });
    expect(view.sort()).toBe('health');
    expect(view.direction()).toBe('asc');
  });

  it('records every action it took under the reply', () => {
    assistant.messages.set([
      { id: 'm1', role: 'assistant', text: '', actions: [], streaming: false },
    ]);
    run('setRange', { range: '30d' });
    expect(assistant.messages()[0].actions.length).toBe(1);
    expect(assistant.messages()[0].actions[0]).toContain('30');
  });

  it('sends the model a churn figure precise enough to quote', () => {
    const snapshot = (
      assistant as unknown as { snapshot(): { kpis: { id: string; value: number }[] } }
    ).snapshot();

    const churn = snapshot.kpis.find((k) => k.id === 'churn')!;
    const live = store.kpis().find((k) => k.id === 'churn')!;

    // Two decimals would round 0.0153 to 0.02 and have the model say 2% against
    // a card reading 1.5%. The digest may trim, but never past what is shown.
    expect(Math.abs(churn.value - live.value)).toBeLessThan(0.000_01);
  });

  it('exports the same figures it was allowed to read', () => {
    let csv = '';
    let filename = '';
    // The CSV is captured from the Blob constructor below; the URL is a stub so
    // nothing tries to actually download during a test run.
    spyOn(URL, 'createObjectURL').and.returnValue('blob:stub');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      filename = this.download;
    });

    const original = window.Blob;
    spyOn(window, 'Blob').and.callFake(function (parts: BlobPart[]) {
      csv = String(parts[0]);
      return new original(parts, { type: 'text/csv' });
    } as never);

    store.setRange('30d');
    run('exportReport');

    expect(filename).toContain('atlas-30d-');
    expect(filename.endsWith('.csv')).toBeTrue();
    expect(csv.split('\r\n')[0]).toBe('Metric,Value,Change');
    expect(csv).toContain('Revenue churn');
  });

  it('keeps the dataset itself out of the digest', () => {
    const snapshot = (assistant as unknown as { snapshot(): unknown }).snapshot();
    expect(store.customers().length).toBeGreaterThan(1000);
    expect(JSON.stringify(snapshot).length).toBeLessThan(8_000);
  });
});
