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

const GHL_HEADERS = () => ({
  'Authorization': `Bearer ${GHL_API_KEY}`,
  'Content-Type':  'application/json',
  'Version':       '2021-07-28',
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
    email:      params.email,
    tags:       params.tags ?? [],
  };

  if (params.address) {
    body.address1 = params.address;
  }

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
      data?.id ||
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
  if (!GHL_API_KEY || !GHL_CALENDAR_ID) {
    console.warn('[GHL] getCalendarSlots: GHL_API_KEY or GHL_CALENDAR_ID not set');
    return {};
  }

  const qs = new URLSearchParams({
    startDate: String(params.startDate),
    endDate:   String(params.endDate),
    timezone:  params.timezone,
  });

  let res: Response;
  try {
    res = await fetch(
      `${GHL_API_BASE}/calendars/${GHL_CALENDAR_ID}/free-slots?${qs.toString()}`,
      { method: 'GET', headers: GHL_HEADERS(), cache: 'no-store' },
    );
  } catch (err) {
    console.error('[GHL] getCalendarSlots network error:', err);
    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[GHL] getCalendarSlots failed: ${res.status} — ${text}`);
    return {};
  }

  try {
    // GHL returns: { _dates_: { "2026-04-22": { slots: ["2026-04-22T09:00:00-05:00", ...] } } }
    const data = await res.json() as {
      _dates_?: Record<string, { slots: string[] }>;
    };
    if (!data._dates_) return {};

    const result: SlotsByDate = {};
    for (const [date, { slots }] of Object.entries(data._dates_)) {
      result[date] = slots.map(startIso => {
        // Each slot is a start time; assume 30-min duration
        const start = new Date(startIso);
        const end   = new Date(start.getTime() + 30 * 60 * 1000);
        return { startTime: startIso, endTime: end.toISOString() } as CalendarSlot;
      });
    }
    return result;
  } catch {
    console.error('[GHL] getCalendarSlots: could not parse response JSON');
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
