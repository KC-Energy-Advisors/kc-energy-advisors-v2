'use client';
import { useEffect, useRef, useState } from 'react';

interface Options {
  threshold?:  number;
  rootMargin?: string;
  once?:       boolean;
}

/**
 * Returns a ref to attach to an element, and a boolean `visible`
 * that flips true when the element enters the viewport.
 *
 * FIX: IntersectionObserver callbacks are asynchronous — they fire on the
 * next tick after the observer is attached. For elements already in the
 * viewport on mount (above the fold), this means there is a guaranteed
 * frame where the element is invisible before the callback fires.
 *
 * We fix this by doing a synchronous getBoundingClientRect check on mount.
 * If the element is already in the viewport, we set visible=true immediately
 * and skip attaching the observer entirely. This eliminates the above-fold
 * invisible flash completely.
 */
export function useIntersection<T extends Element = HTMLDivElement>(
  opts: Options = {},
) {
  const {
    threshold  = 0.12,
    rootMargin = '0px 0px -40px 0px',
    once       = true,
  } = opts;

  const ref              = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ── Synchronous above-fold check ─────────────────────────────────────
    // IntersectionObserver is async — it fires on the next tick after observe().
    // For elements already visible on page load (TrustBar, upper Hero stats),
    // this async gap means they start invisible and then pop in. The fix:
    // check right now whether the element is in the viewport, and if so,
    // make it visible immediately without waiting for the observer.
    const rect = el.getBoundingClientRect();
    const alreadyVisible =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0;

    if (alreadyVisible) {
      setVisible(true);
      return; // element is above-fold — no observer needed
    }

    // ── Observer for below-fold elements ─────────────────────────────────
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}
