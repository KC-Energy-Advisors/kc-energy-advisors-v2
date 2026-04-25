import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { LinkButton } from '@/components/ui/Button';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service | STL Energy Advisors',
  description: 'Terms of service for STL Energy Advisors — St. Louis solar advisory services.',
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen py-20 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[720px] mx-auto">
          <h1
            className="font-black mb-4"
            style={{ fontSize: 'clamp(26px,4vw,38px)', color: '#0C1322', letterSpacing: '-0.02em' }}
          >
            Terms of Service
          </h1>
          <p className="text-[14px] mb-10" style={{ color: '#6B7280' }}>
            Last updated: January 1, 2025
          </p>

          <div className="prose-like flex flex-col gap-8 text-[15px] leading-[1.75]" style={{ color: '#374151' }}>
            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>1. Services</h2>
              <p>
                KC Energy Advisors LLC ("we," "us," or "our") provides solar energy advisory,
                consultation, and referral services to residential homeowners in the St. Louis
                metropolitan area. Our services include free savings estimates, advisor consultations,
                and connection to licensed installation partners.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>2. No Obligation</h2>
              <p>
                Submitting your information through our website does not obligate you to purchase
                any product or service. Our initial consultations and savings reports are provided
                at no cost and with no commitment required.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>3. SMS Communications</h2>
              <p>
                By providing your phone number and checking the consent box on our contact form,
                you agree to receive SMS text messages from KC Energy Advisors. Message and data
                rates may apply. You may opt out at any time by replying STOP to any message.
                View our{' '}
                <a href="/privacy" className="underline" style={{ color: '#2563EB' }}>Privacy Policy</a>
                {' '}for details on how we handle your information.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>4. Savings Estimates</h2>
              <p>
                All savings estimates provided by KC Energy Advisors are projections based on
                average Missouri utility rates, historical EIA rate data, and standard production
                assumptions for our region. Actual savings will vary based on your home's
                specific characteristics, usage patterns, roof orientation, and applicable
                utility tariffs. Estimates do not constitute a guarantee or contract.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>5. Tax Credits</h2>
              <p>
                References to the Federal Investment Tax Credit (ITC) are for informational
                purposes only. Eligibility for tax credits depends on your individual tax
                situation. Consult a qualified tax professional before making financial decisions
                based on projected tax benefits.
              </p>
            </section>

            <section>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: '#0C1322' }}>6. Contact</h2>
              <p>
                Questions about these terms? Call us at{' '}
                <a href={PHONE_HREF} className="font-semibold" style={{ color: '#2563EB' }}>
                  {PHONE_DISPLAY}
                </a>{' '}
                or visit our{' '}
                <a href="/privacy" className="underline" style={{ color: '#2563EB' }}>Privacy Policy</a>.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t" style={{ borderColor: '#E5E7EB' }}>
            <LinkButton href="/">← Back to Homepage</LinkButton>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
