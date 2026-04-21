import { NextRequest, NextResponse } from 'next/server';
import { sendLeadToGHL, upsertGHLContact } from '@/lib/ghl';
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

  // GHL webhook URL must be set in production; in dev, skip GHL and log a warning
  if (!process.env.GHL_WEBHOOK_URL) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[submit-lead] ❌ GHL_WEBHOOK_URL not set — check Vercel env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    console.warn('[submit-lead] ⚠️  GHL_WEBHOOK_URL not set — dev mode, returning mock success');
    console.warn('[submit-lead] payload that would have been sent:', JSON.stringify(payload, null, 2));
    return NextResponse.json({ success: true, qualified, ghl_ok: false, python_ok: false, dev_mode: true, contactId: null });
  }

  // ── Fire webhook + upsert + Python in parallel ────────────────────
  // Each has its own try/catch so one failure never blocks the other.
  // Belt-and-suspenders: webhook keeps existing GHL automations firing;
  // upsert gives us back a contactId for the slot-picker booking flow.

  const results = await Promise.allSettled([

    // ── 1. GHL inbound webhook (keeps automations alive) ────────────
    (async () => {
      try {
        await sendLeadToGHL(payload as LeadPayload);
        console.log(`[submit-lead] ✅ GHL webhook succeeded — phone: ${payload.phone}`);
      } catch (err) {
        console.error(`[submit-lead] ❌ GHL webhook failed — phone: ${payload.phone}`, err);
        throw err;
      }
    })(),

    // ── 2. GHL contact upsert (returns contactId) ────────────────────
    (async (): Promise<string | null> => {
      const p = payload as LeadPayload;
      const contactId = await upsertGHLContact({
        firstName: p.firstName,
        lastName:  p.lastName,
        phone:     p.phone,
        email:     p.email,
        tags:      p.tags,
      });
      if (contactId) {
        console.log(`[submit-lead] ✅ GHL upsert succeeded — contactId: ${contactId}`);
      } else {
        console.warn(`[submit-lead] ⚠️  GHL upsert returned no contactId — phone: ${p.phone}`);
      }
      return contactId;
    })(),

    // ── 3. Python AI webhook ─────────────────────────────────────────
    // Only fires for qualified leads (disqualified leads don't need Michael)
    (async () => {
      if (!qualified) {
        console.log('[submit-lead] ⏭️  Python webhook skipped — lead not qualified');
        return;
      }

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
        throw err;
      }
    })(),

  ]);

  // ── Determine response ────────────────────────────────────────────
  const [ghlResult, upsertResult, pythonResult] = results;

  const ghlOk    = ghlResult.status    === 'fulfilled';
  const pythonOk = pythonResult.status === 'fulfilled';
  const contactId = upsertResult.status === 'fulfilled'
    ? (upsertResult.value as string | null)
    : null;

  // GHL webhook is authoritative — if it fails, return 502
  if (!ghlOk) {
    return NextResponse.json(
      {
        error:      'Failed to submit lead. Please try again.',
        ghl_ok:     false,
        python_ok:  pythonOk,
        contactId:  null,
      },
      { status: 502 },
    );
  }

  // GHL webhook succeeded — return 200 even if Python had an issue
  return NextResponse.json({
    success:    true,
    qualified,
    ghl_ok:     true,
    python_ok:  pythonOk,
    contactId,  // may be null if upsert failed — SlotPicker handles gracefully
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
