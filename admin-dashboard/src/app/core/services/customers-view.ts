import { Injectable, signal } from '@angular/core';

import type { PlanId } from '../models/analytics.model';

export type SortKey = 'name' | 'plan' | 'seats' | 'mrr' | 'health' | 'lastSeen';

/**
 * How the customers table is currently filtered and sorted.
 *
 * This lived inside the table component until the assistant needed to drive it.
 * Nothing about the table changed — the state simply moved somewhere both a
 * click and a tool call can reach, which is the whole point: the assistant is
 * given the controls the user already has, never a private back door.
 */
@Injectable({ providedIn: 'root' })
export class CustomersView {
  readonly query = signal('');
  readonly plan = signal<PlanId | null>(null);
  readonly sort = signal<SortKey>('mrr');
  readonly direction = signal<'asc' | 'desc'>('desc');

  setPlan(plan: PlanId | null): void {
    this.plan.set(plan);
  }

  setQuery(query: string): void {
    this.query.set(query);
  }

  clearQuery(): void {
    this.query.set('');
  }

  toggleSort(key: SortKey): void {
    if (this.sort() === key) {
      this.direction.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sort.set(key);
      this.direction.set(key === 'name' ? 'asc' : 'desc');
    }
  }

  /** Sorts by `key` in a given direction, rather than flipping what is there. */
  sortBy(key: SortKey, direction: 'asc' | 'desc'): void {
    this.sort.set(key);
    this.direction.set(direction);
  }
}
