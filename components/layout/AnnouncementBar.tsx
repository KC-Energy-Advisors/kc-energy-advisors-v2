'use client';
import { useState } from 'react';

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="bg-brand-amber text-white text-sm font-medium py-2.5 px-5 relative z-50">
      <div className="max-w-site mx-auto flex items-center justify-center gap-2.5">
        <span className="hidden sm:block w-[7px] h-[7px] bg-white/80 rounded-full animate-pulse-dot flex-shrink-0" />
        <span className="text-center leading-snug">
          Energy costs are rising faster than at any point in the last 20 years — and demand is only growing.{' '}
          <a href="#qualify" className="underline underline-offset-2 font-semibold hover:text-white/90 transition-colors">
            See what Kansas City homeowners are doing about it →
          </a>
        </span>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="ml-auto flex-shrink-0 text-white/60 hover:text-white px-2 py-0.5 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
