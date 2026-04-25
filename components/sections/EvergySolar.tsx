'use client';
import { useIntersection } from '@/hooks/useIntersection';

const FACTS = [
  {
    label: 'Ameren Missouri net metering',
    detail:
      'Ameren credits you for the energy your panels send to the grid. Those credits roll forward month to month. Most St. Louis solar homeowners see near-zero bills in spring and fall.',
  },
  {
    label: 'Right-sized for Ameren',
    detail:
      "We size your system to match what you actually use, not to overproduce. Excess generation beyond your annual usage is credited at a much lower rate, so right-sizing is how you get the most out of every panel.",
  },
  {
    label: 'At night or on cloudy days',
    detail:
      "You stay connected to the Ameren grid. When your panels aren't producing, you draw power normally. Net metering means your credits from sunny days offset what you pull at night — so your net bill is far lower than before.",
  },
] as const;

function FactCard({ label, detail, index }: { label: string; detail: string; index: number }) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0.15, once: true });
  return (
    <div
      ref={ref}
      className="rounded-2xl p-7 flex flex-col gap-3"
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Numbered dot */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-black"
        style={{ background: '#DBEAFE', color: '#1D4ED8' }}
      >
        {index + 1}
      </div>
      <h3 className="text-[16px] font-bold" style={{ color: '#0C1322' }}>{label}</h3>
      <p className="text-[15px] leading-[1.7]" style={{ color: '#374151' }}>{detail}</p>
    </div>
  );
}

export default function EvergySolar() {
  const { ref: headRef, visible: headVisible } = useIntersection<HTMLDivElement>({ threshold: 0.2, once: true });

  return (
    <section
      id="evergy-solar"
      className="py-28"
      style={{ background: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}
    >
      <div className="max-w-site mx-auto px-6">
        <div
          ref={headRef}
          style={{
            opacity: headVisible ? 1 : 0,
            transform: headVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {/* Eyebrow */}
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5"
            style={{ color: '#2563EB' }}
          >
            How It Actually Works
          </p>

          <h2
            className="text-display-md font-black mb-4"
            style={{ color: '#0C1322', letterSpacing: '-0.01em', maxWidth: 600 }}
          >
            How Ameren Works With Solar
          </h2>

          <p
            className="text-[17px] leading-relaxed mb-12"
            style={{ color: '#374151', maxWidth: 600 }}
          >
            A lot of solar sites skip the specifics. Here&apos;s how Ameren Missouri&apos;s
            net metering program actually works for St. Louis homeowners — no jargon,
            no fluff.
          </p>
        </div>

        {/* Fact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {FACTS.map((f, i) => (
            <FactCard key={f.label} label={f.label} detail={f.detail} index={i} />
          ))}
        </div>

        {/* Key insight callout */}
        <div
          className="rounded-2xl px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#2563EB' }}
          >
            {/* Lightbulb icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M9 2a5 5 0 0 1 3 9v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1a5 5 0 0 1 3-9z"
                stroke="white" strokeWidth="1.5" strokeLinejoin="round"
              />
              <path d="M7 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#1E3A8A' }}>
              Why we right-size every system
            </p>
            <p className="text-[14px] leading-[1.65]" style={{ color: '#1D4ED8' }}>
              Under Ameren&apos;s net metering rules, producing more energy than you use
              doesn&apos;t pay well — Ameren compensates that excess at a much lower rate
              than what they charge you. We design your system around your actual
              consumption so every panel you pay for works at full value.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
