import type {
  AssistantChunk,
  AssistantTransport,
  ChatMessage,
  DashboardSnapshot,
  ToolCall,
} from './assistant.types';

/** Handles negatives explicitly — outflows in this dataset are stored negative. */
const money = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(1)}k` : `${sign}$${Math.round(abs)}`;
};
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * Answers questions from the snapshot alone, with no model behind it.
 *
 * This exists so the whole flow — streaming, tool calls, the panel — can be
 * built and reviewed before any API key exists, and so the published demo still
 * responds if the proxy is down or out of quota. Every figure it quotes is read
 * from the snapshot, so it never states anything the dashboard does not show.
 */
export class MockTransport implements AssistantTransport {
  readonly label = 'demo';

  async *send(
    question: string,
    snap: DashboardSnapshot,
    _history: readonly ChatMessage[],
    signal: AbortSignal,
  ): AsyncIterable<AssistantChunk> {
    const { text, toolCall } = this.answer(question, snap);

    // Stream word by word so the panel behaves exactly as it will with Gemini.
    for (const word of text.split(/(\s+)/)) {
      if (signal.aborted) return;
      await sleep(12 + Math.random() * 26);
      yield { text: word };
    }

    if (toolCall) {
      await sleep(120);
      yield { toolCall };
    }
  }

  private answer(question: string, snap: DashboardSnapshot): { text: string; toolCall?: ToolCall } {
    const q = question.toLowerCase();
    const mrr = snap.kpis.find((k) => k.id === 'mrr');
    const months = snap.monthly;
    const last = months.at(-1);
    const prev = months.at(-2);

    // --- money movement -------------------------------------------------
    if (/why|dip|drop|fell|down|change|movement/.test(q) && months.length >= 2 && last && prev) {
      // contraction and churn are stored as negative outflows, so this adds.
      const net = last.newBiz + last.expansion + last.contraction + last.churn;
      const worst = Math.abs(last.contraction) > Math.abs(last.churn) ? 'contraction' : 'churn';
      const worstValue = Math.abs(worst === 'contraction' ? last.contraction : last.churn);
      return {
        text:
          `In ${last.month}, MRR moved by ${money(net)} net. New business added ${money(last.newBiz)} ` +
          `and expansion another ${money(last.expansion)}, but ${worst} took ${money(worstValue)} back out. ` +
          `Against ${prev.month} the swing came mostly from ${worst}, which went from ` +
          `${money(Math.abs(worst === 'contraction' ? prev.contraction : prev.churn))} to ${money(worstValue)}. ` +
          `Worth pulling the 12-month view to see whether that is a trend or a single bad month.`,
        toolCall: { name: 'setRange', args: { range: '12m' } },
      };
    }

    // --- weekly update --------------------------------------------------
    if (/update|summary|report|draft|brief/.test(q)) {
      const churn = snap.kpis.find((k) => k.id === 'churn');
      const users = snap.kpis.find((k) => k.id === 'users');
      return {
        text:
          `Revenue update — ${snap.range} view.\n\n` +
          `MRR stands at ${money(mrr?.value ?? 0)}, ${signed(mrr?.delta ?? 0)} on the previous period. ` +
          `${users ? `Active users are at ${Math.round(users.value).toLocaleString()} (${signed(users.delta)}). ` : ''}` +
          `${churn ? `Churn is running at ${pct(churn.value / 100)}. ` : ''}` +
          `${snap.planMix.length ? `${topPlan(snap)} remains the largest plan by revenue.` : ''}`,
      };
    }

    // --- accounts at risk ------------------------------------------------
    if (/risk|churn|health|call|save|cs\b|retention/.test(q)) {
      if (!snap.atRisk.length) {
        return { text: 'No accounts are currently below the health threshold — nothing to escalate.' };
      }
      const lines = snap.atRisk
        .slice(0, 5)
        .map((c) => `• ${c.name} — ${c.plan}, ${money(c.mrr)} MRR, health ${c.health}/100 (${c.status})`)
        .join('\n');
      const exposure = snap.atRisk.reduce((s, c) => s + c.mrr, 0);
      return {
        text:
          `${snap.atRisk.length} accounts are below a health score of 40, together worth ` +
          `${money(exposure)} of MRR. The ones worth a call first:\n\n${lines}\n\n` +
          `The pattern is concentrated in the larger plans, so a single save is worth more than the count suggests.`,
      };
    }

    // --- plan comparison --------------------------------------------------
    if (/plan|compare|tier|starter|growth|scale|enterprise/.test(q)) {
      const rows = [...snap.planMix]
        .sort((a, b) => b.mrr - a.mrr)
        .map((p) => `• ${p.label} — ${p.customers} customers, ${money(p.mrr)} MRR (${money(p.mrr / Math.max(p.customers, 1))} each)`)
        .join('\n');
      return {
        text: `Plan mix on the ${snap.range} view:\n\n${rows}\n\nRevenue is concentrated at the top; the smaller plans carry the customer count but not the money.`,
      };
    }

    // --- range switches ----------------------------------------------------
    const range = /12\s*m|year|annual/.test(q)
      ? '12m'
      : /90/.test(q)
        ? '90d'
        : /30|month/.test(q)
          ? '30d'
          : /7|week/.test(q)
            ? '7d'
            : null;
    if (range) {
      return {
        text: `Switching the dashboard to the ${range} window.`,
        toolCall: { name: 'setRange', args: { range } },
      };
    }

    // --- fallback ----------------------------------------------------------
    return {
      text:
        `I can only answer from what this dashboard is showing: MRR is ${money(mrr?.value ?? 0)} ` +
        `on the ${snap.range} view, across ${snap.planMix.reduce((s, p) => s + p.customers, 0)} customers. ` +
        `Try asking why revenue moved, which accounts are at risk, or for a written update.`,
    };
  }
}

function topPlan(snap: DashboardSnapshot): string {
  return [...snap.planMix].sort((a, b) => b.mrr - a.mrr)[0]?.label ?? 'The top plan';
}

function signed(delta: number): string {
  return `${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta * 100).toFixed(1)}%`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
