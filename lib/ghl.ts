/**
 * ghl.ts — Server-side GHL API client.
 * This file is NEVER bundled into the browser.
 * All secrets come from process.env (set in .env.local / Vercel dashboard).
 */
import type { LeadPayload } from './types';

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL ?? '';
const GHL_API_KEY     = process.env.GHL_API_KEY     ?? '';
const GHL_API_BASE    = 'https://services.leadconnectorhq.com';

if (!GHL_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
  console.error('[GHL] GHL_WEBHOOK_URL is not set. Leads will not flow to GHL.');
}

/**
 * Send a qualified lead payload to the GHL inbound webhook.
 * GHL Workflow 1 listens on this webhook and triggers the Michael AI sequence.
 */
export async function sendLeadToGHL(payload: LeadPayload): Promise<void> {
  if (!GHL_WEBHOOK_URL) {
    console.warn('[GHL] No webhook URL configured — payload logged instead:', payload);
    return;
  }

  const res = await fetch(GHL_WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    // Next.js fetch cache — we never want to cache a lead submission
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GHL webhook failed: ${res.status} ${res.statusText} — ${body}`);
  }
}

/**
 * Apply tags to a GHL contact by contactId.
 * Used by the API route when we need to tag a disqualified lead.
 */
export async function tagGHLContact(contactId: string, tags: string[]): Promise<void> {
  if (!GHL_API_KEY) return;

  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method:  'PUT',
    headers: {
      'Authorization':  `Bearer ${GHL_API_KEY}`,
      'Content-Type':   'application/json',
      'Version':        '2021-04-15',
    },
    body:  JSON.stringify({ tags }),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[GHL] Tag update failed for ${contactId}: ${res.status}`);
  }
}
