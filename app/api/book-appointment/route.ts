import { NextRequest, NextResponse } from 'next/server';
import {
  createGHLAppointment,
  updateGHLContactFields,
  upsertGHLContact,
  buildInternalMessage,
  sendInternalNotification,
} from '@/lib/ghl';
import type { BookingRequest, BookingResponse } from '@/lib/types';

function isValidBookingRequest(body: unknown): body is BookingRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    // contactId is now optional — route upserts the contact if absent or empty
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
 * Creates an appointment in GHL for a contact. If contactId is absent or empty
 * (e.g. the submit-lead upsert returned null), this route upserts the contact
 * itself using the lead fields in the request body — so contactId is NEVER null
 * in a successful booking response.
 */
export async function POST(req: NextRequest) {
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

  // ── Resolve contactId — upsert if missing ─────────────────────────
  // If submit-lead returned null (e.g. GHL upsert failed or API key not set),
  // the frontend sends an empty/absent contactId. Upsert here so the booking
  // can always proceed and contactId is NEVER null in the success response.
  let contactId: string = incomingContactId || '';

  if (!contactId) {
    console.error('[book-appointment] contactId missing — upserting contact from lead fields');

    const nameParts  = name.trim().split(/\s+/);
    const upsertFirst = firstName || nameParts[0] || '';
    const upsertLast  = lastName  || nameParts.slice(1).join(' ') || '';

    const upsertedId = await upsertGHLContact({
      firstName : upsertFirst,
      lastName  : upsertLast,
      phone     : phone    || '',
      email     : email    || '',
      address,
      isOwner   : ownsHome,
      roofType,
      timeline,
    }).catch((err: unknown) => {
      console.error('[book-appointment] upsertGHLContact threw:', err);
      return null;
    });

    if (upsertedId) {
      contactId = upsertedId;
      console.error('[book-appointment] ✅ upsert succeeded — contactId:', contactId);
    } else {
      console.error('[book-appointment] ❌ upsert returned null — cannot create appointment without contactId');
      return NextResponse.json<BookingResponse>(
        { success: false, error: 'Could not create or find your contact. Please try again.' },
        { status: 502 },
      );
    }
  }

  try {
    const appointmentId = await createGHLAppointment({
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

    if (!appointmentId) {
      // createGHLAppointment already logged the GHL error detail
      console.error(`[book-appointment] ❌ createGHLAppointment returned null — contactId: ${contactId}`);
      return NextResponse.json<BookingResponse>(
        { success: false, error: 'Failed to create appointment. Please try again.' },
        { status: 502 },
      );
    }

    // ── Appointment confirmed ─────────────────────────────────────────
    console.error(`[book-appointment] ✅ SUCCESS — appointmentId: ${appointmentId}, contactId: ${contactId}`);

    // ── 1. Internal SMS — awaited so it always completes before response ──
    // Has its own try-catch so a failure NEVER affects the booking response.
    // Empty strings normalized to undefined so label maps fire correctly.
    // timeline is the wire key; buildInternalMessage expects decisionStage.
    const decisionStage = timeline || undefined;

    const normalized = {
      name,
      phone        : phone     || undefined,
      address      : address   || undefined,
      monthlyBill  : monthlyBill || undefined,
      roofType     : roofType  || undefined,
      ownsHome     : ownsHome  || undefined,
      decisionStage,
      startTime,
      timezone,
    };

    console.error('[FINAL INTERNAL SMS DATA]', {
      ...normalized,
      firstName: firstName || '(none)',
      lastName : lastName  || '(none)',
    });

    try {
      const internalMsg = buildInternalMessage({
        ...normalized,
        firstName: firstName || undefined,
        lastName : lastName  || undefined,
      });
      await sendInternalNotification(internalMsg);
    } catch (smsErr) {
      console.error('[INTERNAL SMS ERROR] unexpected throw:', smsErr);
    }

    // ── 2. Custom field write — fire-and-forget, never blocks response ──
    updateGHLContactFields(contactId, {
      ownsHome,
      monthlyBill,
      roofType,
      timeline,
      address,
    }).catch(err => console.error('[book-appointment] updateGHLContactFields error:', err));

    return NextResponse.json<BookingResponse>({ success: true, appointmentId, contactId });

  } catch (err) {
    console.error('[book-appointment] Unexpected error:', err);
    return NextResponse.json<BookingResponse>(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
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
