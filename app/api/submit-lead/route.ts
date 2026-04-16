import { NextRequest, NextResponse } from 'next/server';
import { sendLeadToGHL } from '@/lib/ghl';
import type { LeadPayload } from '@/lib/types';

// Simple in-memory rate limiter (resets on cold start — good enough for a landing page)
const RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;          // max submissions per IP per window
const RATE_WINDOW_MS = 60_000; // 1 minute

const TIMEOUT_MS = 5_000; // 5-second max per downstream request

function getRateLimitKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Validation helpers ────────────────────────────────────────────────

function isValidPhone(phone: string): boolean {
  return /^\+1\d{10}$/.test(phone);
}

function isValidPayload(body: unknown): body is LeadPayload & { qualified?: boolean } {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.phone === 'string' &&
    typeof b.is_owner === 'string' &&
    typeof b.location_ok === 'string'
  );
}

// ── Python AI webhook payload ─────────────────────────────────────────
// Shaped to match what michael_agent.py expects on /webhook/inbound
interface PythonPayload {
  first_name:           string;
  phone:                string;
  address:              string;
  bill_tier:            string;
  qualification_status: 'qualified' | 'disqualified';
  source:               'website';
}

function buildPythonPayload(payload: LeadPayload): PythonPayload {
  return {
    first_name:           payload.firstName || '',
    phone:                payload.phone     || '',
    // address is not collected in the form — send city/region from location_ok context
    // Can be enriched later once GHL contact is created
    address:              '',
    bill_tier:            payload.bill_label || payload.bill_amount || '',
    qualification_status: 'qualified',
    source:               'website',
  };
}

// ── Fetch with timeout ────────────────────────────────────────────────
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

// ── POST handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getRateLimitKey(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // For qualified leads, phone is required and must be valid E.164
  const { qualified = true, ...payload } = body as LeadPayload & { qualified?: boolean };
  if (qualified && !isValidPhone(payload.phone)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
  }

  // GHL webhook URL must be set
  if (!process.env.GHL_WEBHOOK_URL) {
    console.error('[submit-lead] GHL_WEBHOOK_URL not set — check Vercel env vars');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // ── Fire both webhooks in parallel, independently ─────────────────
  // Each has its own try/catch so one failure never blocks the other.

  const results = await Promise.allSettled([

    // ── 1. GHL webhook ───────────────────────────────────────────────
    (async () => {
      try {
        await sendLeadToGHL(payload as LeadPayload);
        console.log(`[submit-lead] ✅ GHL webhook succeeded — phone: ${payload.phone}`);
      } catch (err) {
        console.error(`[submit-lead] ❌ GHL webhook failed — phone: ${payload.phone}`, err);
        throw err; // re-throw so Promise.allSettled marks this as rejected
      }
    })(),

    // ── 2. Python AI webhook ─────────────────────────────────────────
    // Only fires for qualified leads (disqualified leads don't need Michael)
    (async () => {
      if (!qualified) {
        console.log('[submit-lead] ⏭️  Python webhook skipped — lead not qualified');
        return;
      }

      // ── URL source of truth: https://michael-agent-2uov.onrender.com/webhook/inbound
      // Set PYTHON_INBOUND_URL in Vercel env vars.  Never use GHL_WEBHOOK_URL here.
      const pythonUrl = process.env.PYTHON_INBOUND_URL ||
        'https://michael-agent-2uov.onrender.com/webhook/inbound';

      if (!pythonUrl) {
        console.warn('[submit-lead] ⚠️  PYTHON_INBOUND_URL not set — skipping Python webhook');
        return;
      }

      const pythonPayload = buildPythonPayload(payload as LeadPayload);

      try {
        const res = await fetchWithTimeout(
          pythonUrl,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(pythonPayload),
            cache:   'no-store',
          },
          TIMEOUT_MS,
        );

        if (res.ok) {
          console.log(
            `[submit-lead] ✅ Python webhook succeeded — phone: ${pythonPayload.phone}`,
            `status: ${res.status}`,
          );
        } else {
          const text = await res.text().catch(() => '');
          console.error(
            `[submit-lead] ❌ Python webhook returned non-OK — phone: ${pythonPayload.phone}`,
            `status: ${res.status}`, text,
          );
          throw new Error(`Python webhook ${res.status}: ${text}`);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.error(
            `[submit-lead] ❌ Python webhook timed out after ${TIMEOUT_MS}ms — phone: ${pythonPayload.phone}`,
          );
        } else {
          console.error(
            `[submit-lead] ❌ Python webhook threw — phone: ${pythonPayload.phone}`, err,
          );
        }
        throw err; // re-throw so Promise.allSettled marks this as rejected
      }
    })(),

  ]);

  // ── Determine response ────────────────────────────────────────────
  const [ghlResult, pythonResult] = results;

  const ghlOk    = ghlResult.status    === 'fulfilled';
  const pythonOk = pythonResult.status === 'fulfilled';

  // GHL is authoritative — if it fails, return 502 to the browser
  // (the form catches this and shows an error to the user)
  if (!ghlOk) {
    return NextResponse.json(
      {
        error:        'Failed to submit lead. Please try again.',
        ghl_ok:       false,
        python_ok:    pythonOk,
      },
      { status: 502 },
    );
  }

  // GHL succeeded — return 200 even if Python had an issue
  // (Michael will still be triggered via GHL; Python failure is non-fatal)
  return NextResponse.json({
    success:   true,
    qualified,
    ghl_ok:    true,
    python_ok: pythonOk,
    // Surface python failure in response so you can debug in Vercel logs
    ...(pythonOk ? {} : { python_warning: 'Python webhook did not succeed — check server logs' }),
  });
}

// ── CORS preflight ────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
