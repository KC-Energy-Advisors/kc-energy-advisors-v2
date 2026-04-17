/**
 * Framer Motion variants — KC Energy Advisors
 *
 * Central library of animation variants used across all sections.
 * Import only what you need to keep bundle size minimal.
 *
 * Usage:
 *   import { fadeUp, stagger, scaleIn } from '@/lib/motion';
 *   <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} />
 */

import type { Variants } from 'framer-motion';

// ── Core entrance animations ──────────────────────────────────────

/** Fade + translate up — primary reveal for text and cards */
export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Fade + translate down — for elements that drop into view */
export const fadeDown: Variants = {
  hidden:  { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Fade left → right — eyebrow labels, section headers */
export const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Fade + scale — stat numbers, badges, icons */
export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }, // slight spring
  },
};

/** Simple fade — for containers, overlays */
export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ── Stagger containers ────────────────────────────────────────────

/** Stagger container — fast (cards, list items) */
export const stagger: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren:  0.07,
      delayChildren:    0.05,
    },
  },
};

/** Stagger container — slow (benefit cards, FAQ rows) */
export const staggerSlow: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren:  0.10,
      delayChildren:    0.10,
    },
  },
};

// ── Hero-specific animations ──────────────────────────────────────

/** Hero headline — large text entrance with slight spring */
export const heroHeadline: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
};

/** Hero subheadline */
export const heroSub: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 },
  },
};

/** Hero CTA row */
export const heroCTA: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 },
  },
};

/** Hero stat strip */
export const heroStats: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.55 },
  },
};

// ── Comparison table rows ─────────────────────────────────────────

/** Comparison row — left side (red/without) fades in */
export const rowLeft: Variants = {
  hidden:  { opacity: 0, x: -12, backgroundColor: 'transparent' },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: i * 0.05 + 0.1, ease: 'easeOut' },
  }),
};

/** Comparison row — right side (green/with) fades in */
export const rowRight: Variants = {
  hidden:  { opacity: 0, x: 12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: i * 0.05 + 0.2, ease: 'easeOut' },
  }),
};

// ── Button interactions ───────────────────────────────────────────

/**
 * Primary CTA button — subtle opacity pulse while idle.
 *
 * Previously animated boxShadow (a paint property) at repeat: Infinity,
 * which caused a browser repaint every single frame. Opacity is a
 * compositor-only property — the GPU handles it entirely off the main
 * thread with zero repaint cost.
 *
 * The visual result is nearly identical: the button gently breathes.
 * The static boxShadow is set once via Tailwind/CSS and never changes.
 */
export const ctaGlow = {
  animate: {
    opacity: [1, 0.82, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Default viewport options — reuse across all whileInView calls */
export const viewport = { once: true, margin: '-80px 0px' } as const;
