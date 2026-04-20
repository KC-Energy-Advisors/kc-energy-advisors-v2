import type { Metadata } from 'next';
import AnnouncementBar  from '@/components/layout/AnnouncementBar';
import Nav              from '@/components/layout/Nav';
import Footer           from '@/components/layout/Footer';
import GetSolarInfoPage from '@/components/sections/GetSolarInfoPage';

export const metadata: Metadata = {
  title: 'See If Solar Makes Sense For Your Home',
  description:
    'Takes 30 seconds. We only schedule consultations when solar genuinely makes sense for your home. No pressure, no obligation — just clarity.',
};

export default function GetSolarInfoRoute() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main>
        <GetSolarInfoPage />
      </main>
      <Footer />
    </>
  );
}
