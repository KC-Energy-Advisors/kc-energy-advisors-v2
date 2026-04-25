'use client';
import { useState, useEffect } from 'react';
import { track } from '@/hooks/useTracking';

// ── Smooth-scroll helper ──────────────────────────────────────────
function scrollToQualify() {
  const el = document.getElementById('qualify');
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - 80,
    behavior: 'smooth',
  });
}

// ── Helpers ───────────────────────────────────────────────────────
const flag = (k: string) =>
  typeof window !== 'undefined' && sessionStorage.getItem(k) === '1';

// Returns true if the user is currently focused inside the qualify form.
// Used to prevent interrupting active typing.
function isFormActive(): boolean {
  const active = document.activeElement;
  if (!active || active === document.body) return false;
  const formEl = document.getElementById('qualify');
  return formEl?.contains(active) ?? false;
}

// ── Exit-intent popup ─────────────────────────────────────────────
// Trigger conditions (ALL must be true):
//  1. Desktop viewport ≥ 1024 px (checked at trigger time)
//  2. User on page ≥ 12 seconds
//  3. User showed engagement: scrolled ≥ 35% OR clicked a CTA
//  4. User has NOT completed the form
//  5. User is NOT currently focused inside the form
//  6. Popup not yet shown this session
//  7. Mouse near top edge: clientY < 10
//  8. Mouse has genuine upward velocity ≥ 0.15 px/ms
//
// Soft-rescue note: scroll_50 + form_start already satisfies gate #3
// (scroll50 implies scroll35), so high-intent mid-funnel abandoners
// are captured automatically without special-casing.
export default function ExitIntentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Fast-path bailouts — check once at mount
    if (flag('kcea_exit_shown'))    return; // already shown
    if (flag('kcea_form_complete')) return; // form already submitted

    let timeReady  = false;
    let lastY      = -1;
    let lastT      = 0;
    let upVelocity = 0; // px/ms, positive = moving upward

    // Track upward velocity across recent mousemove events.
    // Only samples when dt < 150ms to stay within the same gesture.
    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt  = now - lastT;
      if (lastY >= 0 && dt > 0 && dt < 150) {
        upVelocity = (lastY - e.clientY) / dt;
      }
      lastY = e.clientY;
      lastT = now;
    };

    const onMouseLeave = (e: MouseEvent) => {
      // ── Hard guards ──────────────────────────────────────────────
      if (!timeReady)                  return; // < 12 s on page
      if (e.clientY > 10)              return; // not heading toward top chrome
      if (upVelocity < 0.15)           return; // not a deliberate upward gesture
      if (window.innerWidth < 1024)    return; // not desktop at this moment
      if (flag('kcea_exit_shown'))     return; // shown in another tab / fast re-entry
      if (flag('kcea_form_complete'))  return; // form was submitted
      if (isFormActive())              return; // user is actively typing in form

      // ── Engagement gate ───────────────────────────────────────────
      // User must have shown real interest before we interrupt.
      const hasEngaged =
        flag('kcea_scroll35') ||    // scrolled ≥ 35%
        flag('kcea_cta_clicked');   // clicked any CTA
      if (!hasEngaged) return;

      // ── All checks passed ─────────────────────────────────────────
      setVisible(true);
      try { sessionStorage.setItem('kcea_exit_shown', '1'); } catch { /* */ }

      // Track with context about how engaged this user was
      track('exit_intent_shown', {
        highIntent: (flag('kcea_scroll50') && flag('kcea_form_started'))
          ? 'true'
          : 'false',
        upVelocity: Math.round(upVelocity * 100) / 100,
      });

      // Detach — we only ever want one show
      document.removeEventListener('mousemove',  onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };

    const timer = setTimeout(() => { timeReady = true; }, 12000);
    document.addEventListener('mousemove',  onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove',  onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;

  const handleCTA = () => {
    setVisible(false);
    track('exit_intent_cta');
    scrollToQualify();
  };

  const handleDismiss = () => setVisible(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,19,34,0.80)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-banner-heading"
    >
      {/* Card */}
      <div
        className="w-full max-w-[420px] rounded-2xl border border-white/10 p-7 relative"
        style={{ background: '#0F1A2E', boxShadow: '0 28px 80px rgba(0,0,0,0.65)' }}
      >
        {/* Close ✕ */}
        <button
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-all text-[16px] leading-none"
        >
          ✕
        </button>

        {/* Eyebrow */}
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: '#F59E0B' }}>
          WAIT — before you go…
        </p>

        <h2
          id="exit-banner-heading"
          className="text-[20px] font-black text-white mb-3 leading-snug"
        >
          Most St. Louis homeowners don&apos;t realize how much they&apos;re overpaying for electricity.
        </h2>

        <p className="text-[14px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          It takes less than 30 seconds to see your real numbers.
        </p>

        <p className="text-[12.5px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.32)' }}>
          No pressure. If it doesn&apos;t make financial sense, we&apos;ll tell you.
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleCTA}
          className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
          style={{ background: '#2563EB', boxShadow: '0 6px 24px rgba(37,99,235,0.38)' }}
        >
          See My Real Solar Numbers →
        </button>

        {/* Soft dismiss */}
        <button
          onClick={handleDismiss}
          className="w-full py-2 text-[12px] transition-colors"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          No thanks, I&apos;ll figure it out myself
        </button>
      </div>
    </div>
  );
}
