'use client';
import { useState, useEffect, useCallback } from 'react';
import type { CalendarSlot, SlotsByDate } from '@/lib/types';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

export interface SlotPickerProps {
  /** GHL contactId — required; booking is blocked without it */
  contactId    : string;
  /** Full name used as the GHL appointment title */
  name         : string;
  /** Called when the appointment is successfully created in GHL */
  onBooked     : (slot: CalendarSlot) => void;
  /** Called only for truly unrecoverable failures (should be rare) */
  onFatalError : (msg: string) => void;
}

type PickerState =
  | 'loading'      // fetching slots from /api/calendar-slots
  | 'fetch-error'  // slot fetch failed — show retry
  | 'empty'        // GHL returned no availability in next 14 days
  | 'selecting'    // date + time picker active
  | 'confirming'   // slot chosen, showing confirmation card
  | 'booking'      // POST to /api/book-appointment in flight
  | 'book-error';  // booking failed — inline retry (keeps slot selected)

// ─────────────────────────────────────────────────────────────────
//  Date / time helpers
// ─────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" into display strings without timezone shift */
function parseDateKey(key: string) {
  // Use noon so local-timezone offsets never flip the date
  const d = new Date(`${key}T12:00:00`);
  return {
    weekday : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    long    : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

/** Format an ISO slot start time as "9:00 AM" in the user's timezone */
function slotTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour    : 'numeric',
    minute  : '2-digit',
    hour12  : true,
    timeZone: tz,
  });
}

// ─────────────────────────────────────────────────────────────────
//  Keyframe styles — injected once, shared across states
// ─────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes kc-pulse { 0%,100%{opacity:.28} 50%{opacity:.62} }
  @keyframes kc-spin  { to { transform: rotate(360deg); } }
`;

// ─────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────

export default function SlotPicker({
  contactId,
  name,
  onBooked,
  onFatalError,
}: SlotPickerProps) {

  const [state,    setState]   = useState<PickerState>('loading');
  const [slots,    setSlots]   = useState<SlotsByDate>({});
  const [dates,    setDates]   = useState<string[]>([]);
  const [selDate,  setSelDate] = useState<string | null>(null);
  const [selSlot,  setSelSlot] = useState<CalendarSlot | null>(null);
  const [bookErr,  setBookErr] = useState('');

  // Detect browser timezone once; stable for the lifetime of this component.
  const [tz] = useState<string>(() => {
    try   { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; }
    catch { return 'America/Chicago'; }
  });

  // ── Fetch available slots ──────────────────────────────────────
  const loadSlots = useCallback(async () => {
    setState('loading');
    setSelSlot(null);
    setBookErr('');
    console.error('[SlotPicker] fetching slots — tz:', tz);

    try {
      const res  = await fetch(
        `/api/calendar-slots?timezone=${encodeURIComponent(tz)}&days=14`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json    = await res.json() as { slots?: SlotsByDate; error?: string };
      if (json.error) throw new Error(json.error);

      const raw   = json.slots ?? {};
      const avail = Object.keys(raw).filter(k => (raw[k]?.length ?? 0) > 0).sort();

      setSlots(raw);
      setDates(avail);
      console.error('[SlotPicker] loaded', avail.length, 'date(s):', avail.slice(0, 3));

      if (avail.length === 0) {
        setState('empty');
        return;
      }

      // Preserve previously selected date if still available; else pick first.
      setSelDate(prev => (prev && avail.includes(prev)) ? prev : avail[0]);
      setState('selecting');

    } catch (err) {
      console.error('[SlotPicker] loadSlots failed:', err);
      setState('fetch-error');
    }
  }, [tz]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // ── Confirm the selected slot ──────────────────────────────────
  async function confirmBooking() {
    if (!selSlot || !contactId) {
      console.error('[BOOKING] blocked — selSlot:', selSlot, 'contactId:', contactId);
      return;
    }

    setState('booking');
    setBookErr('');
    console.error('[BOOKING] firing — contactId:', contactId, '| start:', selSlot.startTime, '| tz:', tz);

    try {
      const res  = await fetch('/api/book-appointment', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          contactId,
          startTime: selSlot.startTime,
          endTime  : selSlot.endTime,
          name,
          timezone : tz,
        }),
      });

      const json = await res.json() as {
        success?      : boolean;
        appointmentId?: string;
        error?        : string;
      };
      console.error('[BOOKING] response:', res.status, JSON.stringify(json));

      if (!res.ok || !json.success) {
        const msg = json.error || 'Could not confirm your booking. Please try a different time.';
        console.error('[BOOKING] failed — inline retry:', msg);
        setBookErr(msg);
        setState('book-error');
        return;
      }

      console.error('[BOOKING] success — appointmentId:', json.appointmentId ?? 'none');
      onBooked(selSlot);

    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection and try again.';
      console.error('[BOOKING] network error:', err);
      setBookErr(msg);
      setState('book-error');
    }
  }

  // ── Render: loading skeleton ───────────────────────────────────
  if (state === 'loading') {
    return (
      <div>
        <style>{CSS}</style>
        {/* Date strip skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflow: 'hidden' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                flexShrink: 0, width: 72, height: 64, borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                animation : `kc-pulse ${0.9 + i * 0.12}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        {/* Time grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                height: 46, borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                animation : `kc-pulse ${0.9 + i * 0.1}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 20 }}>
          Finding available times…
        </p>
      </div>
    );
  }

  // ── Render: slot fetch failed ──────────────────────────────────
  if (state === 'fetch-error') {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <style>{CSS}</style>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 6 }}>
          Couldn't load available times.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, marginBottom: 20 }}>
          Or call us directly:{' '}
          <a href={PHONE_HREF} style={{ color: '#60a5fa', textDecoration: 'none' }}>
            {PHONE_DISPLAY}
          </a>
        </p>
        <button
          type="button"
          onClick={loadSlots}
          style={{
            background  : 'rgba(255,255,255,0.08)',
            border      : '1px solid rgba(255,255,255,0.14)',
            color       : 'rgba(255,255,255,0.8)',
            padding     : '10px 24px',
            borderRadius: 10,
            fontSize    : 14,
            fontWeight  : 600,
            cursor      : 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Render: no availability ────────────────────────────────────
  if (state === 'empty') {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 6 }}>
          No openings in the next 14 days.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginBottom: 24 }}>
          Give us a call and we'll find a time that works.
        </p>
        <a
          href={PHONE_HREF}
          style={{
            display     : 'inline-block',
            background  : '#2563eb',
            color       : 'white',
            padding     : '13px 30px',
            borderRadius: 12,
            fontSize    : 15,
            fontWeight  : 700,
            textDecoration: 'none',
            boxShadow   : '0 6px 24px rgba(37,99,235,0.45)',
          }}
        >
          {PHONE_DISPLAY}
        </a>
      </div>
    );
  }

  // ── Render: date + time selector ──────────────────────────────
  if (state === 'selecting') {
    const timeSlots = selDate ? (slots[selDate] ?? []) : [];

    return (
      <div>
        <style>{CSS}</style>

        {/* ── Date strip ──────────────────────────────────────── */}
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Select a date
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 26, paddingBottom: 4, scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {dates.map(d => {
              const { weekday, monthDay } = parseDateKey(d);
              const on = d === selDate;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelDate(d); setSelSlot(null); }}
                  style={{
                    flexShrink  : 0,
                    width       : 72,
                    padding     : '10px 0',
                    borderRadius: 12,
                    border      : on ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    background  : on ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.04)',
                    cursor      : 'pointer',
                    textAlign   : 'center',
                    transition  : 'all 0.15s',
                  }}
                >
                  <span style={{
                    display      : 'block',
                    fontSize     : 10,
                    fontWeight   : 700,
                    letterSpacing: '0.07em',
                    color        : on ? '#93c5fd' : 'rgba(255,255,255,0.35)',
                    marginBottom : 3,
                  }}>
                    {weekday}
                  </span>
                  <span style={{
                    display   : 'block',
                    fontSize  : 13,
                    fontWeight: on ? 700 : 500,
                    color     : on ? 'white' : 'rgba(255,255,255,0.58)',
                  }}>
                    {monthDay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Time grid ───────────────────────────────────────── */}
        {timeSlots.length > 0 ? (
          <>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Select a time
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {timeSlots.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelSlot(slot); setState('confirming'); }}
                  style={{
                    padding      : '11px 6px',
                    borderRadius : 10,
                    border       : '1px solid rgba(255,255,255,0.1)',
                    background   : 'rgba(255,255,255,0.04)',
                    color        : 'rgba(255,255,255,0.78)',
                    fontSize     : 13.5,
                    fontWeight   : 600,
                    cursor       : 'pointer',
                    transition   : 'all 0.15s',
                    whiteSpace   : 'nowrap',
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget;
                    b.style.background  = 'rgba(59,130,246,0.18)';
                    b.style.borderColor = 'rgba(59,130,246,0.45)';
                    b.style.color       = 'white';
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget;
                    b.style.background  = 'rgba(255,255,255,0.04)';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.color       = 'rgba(255,255,255,0.78)';
                  }}
                >
                  {slotTime(slot.startTime, tz)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            No times on this date — pick another above.
          </p>
        )}
      </div>
    );
  }

  // ── Render: confirming / booking / book-error ──────────────────
  // All three share this view — only the button state changes.
  if (selSlot && selDate) {
    const { long: dateLong } = parseDateKey(selDate);
    const time = slotTime(selSlot.startTime, tz);
    const busy = state === 'booking';

    return (
      <div>
        <style>{CSS}</style>

        {/* ── Back link ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => { setState('selecting'); setSelSlot(null); setBookErr(''); }}
          style={{
            display    : 'flex',
            alignItems : 'center',
            gap        : 6,
            background : 'none',
            border     : 'none',
            color      : 'rgba(255,255,255,0.36)',
            fontSize   : 13,
            cursor     : 'pointer',
            padding    : '0 0 20px',
            transition : 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.36)')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M8 10L4 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change time
        </button>

        {/* ── Selected slot card ───────────────────────────────── */}
        <div style={{
          background  : 'rgba(59,130,246,0.09)',
          border      : '1px solid rgba(59,130,246,0.22)',
          borderRadius: 14,
          padding     : '18px 20px',
          marginBottom: 20,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
            Your selected time
          </p>
          <p style={{ color: 'white', fontSize: 19, fontWeight: 800, lineHeight: 1.2, marginBottom: 3 }}>
            {dateLong}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
            {time}
          </p>
        </div>

        {/* ── Booking error ────────────────────────────────────── */}
        {state === 'book-error' && bookErr && (
          <p style={{ color: '#fbbf24', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            {bookErr}
          </p>
        )}

        {/* ── Confirm button ───────────────────────────────────── */}
        <button
          type="button"
          onClick={confirmBooking}
          disabled={busy}
          style={{
            width          : '100%',
            padding        : '15px',
            borderRadius   : 12,
            border         : 'none',
            background     : busy ? 'rgba(255,255,255,0.09)' : '#2563eb',
            color          : busy ? 'rgba(255,255,255,0.35)' : 'white',
            fontSize       : 16,
            fontWeight     : 700,
            cursor         : busy ? 'not-allowed' : 'pointer',
            boxShadow      : busy ? 'none' : '0 8px 32px rgba(37,99,235,0.5)',
            transition     : 'all 0.2s',
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
            gap            : 8,
          }}
        >
          {busy ? (
            <>
              <span style={{
                width      : 16,
                height     : 16,
                border     : '2px solid rgba(255,255,255,0.22)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation  : 'kc-spin 0.7s linear infinite',
                display    : 'inline-block',
                flexShrink : 0,
              }} />
              Confirming…
            </>
          ) : (
            state === 'book-error' ? 'Try Again →' : 'Confirm Consultation →'
          )}
        </button>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 12, marginTop: 10 }}>
          Confirmation text will be sent to your phone.
        </p>
      </div>
    );
  }

  return null;
}
