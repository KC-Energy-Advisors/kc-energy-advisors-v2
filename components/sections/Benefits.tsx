'use client';
import { motion } from 'framer-motion';
import { BENEFITS } from '@/lib/constants';
import { fadeUp, stagger, staggerSlow, fadeLeft, viewport } from '@/lib/motion';

export default function Benefits() {
  return (
    <section id="benefits" className="py-28" style={{ background: '#F3F4F6' }}>
      <div className="max-w-site mx-auto px-6">
        {/* Eyebrow */}
        <motion.p
          className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5"
          style={{ color: '#2563EB' }}
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          What You Get
        </motion.p>

        <motion.h2
          className="text-display-md font-black mb-4"
          style={{ color: '#0C1322', letterSpacing: '-0.01em', maxWidth: 560 }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          Every Homeowner Who Qualifies Gets All of This.
        </motion.h2>
        <motion.p
          className="text-[17px] leading-relaxed mb-12"
          style={{ color: '#374151', maxWidth: 560 }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          transition={{ delay: 0.1 }}
        >
          No hidden fees. No bait-and-switch. This is what a qualified KC homeowner receives.
        </motion.p>

        {/* 2-column grid, 4 rows — staggered */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          variants={staggerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {BENEFITS.map((benefit) => (
            <motion.div
              key={benefit.title}
              className="rounded-2xl p-8 bg-white flex flex-col gap-3"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.08)' }}
              variants={fadeUp}
              whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 20px 48px rgba(0,0,0,0.08)', transition: { duration: 0.2 } }}
            >
              {/* Teal checkmark */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#CCFBF1' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M3 9l4 4 8-8" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-[18px] font-bold" style={{ color: '#0C1322' }}>{benefit.title}</h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: '#374151' }}>{benefit.body}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footnotes */}
        <motion.p
          className="text-[12px] mt-8"
          style={{ color: '#6B7280' }}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          *Source: Zillow, 2023. **Consult a tax professional for eligibility. Savings estimates based on avg. KC rates and EIA historical data.
        </motion.p>
      </div>
    </section>
  );
}
