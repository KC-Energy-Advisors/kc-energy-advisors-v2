'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CalendarSlot, SlotsByDate } from '@/lib/types';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

export interface SlotPickerProps {
  /** GHL contactId — optional; book-appointment route upserts if absent */
  contactId?    : string;
  /** Full name used as the GHL appointment title */
  name          : string;
  /** Lead contact fields */
  firstName?    : string;
  lastName?     : string;
  phone?        : string;   // E.164
  email?        : string;
  address?      : string;
  /** Qualification fields — must arrive populated for SMS to show values */
  ownsHome?     : string;   // 'yes' | 'no'
  monthlyBill?  : string;   // 'under-100' | '100-150' | '150-200' | '200-plus'
  roofType?     : string;   // 'asphalt' | 'metal' | 'tile' | 'flat' | 'unsure'
  decisionStage?: string;   // 'exploring' | 'interested' | 'ready'
  /** Callbacks */
  onBooked     : (slot: CalendarSlot) => void;
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

  /* Date strip */
  .kc-date-strip {
    -ms-overflow-style: none;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
  }
  .kc-date-strip::-webkit-scrollbar { display: none; }

  /* Date card */
  .kc-date-card { scroll-snap-align: start; }
  .kc-date-card:not(.kc-date-on):hover {
    background: rgba(59,130,246,0.12) !important;
    border-color: rgba(59,130,246,0.32) !important;
  }
  .kc-date-card:not(.kc-date-on):hover .kc-wd  { color: #93c5fd !important; }
  .kc-date-card:not(.kc-date-on):hover .kc-day { color: rgba(255,255,255,0.9) !important; }

  /* Time button */
  .kc-time-btn { animation: kc-slot-in 0.18s ease both; }
  .kc-time-btn:hover {
    background: rgba(59,130,246,0.22) !important;
    border-color: rgba(59,130,246,0.55) !important;
    color: white !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 22px rgba(37,99,235,0.3) !important;
  }
  .kc-time-btn:active { transform: translateY(0) scale(0.96) !important; transition-duration: 0.07s !important; }

  /* Responsive time grid — collapse to 3 cols on narrow phones */
  @media (max-width: 480px) {
    .kc-time-grid { grid-template-columns: repeat(3, 1fr) !important; }
  }

  /* Arrow button */
  .kc-arrow-btn:hover {
    background: rgba(255,255,255,0.16) !important;
    color: rgba(255,255,255,0.9) !important;
  }
  .kc-arrow-btn:active { transform: scale(0.88) !important; }

  /* Confirm button */
  .kc-confirm-btn:hover:not(:disabled) {
    background: #1d4ed8 !important;
    box-shadow: 0 16px 52px rgba(37,99,235,0.7) !important;
    transform: translateY(-2px) !important;
  }
  .kc-confirm-btn:active:not(:disabled) { transform: translateY(0) scale(0.982) !important; transition-duration: 0.08s !important; }

  /* Back link */
  .kc-back-btn:hover { color: rgba(255,255,255,0.7) !important; }

  /* Animations */
  .kc-fadein { animation: kc-fadein 0.24s ease both; }
  .kc-pop    { animation: kc-pop 0.3s cubic-bezier(0.34,1.4,0.64,1) both; }

  /* Availability dot */
  .kc-avail-dot { animation: kc-dot 2.6s ease-in-out infinite; }

  /* Trust row */
  .kc-trust { display:flex; align-items:center; justify-content:center; gap:32px; flex-wrap:wrap; }
  .kc-trust-item { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.36); font-size:15px; white-space:nowrap; }
  .kc-trust-check { color:rgba(74,222,128,0.8); font-size:13px; }
`;

// ─────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────

export default function SlotPicker({
  contactId,
  name,
  firstName,
  lastName,
  phone,
  email,
  address,
  ownsHome,
  monthlyBill,
  roofType,
  decisionStage,
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
    el.scrollBy({ left: dir === 'right' ? 360 : -360, behavior: 'smooth' });
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
    if (!selSlot) {
      console.error('[BOOKING] blocked — no slot selected');
      return;
    }
    // contactId may be empty if submit-lead upsert failed; the route will upsert
    if (!contactId) {
      console.error('[BOOKING] ⚠️ contactId absent — route will upsert contact during booking');
    }

    setState('booking');
    setBookErr('');
    console.error('[BOOKING] firing — contactId:', contactId || '(absent)', '| start:', selSlot.startTime, '| tz:', tz);

    // ── Build payload from current props ────────────────────────
    // decisionStage maps to 'timeline' in the API / GHL layer.
    // contactId may be empty string — route will upsert if so.
    const bookingPayload = {
      contactId: contactId || '',
      startTime   : selSlot.startTime,
      endTime     : selSlot.endTime,
      name,
      timezone    : tz,
      firstName   : firstName   ?? '',
      lastName    : lastName    ?? '',
      phone       : phone       ?? '',
      email       : email       ?? '',
      address     : address     ?? '',
      ownsHome    : ownsHome    ?? '',
      monthlyBill : monthlyBill ?? '',
      roofType    : roofType    ?? '',
      timeline    : decisionStage ?? '',   // API field name
    };

    // Both variants so the log survives removeConsole in production
    console.log('[FINAL BOOKING PAYLOAD]', {
      firstName: bookingPayload.firstName,
      lastName : bookingPayload.lastName,
      phone    : bookingPayload.phone,
      address  : bookingPayload.address,
      ownsHome : bookingPayload.ownsHome,
      monthlyBill  : bookingPayload.monthlyBill,
      roofType     : bookingPayload.roofType,
      decisionStage: decisionStage ?? '',
    });
    console.error('[FINAL BOOKING PAYLOAD]', {
      firstName: bookingPayload.firstName,
      lastName : bookingPayload.lastName,
      phone    : bookingPayload.phone,
      address  : bookingPayload.address,
      ownsHome : bookingPayload.ownsHome,
      monthlyBill  : bookingPayload.monthlyBill,
      roofType     : bookingPayload.roofType,
      decisionStage: decisionStage ?? '',
    });

    try {
      const res  = await fetch('/api/book-appointment', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(bookingPayload),
      });

      const json = await res.json() as {
        success?      : boolean;
        appointmentId?: string;
        error?        : string;
      };
      console.error('[BOOKING] response:', res.status, JSON.stringify(json));

      if (!res.ok || !json.success) {
        // Keep technical detail in logs only — show friendly message to user
        console.error('[BOOKING] failed — server error:', json.error ?? `HTTP ${res.status}`);
        setBookErr(`We couldn't lock in that time. Please try again or call us at ${PHONE_DISPLAY}.`);
        setState('book-error');
        return;
      }

      console.error('[BOOKING] success — appointmentId:', json.appointmentId ?? 'none');
      onBooked(selSlot);

    } catch (err) {
      // Keep technical detail in logs only — show friendly message to user
      console.error('[BOOKING] network error:', err);
      setBookErr(`We couldn't lock in that time. Please try again or call us at ${PHONE_DISPLAY}.`);
      setState('book-error');
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Render: loading skeleton
  // ─────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div>
        <style>{CSS}</style>

        {/* Identity skeleton */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ width: 240, height: 18, borderRadius: 7, background: 'rgba(255,255,255,0.08)', marginBottom: 10, animation: 'kc-pulse 1s ease-in-out infinite' }} />
          <div style={{ width: 190, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'kc-pulse 1.1s ease-in-out infinite' }} />
        </div>

        {/* Badge skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0, animation: 'kc-pulse 1s ease-in-out infinite' }} />
          <div style={{ width: 200, height: 13, borderRadius: 7, background: 'rgba(255,255,255,0.07)', animation: 'kc-pulse 1s ease-in-out infinite' }} />
        </div>

        {/* Date label skeleton */}
        <div style={{ width: 100, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 24, animation: 'kc-pulse 1s ease-in-out infinite' }} />

        {/* Date strip skeleton */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 52, overflow: 'hidden' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              flexShrink: 0, width: 120, height: 110, borderRadius: 22,
              background: 'rgba(255,255,255,0.055)',
              animation : `kc-pulse ${0.9 + i * 0.1}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 48 }} />

        {/* Time label skeleton */}
        <div style={{ width: 140, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 24, animation: 'kc-pulse 1.1s ease-in-out infinite' }} />

        {/* Time grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{
              height: 72, borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              animation : `kc-pulse ${0.9 + i * 0.09}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 14, marginTop: 36, letterSpacing: '0.01em' }}>
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
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <style>{CSS}</style>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 6v5M10 14h.01" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="8.5" stroke="#f87171" strokeWidth="1.4"/>
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Couldn't load available times
        </p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
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
            color       : 'rgba(255,255,255,0.82)',
            padding     : '13px 36px',
            borderRadius: 13,
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
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <style>{CSS}</style>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(251,191,36,0.09)',
          border: '1px solid rgba(251,191,36,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="3" y="5" width="14" height="12" rx="2" stroke="#fbbf24" strokeWidth="1.4"/>
            <path d="M7 3v3M13 3v3M3 9h14" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          No openings in the next 14 days
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
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
            padding       : '15px 32px',
            borderRadius  : 14,
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
      <div className="kc-fadein">
        <style>{CSS}</style>

        {/* ── Identity anchor ───────────────────────────────────── */}
        <div style={{ marginBottom: 44 }}>
          <p style={{
            color        : 'rgba(255,255,255,0.88)',
            fontSize     : 19,
            fontWeight   : 700,
            letterSpacing: '-0.018em',
            marginBottom : 8,
            lineHeight   : 1.3,
          }}>
            Your consultation with Michael
          </p>
          <p style={{ color: 'rgba(255,255,255,0.36)', fontSize: 14, fontWeight: 400, lineHeight: 1.4 }}>
            Serving homeowners across the Kansas City area
          </p>
        </div>

        {/* ── Availability badge ────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <span
            className="kc-avail-dot"
            style={{
              width       : 10,
              height      : 10,
              borderRadius: '50%',
              background  : '#22c55e',
              boxShadow   : '0 0 0 4px rgba(34,197,94,0.2)',
              flexShrink  : 0,
              display     : 'block',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.4 }}>
            Spots fill quickly — {dates.length} day{dates.length !== 1 ? 's' : ''} still open
          </span>
        </div>

        {/* ── Date label ────────────────────────────────────────── */}
        <p style={{
          color        : 'rgba(255,255,255,0.44)',
          fontSize     : 12,
          fontWeight   : 700,
          letterSpacing: '0.11em',
          textTransform: 'uppercase',
          marginBottom : 24,
        }}>
          Choose a date
        </p>

        {/* ── Date strip ────────────────────────────────────────── */}
        {/*
          Flex-row layout: arrows are siblings of the scroll track, never
          overlapping it. The track's overflow:hidden cleanly clips cards at
          both edges. No paddingLeft offset hack needed.
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>

          {/* Left arrow — outside the scroll track */}
          <button
            type="button"
            aria-label="Scroll dates left"
            className="kc-arrow-btn"
            onClick={() => scrollDates('left')}
            style={{
              flexShrink    : 0,
              width         : 48,
              height        : 48,
              borderRadius  : '50%',
              border        : '1px solid rgba(255,255,255,0.13)',
              background    : 'rgba(10,18,36,0.92)',
              color         : 'rgba(255,255,255,0.56)',
              display       : 'flex',
              alignItems    : 'center',
              justifyContent: 'center',
              cursor        : 'pointer',
              transition    : 'background 0.15s, color 0.15s',
              backdropFilter: 'blur(12px)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M7.5 9.5L4 6l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Scroll track — clips cards, holds the right-edge fade */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>

            {/* Right-edge fade — signals more cards to the right */}
            <div style={{
              position      : 'absolute',
              right         : 0,
              top           : 0,
              bottom        : 0,
              width         : 40,
              background    : 'linear-gradient(to left, rgba(8,15,30,0.96), transparent)',
              zIndex        : 1,
              pointerEvents : 'none',
            }} />

            {/* Scrollable strip */}
            <div
              ref={dateStripRef}
              className="kc-date-strip"
              style={{ overflowX: 'auto', paddingBottom: 4 }}
            >
              <div style={{ display: 'flex', gap: 18, width: 'max-content' }}>
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
                        width       : 120,
                        padding     : '24px 0 22px',
                        borderRadius: 22,
                        border      : on
                          ? '2px solid rgba(59,130,246,0.92)'
                          : '1px solid rgba(255,255,255,0.1)',
                        background  : on
                          ? 'rgba(59,130,246,0.22)'
                          : 'rgba(255,255,255,0.05)',
                        cursor      : 'pointer',
                        textAlign   : 'center',
                        transition  : 'all 0.18s',
                        boxShadow   : on
                          ? '0 0 0 8px rgba(59,130,246,0.14), 0 10px 32px rgba(0,0,0,0.36)'
                          : '0 2px 12px rgba(0,0,0,0.22)',
                      }}
                    >
                      <span
                        className="kc-wd"
                        style={{
                          display      : 'block',
                          fontSize     : 12,
                          fontWeight   : 700,
                          letterSpacing: '0.12em',
                          color        : on ? '#7dd3fc' : 'rgba(255,255,255,0.26)',
                          marginBottom : 10,
                          transition   : 'color 0.15s',
                        }}
                      >
                        {weekday}
                      </span>
                      <span
                        className="kc-day"
                        style={{
                          display   : 'block',
                          fontSize  : 18,
                          fontWeight: on ? 800 : 400,
                          color     : on ? 'white' : 'rgba(255,255,255,0.46)',
                          lineHeight: 1.2,
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
          </div>

          {/* Right arrow — outside the scroll track */}
          <button
            type="button"
            aria-label="Scroll dates right"
            className="kc-arrow-btn"
            onClick={() => scrollDates('right')}
            style={{
              flexShrink    : 0,
              width         : 48,
              height        : 48,
              borderRadius  : '50%',
              border        : '1px solid rgba(255,255,255,0.13)',
              background    : 'rgba(10,18,36,0.92)',
              color         : 'rgba(255,255,255,0.56)',
              display       : 'flex',
              alignItems    : 'center',
              justifyContent: 'center',
              cursor        : 'pointer',
              transition    : 'background 0.15s, color 0.15s',
              backdropFilter: 'blur(12px)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── Section divider ───────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 48 }} />

        {/* ── Time grid ─────────────────────────────────────────── */}
        {timeSlots.length > 0 ? (
          <div className="kc-fadein" key={selDate}>
            <p style={{
              color        : 'rgba(255,255,255,0.44)',
              fontSize     : 12,
              fontWeight   : 700,
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              marginBottom : 24,
            }}>
              Available times{selectedDay ? ` — ${selectedDay}` : ''}
            </p>
            <div
              className="kc-time-grid"
              style={{
                display            : 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap                : 16,
              }}
            >
              {timeSlots.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  className="kc-time-btn"
                  onClick={() => { setSelSlot(slot); setState('confirming'); }}
                  style={{
                    padding       : '20px 10px',
                    borderRadius  : 16,
                    border        : '1px solid rgba(255,255,255,0.11)',
                    background    : 'rgba(255,255,255,0.065)',
                    color         : 'rgba(255,255,255,0.8)',
                    fontSize      : 16,
                    fontWeight    : 600,
                    cursor        : 'pointer',
                    transition    : 'all 0.15s',
                    whiteSpace    : 'nowrap',
                    minHeight     : 72,
                    display       : 'flex',
                    alignItems    : 'center',
                    justifyContent: 'center',
                    boxShadow     : '0 2px 10px rgba(0,0,0,0.18)',
                    animationDelay: `${i * 0.028}s`,
                  }}
                >
                  {slotTime(slot.startTime, tz)}
                </button>
              ))}
            </div>

            {/* Trust line */}
            <div className="kc-trust" style={{ marginTop: 44 }}>
              {(['Free consultation', 'No obligation', '~30 min with Michael'] as const).map(t => (
                <span key={t} className="kc-trust-item">
                  <span className="kc-trust-check">✓</span>{t}
                </span>
              ))}
            </div>

            {/* Commitment note */}
            <p style={{
              color    : 'rgba(255,255,255,0.26)',
              fontSize : 13,
              textAlign: 'center',
              marginTop: 22,
              lineHeight: 1.65,
              fontStyle : 'italic',
            }}>
              Michael will visit your home, review your actual usage, and walk through your options — no pressure, just real numbers.
            </p>
          </div>
        ) : (
          <p style={{
            color    : 'rgba(255,255,255,0.3)',
            fontSize : 14,
            textAlign: 'center',
            marginTop: 8,
            fontStyle: 'italic',
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
      <div className="kc-pop">
        <style>{CSS}</style>

        {/* ── Back link ─────────────────────────────────────────── */}
        <button
          type="button"
          className="kc-back-btn"
          onClick={() => { setState('selecting'); setSelSlot(null); setBookErr(''); }}
          style={{
            display    : 'inline-flex',
            alignItems : 'center',
            gap        : 7,
            background : 'none',
            border     : 'none',
            color      : 'rgba(255,255,255,0.32)',
            fontSize   : 14,
            cursor     : 'pointer',
            padding    : '0 0 40px',
            transition : 'color 0.15s',
            fontWeight : 500,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11.5L5 7l4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change time
        </button>

        {/* ── Identity anchor ───────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <p style={{
            color        : 'rgba(255,255,255,0.88)',
            fontSize     : 19,
            fontWeight   : 700,
            letterSpacing: '-0.018em',
            marginBottom : 7,
            lineHeight   : 1.3,
          }}>
            Your consultation with Michael
          </p>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14 }}>
            Kansas City area · Free · No obligation
          </p>
        </div>

        {/* ── Appointment hero card ─────────────────────────────── */}
        <div style={{
          background  : 'rgba(59,130,246,0.1)',
          border      : '1px solid rgba(59,130,246,0.24)',
          borderTop   : '3px solid rgba(59,130,246,0.7)',
          borderRadius: 28,
          padding     : '44px 44px',
          marginBottom: 40,
          display     : 'flex',
          alignItems  : 'center',
          gap         : 36,
          boxShadow   : '0 12px 52px rgba(0,0,0,0.32)',
        }}>
          {/* Calendar icon */}
          <div style={{
            flexShrink    : 0,
            width         : 80,
            height        : 80,
            borderRadius  : 22,
            background    : 'rgba(59,130,246,0.18)',
            border        : '1px solid rgba(59,130,246,0.32)',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 26 26" fill="none" aria-hidden>
              <rect x="3" y="5" width="20" height="17" rx="3.5" stroke="#60a5fa" strokeWidth="1.6"/>
              <path d="M9 3v4M17 3v4M3 10h20" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="9"  cy="15.5" r="1.2" fill="#60a5fa"/>
              <circle cx="13" cy="15.5" r="1.2" fill="#60a5fa"/>
              <circle cx="17" cy="15.5" r="1.2" fill="#60a5fa"/>
            </svg>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              color        : 'rgba(255,255,255,0.4)',
              fontSize     : 12,
              fontWeight   : 700,
              textTransform: 'uppercase',
              letterSpacing: '0.11em',
              marginBottom : 10,
            }}>
              Your appointment
            </p>
            <p style={{
              color        : 'white',
              fontSize     : 30,
              fontWeight   : 800,
              lineHeight   : 1.1,
              marginBottom : 12,
              letterSpacing: '-0.025em',
            }}>
              {dateLong}
            </p>
            <p style={{
              color     : 'rgba(255,255,255,0.62)',
              fontSize  : 22,
              fontWeight: 500,
              lineHeight: 1,
            }}>
              {time}
            </p>
          </div>
        </div>

        {/* ── Commitment note ───────────────────────────────────── */}
        <p style={{
          color      : 'rgba(255,255,255,0.44)',
          fontSize   : 17,
          lineHeight : 1.65,
          marginBottom: 40,
        }}>
          Michael will visit your home, review your exact energy usage, and walk you through your solar options — no pressure, just the real numbers.
        </p>

        {/* ── Booking error ──────────────────────────────────────── */}
        {state === 'book-error' && bookErr && (
          <div style={{
            background  : 'rgba(239,68,68,0.09)',
            border      : '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14,
            padding     : '16px 22px',
            marginBottom: 22,
          }}>
            <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', margin: 0 }}>
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
            padding       : '24px',
            borderRadius  : 20,
            border        : 'none',
            background    : busy ? 'rgba(255,255,255,0.07)' : '#2563eb',
            color         : busy ? 'rgba(255,255,255,0.28)' : 'white',
            fontSize      : 21,
            fontWeight    : 700,
            cursor        : busy ? 'not-allowed' : 'pointer',
            boxShadow     : busy ? 'none' : '0 10px 44px rgba(37,99,235,0.56)',
            transition    : 'all 0.2s',
            display       : 'flex',
            alignItems    : 'center',
            justifyContent: 'center',
            gap           : 12,
            letterSpacing : '0.005em',
          }}
        >
          {busy ? (
            <>
              <span style={{
                width        : 24,
                height       : 24,
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
          color        : 'rgba(255,255,255,0.28)',
          fontSize     : 15,
          marginTop    : 24,
          lineHeight   : 1.5,
          letterSpacing: '0.005em',
        }}>
          You'll receive a confirmation text right after booking.
        </p>

        {/* ── Trust footer ───────────────────────────────────────── */}
        <div className="kc-trust" style={{ marginTop: 24 }}>
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
