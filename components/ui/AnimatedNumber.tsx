'use client';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

interface Props {
  to:       number;
  trigger:  boolean;
  prefix?:  string;
  suffix?:  string;
  duration?: number;
  className?: string;
}

export default function AnimatedNumber({ to, trigger, prefix = '', suffix = '', duration, className }: Props) {
  const value = useAnimatedNumber(to, trigger, duration);
  return (
    <span className={className}>
      {prefix}{value.toLocaleString('en-US')}{suffix}
    </span>
  );
}
