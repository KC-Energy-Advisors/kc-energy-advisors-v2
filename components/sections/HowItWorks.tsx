'use client';
import { useIntersection } from '@/hooks/useIntersection';
import { LinkButton } from '@/components/ui/Button';
import { track } from '@/hooks/useTracking';

function scrollToQualify() {
  const el = document.getElementById('qualify');
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
}

const STEPS = [
  {
    num:      '01',
    title:    'We Run Your Numbers.',
    body:     'Enter your address so we can estimate your roof, sun exposure, and current energy usage. You\'ll see exactly what solar would save you — before you\'ve committed to anything.',
    timeline: '30-minute consultation',
  },
  {
    num:      '02',
    title:    'We Handle Everything.',
    body:     'We calculate what solar would actually cost vs what you\'re currently paying Evergy. Design, permits, utility coordination, installation — all handled for you.',
    timeline: '2–3 weeks',
  },
  {
    num:      '03',
    title:    'Your Panels Go Live. Your Bill Drops.',
    body:     "If it makes sense, we walk you through your options. If it doesn't, we'll tell you that too. First month of production = first month of savings.",
    timeline: '1 install day',
  },
] as const;

function Step({ step, index }: { step: typeof STEPS[number]; index: number }) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0.2, once: true });
  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 transition-all duration-600"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Large step number */}
      <div
        className="text-[64px] font-black leading-none select-none"
        style={{ color: '#DBEAFE', letterSpacing: '-0.02em' }}
      >
        {step.num}
      </div>
      <h3 className="text-[22px] font-bold" style={{ color: '#0C1322' }}>{step.title}</h3>
      <p className="text-[16px] leading-[1.7]" style={{ color: '#374151' }}>{step.body}</p>
      <div className="inline-flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6" stroke="#0D9488" strokeWidth="1.5"/>
          <path d="M7 4v3l2 2" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-[13px] font-semibold" style={{ color: '#0D9488' }}>{step.timeline}</span>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-28"
      style={{ background: '#F8FAFC', borderTop: '1px solid #E5E7EB' }}
    >
      <div className="max-w-site mx-auto px-6">
        {/* Eyebrow */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#2563EB' }}>
          Simple. Transparent. No Surprises.
        </p>

        <h2 className="text-display-md font-black mb-16" style={{ color: '#0C1322', letterSpacing: '-0.01em', maxWidth: 560 }}>
          From First Conversation to First Savings in Three Steps.
        </h2>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {/* Connector line — desktop only */}
          <div
            className="absolute top-10 left-[16.67%] right-[16.67%] h-px hidden md:block"
            style={{ background: 'linear-gradient(to right, #DBEAFE, #BFDBFE, #DBEAFE)' }}
            aria-hidden
          />
          {STEPS.map((step, i) => (
            <Step key={step.num} step={step} index={i} />
          ))}
        </div>

        {/* Below steps */}
        <div className="mt-16 pt-10 border-t" style={{ borderColor: '#F3F4F6' }}>
          <p className="text-[16px] italic mb-3" style={{ color: '#374151' }}>
            Total time from first call to live system: typically 3–4 weeks.
            Most homeowners are surprised by how straightforward it is.
          </p>
          <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
            We&apos;re not here to &ldquo;sell&rdquo; you solar — we&apos;re here to show you if it actually makes financial sense.
          </p>
          <LinkButton
            href="#qualify"
            onClick={(e) => {
              e.preventDefault();
              track('cta_click', { source: 'how-it-works' });
              scrollToQualify();
            }}
          >
            See My Real Numbers →
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
