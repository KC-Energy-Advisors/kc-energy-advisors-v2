import { NextRequest, NextResponse } from 'next/server';
import {
  createGHLAppointment,
  updateGHLContactFields,
  upsertGHLContact,
  buildInternalMessage,
  sendInternalNotification,
  GhlAccessError,
} from '@/lib/ghl';
import type { BookingRequest, BookingResponse } from '@/lib/types';

function isValidBookingRequest(body: unknown): body is BookingRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    // contactId is optional — route upserts the contact if absent or empty
    (b.contactId === undefined || typeof b.contactId === 'string') &&
    typeof b.startTime === 'string' && b.startTime.length > 0 &&
    typeof b.endTime   === 'string' && b.endTime.length   > 0 &&
    typeof b.name      === 'string' &&
    typeof b.timezone  === 'string'
  );
}

/**
 * POST /api/book-appointment
 * Body: BookingRequest
 * Returns: BookingResponse
 *
 * Flow:
 *  1. Validate request
 *  2. Resolve contactId (upsert if missing)
 *  3. Create GHL appointment
 *  4. Log SUCCESS
 *  5. Await internal SMS (own try-catch — never blocks or breaks booking)
 *  6. Fire-and-forget: write GHL custom fields
 *  7. Return success response
 */
export async function POST(req: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<BookingResponse>(
      { success: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  if (!isValidBookingRequest(body)) {
    return NextResponse.json<BookingResponse>(
      { success: false, error: 'Missing required fields: startTime, endTime, name, timezone' },
      { status: 400 },
    );
  }

  const {
    contactId: incomingContactId,
    startTime,
    endTime,
    name,
    timezone,
    firstName,
    lastName,
    phone,
    email,
    address,
    ownsHome,
    monthlyBill,
    roofType,
    timeline,
  } = body;

  // ── Standardized hand-off log ──────────────────────────────────────
  // Matches the same log emitted on /thank-you (server) and inside
  // SlotPicker (browser) so the contactId is traceable end-to-end.
  console.log('BOOKING WITH CONTACT ID:', incomingContactId || '(absent — will upsert)');
  console.error('BOOKING WITH CONTACT ID:', incomingContactId || '(absent — will upsert)');

  // ── Full lead summary log — survives removeConsole ─────────────────
  console.error(
    '[book-appointment] LEAD SUMMARY\n' +
    `  Name:           ${firstName ? `${firstName} ${lastName}` : name}\n` +
    `  Phone:          ${phone ?? '(not provided)'}\n` +
    `  Email:          ${email ?? '(not provided)'}\n` +
    `  Address:        ${address ?? '(not provided)'}\n` +
    `  Appointment:    ${startTime}\n` +
    `  Timezone:       ${timezone}\n` +
    `  Owns Home:      ${ownsHome ?? '(not provided)'}\n` +
    `  Electric Bill:  ${monthlyBill ?? '(not provided)'}\n` +
    `  Roof Type:      ${roofType ?? '(not provided)'}\n` +
    `  Decision Stage: ${timeline ?? '(not provided)'}\n` +
    `  contactId:      ${incomingContactId || '(absent — will upsert)'}\n` +
    `  calendarId:     ${process.env.GHL_CALENDAR_ID ?? '⚠️ NOT SET'}\n` +
    `  assignedUserId: ${process.env.GHL_ASSIGNED_USER_ID ?? '(not set)'}`,
  );

  // ── [GHL ENV CHECK] — confirms which key and location Vercel actually loaded ──
  // Cross-reference keyLast4/keyLen against Vercel → Settings → Environment Variables.
  {
    const key      = process.env.GHL_API_KEY ?? '';
    const keyLen   = key.length;
    const keyLast4 = key.length >= 4 ? key.slice(-4) : key || '(empty)';
    const locId    = process.env.GHL_LOCATION_ID ?? '';
    const locLast4 = locId.length >= 4 ? `****${locId.slice(-4)}` : locId || '(not set)';
    console.error(
      `[GHL ENV CHECK] route=book-appointment` +
      ` keyLabel=GHL_API_KEY` +
      ` keyLen=${keyLen}` +
      ` keyLast4=${keyLast4}` +
      ` locationId=${locLast4}`,
    );
  }

  // ── Resolve contactId — upsert if missing ─────────────────────────
  let contactId: string = incomingContactId || '';

  if (!contactId) {
    console.error('[book-appointment] contactId missing — upserting contact from lead fields');
    const nameParts   = name.trim().split(/\s+/);
    const upsertFirst = firstName || nameParts[0] || '';
    const upsertLast  = lastName  || nameParts.slice(1).join(' ') || '';

    let upsertedId: string | null = null;
    try {
      upsertedId = await upsertGHLContact({
        firstName : upsertFirst,
        lastName  : upsertLast,
        phone     : phone  || '',
        email     : email  || '',
        address,
        isOwner   : ownsHome,
        roofType,
        timeline,
      });
    } catch (err: unknown) {
      if (err instanceof GhlAccessError) {
        // 403 key/location mismatch — log clearly and return a distinguishable error
        console.error('[book-appointment] ❌ GHL ACCESS DENIED during upsert:', (err as Error).message);
        return NextResponse.json<BookingResponse>(
          { success: false, error: 'GHL key/location mismatch' },
          { status: 403 },
        );
      }
      console.error('[book-appointment] upsertGHLContact threw unexpected error:', err);
      return NextResponse.json<BookingResponse>(
        { success: false, error: 'Could not create or find your contact. Please try again.' },
        { status: 502 },
      );
    }

    if (upsertedId) {
      contactId = upsertedId;
      console.error('[book-appointment] ✅ upsert succeeded — contactId:', contactId);
    } else {
      console.error('[book-appointment] ❌ upsert returned null — cannot proceed');
      return NextResponse.json<BookingResponse>(
        { success: false, error: 'Could not create or find your contact. Please try again.' },
        { status: 502 },
      );
    }
  }

  // ── Create appointment ────────────────────────────────────────────
  // Isolated try-catch: only appointment creation errors are caught here.
  // The SMS block intentionally lives OUTSIDE this try so an unexpected
  // throw from createGHLAppointment can never silently skip the notification.
  let appointmentId: string | null = null;
  try {
    appointmentId = await createGHLAppointment({
      contactId,
      startTime,
      endTime,
      name,
      timezone,
      firstName,
      lastName,
      phone,
      email,
      address,
      ownsHome,
      monthlyBill,
      roofType,
      timeline,
    });
  } catch (err) {
    console.error('[book-appointment] createGHLAppointment threw:', err);
    return NextResponse.json<BookingResponse>(
      { success: false, error: 'Server error creating appointment. Please try again.' },
      { status: 500 },
    );
  }

  if (!appointmentId) {
    console.error(`[book-appointment] ❌ createGHLAppointment returned null — contactId: ${contactId}`);
    return NextResponse.json<BookingResponse>(
      { success: false, error: 'Failed to create appointment. Please try again.' },
      { status: 502 },
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Appointment confirmed. Everything below this point is post-success.
  // ─────────────────────────────────────────────────────────────────

  // Step 1 — Log success
  console.error(`[book-appointment] ✅ SUCCESS — appointmentId: ${appointmentId}, contactId: ${contactId}`);

  // Step 2 — Internal SMS
  // Awaited so it always completes (and logs) before the response is returned.
  // Own try-catch so any failure is logged without breaking the booking response.
  // Empty strings normalized to undefined so label maps in buildInternalMessage work.
  console.error('[FINAL INTERNAL SMS DATA]', {
    name,
    firstName    : firstName    || '(none)',
    lastName     : lastName     || '(none)',
    phone        : phone        || '(empty)',
    address      : address      || '(empty)',
    ownsHome     : ownsHome     || '(empty)',
    monthlyBill  : monthlyBill  || '(empty)',
    roofType     : roofType     || '(empty)',
    decisionStage: timeline     || '(empty)',
    startTime,
    timezone,
  });

  try {
    const smsMsg = buildInternalMessage({
      name,
      firstName    : firstName    || undefined,
      lastName     : lastName     || undefined,
      phone        : phone        || undefined,
      address      : address      || undefined,
      ownsHome     : ownsHome     || undefined,
      monthlyBill  : monthlyBill  || undefined,
      roofType     : roofType     || undefined,
      decisionStage: timeline     || undefined,   // timeline is the wire key
      startTime,
      timezone,
    });
    await sendInternalNotification(contactId, smsMsg);
  } catch (smsErr) {
    console.error('[INTERNAL SMS ERROR] unexpected throw in SMS block:', smsErr);
  }

  // Step 3 — GHL custom fields (fire-and-forget, never blocks response)
  updateGHLContactFields(contactId, {
    ownsHome,
    monthlyBill,
    roofType,
    timeline,
    address,
  }).catch(err => console.error('[book-appointment] updateGHLContactFields error:', err));

  // Step 4 — Return success
  return NextResponse.json<BookingResponse>({ success: true, appointmentId, contactId });
}

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
