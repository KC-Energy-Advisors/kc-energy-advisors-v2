import AnnouncementBar   from '@/components/layout/AnnouncementBar';
import Nav               from '@/components/layout/Nav';
import Footer            from '@/components/layout/Footer';
import Hero              from '@/components/sections/Hero';
import TrustBar          from '@/components/sections/TrustBar';
import ProblemSection    from '@/components/sections/ProblemSection';
import SolutionSection   from '@/components/sections/SolutionSection';
import Calculator        from '@/components/sections/Calculator';
import HowItWorks        from '@/components/sections/HowItWorks';
import MeetMichael       from '@/components/sections/MeetMichael';
import Benefits          from '@/components/sections/Benefits';
import Reviews           from '@/components/sections/Reviews';
import QualifyForm       from '@/components/sections/QualifyForm';
import FAQ               from '@/components/sections/FAQ';
import FinalCTA          from '@/components/sections/FinalCTA';

// Page-level section order per docx v3 spec:
// Dark  → Light → Dark → Light → Light → Dark → Light → Dark → Light → Dark → Light → Dark → Dark
// Hero  → Trust → Problem → Solution → HowItWorks → MeetMichael → Benefits → Calculator → Reviews → Qualify → FAQ → FinalCTA

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main>
        {/* S1 — Dark: Hero */}
        <Hero />

        {/* S2 — Light: Trust bar / social proof */}
        <TrustBar />

        {/* S3 — Dark: Problem (rising rates, aging grid, $52K stat) */}
        <ProblemSection />

        {/* S4 — Light: Solution (comparison table + reassurance) */}
        <SolutionSection />

        {/* S5 — Light: How It Works (3 steps) */}
        <HowItWorks />

        {/* S6 — Dark: Meet Michael (AI chat preview) */}
        <MeetMichael />

        {/* S7 — Stone/Light: Benefits (8 cards) */}
        <Benefits />

        {/* S8 — Light: Calculator */}
        <Calculator />

        {/* S9 — Light: Reviews */}
        <Reviews />

        {/* S10 — Dark: Qualify form */}
        <QualifyForm />

        {/* S11 — Stone/Light: FAQ */}
        <FAQ />

        {/* S12 — Dark: Final CTA */}
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
