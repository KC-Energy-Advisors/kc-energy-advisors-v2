/** Tailwind class merge utility (lightweight, no dependency needed) */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
