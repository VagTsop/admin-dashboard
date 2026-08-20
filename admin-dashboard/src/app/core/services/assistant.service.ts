import { computed, inject, Injectable, signal } from '@angular/core';

import { RANGES, type RangeKey } from '../models/analytics.model';
import { AnalyticsStore } from './analytics.store';
import type {
  AssistantTransport,
  ChatMessage,
  DashboardSnapshot,
  ToolCall,
} from './assistant.types';
import { GeminiTransport } from './gemini-transport';
import { MockTransport } from './mock-transport';

/**
 * Set this to the deployed proxy URL to talk to Gemini. Left empty, the
 * assistant answers from the snapshot alone, which is what the published demo
 * falls back to if the proxy is unreachable or out of quota.
 *
 * The API key is never here — it lives as a secret inside the proxy.
 */
const PROXY_URL = 'https://atlas-assistant.vatsop52.workers.dev';

const SUGGESTIONS = [
  'Why did MRR move this period?',
  'Draft the weekly revenue update',
  'Which accounts should we call first?',
  'Compare the plans by revenue',
] as const;

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly store = inject(AnalyticsStore);

  private readonly mock = new MockTransport();
  private readonly remote = PROXY_URL ? new GeminiTransport(PROXY_URL) : null;

  /** Flips to the mock for the rest of the session if the proxy fails. */
  private readonly degraded = signal(false);

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  readonly suggestions = SUGGESTIONS;

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
        this.degraded.set(true);
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
