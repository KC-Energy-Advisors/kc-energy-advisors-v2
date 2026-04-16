'use client';
import { useIntersection } from '@/hooks/useIntersection';
import { RATE_CHART, SOLAR } from '@/lib/constants';

function RateBar({ item }: { item: (typeof RATE_CHART)[number] }) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0.2, once: true });
  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <span
        className={`text-[11px] font-bold transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ color: item.projected ? '#D97706' : '#3B82F6' }}
      >
        {item.rate}¢
      </span>
      <div className="relative w-9 rounded-t-sm overflow-hidden" style={{ height: 100 }}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-700 ease-out"
          style={{
            height: visible ? `${item.height}%` : '0%',
            transitionDelay: '100ms',
            background: item.projected
              ? 'linear-gradient(to top, #D97706, #F59E0B)'
              : 'linear-gradient(to top, #1E2D45, #2563EB)',
          }}
        />
      </div>
      <span className={`text-[10px] font-medium transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} style={{ color: '#6B7280' }}>
        {item.year}
      </span>
    </div>
  );
}

const PROBLEMS = [
  {
    eyebrow: 'RISING RATES',
    title:   'Rates Have Climbed Every Decade — And the Trend Is Accelerating',
    body:    'U.S. electricity prices rose an average of 3.4% per year from 2010–2023. With AI infrastructure adding historic new demand to the grid, analysts project that rate pressure will increase, not ease, through 2030.',
  },
  {
    eyebrow: 'AGING GRID',
    title:   '40-Year-Old Infrastructure. 21st-Century Demand.',
    body:    "The average American power line is over 40 years old. It was engineered before electric vehicles, before cloud computing, before smart homes. The grid is being asked to do far more than it was designed for.",
  },
  {
    eyebrow: 'NO OWNERSHIP',
    title:   'You Pay Every Month. You Own Nothing.',
    body:    "Every dollar you send to your utility company disappears. No equity. No asset. No return. You've been paying for power — not building anything.",
  },
] as const;

export default function ProblemSection() {
  const { ref: statRef, visible: statVisible } = useIntersection<HTMLDivElement>({ threshold: 0.3, once: true });

  return (
    <section id="why-solar" className="py-28 relative overflow-hidden" style={{ background: '#0C1322' }}>
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(37,99,235,0.05) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      <div className="max-w-site mx-auto px-6 relative z-10">
        {/* Eyebrow */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#F59E0B' }}>
          The Problem
        </p>

        <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
          {/* Left — headline + rate chart */}
          <div className="flex-1">
            <h2 className="text-display-md font-black text-white mb-6 max-w-lg" style={{ letterSpacing: '-0.01em' }}>
              The Grid Was Not Built<br />for What&apos;s Coming.
            </h2>
            <p className="text-[17px] leading-relaxed mb-10" style={{ color: '#94A3B8', maxWidth: 480 }}>
              AI data centers will consume 8–10% of all U.S. electricity by 2030.
              An aging grid. Surging demand. Utilities pass every dollar of that cost
              directly to you.
            </p>

            {/* Rate bar chart */}
            <div className="rounded-2xl p-6 inline-block border border-white/5" style={{ background: 'rgba(30,45,69,0.6)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: '#6B7280' }}>
                KC Average Electricity Rate (¢/kWh)
              </p>
              <div className="flex items-end gap-3">
                {RATE_CHART.map(item => (
                  <RateBar key={item.year} item={item} />
                ))}
              </div>
              <p className="text-[10px] mt-4" style={{ color: '#6B7280' }}>
                Source: EIA Missouri State Profile · 2025 est. projected at 3.4%/yr
              </p>
            </div>
          </div>

          {/* Right — 3 problem cards */}
          <div className="flex-1 flex flex-col gap-4">
            {PROBLEMS.map(p => (
              <div
                key={p.eyebrow}
                className="rounded-2xl p-6 border-l-4"
                style={{ background: '#1E2D45', borderLeftColor: '#D97706', borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#D97706' }}>
                  {p.eyebrow}
                </p>
                <h3 className="text-[17px] font-bold text-white mb-2">{p.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: '#94A3B8' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* $52K knockout stat — docx verified math */}
        <div
          ref={statRef}
          className={`rounded-2xl p-8 md:p-12 text-center transition-all duration-700 ${statVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{
            background: 'linear-gradient(135deg, #1E2D45 0%, #0C1322 100%)',
            border: '1px solid rgba(217,119,6,0.25)',
          }}
        >
          <p className="text-[17px] leading-relaxed mb-4 mx-auto" style={{ color: '#94A3B8', maxWidth: 560 }}>
            At current rates and projected increases,
            the average Kansas City homeowner will pay
          </p>
          <div
            className="font-black leading-none mb-4"
            style={{ fontSize: 'clamp(52px,8vw,80px)', color: '#D97706', letterSpacing: '-0.02em' }}
          >
            $52,000+
          </div>
          <p className="text-[18px] font-semibold text-white mb-4">
            to their utility company over the next 20 years.
          </p>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>
            *Based on avg. KC residential bill of $190/mo, 3.4% annual rate increase per EIA historical data (2010–2023).
          </p>
        </div>
      </div>
    </section>
  );
}
