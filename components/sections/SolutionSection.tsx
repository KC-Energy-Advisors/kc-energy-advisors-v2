'use client';
import { motion } from 'framer-motion';
import { stagger, staggerSlow, fadeUp, fadeLeft, rowLeft, rowRight, viewport } from '@/lib/motion';

const WITHOUT = [
  { text: 'Utility decides your rate' },
  { text: '$2,280+ paid annually, no return' },
  { text: 'Zero say in what you\'re charged' },
  { text: 'Grid-dependent, subject to outages' },
  { text: 'Electric demand keeps climbing' },
  { text: 'No home value impact' },
];

const WITH = [
  { text: 'Rate locked in on day one' },
  { text: 'System you own — builds equity' },
  { text: 'Your cost, your decision' },
  { text: 'Optional battery backup available' },
  { text: 'More independence from the grid' },
  { text: 'Solar homes sell 4% higher on avg.' },
];

export default function SolutionSection() {
  return (
    <section className="py-28" style={{ background: '#FFFFFF' }}>
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
          The Smarter Move
        </motion.p>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left — headline + subhead + reassurance */}
          <motion.div
            className="flex-1 max-w-[480px]"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.h2
              className="text-display-md font-black mb-6"
              style={{ color: '#0C1322', letterSpacing: '-0.01em' }}
              variants={fadeUp}
            >
              Own Your Energy.<br />Control Your Cost.
            </motion.h2>
            <motion.p
              className="text-[17px] leading-[1.7] mb-8"
              style={{ color: '#374151' }}
              variants={fadeUp}
            >
              Solar isn&apos;t a gadget. It&apos;s a financial decision.
              When you generate your own power, you stop renting energy
              from a utility company and start owning it. Your payment is
              fixed. It doesn&apos;t follow Ameren&apos;s pricing schedule.
            </motion.p>

            {/* Reassurance line — docx: one of highest-converting lines */}
            <motion.blockquote
              className="border-l-4 pl-5 italic text-[16px] leading-[1.6]"
              style={{ borderColor: '#0D9488', color: '#374151' }}
              variants={fadeUp}
            >
              &ldquo;If solar doesn&apos;t make financial sense for your home, we&apos;ll tell you that
              before you sign a single thing. We&apos;d rather walk away than oversell.&rdquo;
            </motion.blockquote>
          </motion.div>

          {/* Right — comparison table */}
          <motion.div
            className="flex-1 rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Headers */}
            <div className="grid grid-cols-2">
              <motion.div
                className="px-6 py-4 text-center"
                style={{ background: '#FEF2F2' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewport}
                transition={{ delay: 0.2 }}
              >
                <span className="text-[14px] font-bold" style={{ color: '#991B1B' }}>Without Solar</span>
              </motion.div>
              <motion.div
                className="px-6 py-4 text-center"
                style={{ background: '#ECFDF5' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewport}
                transition={{ delay: 0.3 }}
              >
                <span className="text-[14px] font-bold" style={{ color: '#065F46' }}>With STL Energy Advisors</span>
              </motion.div>
            </div>

            {/* Rows — staggered fade in */}
            {WITHOUT.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-2 border-t"
                style={{ borderColor: '#F3F4F6' }}
              >
                <motion.div
                  className="px-5 py-4 flex items-center gap-3 border-r"
                  style={{ background: i % 2 === 0 ? '#FFFBFB' : '#FFFFFF', borderColor: '#F3F4F6' }}
                  custom={i}
                  variants={rowLeft}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewport}
                >
                  <span className="text-red-400 flex-shrink-0">✕</span>
                  <span className="text-[14px] leading-snug" style={{ color: '#374151' }}>{item.text}</span>
                </motion.div>
                <motion.div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ background: i % 2 === 0 ? '#FAFFFE' : '#FFFFFF' }}
                  custom={i}
                  variants={rowRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewport}
                >
                  <span className="flex-shrink-0" style={{ color: '#0D9488' }}>✓</span>
                  <span className="text-[14px] leading-snug" style={{ color: '#374151' }}>{WITH[i].text}</span>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
