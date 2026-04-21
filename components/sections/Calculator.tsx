'use client';
import { useState, useCallback } from 'react';
import { calcSavings } from '@/lib/solar-calc';
import { LinkButton } from '@/components/ui/Button';
import RevealSection from '@/components/ui/RevealSection';

const PRESETS = [100, 175, 250, 350];

function ResultCard({ label, value, className = '', sub }: { label: string; value: string; className?: string; sub?: string }) {
  const hi = value === '$0';
  return (
    <div className={`rounded-2xl p-5 border transition-all duration-200 ${className}`}>
      <div className={`text-[10.5px] font-bold uppercase tracking-wider mb-1 ${hi ? 'text-white/75' : 'text-white/45'}`}>
        {label}
      </div>
      <div className={`font-black text-white leading-none tracking-tighter ${hi ? 'text-[38px]' : 'text-[28px]'}`}>
        {value}
      </div>
      {sub && (
        <div className={`mt-1 leading-snug ${hi ? 'text-[11.5px] text-white/62' : 'text-[11.5px] text-white/38'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function Calculator() {
  const [bill, setBill] = useState(175);
  const r = calcSavings(bill);

  const fmt = (n: number) => '$' + n.toLocaleString('en-US');
  const pct = ((bill - 50) / 450) * 100;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBill(Number(e.target.value));
  }, []);

  return (
    <section id="calculator" className="bg-brand-navy py-24">
      <div className="max-w-site mx-auto px-6">
        <RevealSection className="text-center max-w-[580px] mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-widest text-white/80 bg-white/10 border border-white/18 px-3.5 py-1.5 rounded-full mb-4">
            Free Estimate
          </div>
          <h2 className="text-display-md font-black text-white mb-4">See exactly what solar saves you.</h2>
          <p className="text-lg text-white/65 leading-relaxed">Move the slider to match your bill. Numbers update instantly.</p>
        </RevealSection>

        <RevealSection className="grid grid-cols-1 md:grid-cols-2 gap-9 bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10">
          {/* Input side */}
          <div className="flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Your Monthly Electric Bill</div>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-3xl font-bold text-slate-500 pb-1">$</span>
              <span className="text-[80px] font-black leading-none text-white tracking-tighter">{bill}</span>
              <span className="text-xl font-medium text-slate-500 pb-1">/mo</span>
            </div>

            {/* Slider */}
            <div className="mb-3">
              <input
                type="range" min={50} max={500} step={5} value={bill}
                onChange={handleSlider}
                aria-label="Monthly electric bill"
                className="w-full h-[5px] rounded-full appearance-none outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,#2563EB ${pct}%,rgba(255,255,255,.1) ${pct}%)`,
                }}
              />
              <div className="flex justify-between text-[11.5px] text-slate-600 mt-1.5">
                <span>$50</span><span>$500</span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex gap-2 flex-wrap mb-auto pb-6">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setBill(p)}
                  className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                    bill === p
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'text-slate-500 border-white/10 hover:border-brand-blue hover:text-white'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="bg-white/[0.04] border border-white/[0.09] rounded-2xl p-5">
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">Ready for your personalized savings report?</p>
              <LinkButton href="/get-solar-info?source=calculator" full>Get My Exact Numbers →</LinkButton>
            </div>
          </div>

          {/* Results side */}
          <div className="flex flex-col gap-3.5">
            {/* Primary */}
            <div className="bg-blue-700 border border-blue-500/30 rounded-2xl p-5">
              <div className="text-[10.5px] font-bold text-white/45 uppercase tracking-wider mb-1">Year 1 Savings</div>
              <div className="text-[42px] font-black text-white leading-none tracking-tighter">{fmt(r.yr1)}</div>
              <div className="text-[11.5px] text-white/38 mt-1">vs. keeping your current plan</div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <ResultCard label="5-Year Savings"   value={fmt(r.yr5)}   className="bg-white/[0.05] border-white/[0.09]" />
              <ResultCard label="25-Year Savings"  value={fmt(r.yr25)}  className="bg-white/[0.05] border-white/[0.09]" />
              <ResultCard
                label="Start with $0 Payments" value="$0"
                className="bg-[linear-gradient(145deg,#0f1f3d_0%,#162952_55%,#1e3a8a_100%)] border-blue-500/45 shadow-[0_0_22px_rgba(37,99,235,0.20)] motion-safe:hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(37,99,235,0.32)] hover:border-blue-400/60"
                sub="No upfront cost. Most homeowners start with $0 payments for the first year."
              />
              <ResultCard label="System Size" value={`${r.kwSize} kW`} className="bg-white/[0.05] border-white/[0.09]" />
            </div>

            <p className="text-[10.5px] text-white/25 leading-relaxed mt-1">
              * Estimates based on KC avg production (1,200 kWh/kW/yr), current utility rates, and 3.4% annual escalation (EIA historical avg). Actual savings vary by home.
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
