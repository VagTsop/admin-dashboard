/**
 * Gemini proxy for the Atlas assistant.
 *
 * A static site cannot keep a secret: anything in the bundle is readable with
 * View Source. So the API key lives here as a Worker secret and the browser
 * only ever learns this URL.
 *
 * Deploy:
 *   npm i -g wrangler
 *   wrangler login
 *   wrangler secret put GEMINI_KEY      # paste the AI Studio key when prompted
 *   wrangler deploy
 */

const ALLOWED_ORIGINS = [
  'https://vagtsop.github.io',
  'http://localhost:4200',
  'http://localhost:4360',
];

// An alias rather than a pinned version: Google retired gemini-2.5-flash for
// new keys mid-build, and a portfolio demo should not need maintenance when
// that happens again.
const MODEL = 'gemini-flash-latest';

/** Crude per-IP ceiling so one visitor cannot drain the free tier. */
const MAX_PER_MINUTE = 8;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const window = hits.get(ip)?.filter((t) => now - t < 60_000) ?? [];
  window.push(now);
  hits.set(ip, window);
  return window.length > MAX_PER_MINUTE;
}

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') ?? '';
    const headers = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

    const ip = request.headers.get('cf-connecting-ip') ?? 'anon';
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...headers, 'content-type': 'application/json' },
      });
    }

    // Reject anything oversized before it reaches Google — the client should be
    // sending roughly a kilobyte of aggregates, never a raw dataset.
    const body = await request.text();
    if (body.length > 32_000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...headers, 'content-type': 'application/json' },
      });
    }

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_KEY, 'content-type': 'application/json' },
        body,
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      return new Response(JSON.stringify({ error: 'Upstream failed', status: upstream.status, detail: detail.slice(0, 300) }), {
        status: upstream.status,
        headers: { ...headers, 'content-type': 'application/json' },
      });
    }

    // Stream straight through so the panel can render tokens as they arrive.
    return new Response(upstream.body, {
      headers: {
        ...headers,
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  },
};
