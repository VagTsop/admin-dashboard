import type {
  AssistantChunk,
  AssistantTransport,
  ChatMessage,
  DashboardSnapshot,
  ToolCall,
} from './assistant.types';

/** Function declarations the model may call — each mirrors a control the UI already has. */
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'setRange',
        description: 'Change the dashboard time window.',
        parameters: {
          type: 'OBJECT',
          properties: {
            range: {
              type: 'STRING',
              enum: ['7d', '30d', '90d', '12m'],
              description: 'The window to show.',
            },
          },
          required: ['range'],
        },
      },
      {
        name: 'toggleLive',
        description: 'Pause or resume the live data feed.',
        parameters: { type: 'OBJECT', properties: {} },
      },
    ],
  },
];

const SYSTEM = `
You are the analyst built into Atlas, a SaaS analytics dashboard.

Rules, in order of importance:
1. Answer ONLY from the JSON snapshot supplied with the question. It contains
   the same aggregates the user can see on screen.
2. If a figure is not in the snapshot, say you cannot see it. Never estimate,
   extrapolate or invent a number.
3. Be short. Two to four sentences unless asked for a written update.
4. Quote figures the way the dashboard formats them: currency rounded, deltas
   as percentages.
5. When a different time window would answer the question better, call setRange
   rather than telling the user to click it.
6. Plain text only. No markdown, no asterisks, no headings — the panel renders
   text verbatim.

Reading the snapshot:
- In "monthly", contraction and churn are ALREADY NEGATIVE — they are outflows.
  Net movement is newBiz + expansion + contraction + churn. Do not subtract them
  again, and describe their size using the absolute value.
- "kpis[].delta" is a ratio, not a percentage: 0.082 means +8.2%.
- "atRisk" is capped at the twelve largest at-risk accounts, so never present it
  as the complete list.
`.trim();

/**
 * Talks to Gemini through a proxy that holds the API key.
 *
 * The key is deliberately not reachable from here: a static site cannot keep a
 * secret, so the browser only ever sees the proxy URL.
 */
export class GeminiTransport implements AssistantTransport {
  readonly label = 'gemini';

  constructor(private readonly endpoint: string) {}

  async *send(
    question: string,
    snapshot: DashboardSnapshot,
    history: readonly ChatMessage[],
    signal: AbortSignal,
  ): AsyncIterable<AssistantChunk> {
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      tools: TOOLS,
      contents: [
        // Keep a short window of turns so follow-ups work without the payload
        // growing. Empty turns are dropped first: a question stopped before its
        // first token leaves a blank reply behind, and an empty part is a 400
        // that would take the rest of the session down with it.
        ...history
          .filter((m) => m.text.trim().length > 0)
          .slice(-6)
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
        {
          role: 'user',
          parts: [
            { text: `Dashboard snapshot:\n${JSON.stringify(snapshot)}` },
            { text: question },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        // Gemini 3 spends output tokens on internal reasoning before it writes
        // anything, so a tight cap returns an empty reply with MAX_TOKENS.
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok || !res.body) throw new Error(`assistant proxy: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Server-sent events: one JSON payload per `data:` line.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue; // a partial frame; the next read completes it
        }

        for (const chunk of extract(parsed)) yield chunk;
      }
    }
  }
}

/** Pulls text and function calls out of one streamGenerateContent frame. */
function* extract(frame: unknown): Generator<AssistantChunk> {
  const parts =
    (frame as { candidates?: { content?: { parts?: unknown[] } }[] })?.candidates?.[0]?.content
      ?.parts ?? [];

  for (const part of parts) {
    const p = part as {
      text?: string;
      thought?: boolean;
      functionCall?: { name?: string; args?: Record<string, unknown> };
    };
    // Reasoning parts are internal; only the answer belongs on screen.
    if (p.text && !p.thought) yield { text: p.text };
    if (p.functionCall?.name) {
      yield { toolCall: { name: p.functionCall.name, args: p.functionCall.args ?? {} } as ToolCall };
    }
  }
}
