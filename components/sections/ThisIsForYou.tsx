import RevealSection from '@/components/ui/RevealSection';

const QUALIFIERS = [
  'You own your home in the Kansas City area',
  'Your electric bill is $100 or more per month',
  'You plan to stay in your home for a few years',
  "You're open to seeing if solar actually makes sense",
] as const;

export default function ThisIsForYou() {
  return (
    <section className="bg-white py-20 border-b border-slate-100">
      <div className="max-w-site mx-auto px-6">
        <RevealSection className="max-w-[580px] mx-auto">

          {/* Eyebrow — soft social proof + local positioning */}
          <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] mb-5" style={{ color: '#2563EB' }}>
            Built specifically for Kansas City homeowners
          </p>

          <h2 className="text-display-sm font-black mb-10" style={{ color: '#0C1322', letterSpacing: '-0.01em' }}>
            Most homeowners we help look like this:
          </h2>

          <ul className="flex flex-col gap-5" role="list">
            {QUALIFIERS.map((q, i) => (
              <li key={i} className="flex items-start gap-4">
                {/* Checkmark icon */}
                <span
                  className="flex-shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)' }}
                  aria-hidden
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5l2.5 2.5L9 3" stroke="#2563EB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-[16px] leading-snug" style={{ color: '#374151' }}>
                  {q}
                </span>
              </li>
            ))}
          </ul>

          {/* Honest qualifier note */}
          <p className="text-[13px] mt-10 pt-8 border-t border-slate-100" style={{ color: '#94A3B8' }}>
            If you don&apos;t fit this profile, solar probably isn&apos;t the right move right now —
            and we&apos;ll tell you that before you ever get on a call.
          </p>

        </RevealSection>
      </div>
    </section>
  );
}
