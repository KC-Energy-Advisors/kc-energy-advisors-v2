import { NextRequest, NextResponse } from 'next/server';

// ── Python backend URL ────────────────────────────────────────────────────────
// Set PYTHON_INBOUND_URL in Vercel env vars.
// Falls back to the known Render URL so it still works if the var is missing.
const PYTHON_BASE_URL =
  process.env.PYTHON_INBOUND_URL?.replace(/\/webhook\/inbound$/, '') ||
  'https://michael-agent-2uov.onrender.com';

const TIMEOUT_MS = 8_000; // 8 s — Render cold-starts can be slow

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── POST /api/website-chat ────────────────────────────────────────────────────
// Proxies chat messages from the MeetMichael phone UI to the Python AI backend.
// Keeps the backend URL server-side — never exposed in the client bundle.
export async function POST(req: NextRequest) {
  // Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, name, phone, source, history } = (body as Record<string, unknown>) ?? {};

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  // history: array of {role, content} — passed through to Python so Claude has context
  const safeHistory = Array.isArray(history) ? history : [];

  const targetUrl = `${PYTHON_BASE_URL}/webhook/website-chat`;

  console.log(`[website-chat] → forwarding to ${targetUrl}`, {
    name:           name || 'Website Visitor',
    source:         source || 'website_chat',
    historyLength:  safeHistory.length,
    messagePreview: message.slice(0, 60),
  });

  try {
    const res = await fetchWithTimeout(
      targetUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          name:    name    || 'Website Visitor',
          phone:   phone   || 'web-user',
          source:  source  || 'website_chat',
          history: safeHistory,   // ← conversation history for Claude context
        }),
        cache: 'no-store',
      },
      TIMEOUT_MS,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[website-chat] ❌ Python returned ${res.status}`, text);
      return NextResponse.json(
        { error: `Backend error ${res.status}`, reply: null },
        { status: 502 },
      );
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[website-chat] ✅ Python replied`, {
      mode:  data.mode ?? 'unknown',
      reply: (data.reply ?? '').slice(0, 80),
    });

    return NextResponse.json({ reply: data.reply ?? null, mode: data.mode ?? null });

  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error(`[website-chat] ❌ Python timed out after ${TIMEOUT_MS}ms`);
      return NextResponse.json(
        { error: 'Backend timed out', reply: null },
        { status: 504 },
      );
    }
    console.error('[website-chat] ❌ Unexpected error', err);
    return NextResponse.json(
      { error: 'Internal error', reply: null },
      { status: 500 },
    );
  }
}

// ── CORS preflight ────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
