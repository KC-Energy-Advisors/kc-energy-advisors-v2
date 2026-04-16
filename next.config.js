/** @type {import('next').NextConfig} */
const config = {
  // ── Performance ──────────────────────────────────────────────────
  // Framer Motion is already tree-shaken; no special config needed.
  // Compiler: remove console.log in production builds only.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ── Images ───────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    // Add your CDN / Nano Banana image domain here if self-hosting
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'kcenergyadvisors.com' },
    ],
  },

  // ── Security headers ─────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking protection
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          // MIME sniffing protection
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          // Referrer — send origin on same-site, nothing cross-origin
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          // Permissions — minimal surface area
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          // DNS prefetch for faster subsequent loads
          { key: 'X-DNS-Prefetch-Control',  value: 'on' },
          // HSTS — 1 year (enable after confirming HTTPS is working)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // CSP — adjust if you add third-party scripts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.leadconnectorhq.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "frame-src https://api.leadconnectorhq.com https://widgets.leadconnectorhq.com",
              "connect-src 'self' https://services.leadconnectorhq.com https://michael-agent-2uow.onrender.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy URL protection — add old GHL page URLs if migrating
      // { source: '/solar', destination: '/', permanent: true },
    ];
  },
};

module.exports = config;
