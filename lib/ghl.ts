/**
 * ghl.ts — Server-side GHL API client.
 * This file is NEVER bundled into the browser.
 * All secrets come from process.env (set in .env.local / Vercel dashboard).
 */
import type { LeadPayload, CalendarSlot, SlotsByDate } from './types';

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL ?? '';
const GHL_API_KEY     = process.env.GHL_API_KEY     ?? '';
const GHL_API_BASE    = 'https://services.leadconnectorhq.com';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID ?? '';
const GHL_CALENDAR_ID = process.env.GHL_CALENDAR_ID ?? '';

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

// ── REST API helpers ──────────────────────────────────────────────────────────

// Contacts API version (upsert/tag use this inline — kept here for reference).
// Calendar API uses 2021-04-15 (confirmed from tagGHLContact at bottom of file).
const GHL_HEADERS = () => ({
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Content-Type':  'application/json',
  'Version':       '2021-04-15',   // ← calendar endpoints require 2021-04-15, NOT 2021-07-28
});

/**
 * Upsert a contact in GHL and return the contact's id.
 * Uses the Contacts Upsert endpoint so the same phone never creates duplicates.
 * Belt-and-suspenders: the inbound webhook (sendLeadToGHL) still fires for
 * workflow triggers — this function only supplements it to get a contactId back.
 */
export async function upsertGHLContact(params: {
  firstName: string;
  lastName:  string;
  phone:     string;  // E.164
  email:     string;
  tags?:     string[];
  address?:  string;  // full address string; mapped to address1 in GHL
}): Promise<string | null> {
  if (!GHL_API_KEY) {
    console.error('[GHL] upsertGHLContact: GHL_API_KEY not set — cannot upsert');
    return null;
  }

  // GHL v2 API — private integration Bearer token + Version: 2021-07-28.
  const endpoint = 'https://services.leadconnectorhq.com/contacts/upsert';

  const body: Record<string, unknown> = {
    locationId: process.env.GHL_LOCATION_ID,
    firstName:  params.firstName,
    lastName:   params.lastName,
    phone:      params.phone,
    tags:       params.tags ?? [],
  };

  const email = typeof params.email === 'string' ? params.email.trim() : '';
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    body.email = email;
  }

  if (params.address) {
    body.address1 = params.address;
  }

  console.error('[GHL CLEAN BODY]', body);
  console.error('[GHL REQUEST] Using endpoint:', endpoint);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version':       '2021-07-28',
        'Content-Type':  'application/json',
      },
      body:    JSON.stringify(body),
      cache:   'no-store',
    });
  } catch (err) {
    console.error('[GHL] upsertGHLContact network error:', err);
    return null;
  }

  console.error('[GHL RESPONSE STATUS]', res.status);
  const raw = await res.text();
  console.error('[GHL RAW BODY]', raw);

  if (!res.ok) {
    console.error(`[GHL] upsertGHLContact failed: ${res.status} — ${raw}`);
    return null;
  }

  try {
    const data = JSON.parse(raw);
    console.error('[GHL RAW RESPONSE]', data);
    const contactId =
      data?.contact?.id ||
      data?.contact?.contactId ||
      data?.id ||
      data?.contactId ||
      data?.data?.id ||
      data?.data?.contact?.id ||
      null;
    console.error('[GHL CONTACT ID]', contactId);
    return contactId;
  } catch {
    console.error('[GHL] upsertGHLContact: could not parse response JSON:', raw);
    return null;
  }
}

/**
 * Fetch available appointment slots for the configured calendar.
 * startDate / endDate are Unix timestamps in milliseconds.
 * Returns slots grouped by date string (YYYY-MM-DD) in the given timezone.
 */
export async function getCalendarSlots(params: {
  startDate: number;  // ms timestamp
  endDate:   number;  // ms timestamp
  timezone:  string;  // IANA, e.g. "America/Chicago"
}): Promise<SlotsByDate> {

  // ── Env-var guard ────────────────────────────────────────────────
  console.error('[GHL] getCalendarSlots — calendarId:', GHL_CALENDAR_ID || '⚠️ NOT SET',
    '| apiKey set:', !!GHL_API_KEY,
    '| tz:', params.timezone,
    '| start:', new Date(params.startDate).toISOString(),
    '| end:', new Date(params.endDate).toISOString());

  if (!GHL_API_KEY || !GHL_CALENDAR_ID) {
    console.error('[GHL] ❌ getCalendarSlots blocked — GHL_API_KEY or GHL_CALENDAR_ID missing in env');
    return {};
  }

  // ── Build request ────────────────────────────────────────────────
  const qs  = new URLSearchParams({
    startDate: String(params.startDate),
    endDate:   String(params.endDate),
    timezone:  params.timezone,
  });
  const url = `${GHL_API_BASE}/calendars/${GHL_CALENDAR_ID}/free-slots?${qs.toString()}`;
  console.error('[GHL] getCalendarSlots — request URL:', url);

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: GHL_HEADERS(), cache: 'no-store' });
  } catch (err) {
    console.error('[GHL] getCalendarSlots network error:', err);
    return {};
  }

  // ── Read raw body once so we can log it regardless of status ────
  const raw = await res.text().catch(() => '');
  console.error('[GHL] getCalendarSlots — status:', res.status,
    '| body (first 800):', raw.substring(0, 800));

  if (!res.ok) {
    console.error(`[GHL] getCalendarSlots failed: ${res.status} — ${raw}`);
    return {};
  }

  // ── Parse ────────────────────────────────────────────────────────
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const topKeys = Object.keys(data);
    console.error('[GHL] getCalendarSlots — top-level keys:', topKeys.slice(0, 6));

    // ── Resolve the date map regardless of envelope shape ──────────
    // Format A (documented):  { _dates_: { "YYYY-MM-DD": { slots: [...] } } }
    // Format B (observed):    { "YYYY-MM-DD": { slots: [...] }, ... }
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    let dateMap: Record<string, { slots: string[] }> | null = null;

    if (data._dates_ && typeof data._dates_ === 'object' && !Array.isArray(data._dates_)) {
      // Format A
      console.error('[GHL] getCalendarSlots — detected Format A (_dates_ envelope)');
      dateMap = data._dates_ as Record<string, { slots: string[] }>;
    } else if (topKeys.some(k => DATE_RE.test(k))) {
      // Format B — top-level keys are date strings
      console.error('[GHL] getCalendarSlots — detected Format B (flat date keys)');
      dateMap = {} as Record<string, { slots: string[] }>;
      for (const key of topKeys) {
        if (DATE_RE.test(key)) {
          const val = data[key];
          if (val && typeof val === 'object' && Array.isArray((val as { slots?: unknown }).slots)) {
            dateMap[key] = val as { slots: string[] };
          }
        }
      }
    } else {
      console.error('[GHL] getCalendarSlots — unrecognised response shape. Top keys:', topKeys.slice(0, 10), '| raw:', raw.substring(0, 400));
      return {};
    }

    const dateKeys = Object.keys(dateMap);
    const totalSlots = dateKeys.reduce((n, k) => n + (dateMap![k]?.slots?.length ?? 0), 0);
    console.error('[GHL] getCalendarSlots — dates:', dateKeys.length,
      '| total slots:', totalSlots,
      '| first 2 dates:', dateKeys.slice(0, 2),
      '| sample slots:', dateMap[dateKeys[0]]?.slots?.slice(0, 2) ?? []);

    if (dateKeys.length === 0) {
      console.error('[GHL] getCalendarSlots — dateMap is empty after parsing');
      return {};
    }

    const result: SlotsByDate = {};
    for (const [date, { slots }] of Object.entries(dateMap)) {
      result[date] = slots.map(startIso => {
        const start = new Date(startIso);
        const end   = new Date(start.getTime() + 30 * 60 * 1000);
        return { startTime: startIso, endTime: end.toISOString() } as CalendarSlot;
      });
    }
    return result;

  } catch (parseErr) {
    console.error('[GHL] getCalendarSlots: JSON parse failed:', parseErr, '| raw:', raw.substring(0, 400));
    return {};
  }
}

/**
 * Create an appointment in GHL for a specific contact and time slot.
 * Returns the appointment id on success, null on failure.
 */
export async function createGHLAppointment(params: {
  contactId : string;
  startTime : string;  // ISO 8601
  endTime   : string;  // ISO 8601
  name      : string;
  timezone  : string;
}): Promise<string | null> {
  if (!GHL_API_KEY || !GHL_CALENDAR_ID) {
    console.warn('[GHL] createGHLAppointment: GHL_API_KEY or GHL_CALENDAR_ID not set');
    return null;
  }

  const body = {
    calendarId:     GHL_CALENDAR_ID,
    locationId:     GHL_LOCATION_ID,
    contactId:      params.contactId,
    startTime:      params.startTime,
    endTime:        params.endTime,
    title:          `Solar Consultation — ${params.name}`,
    appointmentStatus: 'confirmed',
    ignoreDateRange:   false,
    toNotify:          true,
  };

  let res: Response;
  try {
    res = await fetch(`${GHL_API_BASE}/calendars/events/appointments`, {
      method:  'POST',
      headers: GHL_HEADERS(),
      body:    JSON.stringify(body),
      cache:   'no-store',
    });
  } catch (err) {
    console.error('[GHL] createGHLAppointment network error:', err);
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[GHL] createGHLAppointment failed: ${res.status} — ${text}`);
    return null;
  }

  try {
    const data = await res.json() as { id?: string; appointment?: { id?: string } };
    return data?.id ?? data?.appointment?.id ?? null;
  } catch {
    console.error('[GHL] createGHLAppointment: could not parse response JSON');
    return null;
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
