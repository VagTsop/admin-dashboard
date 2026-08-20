import { formatKpi } from '../utils/format';
import { TOOLS } from './gemini-transport';
import type { AssistantChunk, DashboardSnapshot } from './assistant.types';
import { MockTransport } from './mock-transport';

/**
 * The local answerer is the one visitors see whenever Gemini is unreachable, so
 * it is held to the rule the remote one is given: never quote a figure the
 * dashboard does not show, in a form the dashboard would not use.
 */
describe('MockTransport', () => {
  const snapshot: DashboardSnapshot = {
    range: '90d',
    live: true,
    kpis: [
      { id: 'mrr', label: 'Monthly recurring revenue', value: 12_536_405, delta: 0.217, format: 'currency' },
      { id: 'users', label: 'Active users', value: 99_836, delta: 0.225, format: 'number' },
      { id: 'nrr', label: 'Net revenue retention', value: 1.008, delta: 0.001, format: 'percent' },
      { id: 'churn', label: 'Revenue churn', value: 0.0153, delta: -0.08, format: 'percent' },
    ],
    planMix: [
      { plan: 'enterprise', label: 'Enterprise', customers: 737, mrr: 5_600_000 },
      { plan: 'starter', label: 'Starter', customers: 28_725, mrr: 826_100 },
    ],
    monthly: [
      { month: '2026-07', mrr: 12_100_000, newBiz: 280_000, expansion: 240_000, contraction: -60_000, churn: -183_400 },
      { month: '2026-08', mrr: 12_536_405, newBiz: 292_400, expansion: 255_700, contraction: -67_505, churn: -130_070 },
    ],
    atRisk: [
      { name: 'Quanta Networks', plan: 'scale', status: 'past_due', mrr: 4_200, health: 21 },
    ],
  };

  const transport = new MockTransport();

  async function ask(question: string): Promise<{ text: string; tool?: AssistantChunk['toolCall'] }> {
    let text = '';
    let tool: AssistantChunk['toolCall'];
    for await (const chunk of transport.send(question, snapshot, [], new AbortController().signal)) {
      if (chunk.text) text += chunk.text;
      if (chunk.toolCall) tool = chunk.toolCall;
    }
    return { text, tool };
  }

  it('quotes churn exactly as the card formats it', async () => {
    const { text } = await ask('Draft the weekly revenue update');
    // The card renders formatKpi(0.0153, 'percent'). Anything else is a second,
    // disagreeing source of truth — which is the bug this test exists for.
    expect(text).toContain(formatKpi(0.0153, 'percent'));
    expect(text).not.toContain('0.0%');
  });

  it('quotes MRR in the compact form the card uses, not raw thousands', async () => {
    const { text } = await ask('Draft the weekly revenue update');
    expect(text).toContain(formatKpi(12_536_405, 'currency'));
    expect(text).not.toMatch(/\$\d{4,}\.\d k?/);
  });

  it('reads a churn question as a rate, not as a list of accounts', async () => {
    const { text } = await ask('What is our churn rate right now?');
    expect(text).toContain(formatKpi(0.0153, 'percent'));
    expect(text).not.toContain('Quanta Networks');
  });

  it('still lists accounts when the question is about who to call', async () => {
    const { text } = await ask('Which accounts should we call first?');
    expect(text).toContain('Quanta Networks');
  });

  it('names months the way a person would', async () => {
    const { text } = await ask('Why did MRR move this period?');
    expect(text).toContain('August 2026');
    expect(text).not.toContain('2026-08');
  });

  it('treats contraction and churn as outflows rather than subtracting them twice', async () => {
    const { text } = await ask('Why did MRR move this period?');
    // newBiz + expansion + contraction + churn, with the last two already negative.
    expect(text).toContain(formatKpi(292_400 + 255_700 - 67_505 - 130_070, 'currency'));
  });

  it('asks for the wider window when explaining a move', async () => {
    const { tool } = await ask('Why did MRR move this period?');
    expect(tool?.name).toBe('setRange');
    expect(tool?.args['range']).toBe('12m');
  });

  it('puts the accounts on screen instead of only reciting them', async () => {
    const { text, tool } = await ask('Show me the accounts we should call');
    expect(tool?.name).toBe('filterCustomers');
    expect(tool?.args['sort']).toBe('health');
    expect(tool?.args['direction']).toBe('asc');
    expect(text).toContain('Quanta Networks');
  });

  it('narrows to the plan the question named', async () => {
    const { tool } = await ask('Which enterprise accounts are at risk?');
    expect(tool?.args['plan']).toBe('enterprise');
  });

  it('exports offline exactly as it would online', async () => {
    const { tool } = await ask('Export these numbers to a file');
    expect(tool?.name).toBe('exportReport');
  });

  // Eight full answers streamed a word at a time run past Jasmine's default.
  it('emits no tool the remote assistant has not declared', async () => {
    const declared = new Set(TOOLS[0].functionDeclarations.map((d) => d.name));
    const questions = [
      'Why did MRR move this period?',
      'Draft the weekly revenue update',
      'Which accounts should we call first?',
      'Which enterprise accounts are at risk?',
      'Export these numbers to a file',
      'Compare the plans by revenue',
      'Show me the last 12 months',
      'What is our churn rate right now?',
    ];

    for (const question of questions) {
      const { tool } = await ask(question);
      // Drift here is invisible until the proxy goes down and the local
      // answerer turns out to speak a smaller language than the remote one.
      if (tool) expect(declared.has(tool.name)).toBeTrue();
    }
  }, 20_000);

  it('stops mid-answer when the request is aborted', async () => {
    const controller = new AbortController();
    let text = '';
    for await (const chunk of transport.send('Compare the plans by revenue', snapshot, [], controller.signal)) {
      if (chunk.text) text += chunk.text;
      controller.abort();
    }
    // One word arrives before the abort is noticed; the rest must not.
    expect(text.split(/\s+/).filter(Boolean).length).toBeLessThan(3);
  });
});
