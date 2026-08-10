import type { PlanId, RangeKey } from '../models/analytics.model';

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  readonly id: string;
  readonly role: Role;
  /** Grows token by token while a reply streams in. */
  text: string;
  /** Actions the model asked the dashboard to take, shown under the reply. */
  actions: string[];
  streaming: boolean;
  error?: string;
}

/**
 * The compact digest sent with every question.
 *
 * The dataset is 50,000 accounts; none of it is uploaded. What goes over the
 * wire is roughly a kilobyte of already-computed aggregates — the same numbers
 * the user can see — so the model answers about what is on screen and cannot
 * invent a figure that is not in front of it.
 */
export interface DashboardSnapshot {
  readonly range: RangeKey;
  readonly live: boolean;
  readonly kpis: readonly {
    id: string;
    label: string;
    value: number;
    delta: number;
    format: string;
  }[];
  readonly planMix: readonly { plan: PlanId; label: string; customers: number; mrr: number }[];
  readonly monthly: readonly {
    month: string;
    mrr: number;
    newBiz: number;
    expansion: number;
    contraction: number;
    churn: number;
  }[];
  readonly atRisk: readonly {
    name: string;
    plan: PlanId;
    status: string;
    mrr: number;
    health: number;
  }[];
}

/** The functions the model may call. Each maps to something the store can do. */
export interface ToolCall {
  readonly name: 'setRange' | 'toggleLive';
  readonly args: Record<string, unknown>;
}

export interface AssistantChunk {
  /** Text to append to the current reply. */
  readonly text?: string;
  readonly toolCall?: ToolCall;
}

/** Anything that can answer a question — the mock, or Gemini behind a proxy. */
export interface AssistantTransport {
  readonly label: string;
  send(
    question: string,
    snapshot: DashboardSnapshot,
    history: readonly ChatMessage[],
    signal: AbortSignal,
  ): AsyncIterable<AssistantChunk>;
}
