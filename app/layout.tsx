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
    default: "KC Energy Advisors — St. Louis Solar Advisory Firm",
    template: '%s | KC Energy Advisors',
  },
  description:
    "St. Louis homeowners: see exactly how much solar saves you. Free 60-second estimate + personalized SMS from Michael, our AI solar advisor. Licensed, local, no pressure.",
  keywords: [
    'solar panels St. Louis', 'St. Louis solar advisor', 'Missouri solar incentives',
    'Ameren solar', 'solar savings calculator St. Louis',
    'solar installation St. Louis', 'St. Louis solar cost',
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
    title: "KC Energy Advisors — Stop Overpaying Ameren",
    description:
      "See what solar saves YOU. Free instant estimate + personalized SMS from our AI advisor. 500+ Missouri families served. Licensed & local.",
    locale: 'en_US',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'KC Energy Advisors — St. Louis Solar Advisory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "KC Energy Advisors — St. Louis Solar Advisory Firm",
    description:
      "Free 60-second solar estimate for St. Louis homeowners. Personalized numbers, no pressure.",
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
    description: 'Solar energy advisory and installation referral services for St. Louis homeowners.',
    url: SITE_URL,
    telephone: '+18163190932',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'St. Louis',
      addressRegion: 'MO',
      addressCountry: 'US',
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', latitude: 38.6270, longitude: -90.1994 },
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
  <ScrollDebug />
  {children}
</body>
    </html>
  );
}
