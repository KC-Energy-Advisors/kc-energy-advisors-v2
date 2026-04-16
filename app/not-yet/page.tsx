import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { LinkButton } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: "Solar May Not Be the Right Fit Today | KC Energy Advisors",
  description: "Solar isn't for everyone right now — and that's okay. Here's where things stand.",
  robots: { index: false },
};

export default function NotYetPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[580px] mx-auto text-center">

          {/* Soft icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ background: '#FEF3C7' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <circle cx="14" cy="14" r="12" stroke="#D97706" strokeWidth="2"/>
              <path d="M14 8v7" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="14" cy="19" r="1.2" fill="#D97706"/>
            </svg>
          </div>

          {/* Headline — docx: "Handle <$75 with dignity" */}
          <h1
            className="font-black mb-5"
            style={{ fontSize: 'clamp(26px,4vw,36px)', color: '#0C1322', letterSpacing: '-0.02em' }}
          >
            Solar may not be the right fit today.
          </h1>

          {/* Honest copy — docx tone: calm, no shame */}
          <p className="text-[17px] leading-[1.7] mb-6" style={{ color: '#374151' }}>
            Based on what you shared, the numbers don&apos;t quite pencil out right now.
            That&apos;s not a failure — it just means the timing or the situation isn&apos;t ideal.
            We&apos;d rather tell you that upfront than waste your time.
          </p>

          <p className="text-[17px] leading-[1.7] mb-10" style={{ color: '#374151' }}>
            We&apos;ll keep your info on file and follow up if your situation changes —
            or if new programs become available in your area.
          </p>

          {/* Why solar might not fit */}
          <div
            className="rounded-2xl p-6 text-left mb-10"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <p className="text-[14px] font-semibold mb-3" style={{ color: '#374151' }}>Common reasons solar doesn&apos;t fit right now:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Electric bill under $75/month — savings don\'t cover the payment',
                'Renting — you don\'t own the roof',
                'Outside our service area (within ~2 hours of Kansas City)',
                'Roof condition needs attention first',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-[14px]" style={{ color: '#6B7280' }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: '#D97706' }}>›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <LinkButton href="/">Back to Homepage</LinkButton>
            <LinkButton href="/#calculator" variant="secondary">Try the Calculator</LinkButton>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
