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
 */
export function useIntersection<T extends Element = HTMLDivElement>(
  opts: Options = {},
) {
  const {
    threshold  = 0.12,
    rootMargin = '0px 0px -40px 0px',
    once       = true,
  } = opts;

  const ref     = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
