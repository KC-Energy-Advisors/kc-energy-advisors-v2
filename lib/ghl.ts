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

// Phone number that receives internal booking SMS notifications (Michael's number).
// Set INTERNAL_NOTIFICATION_PHONE in Vercel env vars. If unset, notifications are skipped.
const INTERNAL_NOTIFICATION_PHONE = process.env.INTERNAL_NOTIFICATION_PHONE ?? '';

// ── GHL custom field identifiers ─────────────────────────────────────────────
// Default to the exact key names from GHL → Settings → Custom Fields → "Key" column.
// These are the same identifiers used in workflow merge tags:
//   {{contact.average_cost_per_month_for_electricity}}
//   {{contact.roof_type}}
//   {{contact.do_you_own_your_home}}
//   {{contact.decision_stage}}
//   {{contact.property_address}}
//
// GHL resolves custom fields by key name in the customField array.
// If GHL ever rejects key names and demands opaque UUIDs, set the corresponding
// env var in Vercel → Settings → Environment Variables to override the default.
const CF_MONTHLY_BILL    = process.env.GHL_CF_MONTHLY_BILL    || 'average_cost_per_month_for_electricity';
const CF_ROOF_TYPE       = process.env.GHL_CF_ROOF_TYPE       || 'roof_type';
const CF_OWNS_HOME       = process.env.GHL_CF_OWNS_HOME       || 'do_you_own_your_home';
const CF_DECISION_STAGE  = process.env.GHL_CF_DECISION_STAGE  || 'decision_stage';
const CF_PROPERTY_ADDR   = process.env.GHL_CF_PROPERTY_ADDRESS || 'property_address';

if (!GHL_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
  console.error('[GHL] GHL_WEBHOOK_URL is not set. Leads will not flow to GHL.');
}
console.error('[GHL] key sources — lead:', LEAD_KEY_SOURCE, '| booking:', BOOKING_KEY_SOURCE,
  '| internalNotifyPhone:', INTERNAL_NOTIFICATION_PHONE ? '✓ set' : '(not set — booking SMS disabled)',
);
console.error(
  '[GHL] custom field identifiers —',
  '| average_cost_per_month_for_electricity:', CF_MONTHLY_BILL,
  '| roof_type:', CF_ROOF_TYPE,
  '| do_you_own_your_home:', CF_OWNS_HOME,
  '| decision_stage:', CF_DECISION_STAGE,
  '| property_address:', CF_PROPERTY_ADDR,
);

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
 * Build the customField array for a GHL contact upsert or update.
 * Uses the exact field key names from GHL Settings → Custom Fields.
 * The `id` field in each entry accepts both opaque UUIDs and key names.
 *
 * Merge tag → field key mapping:
 *   {{contact.average_cost_per_month_for_electricity}} → CF_MONTHLY_BILL
 *   {{contact.roof_type}}                             → CF_ROOF_TYPE
 *   {{contact.do_you_own_your_home}}                  → CF_OWNS_HOME
 *   {{contact.decision_stage}}                        → CF_DECISION_STAGE
 *   {{contact.property_address}}                      → CF_PROPERTY_ADDR
 */
function buildCustomFields(params: {
  isOwner?:    string;   // 'yes' | 'no'
  billLabel?:  string;   // human label e.g. '$150–$200/mo'
  roofType?:   string;   // code e.g. 'asphalt'
  timeline?:   string;   // code e.g. 'ready'
  address?:    string;   // full property address string
}): Array<{ id: string; field_value: string }> {
  const fields: Array<{ id: string; field_value: string }> = [];

  if (params.billLabel) {
    fields.push({ id: CF_MONTHLY_BILL,   field_value: params.billLabel });
  }
  if (params.roofType) {
    fields.push({ id: CF_ROOF_TYPE,      field_value: ROOF_LABELS[params.roofType]    ?? params.roofType });
  }
  if (params.isOwner) {
    fields.push({ id: CF_OWNS_HOME,      field_value: params.isOwner === 'yes' ? 'Yes' : 'No' });
  }
  if (params.timeline) {
    fields.push({ id: CF_DECISION_STAGE, field_value: TIMELINE_LABELS[params.timeline] ?? params.timeline });
  }
  if (params.address) {
    fields.push({ id: CF_PROPERTY_ADDR,  field_value: params.address });
  }

  return fields;
}

/**
 * Upsert a contact in GHL and return the contact's id.
 * Uses the Contacts Upsert endpoint so the same phone never creates duplicates.
 * Belt-and-suspenders: the inbound webhook (sendLeadToGHL) still fires for
 * workflow triggers — this function only supplements it to get a contactId back.
 *
 * Custom fields (monthly_bill, roof_type, owns_home, decision_stage) are sent
 * when the corresponding GHL_CF_* env vars are configured. If they are blank,
 * those fields are skipped and Vercel logs will show which IDs are missing.
 */
export async function upsertGHLContact(params: {
  firstName : string;
  lastName  : string;
  phone     : string;   // E.164
  email     : string;
  tags?     : string[];
  address?  : string;   // full address string; mapped to address1 in GHL
  // Qualification — used to populate custom fields for workflow merge tags
  isOwner?  : string;   // 'yes' | 'no'  → {{contact.owns_home}}
  billLabel?: string;   // human label   → {{contact.monthly_bill}}
  roofType? : string;   // code           → {{contact.roof_type}}
  timeline? : string;   // code           → {{contact.decision_stage}}
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

  // ── Custom fields — write to exact GHL field key names ─────────────
  // address is written to both the standard address1 field (already set above)
  // AND the property_address custom field so {{contact.property_address}} resolves.
  const customFields = buildCustomFields({
    isOwner:   params.isOwner,
    billLabel: params.billLabel,
    roofType:  params.roofType,
    timeline:  params.timeline,
    address:   params.address,
  });
  // GHL v2 contacts/upsert uses the key "customField" (singular array)
  if (customFields.length > 0) {
    body.customField = customFields;
  }

  // ── Resolved human-readable values for logging ─────────────────────
  const logOwnsHome      = params.isOwner   ? (params.isOwner === 'yes' ? 'Yes' : 'No')              : '(not provided)';
  const logMonthlyBill   = params.billLabel ?? '(not provided)';
  const logRoofType      = params.roofType  ? (ROOF_LABELS[params.roofType]    ?? params.roofType)   : '(not provided)';
  const logDecisionStage = params.timeline  ? (TIMELINE_LABELS[params.timeline] ?? params.timeline)  : '(not provided)';

  // ── LOG 1: Contact update payload ──────────────────────────────────
  console.error(
    '[GHL] CONTACT UPDATE PAYLOAD\n' +
    JSON.stringify({
      name           : `${params.firstName} ${params.lastName}`.trim(),
      phone          : params.phone,
      address1       : params.address ?? '',
      customFields   : customFields,
    }, null, 2),
  );

  // ── LOG 2: Custom field values being written ────────────────────────
  console.error(
    '[GHL] CUSTOM FIELD VALUES\n' +
    `  average_cost_per_month_for_electricity: ${logMonthlyBill}\n` +
    `  roof_type:                              ${logRoofType}\n` +
    `  do_you_own_your_home:                   ${logOwnsHome}\n` +
    `  decision_stage:                         ${logDecisionStage}\n` +
    `  property_address:                       ${params.address ?? '(not provided)'}`,
  );

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
    if (contactId && customFields.length > 0) {
      console.error(
        `[GHL] ✅ CONTACT UPDATED WITH CUSTOM FIELDS — contactId: ${contactId} | fields written: ${customFields.length}`,
      );
    } else if (contactId && customFields.length === 0) {
      console.error(
        `[GHL] ✅ contact upserted (no custom field values provided) — contactId: ${contactId}`,
      );
    }
    return contactId;
  } catch {
    console.error('[GHL] upsertGHLContact: could not parse response JSON:', raw);
    return null;
  }
}

/**
 * Write qualification custom fields to an existing GHL contact via PUT.
 * Called fire-and-forget from createGHLAppointment so the merge tags
 * ({{contact.average_cost_per_month_for_electricity}}, etc.) are always
 * populated by the time the GHL workflow SMS fires after booking.
 */
async function updateGHLContactFields(contactId: string, params: {
  ownsHome?   : string;   // 'yes' | 'no'
  monthlyBill?: string;   // code e.g. '150-200'
  roofType?   : string;   // code e.g. 'asphalt'
  timeline?   : string;   // code e.g. 'ready'
  address?    : string;
}): Promise<void> {
  if (!GHL_LEAD_API_KEY) {
    console.error('[GHL] updateGHLContactFields: no lead API key — skipping');
    return;
  }

  // Convert bill code → human label using the same map as the rest of the system
  const billLabel = params.monthlyBill
    ? (BILL_LABELS[params.monthlyBill] ?? params.monthlyBill)
    : undefined;

  const customField = buildCustomFields({
    isOwner:   params.ownsHome,
    billLabel,
    roofType:  params.roofType,
    timeline:  params.timeline,
    address:   params.address,
  });

  if (customField.length === 0) {
    console.error('[GHL] updateGHLContactFields: nothing to write — all values blank');
    return;
  }

  console.error('[GHL] updateGHLContactFields — contactId:', contactId,
    '| writing fields:', customField.map(f => `${f.id}="${f.field_value}"`).join(', '),
  );

  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      method:  'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_LEAD_API_KEY}`,
        'Content-Type':  'application/json',
        'Version':       '2021-07-28',
      },
      body:  JSON.stringify({ customField }),
      cache: 'no-store',
    });
    const raw = await res.text().catch(() => '');
    if (res.ok) {
      console.error('[GHL] updateGHLContactFields ✅ — contactId:', contactId,
        '| fields written:', customField.length);
    } else {
      console.error('[GHL] updateGHLContactFields ❌ —', res.status, '|', raw.substring(0, 400));
    }
  } catch (err) {
    console.error('[GHL] updateGHLContactFields network error:', err);
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

// ── Lead summary label maps ───────────────────────────────────────────────────
const BILL_LABELS: Record<string, string> = {
  'under-100': 'Under $100/mo',
  '100-150':   '$100–$150/mo',
  '150-200':   '$150–$200/mo',
  '200-plus':  '$200+/mo',
};
const ROOF_LABELS: Record<string, string> = {
  'asphalt': 'Asphalt shingle',
  'metal':   'Metal',
  'tile':    'Tile',
  'unsure':  'Not sure',
};
const TIMELINE_LABELS: Record<string, string> = {
  'exploring':  'Just exploring',
  'interested': "I'm interested",
  'ready':      'Ready if it makes sense',
};

/** Format an ISO appointment time as "Tuesday, April 28 · 10:00 AM Central" */
function fmtAppointmentTime(iso: string, tz: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
    // Try to get a short timezone label like "Central"
    const tzShort = d.toLocaleTimeString('en-US', { timeZoneName: 'short', timeZone: tz }).split(' ').pop() ?? tz;
    return `${date} · ${time} ${tzShort}`;
  } catch {
    return iso;
  }
}

/**
 * Build the appointment notes block that appears in GHL and in the
 * internal notification. Every booked appointment gets this summary.
 */
function buildAppointmentNotes(params: {
  firstName?  : string;
  lastName?   : string;
  name        : string;
  phone?      : string;
  email?      : string;
  address?    : string;
  startTime   : string;
  timezone    : string;
  ownsHome?   : string;
  monthlyBill?: string;
  roofType?   : string;
  timeline?   : string;
}): string {
  const fullName  = params.firstName
    ? `${params.firstName} ${params.lastName ?? ''}`.trim()
    : params.name;

  return [
    'NEW SOLAR CONSULTATION',
    '',
    `Name:    ${fullName}`,
    `Phone:   ${params.phone ?? '(not provided)'}`,
    `Email:   ${params.email   ? params.email   : '(not provided)'}`,
    `Address: ${params.address ? params.address : '(not provided)'}`,
    '',
    `Appointment Time: ${fmtAppointmentTime(params.startTime, params.timezone)}`,
    '',
    'Qualification:',
    `  Owns Home:      ${params.ownsHome    === 'yes' ? 'Yes' : params.ownsHome === 'no' ? 'No' : '(not provided)'}`,
    `  Electric Bill:  ${params.monthlyBill ? (BILL_LABELS[params.monthlyBill] ?? params.monthlyBill)     : '(not provided)'}`,
    `  Roof Type:      ${params.roofType    ? (ROOF_LABELS[params.roofType]    ?? params.roofType)        : '(not provided)'}`,
    `  Decision Stage: ${params.timeline    ? (TIMELINE_LABELS[params.timeline] ?? params.timeline)       : '(not provided)'}`,
    '',
    'Source: KC Energy Advisors website',
  ].join('\n');
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
 *   - Added enriched title and notes from lead qualification data.
 */
export async function createGHLAppointment(params: {
  contactId   : string;
  startTime   : string;  // ISO 8601
  endTime     : string;  // ISO 8601
  name        : string;
  timezone    : string;  // IANA tz — sent as selectedTimezone per GHL API spec
  firstName?  : string;
  lastName?   : string;
  phone?      : string;
  email?      : string;
  address?    : string;
  ownsHome?   : string;
  monthlyBill?: string;
  roofType?   : string;
  timeline?   : string;
}): Promise<string | null> {
  if (!GHL_BOOKING_API_KEY || !GHL_CALENDAR_ID) {
    console.error('[GHL] createGHLAppointment: booking API key (GHL_BOOKING_API_KEY / GHL_API_KEY) or GHL_CALENDAR_ID not set — cannot book');
    return null;
  }

  // ── Build enriched title and notes ───────────────────────────────
  const fullName = params.firstName
    ? `${params.firstName} ${params.lastName ?? ''}`.trim()
    : params.name;

  const appointmentTitle = `Solar Consultation - ${fullName}`;
  const appointmentNotes = buildAppointmentNotes(params);

  // ── Log full summary to Vercel before the API call ───────────────
  console.error('[GHL] createGHLAppointment — LEAD SUMMARY\n' + appointmentNotes);

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
    title:             appointmentTitle,
    notes:             appointmentNotes,
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
          // Attach lead summary as a GHL contact note — fire-and-forget
          addGHLContactNote(params.contactId, appointmentNotes).catch(err =>
            console.error('[GHL] addGHLContactNote (post-retry) error:', err),
          );
          // Write qualification custom fields to contact so GHL workflow merge tags resolve
          updateGHLContactFields(params.contactId, {
            ownsHome:    params.ownsHome,
            monthlyBill: params.monthlyBill,
            roofType:    params.roofType,
            timeline:    params.timeline,
            address:     params.address,
          }).catch(err =>
            console.error('[GHL] updateGHLContactFields (post-retry) error:', err),
          );
          // Send internal SMS notification to Michael — fire-and-forget
          // Map params.timeline → decisionStage so buildInternalMessage reads the right key
          const internalMsg = buildInternalMessage({
            ...params,
            decisionStage: params.timeline,
          });
          sendInternalNotification(internalMsg).catch(err =>
            console.error('[INTERNAL SMS] post-retry send error:', err),
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
      // Attach lead summary as a GHL contact note — fire-and-forget, never blocks booking
      addGHLContactNote(params.contactId, appointmentNotes).catch(err =>
        console.error('[GHL] addGHLContactNote (post-booking) error:', err),
      );
      // Write qualification custom fields to contact so GHL workflow merge tags resolve
      updateGHLContactFields(params.contactId, {
        ownsHome:    params.ownsHome,
        monthlyBill: params.monthlyBill,
        roofType:    params.roofType,
        timeline:    params.timeline,
        address:     params.address,
      }).catch(err =>
        console.error('[GHL] updateGHLContactFields (post-booking) error:', err),
      );
      // Send internal SMS notification to Michael — fire-and-forget
      // Map params.timeline → decisionStage so buildInternalMessage reads the right key
      const internalMsg = buildInternalMessage({
        ...params,
        decisionStage: params.timeline,
      });
      sendInternalNotification(internalMsg).catch(err =>
        console.error('[INTERNAL SMS] post-booking send error:', err),
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
 * Add a note to a GHL contact.
 * Used after booking to attach the full lead summary to the contact record.
 * Non-blocking — caller should not await unless it cares about the result.
 */
export async function addGHLContactNote(contactId: string, noteBody: string): Promise<void> {
  if (!GHL_LEAD_API_KEY) {
    console.error('[GHL] addGHLContactNote: no lead API key — skipping contact note');
    return;
  }

  const url = `${GHL_API_BASE}/contacts/${contactId}/notes`;
  console.error('[GHL] addGHLContactNote → POST', url, '| contactId:', contactId);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${GHL_LEAD_API_KEY}`,
        'Content-Type':  'application/json',
        'Version':       '2021-07-28',
      },
      body:  JSON.stringify({ body: noteBody }),
      cache: 'no-store',
    });

    const raw = await res.text().catch(() => '');
    if (res.ok) {
      console.error('[GHL] addGHLContactNote SUCCESS — contactId:', contactId);
    } else {
      console.error('[GHL] addGHLContactNote FAILED —', res.status, '| body:', raw.substring(0, 400));
    }
  } catch (err) {
    console.error('[GHL] addGHLContactNote network error:', err);
  }
}

/**
 * Build the internal SMS text that Michael receives after every booking.
 * Format is locked — do not change labels or emoji without product sign-off.
 *
 * Field names MUST match exactly what createGHLAppointment passes here:
 *   ownsHome, monthlyBill, roofType, decisionStage
 */
function buildInternalMessage(params: {
  firstName?    : string;
  lastName?     : string;
  name          : string;
  phone?        : string;
  address?      : string;
  ownsHome?     : string;    // 'yes' | 'no'
  monthlyBill?  : string;    // code e.g. '150-200'
  roofType?     : string;    // code e.g. 'asphalt'
  decisionStage?: string;    // code e.g. 'ready'
  startTime     : string;
  timezone      : string;
}): string {
  // ── Log exact input so Vercel shows what this function received ──
  console.error('[SMS INPUT]', {
    ownsHome     : params.ownsHome      ?? '(missing)',
    monthlyBill  : params.monthlyBill   ?? '(missing)',
    roofType     : params.roofType      ?? '(missing)',
    decisionStage: params.decisionStage ?? '(missing)',
    phone        : params.phone         ?? '(missing)',
    address      : params.address       ?? '(missing)',
    name         : params.name,
    startTime    : params.startTime,
  });

  const fullName = params.firstName
    ? `${params.firstName} ${params.lastName ?? ''}`.trim()
    : params.name;

  const ownsHome  = params.ownsHome      === 'yes' ? 'Yes'
                  : params.ownsHome      === 'no'  ? 'No'
                  : '(not provided)';
  const bill      = params.monthlyBill   ? (BILL_LABELS[params.monthlyBill]         ?? params.monthlyBill)   : '(not provided)';
  const roof      = params.roofType      ? (ROOF_LABELS[params.roofType]            ?? params.roofType)      : '(not provided)';
  const stage     = params.decisionStage ? (TIMELINE_LABELS[params.decisionStage]   ?? params.decisionStage) : '(not provided)';
  const apptTime  = fmtAppointmentTime(params.startTime, params.timezone);

  // Log which fields are missing so Vercel shows the gap immediately
  const missing = [
    !params.phone         && 'phone',
    !params.address       && 'address',
    !params.ownsHome      && 'ownsHome',
    !params.monthlyBill   && 'monthlyBill',
    !params.roofType      && 'roofType',
    !params.decisionStage && 'decisionStage',
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error('[INTERNAL SMS] ⚠️  missing fields — SMS will show (not provided) for:', missing.join(', '));
  }

  const message = [
    '🔥 NEW APPOINTMENT BOOKED 🔥',
    '',
    `Name: ${fullName}`,
    `Phone: ${params.phone ?? '(not provided)'}`,
    `Address: ${params.address ?? '(not provided)'}`,
    `Time: ${apptTime}`,
    `Bill: ${bill}`,
    `Roof: ${roof}`,
    `Owns Home: ${ownsHome}`,
    `Stage: ${stage}`,
    '',
    'This one is locked in. 📈',
  ].join('\n');

  // ── Log final message text before it leaves this function ────────
  console.error('[SMS OUTPUT]', message);

  return message;
}

/**
 * Send an internal SMS via GHL Conversations API.
 * Used to notify Michael immediately after a lead books an appointment.
 * Non-blocking — wrap callsite in .catch() so failure never affects booking.
 */
export async function sendInternalNotification(message: string): Promise<void> {
  if (!INTERNAL_NOTIFICATION_PHONE) {
    console.error('[INTERNAL SMS] INTERNAL_NOTIFICATION_PHONE not set — skipping notification');
    return;
  }
  if (!GHL_API_KEY) {
    console.error('[INTERNAL SMS] GHL_API_KEY not set — cannot send notification');
    return;
  }

  console.error('[INTERNAL SMS] Sending lead notification → phone:', INTERNAL_NOTIFICATION_PHONE);

  try {
    const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type' : 'application/json',
        'Version'      : '2021-07-28',
      },
      body : JSON.stringify({
        type   : 'SMS',
        message: message,
        phone  : INTERNAL_NOTIFICATION_PHONE,
      }),
      cache: 'no-store',
    });

    const raw = await res.text().catch(() => '');
    if (res.ok) {
      console.error('[INTERNAL SMS] ✅ Sent successfully — status:', res.status);
    } else {
      console.error('[INTERNAL SMS] ❌ Failed — status:', res.status, '| body:', raw.substring(0, 600));
    }
  } catch (err) {
    console.error('[INTERNAL SMS] Network error:', err);
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
