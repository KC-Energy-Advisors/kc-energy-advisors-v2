import type { Metadata } from 'next';
import AnnouncementBar  from '@/components/layout/AnnouncementBar';
import Nav              from '@/components/layout/Nav';
import Footer           from '@/components/layout/Footer';
import GetSolarInfoPage from '@/components/sections/GetSolarInfoPage';

// SERVER-SIDE MARKER — appears in Vercel function logs, not browser console
console.error('🔥 get-solar-info/page.tsx IS RUNNING (server) 🔥');

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
      <main style={{ display: 'block', width: '100%', minHeight: 0, alignItems: 'unset', justifyContent: 'unset' }}>
        <GetSolarInfoPage />
      </main>
      <Footer />
    </>
  );
}
