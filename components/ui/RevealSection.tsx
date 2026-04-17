'use client';
import { useIntersection } from '@/hooks/useIntersection';
import { cn } from '@/lib/utils';

interface Props {
  children:   React.ReactNode;
  className?: string;
  delay?:     number;  // 0 | 1 | 2 | 3 (×80ms stagger)
  as?:        keyof JSX.IntrinsicElements;
}

const DELAYS = ['', 'delay-75', 'delay-150', 'delay-200', 'delay-300'] as const;

export default function RevealSection({ children, className, delay = 0, as: Tag = 'div' }: Props) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0, rootMargin: '0px' });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        DELAYS[delay] ?? '',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-7',
        className,
      )}
    >
      {children}
    </div>
  );
}
