'use client';
import { useEffect, useRef, useState } from 'react';

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Animates from `from` to `to` over `duration` ms
 * once `trigger` flips to true.
 */
export function useAnimatedNumber(
  to:       number,
  trigger:  boolean,
  duration: number = 1700,
  from:     number = 0,
): number {
  const [value, setValue] = useState(from);
  const rafRef            = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();

    function tick(now: number) {
      const p   = Math.min((now - start) / duration, 1);
      const cur = Math.round(from + easeOutQuart(p) * (to - from));
      setValue(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger, to, from, duration]);

  return value;
}
