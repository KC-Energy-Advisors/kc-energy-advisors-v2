'use client';
import { useEffect } from 'react';

// ── Event catalogue ───────────────────────────────────────────────
export type TrackEvent =
  | 'cta_click'
  | 'scroll_50'
  | 'form_start'
  | 'form_abandon'
  | 'form_complete'
  | 'exit_intent_shown'
  | 'exit_intent_cta'
  | 'high_intent_user';  // scroll50 + cta_click + form_start all fired

// ── Internal: fire to GA4 / Pixel / console ───────────────────────
// Used by both track() and maybeTrackHighIntent() to avoid recursion.
function fireExternal(
  event: string,
  props?: Record<string, string | number | boolean>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag('event', event, props ?? {});
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).fbq('trackCustom', event, props ?? {});
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[track]', event, props ?? '');
  }
}

// ── High-intent composite event ───────────────────────────────────
// Fires once per session when all three engagement signals are present:
// scroll_50 + cta_click + form_start.
function maybeTrackHighIntent(): void {
  try {
    if (sessionStorage.getItem('kcea_high_intent') === '1') return;
    const has = (k: string) => sessionStorage.getItem(k) === '1';
    if (!has('kcea_scroll50') || !has('kcea_cta_clicked') || !has('kcea_form_started')) return;
    sessionStorage.setItem('kcea_high_intent', '1');
  } catch { return; }
  fireExternal('high_intent_user', { triggers: 'scroll50+cta+form_start' });
}

// ── Core track function ───────────────────────────────────────────
// Works today with zero analytics installed.
// Drop GA4 / Meta Pixel script tags into layout.tsx and events
// automatically flow — no code changes needed here.
export function track(
  event: TrackEvent,
  props?: Record<string, string | number | boolean>,
): void {
  // 1. sessionStorage event log (inspect via DevTools → Application → Session Storage)
  try {
    const KEY = 'kcea_events';
    type Entry = { event: string; props?: object; ts: number };
    const prev: Entry[] = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    prev.push({ event, props, ts: Date.now() });
    sessionStorage.setItem(KEY, JSON.stringify(prev.slice(-100)));

    // 2. Boolean flags for key events — O(1) reads by exit-intent + high-intent logic.
    //    These never get cleared so they survive soft refreshes within the session.
    if (event === 'cta_click')     sessionStorage.setItem('kcea_cta_clicked',  '1');
    if (event === 'form_start')    sessionStorage.setItem('kcea_form_started',  '1');
    if (event === 'form_complete') sessionStorage.setItem('kcea_form_complete', '1');
  } catch { /* storage blocked */ }

  // 3. Fire to external destinations
  fireExternal(event, props);

  // 4. Check if high-intent threshold is now met
  if (event === 'cta_click' || event === 'form_start') {
    maybeTrackHighIntent();
  }
}

// ── Scroll-depth hook ─────────────────────────────────────────────
// Sets kcea_scroll35 at 35% (silent flag, used by exit-intent gate).
// Fires scroll_50 event + sets kcea_scroll50 flag at 50%.
export function useScrollTracking(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const already35 = sessionStorage.getItem('kcea_scroll35') === '1';
    const already50 = sessionStorage.getItem('kcea_scroll50') === '1';
    if (already35 && already50) return; // both thresholds already recorded

    let fired35 = already35;
    let fired50 = already50;

    const onScroll = () => {
      if (fired35 && fired50) return;
      const total = document.body.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const pct = (window.scrollY / total) * 100;

      if (!fired35 && pct >= 35) {
        fired35 = true;
        try { sessionStorage.setItem('kcea_scroll35', '1'); } catch { /* */ }
        // No track() call here — 35% is a silent engagement gate only
      }

      if (!fired50 && pct >= 50) {
        fired50 = true;
        try { sessionStorage.setItem('kcea_scroll50', '1'); } catch { /* */ }
        track('scroll_50');
        maybeTrackHighIntent(); // check if this tips the user into high-intent
      }

      if (fired35 && fired50) {
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}
