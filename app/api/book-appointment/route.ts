import { NextRequest, NextResponse } from 'next/server';
import { createGHLAppointment } from '@/lib/ghl';
import type { BookingRequest, BookingResponse } from '@/lib/types';

function isValidBookingRequest(body: unknown): body is BookingRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.contactId === 'string' && b.contactId.length > 0 &&
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
 * Creates an appointment in GHL for a contact that was already upserted
 * during form submission. Because the contact already exists, GHL will
 * correctly attribute the appointment and fire any "Appointment Created"
 * workflow triggers (including the Python booking-followup webhook).
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
      { success: false, error: 'Missing required fields: contactId, startTime, endTime, name, timezone' },
      { status: 400 },
    );
  }

  const { contactId, startTime, endTime, name, timezone } = body;

  try {
    const appointmentId = await createGHLAppointment({
      contactId,
      startTime,
      endTime,
      name,
      timezone,
    });

    if (!appointmentId) {
      console.error(`[book-appointment] ❌ createGHLAppointment returned null — contactId: ${contactId}`);
      return NextResponse.json<BookingResponse>(
        { success: false, error: 'Failed to create appointment. Please try again.' },
        { status: 502 },
      );
    }

    console.log(`[book-appointment] ✅ Appointment created — id: ${appointmentId}, contact: ${contactId}`);
    return NextResponse.json<BookingResponse>({ success: true, appointmentId });

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
