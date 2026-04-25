import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import ThankYouBooking from '@/components/sections/ThankYouBooking';

export const metadata: Metadata = {
  title: 'Schedule Your Free In-Home Solar Consultation | STL Energy Advisors',
  description:
    'Book your free in-home solar consultation. Michael will come to your home, review your electric usage, and walk you through your options.',
  robots: { index: false },
};

/**
 * /thank-you
 *
 * Loaded immediately after a successful Step 4 (or get-solar-info) lead submit.
 * Reads the lead context from URL query params (set by the submitter) and hands
 * it to <ThankYouBooking /> which renders the working SlotPicker against the
 * SAME GHL contact — so the appointment does not create a duplicate contact.
 *
 * Query params (all optional — booking still works if missing):
 *   cid         : GHL contactId  ← single canonical name across the funnel
 *   name        : full name
 *   phone       : E.164
 *   address     : full address
 *   ownsHome    : 'yes' | 'no'
 *   monthlyBill : bill code OR human label
 *   roofType    : 'asphalt' | 'metal' | 'tile' | 'unsure'
 *   stage       : 'exploring' | 'interested' | 'ready'
 */
export default function ThankYouPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // searchParams may be string[] for repeated keys — collapse to first value.
  const pick = (k: string): string => {
    const v = searchParams?.[k];
    if (Array.isArray(v)) return v[0] ?? '';
    return v ?? '';
  };

  // `cid` is the single canonical query-param name across the funnel.
  // It's the GHL contactId that links the booking back to the SAME contact
  // created at submit time — preventing duplicate contacts in GHL.
  const cid           = pick('cid');
  const name          = pick('name');
  const phone         = pick('phone');
  const address       = pick('address');
  const ownsHome      = pick('ownsHome');
  const monthlyBill   = pick('monthlyBill');
  const roofType      = pick('roofType');
  const decisionStage = pick('stage');

  // ── Server-side log: confirms what /thank-you received from the URL ──
  // Visible in Vercel function logs. Pairs with the matching client log
  // inside ThankYouBooking and the route log inside /api/book-appointment.
  console.log('BOOKING WITH CONTACT ID:', cid || '(absent — book-appointment will upsert)');
  console.error('BOOKING WITH CONTACT ID:', cid || '(absent — book-appointment will upsert)');
  console.error(
    '[/thank-you] page received',
    '| cid:',          cid         || '(absent)',
    '| name:',         name        || '(empty)',
    '| phone:',        phone       || '(empty)',
    '| address:',      address     || '(empty)',
    '| ownsHome:',     ownsHome    || '(empty)',
    '| monthlyBill:',  monthlyBill || '(empty)',
    '| roofType:',     roofType    || '(empty)',
    '| decisionStage:', decisionStage || '(empty)',
  );

  return (
    <>
      <Nav />
      <main>
        <ThankYouBooking
          cid          ={cid}
          name         ={name}
          phone        ={phone}
          address      ={address}
          ownsHome     ={ownsHome}
          monthlyBill  ={monthlyBill}
          roofType     ={roofType}
          decisionStage={decisionStage}
        />
      </main>
      <Footer />
    </>
  );
}
