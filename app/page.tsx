import AnnouncementBar   from '@/components/layout/AnnouncementBar';
import Nav               from '@/components/layout/Nav';
import Hero              from '@/components/sections/Hero';
import MeetMichael       from '@/components/sections/MeetMichael';

// BINARY ISOLATION — Group A only
// If homepage drags: culprit is in Group A (AnnouncementBar, Nav, Hero, MeetMichael)
// If homepage stable: culprit is in Group B (restore next)

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <MeetMichael />
      </main>
    </>
  );
}
