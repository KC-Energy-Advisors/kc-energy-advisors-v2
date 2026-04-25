import type { Metadata } from 'next';
import Nav    from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — STL Energy Advisors',
  description: 'How STL Energy Advisors collects, uses, and protects your personal information.',
};

const LAST_UPDATED = 'January 1, 2025';

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="bg-white py-20 px-6">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-[38px] font-black text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mb-12">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-slate max-w-none">
            <Section title="1. Who We Are">
              <p>KC Energy Advisors LLC (&ldquo;KC Energy Advisors,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;) is a solar advisory firm based in St. Louis, Missouri. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you visit our website or submit a form requesting solar information.</p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect information you voluntarily provide, including:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Name, phone number, and email address (collected via our qualification form)</li>
                <li>Your home ownership status and approximate electric bill</li>
                <li>General location (city/region)</li>
                <li>UTM parameters and referral source (to understand how you found us)</li>
              </ul>
              <p className="mt-4">We also automatically collect standard web analytics data such as IP address, browser type, pages visited, and time on site. We do not use session recording tools or sell behavioral data.</p>
            </Section>

            <Section title="3. How We Use Your Information">
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>To contact you via SMS with your personalized solar savings estimate (only with your explicit consent)</li>
                <li>To schedule and conduct your free solar advisor call</li>
                <li>To improve our website and marketing effectiveness</li>
                <li>To comply with legal obligations</li>
              </ul>
            </Section>

            <Section title="4. SMS / Text Messaging">
              <p>By submitting our qualification form and checking the consent box, you expressly consent to receive text messages from KC Energy Advisors at the mobile number you provide. Message frequency varies (typically 2–6 messages per inquiry). Message and data rates may apply.</p>
              <p className="mt-3"><strong>To opt out:</strong> Reply STOP to any text message from us. You will receive a single confirmation message and will not receive further messages. To opt back in, text START.</p>
              <p className="mt-3">We do not share your mobile number with third parties for their marketing purposes.</p>
            </Section>

            <Section title="5. Information Sharing">
              <p>We do not sell your personal information. We may share it with:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li><strong>GoHighLevel (GHL):</strong> Our CRM and SMS platform</li>
                <li><strong>Anthropic:</strong> AI infrastructure powering our Michael advisor (no personally identifiable data is retained by Anthropic beyond the API call)</li>
                <li><strong>Licensed solar installation partners:</strong> Only after you book an advisor call and confirm interest</li>
                <li><strong>Law enforcement or legal process:</strong> When required by law</li>
              </ul>
            </Section>

            <Section title="6. Data Retention">
              <p>We retain your contact information in our CRM for up to 24 months unless you request deletion. You may request deletion at any time by emailing us.</p>
            </Section>

            <Section title="7. Your Rights">
              <p>You may request to access, correct, or delete your personal information at any time. To exercise these rights, contact us at the address below. We will respond within 30 days.</p>
            </Section>

            <Section title="8. Cookies">
              <p>Our website uses minimal cookies — primarily for analytics (Google Analytics) and to remember your preferences. We do not use advertising or tracking cookies. You can disable cookies in your browser settings at any time.</p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>Our services are not directed to children under 13. We do not knowingly collect personal information from children.</p>
            </Section>

            <Section title="10. Contact Us">
              <p>KC Energy Advisors LLC<br/>St. Louis, Missouri<br/>Email: info@kcenergyadvisors.com</p>
              <p className="mt-3">For SMS opt-out issues, text STOP to the number you received our message from, or email us with your phone number and we will immediately remove you.</p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-[20px] font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-[14.5px] text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}
