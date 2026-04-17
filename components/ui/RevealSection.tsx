'use client';
import { useIntersection } from '@/hooks/useIntersection';
import { cn } from '@/lib/utils';

interface Props {
  children:   React.ReactNode;
  className?: string;
  /**
   * Stagger delay index (0–4). Maps to fixed Tailwind delay classes so
   * the purger doesn't strip them. Each step ≈ 75–300ms.
   */
  delay?:     0 | 1 | 2 | 3 | 4;
  as?:        keyof React.JSX.IntrinsicElements;
}

// Full class strings — Tailwind needs to see these at build time to include them.
const DELAYS = [
  '',
  'delay-75',
  'delay-150',
  'delay-200',
  'delay-300',
] as const;

export default function RevealSection({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: Props) {
  const { ref, visible } = useIntersection<HTMLDivElement>({
    threshold:   0.12,
    rootMargin: '0px',
    once:        true,
  });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        DELAYS[delay] ?? '',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
