import { NextRequest, NextResponse } from 'next/server';
import { getCalendarSlots } from '@/lib/ghl';

/**
 * GET /api/calendar-slots
 * Query params:
 *   timezone  — IANA timezone string (default: "America/Chicago")
 *   days      — how many days ahead to fetch (default: 14, max: 30)
 *
 * Returns: { slots: SlotsByDate }
 * Errors:  { error: string }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const timezone = searchParams.get('timezone') || 'America/Chicago';
  const daysRaw  = parseInt(searchParams.get('days') || '14', 10);
  const days     = Math.min(Math.max(1, isNaN(daysRaw) ? 14 : daysRaw), 30);

  const now      = Date.now();
  const startMs  = now;
  const endMs    = now + days * 24 * 60 * 60 * 1000;

  try {
    const slots = await getCalendarSlots({ startDate: startMs, endDate: endMs, timezone });
    return NextResponse.json({ slots });
  } catch (err) {
    console.error('[calendar-slots] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch calendar slots' }, { status: 500 });
  }
}

// No POST / other methods
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
