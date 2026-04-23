'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
//  Styles
// ─────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes kc-pulse  { 0%,100%{opacity:.18} 50%{opacity:.44} }
  @keyframes kc-spin   { to { transform: rotate(360deg); } }
  @keyframes kc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes kc-pop    { 0%{opacity:0;transform:scale(0.96) translateY(6px)} 65%{transform:scale(1.015) translateY(0)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes kc-dot    { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
  @keyframes kc-slot-in { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }

  /* Date strip scrollbar suppression + touch scroll */
  .kc-date-strip {
    -ms-overflow-style: none;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
  }
  .kc-date-strip::-webkit-scrollbar { display: none; }

  /* Date card scroll snap anchor */
  .kc-date-card { scroll-snap-align: start; }

  /* Date card hover (unselected only) */
  .kc-date-card:not(.kc-date-on):hover {
    background: rgba(59,130,246,0.1) !important;
    border-color: rgba(59,130,246,0.28) !important;
  }
  .kc-date-card:not(.kc-date-on):hover .kc-wd  { color: #93c5fd !important; }
  .kc-date-card:not(.kc-date-on):hover .kc-day { color: rgba(255,255,255,0.85) !important; }

  /* Time button — stagger in on mount, lift on hover */
  .kc-time-btn { animation: kc-slot-in 0.18s ease both; }
  .kc-time-btn:hover {
    background: rgba(59,130,246,0.2) !important;
    border-color: rgba(59,130,246,0.5) !important;
    color: white !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 18px rgba(37,99,235,0.26) !important;
  }
  .kc-time-btn:active { transform: translateY(0) scale(0.96) !important; transition-duration: 0.07s !important; }

  /* Responsive time grid: 3 cols on narrow screens */
  @media (max-width: 380px) {
    .kc-time-grid { grid-template-columns: repeat(3, 1fr) !important; }
  }

  /* Arrow button */
  .kc-arrow-btn:hover {
    background: rgba(255,255,255,0.14) !important;
    color: rgba(255,255,255,0.9) !important;
  }
  .kc-arrow-btn:active { transform: translateY(-50%) scale(0.88) !important; }

  /* Confirm button */
  .kc-confirm-btn:hover:not(:disabled) {
    background: #1d4ed8 !important;
    box-shadow: 0 14px 48px rgba(37,99,235,0.66) !important;
    transform: translateY(-2px) !important;
  }
  .kc-confirm-btn:active:not(:disabled) { transform: translateY(0) scale(0.982) !important; transition-duration: 0.08s !important; }

  /* Back link */
  .kc-back-btn:hover { color: rgba(255,255,255,0.7) !important; }

  /* Section animations */
  .kc-fadein { animation: kc-fadein 0.24s ease both; }
  .kc-pop    { animation: kc-pop 0.3s cubic-bezier(0.34,1.4,0.64,1) both; }

  /* Availability dot pulse */
  .kc-avail-dot { animation: kc-dot 2.6s ease-in-out infinite; }

  /* Trust line checkmarks */
  .kc-trust { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
  .kc-trust-item { display:flex; align-items:center; gap:5px; color:rgba(255,255,255,0.28); font-size:12px; white-space:nowrap; }
  .kc-trust-check { color:rgba(74,222,128,0.7); font-size:11px; }
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

  const dateStripRef = useRef<HTMLDivElement>(null);

  // Detect browser timezone once; stable for the lifetime of this component.
  const [tz] = useState<string>(() => {
    try   { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; }
    catch { return 'America/Chicago'; }
  });

  // ── Scroll the date strip left / right ────────────────────────
  function scrollDates(dir: 'left' | 'right') {
    const el = dateStripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  }

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

  // ─────────────────────────────────────────────────────────────
  //  Render: loading skeleton
  // ─────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{ paddingTop: 4 }}>
        <style>{CSS}</style>

        {/* Availability badge skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0, animation: 'kc-pulse 1s ease-in-out infinite' }} />
          <div style={{ width: 160, height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.07)', animation: 'kc-pulse 1s ease-in-out infinite' }} />
        </div>

        {/* Date label skeleton */}
        <div style={{ width: 76, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', marginBottom: 14, animation: 'kc-pulse 1s ease-in-out infinite' }} />

        {/* Date strip skeleton */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, overflow: 'hidden' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              flexShrink: 0, width: 88, height: 80, borderRadius: 16,
              background: 'rgba(255,255,255,0.055)',
              animation : `kc-pulse ${0.9 + i * 0.1}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }} />

        {/* Time label skeleton */}
        <div style={{ width: 110, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', marginBottom: 14, animation: 'kc-pulse 1.1s ease-in-out infinite' }} />

        {/* Time grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{
              height: 52, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              animation : `kc-pulse ${0.9 + i * 0.09}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 24, letterSpacing: '0.01em' }}>
          Checking Michael's calendar…
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: slot fetch failed
  // ─────────────────────────────────────────────────────────────
  if (state === 'fetch-error') {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center' }}>
        <style>{CSS}</style>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 6v5M10 14h.01" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="8.5" stroke="#f87171" strokeWidth="1.4"/>
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
          Couldn't load available times
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 24 }}>
          Or call us directly:{' '}
          <a href={PHONE_HREF} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
            {PHONE_DISPLAY}
          </a>
        </p>
        <button
          type="button"
          onClick={loadSlots}
          className="kc-arrow-btn"
          style={{
            background  : 'rgba(255,255,255,0.07)',
            border      : '1px solid rgba(255,255,255,0.13)',
            color       : 'rgba(255,255,255,0.8)',
            padding     : '12px 32px',
            borderRadius: 12,
            fontSize    : 14,
            fontWeight  : 600,
            cursor      : 'pointer',
            transition  : 'background 0.15s, color 0.15s',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: no availability
  // ─────────────────────────────────────────────────────────────
  if (state === 'empty') {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center' }}>
        <style>{CSS}</style>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(251,191,36,0.09)',
          border: '1px solid rgba(251,191,36,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="3" y="5" width="14" height="12" rx="2" stroke="#fbbf24" strokeWidth="1.4"/>
            <path d="M7 3v3M13 3v3M3 9h14" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
          No openings in the next 14 days
        </p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginBottom: 28 }}>
          Give us a call and we'll find a time that works for you.
        </p>
        <a
          href={PHONE_HREF}
          style={{
            display       : 'inline-flex',
            alignItems    : 'center',
            gap           : 9,
            background    : '#2563eb',
            color         : 'white',
            padding       : '14px 30px',
            borderRadius  : 13,
            fontSize      : 15,
            fontWeight    : 700,
            textDecoration: 'none',
            boxShadow     : '0 6px 28px rgba(37,99,235,0.42)',
            transition    : 'all 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 3.5A1.5 1.5 0 013.5 2h.878c.414 0 .781.253.937.636l.686 1.715a1 1 0 01-.23 1.08L4.5 6.5C5.5 8.5 7.5 10.5 9.5 11.5l1.069-1.271a1 1 0 011.08-.23l1.715.686c.383.156.636.523.636.937V13A1.5 1.5 0 0112.5 14C6.701 14 2 9.299 2 3.5z" fill="white"/>
          </svg>
          {PHONE_DISPLAY}
        </a>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: date + time selector
  // ─────────────────────────────────────────────────────────────
  if (state === 'selecting') {
    const timeSlots   = selDate ? (slots[selDate] ?? []) : [];
    const selectedDay = selDate ? parseDateKey(selDate).monthDay : '';

    return (
      <div className="kc-fadein" style={{ paddingTop: 4 }}>
        <style>{CSS}</style>

        {/* ── Identity anchor ───────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <p style={{
            color        : 'rgba(255,255,255,0.78)',
            fontSize     : 15,
            fontWeight   : 600,
            letterSpacing: '-0.01em',
            marginBottom : 3,
          }}>
            Your consultation with Michael
          </p>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontWeight: 400 }}>
            Serving homeowners across the Kansas City area
          </p>
        </div>

        {/* ── Availability badge ────────────────────────────────── */}
        <div style={{
          display    : 'flex',
          alignItems : 'center',
          gap        : 10,
          marginBottom: 28,
        }}>
          <span
            className="kc-avail-dot"
            style={{
              width       : 8,
              height      : 8,
              borderRadius: '50%',
              background  : '#22c55e',
              boxShadow   : '0 0 0 3px rgba(34,197,94,0.18)',
              flexShrink  : 0,
              display     : 'block',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.44)', fontSize: 13 }}>
            Spots fill quickly — {dates.length} day{dates.length !== 1 ? 's' : ''} still open
          </span>
        </div>

        {/* ── Date label ────────────────────────────────────────── */}
        <p style={{
          color        : 'rgba(255,255,255,0.36)',
          fontSize     : 11,
          fontWeight   : 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          marginBottom : 14,
        }}>
          Choose a date
        </p>

        {/* ── Date strip with arrow navigation ──────────────────── */}
        <div style={{ position: 'relative', marginBottom: 32 }}>

          {/* Left arrow */}
          <button
            type="button"
            aria-label="Scroll dates left"
            className="kc-arrow-btn"
            onClick={() => scrollDates('left')}
            style={{
              position      : 'absolute',
              left          : -5,
              top           : '50%',
              transform     : 'translateY(-50%)',
              zIndex        : 2,
              width         : 34,
              height        : 34,
              borderRadius  : '50%',
              border        : '1px solid rgba(255,255,255,0.12)',
              background    : 'rgba(10,18,36,0.88)',
              color         : 'rgba(255,255,255,0.5)',
              display       : 'flex',
              alignItems    : 'center',
              justifyContent: 'center',
              cursor        : 'pointer',
              transition    : 'background 0.15s, color 0.15s',
              backdropFilter: 'blur(12px)',
              flexShrink    : 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M7.5 9.5L4 6l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Left fade */}
          <div style={{
            position     : 'absolute', left: 24, top: 0, bottom: 0, width: 28,
            background   : 'linear-gradient(to right, rgba(8,16,32,0.95), transparent)',
            zIndex       : 1,
            pointerEvents: 'none',
          }} />

          {/* Scrollable strip */}
          <div
            ref={dateStripRef}
            className="kc-date-strip"
            style={{ overflowX: 'auto', paddingLeft: 30, paddingRight: 30, paddingBottom: 4 }}
          >
            <div style={{ display: 'flex', gap: 10, width: 'max-content' }}>
              {dates.map(d => {
                const { weekday, monthDay } = parseDateKey(d);
                const on = d === selDate;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`kc-date-card${on ? ' kc-date-on' : ''}`}
                    onClick={() => { setSelDate(d); setSelSlot(null); }}
                    style={{
                      flexShrink  : 0,
                      width       : 88,
                      padding     : '14px 0 13px',
                      borderRadius: 16,
                      border      : on
                        ? '2px solid rgba(59,130,246,0.9)'
                        : '1px solid rgba(255,255,255,0.09)',
                      background  : on
                        ? 'rgba(59,130,246,0.2)'
                        : 'rgba(255,255,255,0.04)',
                      cursor      : 'pointer',
                      textAlign   : 'center',
                      transition  : 'all 0.18s',
                      boxShadow   : on
                        ? '0 0 0 4px rgba(59,130,246,0.13), 0 6px 20px rgba(0,0,0,0.28)'
                        : '0 2px 8px rgba(0,0,0,0.18)',
                    }}
                  >
                    <span
                      className="kc-wd"
                      style={{
                        display      : 'block',
                        fontSize     : 10,
                        fontWeight   : 700,
                        letterSpacing: '0.1em',
                        color        : on ? '#7dd3fc' : 'rgba(255,255,255,0.2)',
                        marginBottom : 5,
                        transition   : 'color 0.15s',
                      }}
                    >
                      {weekday}
                    </span>
                    <span
                      className="kc-day"
                      style={{
                        display   : 'block',
                        fontSize  : 13.5,
                        fontWeight: on ? 800 : 400,
                        color     : on ? 'white' : 'rgba(255,255,255,0.38)',
                        lineHeight: 1.3,
                        transition: 'color 0.15s',
                      }}
                    >
                      {monthDay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right fade */}
          <div style={{
            position     : 'absolute', right: 24, top: 0, bottom: 0, width: 28,
            background   : 'linear-gradient(to left, rgba(8,16,32,0.95), transparent)',
            zIndex       : 1,
            pointerEvents: 'none',
          }} />

          {/* Right arrow */}
          <button
            type="button"
            aria-label="Scroll dates right"
            className="kc-arrow-btn"
            onClick={() => scrollDates('right')}
            style={{
              position      : 'absolute',
              right         : -5,
              top           : '50%',
              transform     : 'translateY(-50%)',
              zIndex        : 2,
              width         : 34,
              height        : 34,
              borderRadius  : '50%',
              border        : '1px solid rgba(255,255,255,0.12)',
              background    : 'rgba(10,18,36,0.88)',
              color         : 'rgba(255,255,255,0.5)',
              display       : 'flex',
              alignItems    : 'center',
              justifyContent: 'center',
              cursor        : 'pointer',
              transition    : 'background 0.15s, color 0.15s',
              backdropFilter: 'blur(12px)',
              flexShrink    : 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── Section divider ───────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }} />

        {/* ── Time grid ─────────────────────────────────────────── */}
        {timeSlots.length > 0 ? (
          <div className="kc-fadein" key={selDate}>
            <p style={{
              color        : 'rgba(255,255,255,0.36)',
              fontSize     : 11,
              fontWeight   : 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              marginBottom : 14,
            }}>
              Available times{selectedDay ? ` — ${selectedDay}` : ''}
            </p>
            <div
              className="kc-time-grid"
              style={{
                display            : 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap                : 10,
              }}
            >
              {timeSlots.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  className="kc-time-btn"
                  onClick={() => { setSelSlot(slot); setState('confirming'); }}
                  style={{
                    padding        : '14px 4px',
                    borderRadius   : 12,
                    border         : '1px solid rgba(255,255,255,0.1)',
                    background     : 'rgba(255,255,255,0.05)',
                    color          : 'rgba(255,255,255,0.72)',
                    fontSize       : 13,
                    fontWeight     : 600,
                    cursor         : 'pointer',
                    transition     : 'all 0.15s',
                    whiteSpace     : 'nowrap',
                    minHeight      : 52,
                    display        : 'flex',
                    alignItems     : 'center',
                    justifyContent : 'center',
                    boxShadow      : '0 2px 6px rgba(0,0,0,0.14)',
                    animationDelay : `${i * 0.028}s`,
                  }}
                >
                  {slotTime(slot.startTime, tz)}
                </button>
              ))}
            </div>
            {/* Trust line */}
            <div className="kc-trust" style={{ marginTop: 22 }}>
              {(['Free consultation', 'No obligation', '~30 min with Michael'] as const).map(t => (
                <span key={t} className="kc-trust-item">
                  <span className="kc-trust-check">✓</span>{t}
                </span>
              ))}
            </div>

            {/* Commitment note */}
            <p style={{
              color      : 'rgba(255,255,255,0.22)',
              fontSize   : 12,
              textAlign  : 'center',
              marginTop  : 12,
              lineHeight : 1.6,
              fontStyle  : 'italic',
            }}>
              Michael will visit your home, review your actual usage, and walk through your options — no pressure, just real numbers.
            </p>
          </div>
        ) : (
          <p style={{
            color      : 'rgba(255,255,255,0.28)',
            fontSize   : 13,
            textAlign  : 'center',
            marginTop  : 8,
            fontStyle  : 'italic',
          }}>
            No times available on this date — select another above.
          </p>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: confirming / booking / book-error
  //  All three share this layout — only the button state changes.
  // ─────────────────────────────────────────────────────────────
  if (selSlot && selDate) {
    const { long: dateLong } = parseDateKey(selDate);
    const time = slotTime(selSlot.startTime, tz);
    const busy = state === 'booking';

    return (
      <div className="kc-pop" style={{ paddingTop: 4 }}>
        <style>{CSS}</style>

        {/* ── Back link ─────────────────────────────────────────── */}
        <button
          type="button"
          className="kc-back-btn"
          onClick={() => { setState('selecting'); setSelSlot(null); setBookErr(''); }}
          style={{
            display    : 'inline-flex',
            alignItems : 'center',
            gap        : 6,
            background : 'none',
            border     : 'none',
            color      : 'rgba(255,255,255,0.3)',
            fontSize   : 13,
            cursor     : 'pointer',
            padding    : '0 0 24px',
            transition : 'color 0.15s',
            fontWeight : 500,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11.5L5 7l4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change time
        </button>

        {/* ── Identity anchor + eyebrow ─────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <p style={{
            color        : 'rgba(255,255,255,0.76)',
            fontSize     : 15,
            fontWeight   : 600,
            letterSpacing: '-0.01em',
            marginBottom : 3,
          }}>
            Your consultation with Michael
          </p>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>
            Kansas City area · Free · No obligation
          </p>
        </div>

        {/* ── Selected slot card ────────────────────────────────── */}
        <div style={{
          background    : 'rgba(59,130,246,0.08)',
          border        : '1px solid rgba(59,130,246,0.2)',
          borderTop     : '2px solid rgba(59,130,246,0.55)',
          borderRadius  : 18,
          padding       : '22px 24px',
          marginBottom  : 20,
          display       : 'flex',
          alignItems    : 'center',
          gap           : 18,
          boxShadow     : '0 6px 32px rgba(0,0,0,0.26)',
        }}>
          {/* Calendar icon */}
          <div style={{
            flexShrink    : 0,
            width         : 48,
            height        : 48,
            borderRadius  : 13,
            background    : 'rgba(59,130,246,0.16)',
            border        : '1px solid rgba(59,130,246,0.26)',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect x="3" y="5" width="16" height="14" rx="3" stroke="#60a5fa" strokeWidth="1.5"/>
              <path d="M8 3v3M14 3v3M3 9h16" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="13" r="1" fill="#60a5fa"/>
              <circle cx="11" cy="13" r="1" fill="#60a5fa"/>
              <circle cx="14" cy="13" r="1" fill="#60a5fa"/>
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{
              color        : 'rgba(255,255,255,0.36)',
              fontSize     : 10,
              fontWeight   : 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom : 5,
            }}>
              Your appointment
            </p>
            <p style={{
              color     : 'white',
              fontSize  : 18,
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 3,
              whiteSpace: 'nowrap',
              overflow  : 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {dateLong}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 14, fontWeight: 500 }}>
              {time}
            </p>
          </div>
        </div>

        {/* ── Commitment note ───────────────────────────────────── */}
        <p style={{
          color      : 'rgba(255,255,255,0.38)',
          fontSize   : 13,
          lineHeight : 1.6,
          marginBottom: 20,
        }}>
          Michael will visit your home, review your exact energy usage, and walk you through your solar options — no pressure, just the real numbers.
        </p>

        {/* ── Booking error ──────────────────────────────────────── */}
        {state === 'book-error' && bookErr && (
          <div style={{
            background  : 'rgba(239,68,68,0.09)',
            border      : '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12,
            padding     : '12px 16px',
            marginBottom: 16,
          }}>
            <p style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', margin: 0 }}>
              {bookErr}
            </p>
          </div>
        )}

        {/* ── Confirm button ─────────────────────────────────────── */}
        <button
          type="button"
          className="kc-confirm-btn"
          onClick={confirmBooking}
          disabled={busy}
          style={{
            width         : '100%',
            padding       : '16px',
            borderRadius  : 14,
            border        : 'none',
            background    : busy ? 'rgba(255,255,255,0.07)' : '#2563eb',
            color         : busy ? 'rgba(255,255,255,0.28)' : 'white',
            fontSize      : 16,
            fontWeight    : 700,
            cursor        : busy ? 'not-allowed' : 'pointer',
            boxShadow     : busy ? 'none' : '0 8px 36px rgba(37,99,235,0.5)',
            transition    : 'all 0.2s',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
            gap           : 9,
            letterSpacing : '0.01em',
          }}
        >
          {busy ? (
            <>
              <span style={{
                width        : 17,
                height       : 17,
                border       : '2.5px solid rgba(255,255,255,0.15)',
                borderTopColor: 'rgba(255,255,255,0.65)',
                borderRadius : '50%',
                animation    : 'kc-spin 0.7s linear infinite',
                display      : 'inline-block',
                flexShrink   : 0,
              }} />
              Locking in your time…
            </>
          ) : (
            state === 'book-error' ? 'Try Again →' : 'Confirm My Time →'
          )}
        </button>

        {/* ── Post-click reassurance ─────────────────────────────── */}
        <p style={{
          textAlign    : 'center',
          color        : 'rgba(255,255,255,0.24)',
          fontSize     : 12,
          marginTop    : 12,
          lineHeight   : 1.5,
          letterSpacing: '0.005em',
        }}>
          You'll receive a confirmation text right after booking.
        </p>

        {/* ── Trust footer ───────────────────────────────────────── */}
        <div className="kc-trust" style={{ marginTop: 10 }}>
          {(['Free', 'No obligation', 'No payment required'] as const).map(t => (
            <span key={t} className="kc-trust-item">
              <span className="kc-trust-check">✓</span>{t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
