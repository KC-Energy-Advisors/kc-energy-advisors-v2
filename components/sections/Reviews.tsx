import RevealSection from '@/components/ui/RevealSection';
import { LinkButton } from '@/components/ui/Button';

const REVIEWS = [
  {
    name: 'Jennifer M.',
    location: 'Overland Park, KS',
    bill: '$215 → $28/mo',
    rating: 5,
    text: "The whole thing took about 4 minutes. Michael texted me back immediately, was super knowledgeable, and didn't try to upsell me. My bill went from $215 to $28 per month. I wish I had done this 3 years ago.",
    initials: 'JM',
    color: 'bg-blue-500',
  },
  {
    name: 'Robert K.',
    location: 'Lee\'s Summit, MO',
    bill: 'Saving $2,800/yr',
    rating: 4,
    text: "Skeptical at first — I've been burned by solar 'advisors' before. But Michael laid out the numbers clearly, no pressure. The advisor call was 15 minutes and I had a quote the same day. Installed in 8 weeks. Only knock is the permit took a bit longer than expected.",
    initials: 'RK',
    color: 'bg-slate-600',
  },
  {
    name: 'Maria T.',
    location: 'Kansas City, MO',
    bill: '$0 down financing',
    rating: 5,
    text: "I was nervous about the cost. Michael explained the $0 down option — my new payment is $142/mo vs. my old $190 bill. I'm cash flow positive from month one. The 30% tax credit was a massive bonus.",
    initials: 'MT',
    color: 'bg-brand-blue',
  },
  {
    name: 'Dave & Sarah L.',
    location: 'Blue Springs, MO',
    bill: 'System paid off in 7yr',
    rating: 5,
    text: "We got 4 other solar quotes. KC Energy Advisors was the only company that felt honest. No fake urgency, no hidden fees. Our payback is 7 years and after that it's basically free electricity for life.",
    initials: 'DS',
    color: 'bg-green-600',
  },
  {
    name: 'Angela W.',
    location: 'Shawnee, KS',
    bill: '$3,100 tax credit',
    rating: 5,
    text: "My husband was hesitant. After 10 minutes with Michael and then the advisor call, he was on board. The process was SO smooth. Panels went up in one day. We got a $3,100 federal tax credit this April.",
    initials: 'AW',
    color: 'bg-purple-500',
  },
  {
    name: 'Tom B.',
    location: 'Independence, MO',
    bill: '$178/mo → $19/mo',
    rating: 5,
    text: "I'm a retired electrician so I know panels. These guys recommended LG panels — solid choice. Install crew was professional. Bill went from $178 to $19. Would absolutely recommend KC Energy Advisors.",
    initials: 'TB',
    color: 'bg-orange-500',
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-yellow-400" aria-hidden>
          <path d="M7 1L8.5 5H13L9.5 7.5L10.8 12L7 9.5L3.2 12L4.5 7.5L1 5H5.5L7 1Z"/>
        </svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <section id="reviews" className="bg-slate-50 py-24">
      <div className="max-w-site mx-auto px-6">
        <RevealSection className="text-center max-w-[560px] mx-auto mb-6">
          <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-widest text-brand-blue bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full mb-4">
            Real KC Homeowners
          </div>
          <h2 className="text-display-md font-black text-slate-900 mb-4">
            500+ families already made the switch.
          </h2>
        </RevealSection>

        {/* Value props — free value · low barrier · long-term protection · quick process */}
        <RevealSection delay={1} className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <div className="text-center">
            <div className="text-[48px] font-black text-slate-900 leading-none">Free</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">Personalized Savings Report</div>
          </div>
          <div className="w-px h-16 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[48px] font-black text-slate-900 leading-none">$0</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">$0 Down Options Available</div>
          </div>
          <div className="w-px h-16 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[48px] font-black text-slate-900 leading-none">25yr</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">25-Year Panel Warranty</div>
          </div>
          <div className="w-px h-16 bg-slate-200 hidden sm:block" />
          <div className="text-center">
            <div className="text-[48px] font-black text-slate-900 leading-none">30min</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">30-Minute Consultation</div>
          </div>
        </RevealSection>

        {/* Review grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {REVIEWS.map((r, i) => (
            <RevealSection key={r.name} delay={(i % 4) as 0|1|2|3|4} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${r.color} flex items-center justify-center text-white text-[12px] font-black flex-shrink-0`}>
                    {r.initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-500">{r.location}</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg px-2 py-1 text-[10.5px] font-bold text-green-700 flex-shrink-0">
                  {r.bill}
                </div>
              </div>
              <Stars n={r.rating} />
              <p className="text-[13.5px] text-slate-600 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
            </RevealSection>
          ))}
        </div>

        <RevealSection className="text-center">
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed px-4">
            * Results shown are from real KC Energy Advisors customers and reflect their individual
            systems, usage patterns, and utility rates. Savings vary by home. Results vary by home, roof, and energy usage.
            No reviewer was compensated for their review.
          </p>
          <LinkButton href="/get-solar-info?source=reviews" size="lg">
            See What I&apos;d Save →
          </LinkButton>
        </RevealSection>
      </div>
    </section>
  );
}
