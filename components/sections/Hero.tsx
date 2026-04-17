'use client';
import { motion } from 'framer-motion';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useIntersection } from '@/hooks/useIntersection';
import { LinkButton } from '@/components/ui/Button';
import {
  heroHeadline,
  heroSub,
  heroCTA,
  heroStats,
  ctaGlow,
} from '@/lib/motion';

function StatItem({ to, suffix, label }: { to: number; suffix: string; label: string }) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0.5 });
  const val = useAnimatedNumber(to, visible);
  return (
    <div ref={ref} className="flex flex-col gap-0.5">
      <strong className="text-[22px] font-black text-white tracking-tight leading-none">
        {val.toLocaleString()}{suffix}
      </strong>
      <span className="text-[12px] font-medium" style={{ color: 'rgba(147,197,253,0.7)' }}>{label}</span>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden min-h-[calc(100vh-68px-44px)] flex items-center py-20"
      style={{ background: '#0C1322' }}
    >
      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(37,99,235,0.08) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      {/* Ambient glow — Framer Motion for continuous animation */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'rgba(37,99,235,0.10)', filter: 'blur(100px)', top: -200, right: -100 }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: 'rgba(245,158,11,0.06)', filter: 'blur(80px)', bottom: -100, left: -80 }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        aria-hidden
      />

      <div className="max-w-site mx-auto px-6 relative z-10">
        {/* Eyebrow */}
        <motion.p
          className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5"
          style={{ color: '#F59E0B' }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Kansas City · Energy Advisors
        </motion.p>

        {/* H1 */}
        <motion.h1
          className="text-display-xl font-black text-white mb-6 max-w-3xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}
          variants={heroHeadline}
          initial="hidden"
          animate="visible"
        >
          Evergy Raised Rates Again.<br className="hidden sm:block" />{' '}
          Lock In a Lower Bill.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl leading-relaxed max-w-[580px] mb-4"
          style={{ color: '#94A3B8' }}
          variants={heroSub}
          initial="hidden"
          animate="visible"
        >
          KC homeowners are replacing unpredictable Evergy bills
          with one fixed monthly solar cost — lower than what they pay now,
          locked in for 25 years.
        </motion.p>

        {/* Urgency insert */}
        <motion.p
          className="text-[14px] font-medium mb-9"
          style={{ color: '#F59E0B' }}
          variants={heroSub}
          initial="hidden"
          animate="visible"
        >
          → Evergy has filed for another rate increase.{' '}
          <span style={{ color: '#94A3B8' }}>
            Every month you wait is another month at their rate, not yours.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-wrap gap-3 mb-14"
          variants={heroCTA}
          initial="hidden"
          animate="visible"
        >
          {/* Primary CTA with pulse glow */}
          <motion.a
            href="#qualify"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-white text-[16px] transition-colors hover:bg-blue-700"
            style={{ background: '#2563EB', borderRadius: 8 }}
            variants={ctaGlow}
            animate="animate"
            whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
          >
            Get My Free Savings Report
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>

          {/* Secondary CTA */}
          <motion.a
            href="#meet-michael"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-lg font-semibold text-[16px] border transition-all"
            style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }}
            whileHover={{
              borderColor: 'rgba(255,255,255,0.35)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            Meet Michael, Our AI Advisor
          </motion.a>
        </motion.div>

        {/* Stat trust strip */}
        <motion.div
          className="flex items-center flex-wrap gap-8"
          variants={heroStats}
          initial="hidden"
          animate="visible"
        >
          <StatItem to={1800} suffix="" label="Avg. annual savings / home" />
          <div className="w-px h-8 bg-white/10" />
          <StatItem to={500} suffix="+" label="KC families served" />
          <div className="w-px h-8 bg-white/10" />
          <StatItem to={25} suffix=" yr" label="Panel warranty included" />
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.25)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <span>Scroll</span>
        <motion.div
          className="w-[18px] h-[18px] border-r-2 border-b-2 rotate-45"
          style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}
