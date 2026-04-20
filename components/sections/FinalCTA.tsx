'use client';
import { motion } from 'framer-motion';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';
import { fadeUp, stagger, ctaGlow, viewport } from '@/lib/motion';

export default function FinalCTA() {
  return (
    <section className="py-28 relative overflow-hidden" style={{ background: '#0C1322' }}>
      {/* Gold left-border line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: 'linear-gradient(to bottom, transparent, #F59E0B 20%, #F59E0B 80%, transparent)' }}
        aria-hidden
      />
      {/* Ambient glows */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'rgba(37,99,235,0.08)', filter: 'blur(100px)', top: -200, left: -100 }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'rgba(245,158,11,0.06)', filter: 'blur(80px)', bottom: -100, right: -60 }}
        animate={{ scale: [1, 1.10, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        aria-hidden
      />

      <motion.div
        className="max-w-site mx-auto px-6 relative z-10 text-center"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        {/* Eyebrow */}
        <motion.p
          className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-6"
          style={{ color: '#F59E0B' }}
          variants={fadeUp}
        >
          Your Energy Future Is a Decision, Not a Circumstance.
        </motion.p>

        {/* Headline */}
        <motion.h2
          className="font-black text-white mb-6 mx-auto"
          style={{ fontSize: 'clamp(32px,5vw,52px)', letterSpacing: '-0.02em', lineHeight: 1.08, maxWidth: 640 }}
          variants={fadeUp}
        >
          The Homeowners Who Moved Early<br />
          Won&apos;t Feel the Next Rate Increase.
        </motion.h2>

        {/* Subhead */}
        <motion.p
          className="text-[18px] leading-relaxed mb-12 mx-auto"
          style={{ color: '#94A3B8', maxWidth: 580 }}
          variants={fadeUp}
        >
          Kansas City homeowners who installed solar in 2021–2023 avoided
          the largest rate spike in a decade. The conditions that made that
          the right move then still exist now — and demand is still rising.
        </motion.p>

        {/* Primary CTA — with continuous glow pulse */}
        <motion.div variants={fadeUp}>
          <motion.a
            href="/get-solar-info?source=final-cta"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-lg font-semibold text-white text-[17px] mb-5"
            style={{ background: '#2563EB', borderRadius: 8 }}
            variants={ctaGlow}
            animate="animate"
            whileHover={{ scale: 1.03, backgroundColor: '#1D4ED8', transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.97 }}
          >
            Get My Free Savings Report →
          </motion.a>
        </motion.div>

        {/* Secondary — phone */}
        <motion.div className="mt-5" variants={fadeUp}>
          <a
            href={PHONE_HREF}
            className="text-[16px] font-medium hover:text-white underline underline-offset-4 transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Talk to an advisor: {PHONE_DISPLAY}
          </a>
        </motion.div>

        {/* Micro-trust */}
        <motion.div
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-[14px]"
          style={{ color: '#6B7280' }}
          variants={fadeUp}
        >
          <span>✓ $0 down</span>
          <span>✓ No credit check</span>
          <span>✓ No obligation</span>
          <span>✓ Kansas City team</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
