'use client';
/**
 * SlotPicker.tsx
 * Custom date + time picker for booking a solar consultation.
 * Fetches available slots from /api/calendar-slots and books via /api/book-appointment.
 * No data re-entry — contactId, name, and phone come in as props.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CalendarSlot, SlotsByDate, BookingRequest } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Guess the user's IANA timezone, fallback to Central */
function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  } catch {
    return 'America/Chicago';
  }
}

/**
 * Format an ISO string to a human-readable time like "9:00 AM"
 * in the user's local timezone.
 */
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/**
 * Format a YYYY-MM-DD key to a display label like "Tuesday, April 22"
 */
function fmtDate(dateKey: string): string {
  try {
    // Parse as noon local time to avoid timezone edge-case flips
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

/** Sort date keys ascending */
function sortedDateKeys(slots: SlotsByDate): string[] {
  return Object.keys(slots).sort();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SlotPickerProps {
  contactId : string | null;  // null if upsert failed — show fallback iframe
  name      : string;
  phone     : string;
  onBooked  : (appointmentId: string, slot: CalendarSlot) => void;
  onError?  : (msg: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error' | 'empty';
type BookState = 'idle' | 'booking' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────

export default function SlotPicker({ contactId, name, phone, onBooked, onError }: SlotPickerProps) {
  const timezone = guessTimezone();

  const [loadState,      setLoadState]      = useState<LoadState>('loading');
  const [slotsByDate,    setSlotsByDate]    = useState<SlotsByDate>({});
  const [selectedDate,   setSelectedDate]   = useState<string | null>(null);
  const [selectedSlot,   setSelectedSlot]   = useState<CalendarSlot | null>(null);
  const [bookState,      setBookState]      = useState<BookState>('idle');
  const [bookError,      setBookError]      = useState<string>('');

  // ── Fetch available slots ─────────────────────────────────────────────────
  const fetchSlots = useCallback(async () => {
    setLoadState('loading');
    try {
      const res = await fetch(
        `/api/calendar-slots?timezone=${encodeURIComponent(timezone)}&days=14`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(`slots fetch ${res.status}`);
      const data = await res.json() as { slots: SlotsByDate; error?: string };
      if (data.error) throw new Error(data.error);

      const keys = sortedDateKeys(data.slots);
      if (keys.length === 0) {
        setLoadState('empty');
        return;
      }
      setSlotsByDate(data.slots);
      setSelectedDate(keys[0]);   // auto-select first available date
      setLoadState('ready');
    } catch (err) {
      console.error('[SlotPicker] fetchSlots error:', err);
      setLoadState('error');
    }
  }, [timezone]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // ── Reset slot selection when date changes ────────────────────────────────
  useEffect(() => {
    setSelectedSlot(null);
    setBookState('idle');
    setBookError('');
  }, [selectedDate]);

  // ── Book the selected slot ────────────────────────────────────────────────
  async function handleBook() {
    if (!selectedSlot || !contactId) return;

    setBookState('booking');
    setBookError('');

    const body: BookingRequest = {
      contactId,
      startTime: selectedSlot.startTime,
      endTime:   selectedSlot.endTime,
      name,
      timezone,
    };

    try {
      const res = await fetch('/api/book-appointment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; appointmentId?: string; error?: string };

      if (!data.success || !data.appointmentId) {
        const msg = data.error || 'Failed to book. Please try again.';
        setBookError(msg);
        setBookState('error');
        onError?.(msg);
        return;
      }

      onBooked(data.appointmentId, selectedSlot);
    } catch (err) {
      const msg = 'Network error. Please try again.';
      setBookError(msg);
      setBookState('error');
      onError?.(msg);
      console.error('[SlotPicker] handleBook error:', err);
    }
  }

  // ── If no contactId, fall back to GHL iframe ──────────────────────────────
  if (!contactId) {
    const fallbackSrc = (() => {
      const p = new URLSearchParams();
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        p.set('first_name', parts[0]);
        p.set('last_name',  parts.slice(1).join(' '));
      } else {
        p.set('name', name);
      }
      if (phone) p.set('phone', phone);
      return `https://api.leadconnectorhq.com/widget/booking/0fu9WuucPW0YhM0SEGf?${p.toString()}`;
    })();

    return (
      <div style={{ width: '100%' }}>
        <iframe
          src={fallbackSrc}
          scrolling="no"
          onLoad={() => window.scrollTo({ top: 0, behavior: 'auto' })}
          style={{
            width: '100%',
            minHeight: '700px',
            border: 'none',
            overflow: 'hidden',
            display: 'block',
            overflowAnchor: 'none',
          }}
        />
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 16 }}>Loading available times…</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadState === 'error') {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 16 }}>
          Couldn't load available times. Please refresh or call us directly.
        </p>
        <button
          onClick={fetchSlots}
          style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (loadState === 'empty') {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
          No times available in the next 14 days. Please check back soon or call us directly.
        </p>
      </div>
    );
  }

  // ── Ready — render date tabs + time grid ──────────────────────────────────
  const dateKeys     = sortedDateKeys(slotsByDate);
  const todaySlots   = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>

      {/* ── Date selector ────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, padding: '0 4px', minWidth: 'max-content' }}>
          {dateKeys.map(dk => {
            const d    = new Date(`${dk}T12:00:00`);
            const mon  = d.toLocaleDateString('en-US', { month: 'short' });
            const day  = d.toLocaleDateString('en-US', { day: 'numeric' });
            const dow  = d.toLocaleDateString('en-US', { weekday: 'short' });
            const sel  = dk === selectedDate;
            return (
              <button
                key={dk}
                onClick={() => setSelectedDate(dk)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: sel ? '2px solid #2563EB' : '2px solid rgba(255,255,255,0.12)',
                  background: sel ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.04)',
                  color: sel ? '#fff' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  minWidth: 60,
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{dow}</span>
                <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, marginTop: 2 }}>{day}</span>
                <span style={{ fontSize: 11, marginTop: 1 }}>{mon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected date label ───────────────────────────────────── */}
      {selectedDate && (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '16px 0 10px', fontWeight: 500 }}>
          {fmtDate(selectedDate)}
        </p>
      )}

      {/* ── Time slots grid ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {todaySlots.map(slot => {
          const sel = selectedSlot?.startTime === slot.startTime;
          return (
            <button
              key={slot.startTime}
              onClick={() => { setSelectedSlot(slot); setBookState('idle'); setBookError(''); }}
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                border: sel ? '2px solid #2563EB' : '2px solid rgba(255,255,255,0.12)',
                background: sel ? 'rgba(37,99,235,0.22)' : 'rgba(255,255,255,0.04)',
                color: sel ? '#fff' : 'rgba(255,255,255,0.75)',
                fontSize: 14,
                fontWeight: sel ? 600 : 400,
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s, color 0.12s',
                textAlign: 'center',
              }}
            >
              {fmtTime(slot.startTime)}
            </button>
          );
        })}
      </div>

      {/* ── Confirm button ────────────────────────────────────────── */}
      {selectedSlot && (
        <div style={{ marginTop: 24 }}>
          {bookError && (
            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>
              {bookError}
            </p>
          )}
          <button
            onClick={handleBook}
            disabled={bookState === 'booking'}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 10,
              border: 'none',
              background: bookState === 'booking' ? 'rgba(37,99,235,0.5)' : '#2563EB',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: bookState === 'booking' ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.01em',
            }}
          >
            {bookState === 'booking'
              ? 'Booking…'
              : `Confirm ${fmtTime(selectedSlot.startTime)} on ${fmtDate(selectedDate!)}`}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            You'll receive a confirmation text at {phone}
          </p>
        </div>
      )}
    </div>
  );
}
