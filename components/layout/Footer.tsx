import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works'          },
  { href: '#why-solar',    label: 'Why Solar'             },
  { href: '#reviews',      label: 'Reviews'               },
  { href: '/get-solar-info?source=footer', label: 'Get a Savings Report'  },
  { href: '/privacy',      label: 'Privacy Policy'        },
  { href: '/terms',        label: 'Terms'                 },
];

const TRUST_SEALS = [
  'St. Louis Homeowner-Focused',
  'State Licensed Installer · Missouri',
  'Licensed Contractor · Missouri',
  '25-Year Panel Warranty',
];

export default function Footer() {
  return (
    <footer style={{ background: '#0C1322', color: '#FFFFFF' }}>
      <div className="max-w-site mx-auto px-6 pt-16 pb-8">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Col 1 — Logo + tagline */}
          <div>
            <a href="/" className="flex items-center gap-2.5 mb-4" style={{ color: '#FFFFFF' }}>
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden>
                <circle cx="14" cy="14" r="13" fill="#2563EB"/>
                <path d="M14 5L16.5 11H22L17.5 14.5L19.5 21L14 17L8.5 21L10.5 14.5L6 11H11.5L14 5Z" fill="white"/>
              </svg>
              <span className="text-[15px] font-semibold">
                STL Energy<strong className="font-extrabold">Advisors</strong>
              </span>
            </a>
            <p className="text-[14px] leading-relaxed" style={{ color: '#6B7280' }}>
              Helping St. Louis homeowners take control of their energy — without pressure or guesswork.
            </p>
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#4B5563' }}>
              STL Energy Advisors is a division of KC Energy Advisors LLC.
            </p>
          </div>

          {/* Col 2 — Contact */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#F59E0B' }}>Contact</h3>
            <div className="flex flex-col gap-2 text-[14px]" style={{ color: '#6B7280' }}>
              <a href={PHONE_HREF} className="hover:text-white transition-colors font-medium" style={{ color: '#94A3B8' }}>
                {PHONE_DISPLAY}
              </a>
              <span>St. Louis, MO</span>
              <span>Response within 1 business hour.</span>
            </div>
          </div>

          {/* Col 3 — Links */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#F59E0B' }}>Links</h3>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[14px] transition-colors hover:text-white"
                    style={{ color: '#6B7280' }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Trust seals */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#F59E0B' }}>Our Commitment</h3>
            <ul className="flex flex-col gap-2">
              {TRUST_SEALS.map(seal => (
                <li key={seal} className="text-[14px] flex items-center gap-2" style={{ color: '#6B7280' }}>
                  <span style={{ color: '#0D9488' }}>✓</span>
                  {seal}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-8 pb-6 text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
          <p className="mb-3">
            Savings estimates are based on average Missouri utility rates and projected 3.4% annual rate increase per EIA historical data.
            Individual results vary based on system size, roof orientation, local utility rates, and usage patterns.
            Not all homeowners qualify. Subject to credit approval. Individual results vary based on home, roof, and energy usage.
          </p>
          <p>© {new Date().getFullYear()} KC Energy Advisors · St. Louis, MO · All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
