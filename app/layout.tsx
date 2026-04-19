"use client";
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import "./globals.css";
import ScrollDebug from '@/components/ui/ScrollDebug';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kcenergyadvisors.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563EB',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KC Energy Advisors — KC's #1 Solar Advisory Firm",
    template: '%s | KC Energy Advisors',
  },
  description:
    "Kansas City homeowners: see exactly how much solar saves you. Free 60-second estimate + personalized SMS from Michael, our AI solar advisor. Licensed, local, no pressure.",
  keywords: [
    'solar panels Kansas City', 'KC solar advisor', 'Missouri solar incentives',
    'Evergy solar', 'solar savings calculator KC',
    'solar installation Kansas City', 'KC solar cost',
  ],
  authors: [{ name: 'KC Energy Advisors LLC' }],
  creator: 'KC Energy Advisors LLC',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'KC Energy Advisors',
    title: "KC Energy Advisors — Stop Overpaying Evergy",
    description:
      "See what solar saves YOU. Free instant estimate + personalized SMS from our AI advisor. 500+ KC families served. Licensed & local.",
    locale: 'en_US',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'KC Energy Advisors — Kansas City Solar Advisory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "KC Energy Advisors — KC's #1 Solar Advisory Firm",
    description:
      "Free 60-second solar estimate for KC homeowners. Personalized numbers, no pressure.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SITE_URL,
    name: 'KC Energy Advisors',
    description: 'Solar energy advisory and installation referral services for Kansas City homeowners.',
    url: SITE_URL,
    telephone: '+18163190932',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kansas City',
      addressRegion: 'MO',
      addressCountry: 'US',
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', latitude: 39.0997, longitude: -94.5786 },
      geoRadius: '160934', // ~100 miles / 2 hours
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '127',
      bestRating: '5',
    },
    sameAs: [],
  };

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
  <div
    style={{
      position: 'fixed',
      top: 20,
      left: 20,
      zIndex: 999999,
      background: 'red',
      color: 'white',
      padding: '10px 14px',
      fontWeight: 'bold',
      borderRadius: '8px',
    }}
  >
    TEST LIVE
  </div>
  <ScrollDebug />
  {children}
</body>
    </html>
  );
}
