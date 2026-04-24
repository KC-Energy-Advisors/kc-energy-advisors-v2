import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Good News — You Likely Qualify | KC Energy Advisors',
  description: 'Book your free Savings Report call with a local KC solar advisor.',
  robots: { index: false },
};

export default function ThankYouPage() {
  const calendarUrl = process.env.NEXT_PUBLIC_BOOKING_CALENDAR_URL ||
    'https://api.leadconnectorhq.com/widget/booking/0fu9WuucPW0YhM0SEGf';

  return (
    <>
      <Nav />
      <main className="min-h-screen py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[680px] mx-auto text-center">

          {/* Teal checkmark icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ background: '#CCFBF1' }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
              <path d="M6 15l6 6 12-12" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Headline — exact docx copy */}
          <h1
            className="font-black mb-5"
            style={{ fontSize: 'clamp(28px,5vw,40px)', color: '#0C1322', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Good news — you likely qualify.
          </h1>

          {/* Subhead — exact docx copy */}
          <p className="text-[17px] leading-[1.7] mx-auto mb-10" style={{ color: '#374151', maxWidth: 480 }}>
            The next step is a free 15-minute call with one of our KC advisors.
            We review your numbers before we talk — so the call is
            100% about your specific savings. No generic pitch.
          </p>

          {/* GHL Calendar embed — loads immediately per docx spec: "no extra click to reach it" */}
          <div
            className="rounded-2xl overflow-hidden mb-8 w-full"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.08)' }}
          >
            <iframe
              src={calendarUrl}
              className="w-full"
              style={{ height: 700, border: 'none' }}
              title="Book Your Free Savings Report Call"
              loading="eager"
            />
          </div>

          {/* Call fallback */}
          <p className="text-[14px]" style={{ color: '#6B7280' }}>
            Prefer to call now?{' '}
            <a href={PHONE_HREF} className="font-semibold hover:underline" style={{ color: '#2563EB' }}>
              {PHONE_DISPLAY}
            </a>
            <br className="hidden sm:block" />
            Mon–Fri 8am–7pm · Sat 9am–3pm · Central Time
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
