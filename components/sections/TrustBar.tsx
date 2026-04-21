import RevealSection from '@/components/ui/RevealSection';

const LOGOS = [
  { name: 'Google',    badge: '★★★★★  4.9 · 127 reviews'   },
  { name: 'BBB',       badge: 'A+ Accredited Business'      },
  { name: 'Installer', badge: 'State Licensed Installer'    },
  { name: 'Licensed',  badge: 'MO & KS Licensed Contractor' },
];

const STATS = [
  { value: '500+',  label: 'KC Homes Powered'      },
  { value: '$0',    label: 'Down • Many Qualify'    },
  { value: '25yr',  label: 'Panel Warranty'         },
];

export default function TrustBar() {
  return (
    <section className="bg-white border-y border-slate-100 py-10">
      <div className="max-w-site mx-auto px-6">
        {/* Stats row */}
        <RevealSection className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 pb-10 border-b border-slate-100">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-[32px] font-black text-brand-blue tracking-tight leading-none mb-1">{s.value}</div>
              <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </RevealSection>

        {/* Logo trust row */}
        <RevealSection delay={1} className="flex flex-wrap items-center justify-center gap-8">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-2">Trusted &amp; Verified</span>
          {LOGOS.map(l => (
            <div key={l.name} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              {/* Logo placeholder — solid colored squares in brand palette */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0
                ${l.name === 'Google'    ? 'bg-[#4285F4]'  :
                  l.name === 'BBB'       ? 'bg-[#003087]'  :
                  l.name === 'Installer' ? 'bg-brand-blue' :
                                           'bg-[#0D9488]'}`}
              >
                {l.name.slice(0,2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800 leading-none">{l.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{l.badge}</div>
              </div>
            </div>
          ))}
        </RevealSection>
      </div>
    </section>
  );
}
