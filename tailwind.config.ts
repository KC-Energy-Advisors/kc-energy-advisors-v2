import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── KC Energy Advisors brand tokens (v3 spec) ──────────────
        brand: {
          // Primary darks
          ink:       '#0C1322',   // Deep Ink — nav, hero, dark sections
          slate:     '#1E2D45',   // Slate Blue — dark card backgrounds
          // Actions
          blue:      '#2563EB',   // Electric Blue — CTAs, links, focus
          'blue-lt': '#3B82F6',   // Sky Blue — hover, accents
          'blue-xlt':'#EFF6FF',   // Lightest blue — form focus bg
          'blue-dk': '#1D4ED8',   // Darker blue — hover on CTAs
          // Trust / confirmation
          teal:      '#0D9488',   // Checkmarks, savings, confirmed states
          'teal-lt': '#CCFBF1',   // Light teal bg
          // Urgency / attention
          amber:     '#D97706',   // Announcement bar, insight callouts
          'amber-lt':'#F59E0B',   // Section eyebrows, accent lines, gold
          // Text
          body:      '#374151',   // All body copy
          muted:     '#6B7280',   // Captions, fine print
          // Surfaces
          stone:     '#F3F4F6',   // Alternating section bg
          // Legacy aliases kept for backward compat
          navy:      '#0C1322',
          gold:      '#F59E0B',
          'gold-lt': '#FBBF24',
          green:     '#22C55E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(42px,7.5vw,84px)', { lineHeight: '1.04', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(32px,5vw,56px)',   { lineHeight: '1.1',  letterSpacing: '-0.035em' }],
        'display-md': ['clamp(26px,4vw,44px)',   { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        'display-sm': ['clamp(20px,3vw,28px)',   { lineHeight: '1.2',  letterSpacing: '-0.025em' }],
      },
      maxWidth: { site: '1120px' },
      keyframes: {
        'blob-drift': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(24px,-18px) scale(1.04)' },
          '66%':     { transform: 'translate(-18px,14px) scale(0.97)' },
        },
        'pulse-dot': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%':     { opacity: '0.5', transform: 'scale(0.75)' },
        },
        'bounce-arr': {
          '0%,100%': { transform: 'rotate(45deg) translateY(0)' },
          '50%':     { transform: 'rotate(45deg) translateY(5px)' },
        },
        'msg-pop': {
          from: { opacity: '0', transform: 'scale(0.9) translateY(8px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'step-slide': {
          from: { opacity: '0', transform: 'translateX(18px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'typing-bounce': {
          '0%,80%,100%': { transform: 'scale(0.75)', opacity: '0.5' },
          '40%':         { transform: 'scale(1.15)', opacity: '1' },
        },
        'bar-grow': {
          from: { height: '0' },
        },
      },
      animation: {
        'blob-drift':     'blob-drift 12s ease-in-out infinite',
        'blob-drift-alt': 'blob-drift 16s ease-in-out infinite reverse',
        'pulse-dot':      'pulse-dot 1.8s ease-in-out infinite',
        'bounce-arr':     'bounce-arr 2s ease-in-out infinite',
        'msg-pop':        'msg-pop 0.32s cubic-bezier(0.4,0,0.2,1) both',
        'step-slide':     'step-slide 0.32s cubic-bezier(0.4,0,0.2,1) both',
        'typing-bounce':  'typing-bounce 0.9s ease-in-out infinite',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(37,99,235,0.06) 1px, transparent 1px)',
        'hero-gradient': 'linear-gradient(160deg, #ffffff 0%, #f0f6ff 55%, #ebf3ff 100%)',
        'dark-card': 'linear-gradient(135deg, #1D4ED8, #1E40AF 60%, #1a3a9e)',
      },
    },
  },
  plugins: [],
};

export default config;
