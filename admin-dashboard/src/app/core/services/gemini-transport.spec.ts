import type { AssistantChunk, DashboardSnapshot } from './assistant.types';
import { GeminiTransport, ProxyError } from './gemini-transport';

/**
 * Written after the deployed demo spent an afternoon in offline mode: Gemini
 * answered one request with 503 "high demand", and a single unretried failure
 * was enough to retire the real assistant for every visitor who arrived next.
 */
describe('GeminiTransport', () => {
  const snapshot = {
    range: '90d',
    live: true,
    kpis: [],
    planMix: [],
    monthly: [],
    atRisk: [],
  } as unknown as DashboardSnapshot;

  const transport = new GeminiTransport('https://proxy.test');
  let calls: number;

  function sse(...frames: object[]): Response {
    const body = frames.map((f) => `data: ${JSON.stringify(f)}\n`).join('\n');
    return new Response(new Blob([body]).stream(), { status: 200 });
  }

  const answer = sse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });

  async function drain(signal = new AbortController().signal): Promise<AssistantChunk[]> {
    const out: AssistantChunk[] = [];
    for await (const chunk of transport.send('q', snapshot, [], signal)) out.push(chunk);
    return out;
  }

  beforeEach(() => {
    calls = 0;
  });

  it('retries a 503 and keeps the answer', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () => {
      calls++;
      return calls === 1 ? new Response('busy', { status: 503 }) : answer.clone();
    });

    const chunks = await drain();
    expect(calls).toBe(2);
    expect(chunks.map((c) => c.text).join('')).toBe('ok');
  });

  it('gives up after the retry rather than hammering the proxy', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () => {
      calls++;
      return new Response('busy', { status: 503 });
    });

    await expectAsync(drain()).toBeRejected();
    expect(calls).toBe(2);
  });

  it('does not retry a 429: neither a spent minute nor a spent day clears in one', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () => {
      calls++;
      return new Response('quota', { status: 429 });
    });

    await expectAsync(drain()).toBeRejectedWithError(/429/);
    expect(calls).toBe(1);
  });

  it('reports the status so the caller can pick how long to stay away', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response('quota', { status: 429 }));

    try {
      await drain();
      fail('expected a rejection');
    } catch (err) {
      expect((err as ProxyError).status).toBe(429);
    }
  });

  it('does not retry a refusal, which will not fix itself', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () => {
      calls++;
      return new Response('bad request', { status: 400 });
    });

    await expectAsync(drain()).toBeRejected();
    expect(calls).toBe(1);
  });

  it('never retries a request the user cancelled', async () => {
    const controller = new AbortController();
    spyOn(globalThis, 'fetch').and.callFake(async () => {
      calls++;
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    });

    await expectAsync(drain(controller.signal)).toBeRejected();
    expect(calls).toBe(1);
  });

  it('drops empty turns from the history it sends', async () => {
    let sent = '';
    spyOn(globalThis, 'fetch').and.callFake(async (_url, init) => {
      sent = String((init as RequestInit).body);
      return answer.clone();
    });

    await (async () => {
      for await (const _ of transport.send(
        'q',
        snapshot,
        [
          { id: 'a', role: 'user', text: 'earlier question', actions: [], streaming: false },
          { id: 'b', role: 'assistant', text: '', actions: [], streaming: false },
        ],
        new AbortController().signal,
      )) {
        // drained for the side effect on `sent`
      }
    })();

    expect(sent).toContain('earlier question');
    // An empty part is a 400 that would take the rest of the session with it.
    expect(sent).not.toContain('{"text":""}');
  });

  it('keeps the model\'s private reasoning off the screen', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () =>
      sse({
        candidates: [
          { content: { parts: [{ text: 'thinking…', thought: true }, { text: 'visible' }] } },
        ],
      }),
    );

    const chunks = await drain();
    expect(chunks.map((c) => c.text).join('')).toBe('visible');
  });

  it('surfaces a function call as a tool the dashboard can run', async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () =>
      sse({
        candidates: [
          { content: { parts: [{ functionCall: { name: 'setRange', args: { range: '12m' } } }] } },
        ],
      }),
    );

    const chunks = await drain();
    expect(chunks[0].toolCall?.name).toBe('setRange');
    expect(chunks[0].toolCall?.args['range']).toBe('12m');
  });
});
