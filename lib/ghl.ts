/**
 * ghl.ts — Server-side GHL API client.
 * This file is NEVER bundled into the browser.
 * All secrets come from process.env (set in .env.local / Vercel dashboard).
 */
import type { LeadPayload, CalendarSlot, SlotsByDate } from './types';

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL ?? '';
const GHL_API_BASE    = 'https://services.leadconnectorhq.com';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID ?? '';
const GHL_CALENDAR_ID = process.env.GHL_CALENDAR_ID ?? '';

// ── Dual API key resolution ───────────────────────────────────────────────────
// GHL_LEAD_API_KEY    → KC Web Lead API    (contacts upsert, tag)
// GHL_BOOKING_API_KEY → KC Booking API     (calendar slots, appointment creation)
// GHL_API_KEY         → legacy single key  (fallback when specific key not set)
//
// All three can live in Vercel → Settings → Environment Variables.
// The specific key always wins; GHL_API_KEY is the safety net.
const GHL_API_KEY         = process.env.GHL_API_KEY         ?? '';
const GHL_LEAD_API_KEY    = process.env.GHL_LEAD_API_KEY    || GHL_API_KEY;
const GHL_BOOKING_API_KEY = process.env.GHL_BOOKING_API_KEY || GHL_API_KEY;

// Human-readable source labels — logged but NEVER the actual token.
const LEAD_KEY_SOURCE    = process.env.GHL_LEAD_API_KEY
  ? 'GHL_LEAD_API_KEY'
  : (GHL_API_KEY ? 'GHL_API_KEY (fallback)' : '⚠️ NOT SET');
const BOOKING_KEY_SOURCE = process.env.GHL_BOOKING_API_KEY
  ? 'GHL_BOOKING_API_KEY'
  : (GHL_API_KEY ? 'GHL_API_KEY (fallback)' : '⚠️ NOT SET');

if (!GHL_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
  console.error('[GHL] GHL_WEBHOOK_URL is not set. Leads will not flow to GHL.');
}
console.error('[GHL] key sources — lead:', LEAD_KEY_SOURCE, '| booking:', BOOKING_KEY_SOURCE);

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

// Calendar endpoints require Version 2021-04-15; contacts use 2021-07-28 inline.
// Accepts an explicit key so each caller passes its own resolved key.
const GHL_HEADERS = (apiKey: string) => ({
  'Authorization': `Bearer ${apiKey}`,
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
  if (!GHL_LEAD_API_KEY) {
    console.error('[GHL] upsertGHLContact: no lead API key set (tried GHL_LEAD_API_KEY, GHL_API_KEY) — cannot upsert');
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
  console.error('[GHL REQUEST] Using endpoint:', endpoint, '| keySource:', LEAD_KEY_SOURCE);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${GHL_LEAD_API_KEY}`,
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
    '| keySource:', BOOKING_KEY_SOURCE,
    '| tz:', params.timezone,
    '| start:', new Date(params.startDate).toISOString(),
    '| end:', new Date(params.endDate).toISOString());

  if (!GHL_BOOKING_API_KEY || !GHL_CALENDAR_ID) {
    console.error('[GHL] ❌ getCalendarSlots blocked — booking API key (GHL_BOOKING_API_KEY / GHL_API_KEY) or GHL_CALENDAR_ID missing');
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
    res = await fetch(url, { method: 'GET', headers: GHL_HEADERS(GHL_BOOKING_API_KEY), cache: 'no-store' });
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
 *
 * FIX LOG (2026-04):
 *   - Added `selectedTimezone` to request body — GHL requires this field;
 *     omitting it causes a validation error and the appointment is never created.
 *   - Added optional `assignedUserId` from GHL_ASSIGNED_USER_ID env var so
 *     the appointment lands on Michael's calendar and triggers his workflow.
 *   - Full diagnostic logging: outgoing body, URL, HTTP status, raw response.
 *   - All logs use console.error so they survive Next.js removeConsole in prod.
 */
export async function createGHLAppointment(params: {
  contactId : string;
  startTime : string;  // ISO 8601
  endTime   : string;  // ISO 8601
  name      : string;
  timezone  : string;  // IANA tz — sent as selectedTimezone per GHL API spec
}): Promise<string | null> {
  if (!GHL_BOOKING_API_KEY || !GHL_CALENDAR_ID) {
    console.error('[GHL] createGHLAppointment: booking API key (GHL_BOOKING_API_KEY / GHL_API_KEY) or GHL_CALENDAR_ID not set — cannot book');
    return null;
  }

  // ── Build request body ───────────────────────────────────────────
  // `selectedTimezone` is required by GHL — without it GHL rejects with 422.
  // `assignedUserId`   assigns the appointment to Michael so his workflow fires.
  // `toNotify: true`   triggers GHL's built-in confirmation email/SMS to contact.
  const body: Record<string, unknown> = {
    calendarId:        GHL_CALENDAR_ID,
    locationId:        GHL_LOCATION_ID,
    contactId:         params.contactId,
    startTime:         params.startTime,
    endTime:           params.endTime,
    selectedTimezone:  params.timezone,   // ← WAS MISSING — root cause of booking failure
    title:             `Solar Consultation — ${params.name}`,
    appointmentStatus: 'confirmed',
    ignoreDateRange:   false,
    toNotify:          true,
  };

  // Attach to Michael's GHL user account if env var is configured.
  // Set GHL_ASSIGNED_USER_ID in Vercel → Settings → Environment Variables.
  const assignedUserId = process.env.GHL_ASSIGNED_USER_ID;
  if (assignedUserId) {
    body.assignedUserId = assignedUserId;
  }

  const url = `${GHL_API_BASE}/calendars/events/appointments`;

  // ── Diagnostic log: outgoing request ────────────────────────────
  console.error('[GHL] createGHLAppointment → REQUEST',
    '| url:', url,
    '| keySource:', BOOKING_KEY_SOURCE,
    '| calendarId:', GHL_CALENDAR_ID,
    '| locationId:', GHL_LOCATION_ID,
    '| contactId:', params.contactId,
    '| startTime:', params.startTime,
    '| endTime:', params.endTime,
    '| selectedTimezone:', params.timezone,
    '| assignedUserId:', assignedUserId ?? '(not set)',
    '| toNotify: true',
  );

  let res: Response;
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: GHL_HEADERS(GHL_BOOKING_API_KEY),
      body:    JSON.stringify(body),
      cache:   'no-store',
    });
  } catch (err) {
    console.error('[GHL] createGHLAppointment network error:', err);
    return null;
  }

  // ── Read body once — needed for both logging and parsing ─────────
  const raw = await res.text().catch(() => '');

  // ── Diagnostic log: response ─────────────────────────────────────
  console.error('[GHL] createGHLAppointment → RESPONSE',
    '| status:', res.status,
    '| ok:', res.ok,
    '| body (first 1000):', raw.substring(0, 1000),
  );

  if (!res.ok) {
    // ── 422 + assignedUserId present → retry without it ──────────────
    if (res.status === 422 && assignedUserId) {
      console.error('[GHL] createGHLAppointment: HTTP 422 with assignedUserId — likely not a calendar team member.',
        '| calendarId:', GHL_CALENDAR_ID,
        '| assignedUserId:', assignedUserId,
        '| full error body:', raw,
        '| Retrying WITHOUT assignedUserId…',
      );

      // Build a clean body without assignedUserId
      const retryBody: Record<string, unknown> = {
        calendarId:        GHL_CALENDAR_ID,
        locationId:        GHL_LOCATION_ID,
        contactId:         params.contactId,
        startTime:         params.startTime,
        endTime:           params.endTime,
        selectedTimezone:  params.timezone,
        title:             `Solar Consultation — ${params.name}`,
        appointmentStatus: 'confirmed',
        ignoreDateRange:   false,
        toNotify:          true,
      };

      console.error('[GHL] createGHLAppointment → RETRY REQUEST',
        '| url:', url,
        '| calendarId:', GHL_CALENDAR_ID,
        '| contactId:', params.contactId,
        '| startTime:', params.startTime,
        '| assignedUserId: OMITTED',
      );

      let retryRes: Response;
      try {
        retryRes = await fetch(url, {
          method:  'POST',
          headers: GHL_HEADERS(GHL_BOOKING_API_KEY),
          body:    JSON.stringify(retryBody),
          cache:   'no-store',
        });
      } catch (retryErr) {
        console.error('[GHL] createGHLAppointment retry network error:', retryErr);
        return null;
      }

      const retryRaw = await retryRes.text().catch(() => '');

      console.error('[GHL] createGHLAppointment → RETRY RESPONSE',
        '| status:', retryRes.status,
        '| ok:', retryRes.ok,
        '| body (first 1000):', retryRaw.substring(0, 1000),
      );

      if (!retryRes.ok) {
        console.error('[GHL] createGHLAppointment RETRY ALSO FAILED — HTTP', retryRes.status,
          '| contactId:', params.contactId,
          '| full error body:', retryRaw,
        );
        return null;
      }

      // Retry succeeded — parse and return
      try {
        const retryData = JSON.parse(retryRaw) as {
          id?:          string;
          appointment?: { id?: string };
        };
        const retryId = retryData?.appointment?.id ?? retryData?.id ?? null;
        if (retryId) {
          console.error('[GHL] createGHLAppointment RETRY SUCCESS (no assignedUserId) — appointmentId:', retryId,
            '| contactId:', params.contactId,
            '| startTime:', params.startTime,
          );
        } else {
          console.error('[GHL] createGHLAppointment retry: HTTP 2xx but no id — raw:', retryRaw.substring(0, 400));
        }
        return retryId;
      } catch (retryParseErr) {
        console.error('[GHL] createGHLAppointment retry: JSON parse failed —', retryParseErr, '| raw:', retryRaw.substring(0, 400));
        return null;
      }
    }

    // ── Non-422 failure (or 422 without assignedUserId) ───────────────
    console.error(`[GHL] createGHLAppointment FAILED — HTTP ${res.status}`,
      '| contactId:', params.contactId,
      '| full error body:', raw,
    );
    return null;
  }

  // ── Parse appointment id ─────────────────────────────────────────
  // GHL returns: { appointment: { id: "...", ... } }
  // Belt-and-suspenders: also check top-level id in case shape changes.
  try {
    const data = JSON.parse(raw) as {
      id?:           string;
      appointment?:  { id?: string };
    };

    const appointmentId =
      data?.appointment?.id ??
      data?.id ??
      null;

    if (appointmentId) {
      console.error('[GHL] createGHLAppointment SUCCESS — appointmentId:', appointmentId,
        '| contactId:', params.contactId,
        '| startTime:', params.startTime,
      );
    } else {
      console.error('[GHL] createGHLAppointment: HTTP 2xx but no id in response — raw:', raw.substring(0, 400));
    }

    return appointmentId;

  } catch (parseErr) {
    console.error('[GHL] createGHLAppointment: could not parse response JSON —', parseErr, '| raw:', raw.substring(0, 400));
    return null;
  }
}

/**
 * Apply tags to a GHL contact by contactId.
 * Used by the API route when we need to tag a disqualified lead.
 */
export async function tagGHLContact(contactId: string, tags: string[]): Promise<void> {
  if (!GHL_LEAD_API_KEY) {
    console.error('[GHL] tagGHLContact: no lead API key set (tried GHL_LEAD_API_KEY, GHL_API_KEY) — skipping tag');
    return;
  }

  console.error('[GHL] tagGHLContact — contactId:', contactId, '| tags:', tags, '| keySource:', LEAD_KEY_SOURCE);

  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method:  'PUT',
    headers: {
      'Authorization':  `Bearer ${GHL_LEAD_API_KEY}`,
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
