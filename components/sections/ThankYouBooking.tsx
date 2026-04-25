'use client';
/**
 * ThankYouBooking.tsx
 *
 * Client component rendered by /app/thank-you/page.tsx after a successful
 * Step 4 (or get-solar-info) submission. It receives the GHL contactId and
 * the lead's qualification fields via URL params and renders the SAME working
 * SlotPicker used on /get-solar-info — so the contact created at submit time
 * carries through to the appointment without creating a duplicate.
 *
 * On successful booking the SlotPicker triggers /api/book-appointment which:
 *   1. Creates the GHL appointment for the same contactId (no dupe).
 *   2. Awaits sendInternalNotification (admin booking SMS).
 *   3. Fires-and-forgets updateGHLContactFields (workflow merge tags).
 */
import { useEffect, useState } from 'react';
import type { CalendarSlot } from '@/lib/types';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';
import SlotPicker from './SlotPicker';

export interface ThankYouBookingProps {
  /**
   * GHL contactId — named `cid` to match the URL query param
   * convention used across the funnel. May be empty string;
   * the /api/book-appointment route will upsert if so.
   */
  cid          : string;
  name         : string;   // full name
  phone        : string;   // E.164
  address      : string;
  ownsHome     : string;
  monthlyBill  : string;   // either a bill code or a human label (both work)
  roofType     : string;
  decisionStage: string;
}

/**
 * Format an ISO appointment time as a friendly date + time pair.
 */
function fmtBookedDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  } catch {
    return { date: iso, time: '' };
  }
}

export default function ThankYouBooking(props: ThankYouBookingProps) {
  const {
    cid, name, phone, address,
    ownsHome, monthlyBill, roofType, decisionStage,
  } = props;

  const [bookedSlot, setBookedSlot] = useState<CalendarSlot | null>(null);
  const [fatalError, setFatalError] = useState<string>('');

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ');
  const firstOnly = firstName || name;

  // ── Browser-side log: confirms the SAME contactId is reaching the picker ──
  // Pairs with the matching log inside SlotPicker (right before the fetch)
  // and inside /api/book-appointment so the full hand-off chain is visible
  // in DevTools + Vercel logs.
  useEffect(() => {
    console.log('BOOKING WITH CONTACT ID:', cid || '(absent — route will upsert)');
    console.error('BOOKING WITH CONTACT ID:', cid || '(absent — route will upsert)');
  }, [cid]);

  // ── BOOKED state — user just confirmed their slot ──────────────────
  if (bookedSlot) {
    const { date, time } = fmtBookedDate(bookedSlot.startTime);
    return (
      <div style={{ background: '#0C1322', minHeight: '100vh' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>

          {/* Check circle */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(13,148,136,0.15)',
            border: '2px solid rgba(13,148,136,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <path d="M6 14l6 6 10-10" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{ color: '#ffffff', fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>
            You&apos;re booked{firstOnly ? `, ${firstOnly}` : ''}!
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            Your free in-home solar consultation is confirmed.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{date}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{time}</p>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
            Michael will come to your home at the time above to review your electric usage and walk
            you through your options. We&apos;ll text {phone || 'you'} with a confirmation shortly.
          </p>

          {fatalError && (
            <p style={{ color: '#fbbf24', fontSize: 13, marginTop: 16, marginBottom: 16 }}>
              Note: {fatalError}
            </p>
          )}

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 28 }}>
            Need to reschedule? Call{' '}
            <a href={PHONE_HREF} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>
              {PHONE_DISPLAY}
            </a>
          </p>

          <p style={{ marginTop: 24 }}>
            <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
              ← Back to home
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── BOOKING state — render SlotPicker with in-home consultation copy ──
  return (
    <div style={{ background: '#0C1322', minHeight: '100vh' }}>
      {/* Dot-grid texture, identical aesthetic to /get-solar-info booking step */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(37,99,235,0.055) 1px,transparent 1px)',
          backgroundSize : '32px 32px',
          zIndex: 0,
        }}
        aria-hidden
      />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 56, paddingBottom: 104 }}>

        {/* ── Headline + sub copy ───────────────────────────────────── */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
          {firstOnly && (
            <p style={{
              color        : '#0D9488',
              fontSize     : 13,
              fontWeight   : 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom : 14,
            }}>
              ✓ {firstOnly}, your home looks like a great fit
            </p>
          )}
          <h1 style={{
            color        : '#ffffff',
            fontSize     : 'clamp(28px, 4vw, 38px)',
            fontWeight   : 900,
            lineHeight   : 1.15,
            letterSpacing: '-0.02em',
            marginBottom : 16,
          }}>
            Schedule your free in-home solar consultation
          </h1>
          <p style={{
            color     : 'rgba(255,255,255,0.6)',
            fontSize  : 17,
            lineHeight: 1.6,
            maxWidth  : 560,
            margin    : '0 auto',
          }}>
            Michael will come to your home, review your electric usage, and walk you through your options.
            No pressure, just the real numbers.
          </p>
        </div>

        {/* ── SlotPicker card ───────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
          <div
            className="w-full rounded-3xl border border-white/[0.14]"
            style={{
              background: 'rgba(255,255,255,0.055)',
              boxShadow : '0 24px 80px rgba(0,0,0,0.52), 0 4px 20px rgba(0,0,0,0.28)',
              padding   : '56px 52px 64px',
            }}
          >
            <SlotPicker
              cid          ={cid}
              name         ={name}
              firstName    ={firstName}
              lastName     ={lastName}
              phone        ={phone}
              address      ={address}
              ownsHome     ={ownsHome}
              monthlyBill  ={monthlyBill}
              roofType     ={roofType}
              decisionStage={decisionStage}
              onBooked     ={(slot) => setBookedSlot(slot)}
              onFatalError ={(msg)  => setFatalError(msg)}
            />
          </div>
        </div>

        {/* ── What to expect block ──────────────────────────────────── */}
        <div style={{ maxWidth: 720, margin: '56px auto 0', padding: '0 24px' }}>
          <p style={{
            textAlign    : 'center',
            color        : 'rgba(255,255,255,0.3)',
            fontSize     : 11,
            fontWeight   : 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom : 20,
          }}>
            What happens at the in-home visit
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              {
                icon : '📋',
                title: 'We review your actual energy usage',
                body : 'Your real Evergy bill — the numbers specific to your home, not national averages.',
              },
              {
                icon : '🏡',
                title: 'We look at your roof and home together',
                body : 'A system designed around your roof, your usage, and your goals — no guesswork.',
              },
              {
                icon : '📊',
                title: 'We give you honest numbers either way',
                body : "If solar doesn't make financial sense for your home, we'll say so. No pressure.",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display      : 'flex',
                  gap          : 16,
                  padding      : '20px 24px',
                  borderRadius : 16,
                  border       : '1px solid rgba(255,255,255,0.07)',
                  background   : 'rgba(255,255,255,0.022)',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }} aria-hidden>{item.icon}</span>
                <div>
                  <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                    {item.title}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.55 }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fallback: prefer to call ──────────────────────────────── */}
        <p style={{
          textAlign : 'center',
          color     : 'rgba(255,255,255,0.4)',
          fontSize  : 13,
          marginTop : 40,
          padding   : '0 24px',
        }}>
          Prefer to call?{' '}
          <a href={PHONE_HREF} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'underline', fontWeight: 600 }}>
            {PHONE_DISPLAY}
          </a>
          {' '}· Mon–Fri 8am–7pm · Sat 9am–3pm CT
        </p>
      </div>
    </div>
  );
}
