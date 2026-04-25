import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

export const metadata: Metadata = {
  title: "You're Booked | STL Energy Advisors",
  description: "Your savings report call is confirmed. Here's exactly what happens next.",
  robots: { index: false },
};

const calendarLinks = [
  {
    label: 'Google Calendar',
    href: 'https://calendar.google.com/calendar/r/eventedit',
    icon: '📅',
  },
  {
    label: 'Apple Calendar',
    href: 'webcal://',
    icon: '🍎',
  },
  {
    label: 'Outlook',
    href: 'https://outlook.live.com/calendar/0/action/compose',
    icon: '📧',
  },
];

export default function BookedPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[600px] mx-auto">

          {/* Large teal checkmark — docx spec */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ background: '#CCFBF1' }}
          >
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden>
              <path d="M8 19l7 7 15-15" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Headline — exact docx copy */}
          <h1
            className="font-black text-center mb-4"
            style={{ fontSize: 'clamp(32px,5vw,44px)', color: '#0C1322', letterSpacing: '-0.02em' }}
          >
            You&apos;re booked.
          </h1>

          {/* Subhead */}
          <p className="text-[17px] text-center mb-10" style={{ color: '#374151' }}>
            Here&apos;s exactly what happens next:
          </p>

          {/* Numbered steps — exact docx copy */}
          <ol className="flex flex-col gap-6 mb-12">
            {[
              {
                step: 1,
                text: "In the next few minutes, you'll get a text from our team confirming your appointment and your advisor's name.",
              },
              {
                step: 2,
                text: "Before your call, we'll review your utility zone, roof details, and typical sun hours — so we arrive with real numbers.",
              },
              {
                step: 3,
                text: "At your scheduled time, your advisor calls you. 15 minutes. Honest conversation. No pressure. If solar doesn't work for your home, we'll tell you that.",
              },
            ].map(({ step, text }) => (
              <li key={step} className="flex gap-5 items-start">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-[15px]"
                  style={{ background: '#EFF6FF', color: '#2563EB' }}
                >
                  {step}
                </div>
                <p className="text-[16px] leading-[1.7] pt-1" style={{ color: '#374151' }}>{text}</p>
              </li>
            ))}
          </ol>

          {/* Add to calendar */}
          <div
            className="rounded-2xl p-6 mb-8"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <p className="text-[14px] font-semibold mb-4" style={{ color: '#374151' }}>Add to your calendar:</p>
            <div className="flex flex-wrap gap-3">
              {calendarLinks.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                >
                  <span>{l.icon}</span>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Reschedule */}
          <p className="text-center text-[14px]" style={{ color: '#6B7280' }}>
            Need to reschedule? Reply to the text we&apos;ll send you, or call{' '}
            <a href={PHONE_HREF} className="font-semibold hover:underline" style={{ color: '#2563EB' }}>
              {PHONE_DISPLAY}
            </a>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
