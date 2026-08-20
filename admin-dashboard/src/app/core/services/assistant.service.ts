import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PLANS, RANGES, type PlanId, type RangeKey } from '../models/analytics.model';
import { AnalyticsStore } from './analytics.store';
import { CustomersView, type SortKey } from './customers-view';
import type {
  AssistantTransport,
  ChatMessage,
  DashboardSnapshot,
  ToolCall,
} from './assistant.types';
import { GeminiTransport, ProxyError } from './gemini-transport';
import { MockTransport } from './mock-transport';

/**
 * Set this to the deployed proxy URL to talk to Gemini. Left empty, the
 * assistant answers from the snapshot alone, which is what the published demo
 * falls back to if the proxy is unreachable or out of quota.
 *
 * The API key is never here — it lives as a secret inside the proxy.
 */
const PROXY_URL = 'https://atlas-assistant.vatsop52.workers.dev';

/** How long the local answerer keeps the conversation after a proxy failure. */
const DEGRADED_MS = 60_000;

/** And after a quota refusal, which a minute will not clear. */
const QUOTA_DEGRADED_MS = 15 * 60_000;

const SORT_KEYS: readonly SortKey[] = ['name', 'plan', 'seats', 'mrr', 'health', 'lastSeen'];

/** Quotes only when it has to, and doubles any quote already inside. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * What the panel can do, in the visitor's terms, with one question that proves
 * each. Shown before the first message: nobody opens a chat box knowing that it
 * also drives the screen behind it, and a blank box invites a bad first try.
 *
 * Every example is answerable by the local transport too, so the introduction
 * still holds when the proxy is out of quota.
 */
const ABILITIES: readonly { what: string; example: string }[] = [
  { what: 'Explain a movement', example: 'Why did MRR move this period?' },
  { what: 'Write the update', example: 'Draft the weekly revenue update' },
  { what: 'Change the time window', example: 'Show me the last 12 months' },
  { what: 'Filter the table', example: 'Which enterprise accounts are at risk?' },
  { what: 'Export what you see', example: 'Export these numbers to a file' },
] as const;

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly store = inject(AnalyticsStore);
  private readonly view = inject(CustomersView);
  private readonly router = inject(Router);

  private readonly mock = new MockTransport();
  private readonly remote = PROXY_URL ? new GeminiTransport(PROXY_URL) : null;

  /**
   * Flips to the mock when the proxy fails, and back again after a cooling-off
   * period. Permanent would be simpler, but a Gemini capacity spike lasts
   * seconds while a visit lasts minutes — one bad moment should not decide what
   * the rest of the visit gets to see.
   */
  private readonly degraded = signal(false);
  private cooldown: ReturnType<typeof setTimeout> | null = null;

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  readonly abilities = ABILITIES;

  readonly mode = computed<'gemini' | 'demo'>(() =>
    this.remote && !this.degraded() ? 'gemini' : 'demo',
  );

  private controller: AbortController | null = null;

  toggle(): void {
    this.open.update((o) => !o);
  }

  close(): void {
    this.open.set(false);
  }

  clear(): void {
    this.stop();
    this.messages.set([]);
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
    this.busy.set(false);
    this.messages.update((list) =>
      list.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  }

  async ask(question: string): Promise<void> {
    const text = question.trim();
    if (!text || this.busy()) return;

    const history = this.messages();
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      actions: [],
      streaming: true,
    };

    this.messages.set([
      ...history,
      { id: crypto.randomUUID(), role: 'user', text, actions: [], streaming: false },
      reply,
    ]);

    this.busy.set(true);
    // Held locally as well: stop() clears the field, and the catch below still
    // needs to know whether this particular request was cancelled.
    const controller = new AbortController();
    this.controller = controller;
    const snapshot = this.snapshot();

    const transport: AssistantTransport =
      this.remote && !this.degraded() ? this.remote : this.mock;

    try {
      for await (const chunk of transport.send(text, snapshot, history, controller.signal)) {
        if (chunk.text) this.append(reply.id, chunk.text);
        if (chunk.toolCall) this.runTool(reply.id, chunk.toolCall);
      }
    } catch (err) {
      // Stop aborts the same fetch a dead proxy would reject: a cancellation is
      // a choice, not an outage, so it must not demote the rest of the session.
      if (controller.signal.aborted) {
        // stop() has already cleared `streaming`; the partial reply stands.
      } else if (transport === this.remote) {
        // A proxy that is down or rate-limited should not end the conversation:
        // drop to the local answerer and retry once, silently.
        this.degrade(err);
        // Whatever tokens arrived before the break are half a sentence; leaving
        // them would run the local answer on from a thought Gemini never
        // finished. Tool calls already ran, so those notes stay.
        this.replace(reply.id, '');
        try {
          for await (const chunk of this.mock.send(text, snapshot, history, controller.signal)) {
            if (chunk.text) this.append(reply.id, chunk.text);
            if (chunk.toolCall) this.runTool(reply.id, chunk.toolCall);
          }
        } catch {
          this.fail(reply.id);
        }
      } else {
        this.fail(reply.id, err);
      }
    } finally {
      this.messages.update((list) =>
        list.map((m) => (m.id === reply.id ? { ...m, streaming: false } : m)),
      );
      // Only if a newer question has not already taken over: stopping one and
      // asking the next immediately would otherwise leave the new request with
      // no controller to abort and the panel showing itself as idle.
      if (this.controller === controller) {
        this.busy.set(false);
        this.controller = null;
      }
    }
  }

  // ------------------------------------------------------------- internals

  private append(id: string, text: string): void {
    this.messages.update((list) =>
      list.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)),
    );
  }

  /**
   * Points the customers table at a subset and shows it.
   *
   * Every argument is checked against the values the table itself accepts:
   * a model that invents a plan name changes nothing rather than emptying the
   * screen. The search term is capped for the same reason.
   */
  private filterCustomers(args: Record<string, unknown>): string {
    const applied: string[] = [];

    const plan = typeof args['plan'] === 'string' ? args['plan'] : undefined;
    if (plan === 'all') {
      this.view.setPlan(null);
      applied.push('all plans');
    } else if (plan && PLANS.some((p) => p.id === plan)) {
      this.view.setPlan(plan as PlanId);
      applied.push(PLANS.find((p) => p.id === plan)!.label);
    }

    if (typeof args['query'] === 'string') {
      const query = args['query'].slice(0, 60);
      this.view.setQuery(query);
      if (query) applied.push(`“${query}”`);
    }

    const sort = args['sort'];
    if (typeof sort === 'string' && SORT_KEYS.includes(sort as SortKey)) {
      const direction = args['direction'] === 'asc' ? 'asc' : 'desc';
      this.view.sortBy(sort as SortKey, direction);
      applied.push(`sorted by ${sort}`);
    }

    // The filter is applied either way; failing to navigate is not worth an
    // unhandled rejection on top of it.
    void this.router.navigate(['/customers']).catch(() => undefined);
    return applied.length
      ? `Filtered the customers table to ${applied.join(', ')}`
      : 'Opened the customers table';
  }

  /**
   * Saves the visible figures as a CSV.
   *
   * The snapshot is the export: whatever the assistant was allowed to read is
   * exactly what lands in the file, so the two can never disagree.
   */
  private exportReport(): string {
    const snap = this.snapshot();
    const rows: string[][] = [
      ['Metric', 'Value', 'Change'],
      ...snap.kpis.map((k) => [k.label, String(k.value), String(k.delta)]),
      [],
      ['Month', 'MRR', 'New business', 'Expansion', 'Contraction', 'Churn'],
      ...snap.monthly.map((m) => [
        m.month,
        String(m.mrr),
        String(m.newBiz),
        String(m.expansion),
        String(m.contraction),
        String(m.churn),
      ]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-${snap.range}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return `Exported the ${snap.range} figures as CSV`;
  }

  /**
   * Hands the next question back to Gemini once the cooling-off period ends.
   *
   * A busy minute is worth waiting out; an exhausted quota is not. 429 means
   * the key is either over its per-minute limit or out of requests for the day,
   * and coming back in a minute to find out which just spends another request
   * on the answer — so that one waits considerably longer.
   */
  private degrade(err: unknown): void {
    const quota = err instanceof ProxyError && err.status === 429;

    this.degraded.set(true);
    if (this.cooldown) clearTimeout(this.cooldown);
    this.cooldown = setTimeout(
      () => {
        this.degraded.set(false);
        this.cooldown = null;
      },
      quota ? QUOTA_DEGRADED_MS : DEGRADED_MS,
    );
  }

  private replace(id: string, text: string): void {
    this.messages.update((list) => list.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  private note(id: string, action: string): void {
    this.messages.update((list) =>
      list.map((m) => (m.id === id ? { ...m, actions: [...m.actions, action] } : m)),
    );
  }

  private fail(id: string, err?: unknown): void {
    const message = err instanceof Error && err.name === 'AbortError' ? 'Stopped.' : 'That request failed.';
    this.messages.update((list) =>
      list.map((m) => (m.id === id ? { ...m, error: message, streaming: false } : m)),
    );
  }

  /**
   * Executes a model-requested action against the store. Everything here is
   * something the user could have clicked; the assistant gets no capability the
   * UI does not already expose.
   */
  private runTool(messageId: string, call: ToolCall): void {
    if (call.name === 'setRange') {
      const range = String(call.args['range']) as RangeKey;
      if (!RANGES.some((r) => r.key === range)) return;
      this.store.setRange(range);
      this.note(messageId, `Switched the range to ${RANGES.find((r) => r.key === range)!.label}`);
      return;
    }

    if (call.name === 'filterCustomers') {
      this.note(messageId, this.filterCustomers(call.args));
      return;
    }

    if (call.name === 'exportReport') {
      this.note(messageId, this.exportReport());
      return;
    }

    if (call.name === 'toggleLive') {
      this.store.toggleLive();
      this.note(messageId, this.store.live() ? 'Resumed the live feed' : 'Paused the live feed');
    }
  }

  /** Builds the ~1 kB digest that travels with each question. */
  private snapshot(): DashboardSnapshot {
    const series = this.store.series();

    // Roll the daily series up to months so the payload stays small and the
    // model reasons about periods rather than noise.
    const buckets = new Map<string, { mrr: number; newBiz: number; expansion: number; contraction: number; churn: number }>();
    for (const p of series) {
      const key = new Date(p.t).toISOString().slice(0, 7);
      const b = buckets.get(key) ?? { mrr: 0, newBiz: 0, expansion: 0, contraction: 0, churn: 0 };
      b.mrr = p.mrr; // last value in the month
      b.newBiz += p.newBiz;
      b.expansion += p.expansion;
      b.contraction += p.contraction;
      b.churn += p.churn;
      buckets.set(key, b);
    }

    return {
      range: this.store.range(),
      live: this.store.live(),
      kpis: this.store.kpis().map((k) => ({
        id: k.id,
        label: k.label,
        // Two decimals is the right trim for dollars and users, and far too
        // coarse for a ratio: churn at 0.0153 would round to 0.02 and be quoted
        // as 2% against a card reading 1.5%. Ratios keep six, which is past the
        // point where a trim could tip the card's own rounding either way.
        value:
          k.format === 'percent'
            ? Math.round(k.value * 1_000_000) / 1_000_000
            : Math.round(k.value * 100) / 100,
        delta: Math.round(k.delta * 1_000_000) / 1_000_000,
        format: k.format,
      })),
      planMix: this.store.plans().map((p) => ({
        plan: p.plan,
        label: p.label,
        customers: p.customers,
        mrr: Math.round(p.mrr),
      })),
      monthly: [...buckets.entries()].map(([month, b]) => ({
        month,
        mrr: Math.round(b.mrr),
        newBiz: Math.round(b.newBiz),
        expansion: Math.round(b.expansion),
        contraction: Math.round(b.contraction),
        churn: Math.round(b.churn),
      })),
      atRisk: this.store
        .customers()
        .filter((c) => c.health < 40)
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 12)
        .map((c) => ({ name: c.name, plan: c.plan, status: c.status, mrr: Math.round(c.mrr), health: c.health })),
    };
  }
}
