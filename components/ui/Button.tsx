import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'white' | 'outline-light';
type Size    = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:       'bg-brand-blue text-white shadow-[0_8px_30px_rgba(37,99,235,0.28)] hover:bg-brand-blue-dk hover:-translate-y-px hover:shadow-[0_14px_38px_rgba(37,99,235,0.38)] active:translate-y-0',
  ghost:         'bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-px',
  white:         'bg-white text-brand-blue shadow-md hover:bg-slate-50 hover:-translate-y-px hover:shadow-lg',
  'outline-light':'border border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-lg gap-1.5',
  md: 'text-sm px-5 py-3 rounded-xl gap-1.5',
  lg: 'text-base px-7 py-[15px] rounded-xl gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  full?:    boolean;
}
interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href:     string;
  variant?: Variant;
  size?:    Size;
  full?:    boolean;
}

const base = 'inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-150 whitespace-nowrap select-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', full, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variantClasses[variant], sizeClasses[size], full && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export function LinkButton({ href, variant = 'primary', size = 'md', full, className, children, ...props }: LinkButtonProps) {
  return (
    <a
      href={href}
      className={cn(base, variantClasses[variant], sizeClasses[size], full && 'w-full', className)}
      {...props}
    >
      {children}
    </a>
  );
}
