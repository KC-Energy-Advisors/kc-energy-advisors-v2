import AnnouncementBar   from '@/components/layout/AnnouncementBar';
import Nav               from '@/components/layout/Nav';
import Footer            from '@/components/layout/Footer';
import Hero              from '@/components/sections/Hero';
import TrustBar          from '@/components/sections/TrustBar';
import ProblemSection    from '@/components/sections/ProblemSection';
import SolutionSection   from '@/components/sections/SolutionSection';
import Calculator        from '@/components/sections/Calculator';
import HowItWorks        from '@/components/sections/HowItWorks';
import EvergySolar       from '@/components/sections/EvergySolar';
import MeetMichael       from '@/components/sections/MeetMichael';
import Benefits          from '@/components/sections/Benefits';
import Reviews           from '@/components/sections/Reviews';
import QualifyForm       from '@/components/sections/QualifyForm';
import FAQ               from '@/components/sections/FAQ';
import FinalCTA          from '@/components/sections/FinalCTA';
import ExitIntentBanner  from '@/components/ui/ExitIntentBanner';
import ThisIsForYou      from '@/components/sections/ThisIsForYou';

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <ExitIntentBanner />
      <main>
        <Hero />
        <TrustBar />
        <ThisIsForYou />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <EvergySolar />
        <MeetMichael />
        <Benefits />
        <Calculator />
        <Reviews />
        <QualifyForm />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
