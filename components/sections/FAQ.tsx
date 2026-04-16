'use client';
import { useState } from 'react';
import { FAQ_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function FAQItem({ q, a, open, onToggle, index }: {
  q: string; a: string; open: boolean; onToggle: () => void; index: number;
}) {
  return (
    <div
      className={cn(
        'border rounded-2xl overflow-hidden transition-colors duration-200',
        open ? 'border-blue-200' : 'border-slate-200 hover:border-slate-300',
      )}
      style={{ background: open ? '#EFF6FF' : '#FFFFFF' }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[16px] font-semibold" style={{ color: '#0C1322' }}>{q}</span>
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: open ? '#2563EB' : '#F3F4F6',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke={open ? '#fff' : '#374151'} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <p className="px-6 pb-6 text-[15px] leading-[1.7]" style={{ color: '#374151' }}>{a}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28" style={{ background: '#F3F4F6' }}>
      <div className="max-w-site mx-auto px-6">
        {/* Eyebrow */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#2563EB' }}>
          Common Questions
        </p>
        <h2 className="text-display-md font-black mb-12" style={{ color: '#0C1322', letterSpacing: '-0.01em', maxWidth: 540 }}>
          Honest Answers. No Runaround.
        </h2>

        <div className="max-w-[760px] flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              index={i}
              q={item.q}
              a={item.a}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
