'use client';
import { useState, useEffect } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#why-solar',    label: 'Why Solar'    },
  { href: '#reviews',      label: 'Reviews'      },
];

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="14" cy="14" r="13" fill="#2563EB"/>
        <path d="M14 5L16.5 11H22L17.5 14.5L19.5 21L14 17L8.5 21L10.5 14.5L6 11H11.5L14 5Z" fill="white"/>
      </svg>
      <span className="text-[15.5px] font-medium tracking-tight" style={{ color: 'inherit' }}>
        KC Energy<strong className="font-extrabold">Advisors</strong>
      </span>
    </a>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  const scrollTo = (href: string) => {
    close();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 68 - 12, behavior: 'auto' });
  };

  // Transparent on hero, Deep Ink + blur on scroll (per docx spec)
  const navBg = scrolled
    ? 'bg-brand-ink/95 backdrop-blur-[12px] border-b border-white/10'
    : 'bg-transparent';
  const textColor = scrolled ? 'text-white/80 hover:text-white' : 'text-white/90 hover:text-white';
  const logoColor = scrolled ? 'text-white' : 'text-white';

  return (
    <nav className={cn('sticky top-0 z-40 transition-all duration-300', navBg)}>
      <div className={cn('max-w-site mx-auto px-6 h-[68px] flex items-center gap-8', logoColor)}>
        <Logo />

        {/* Desktop links */}
        <ul className="hidden md:flex gap-1 ml-auto">
          {LINKS.map(l => (
            <li key={l.href}>
              <button
                onClick={() => scrollTo(l.href)}
                className={cn('text-sm font-medium px-3 py-1.5 rounded-lg transition-colors', textColor)}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <LinkButton href="/get-solar-info?source=nav" size="sm" className="hidden md:inline-flex ml-2">
          Get Your Free Analysis →
        </LinkButton>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden ml-auto flex flex-col gap-[5px] p-2"
        >
          <span className={cn('block w-[22px] h-0.5 bg-white rounded-sm transition-transform duration-250', open && 'translate-y-[7px] rotate-45')} />
          <span className={cn('block w-[22px] h-0.5 bg-white rounded-sm transition-opacity duration-250',  open && 'opacity-0')} />
          <span className={cn('block w-[22px] h-0.5 bg-white rounded-sm transition-transform duration-250', open && '-translate-y-[7px] -rotate-45')} />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-350 border-t border-white/10 bg-brand-ink',
          open ? 'max-h-96' : 'max-h-0',
        )}
      >
        <ul className="px-6 py-2">
          {LINKS.map(l => (
            <li key={l.href} className="border-b border-white/10">
              <button
                onClick={() => scrollTo(l.href)}
                className="block w-full text-left py-3.5 text-[15px] font-medium text-white/80"
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4">
          <LinkButton href="/get-solar-info?source=mobile-nav" full onClick={close}>Get Your Free Analysis →</LinkButton>
        </div>
      </div>
    </nav>
  );
}
