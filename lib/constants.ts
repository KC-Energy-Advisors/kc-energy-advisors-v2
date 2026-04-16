import type { BillOption, ChatMessage } from './types';

// ── Phone / contact ──────────────────────────────────────────────
export const PHONE_DISPLAY = '(816) 319-0932';
export const PHONE_HREF    = 'tel:+18163190932';

// ── Bill options — single source of truth for form + routing ─────
// Mirrors BILL_MAP in michael_agent.py qualification logic
// $150+ → solar-high-value (advisor prioritizes follow-up)
// $250+ → solar-priority  (advisor called same day)
export const BILL_OPTIONS: BillOption[] = [
  {
    code:      'under-75',
    label:     'Under $75',
    midpoint:  60,
    qualifies: false,
    tag:       'solar-dq-low-bill',
  },
  {
    code:      '75-150',
    label:     '$75 – $150',
    midpoint:  112,
    qualifies: true,
    tag:       '',
    badge:     'Good candidate',
  },
  {
    code:      '150-250',
    label:     '$150 – $250',
    midpoint:  200,
    qualifies: true,
    tag:       'solar-high-value',
    badge:     'Strong candidate',
  },
  {
    code:      '250-plus',
    label:     '$250+',
    midpoint:  300,
    qualifies: true,
    tag:       'solar-priority',
    badge:     '⚡ Priority savings',
  },
];

// ── Solar math constants (KC-specific) ───────────────────────────
export const SOLAR = {
  OFFSET:      0.85,   // fraction of bill offset by solar
  RATE_RISE:   0.034,  // annual utility rate escalation (EIA 2010-2023 avg)
  KWH_PER_KW:  1200,   // KC avg kWh/kW/year production
  RATE_KWH:    0.13,   // $/kWh baseline (KC avg blended rate)
  COST_PER_KW: 2850,   // installed $/kW
  TAX_CREDIT:  0.30,   // federal ITC (in effect through 2032)
  // 20-year compounded cost at $190/mo, 3.4%/yr (docx verified math)
  TWENTY_YR_UTILITY_COST: 52000,
  AVG_ANNUAL_SAVINGS:     1800,
} as const;

// ── GHL tags applied on lead submission ──────────────────────────
export const BASE_TAGS = ['solar-lead-website'] as const;

// ── Michael AI chat script (mirrors michael_agent.py flow) ───────
// Delays are cumulative ms from section entering viewport
export const CHAT_SCRIPT: ChatMessage[] = [
  { from: 'michael', text: "Hey! I'm Michael with KC Energy Advisors. Quick question — do you own your home?",                                                                             delay: 800  },
  { from: 'user',    text: "Yeah, I own the place.",                                                                                                                                     delay: 2200 },
  { from: 'michael', text: "Perfect. Are you in the Kansas City area — within about 2 hours?",                                                                                           delay: 1600 },
  { from: 'user',    text: "Yep, out in Overland Park.",                                                                                                                                 delay: 2400 },
  { from: 'michael', text: "Nice. What's your average monthly electric bill — ballpark is fine.",                                                                                        delay: 1800 },
  { from: 'user',    text: "Around $180 a month, sometimes more in summer.",                                                                                                             delay: 2600 },
  { from: 'michael', text: "Sounds like your home is a solid candidate. Want to grab a free 15-min call with one of our KC advisors? No pressure — just your numbers.",                  delay: 2000 },
  { from: 'user',    text: "Yeah, let's do it. Just booked for Tuesday at 2pm.",                                                                                                         delay: 2800 },
  { from: 'michael', text: "You're all set! Your advisor will walk you through exactly what you'd save. Talk soon. 🎉",                                                                  delay: 1400 },
];

// ── KC utility rate chart data (2019–2025 est.) ──────────────────
export const RATE_CHART = [
  { year: '2019', rate: 10.9, height: 68 },
  { year: '2020', rate: 11.2, height: 72 },
  { year: '2021', rate: 11.5, height: 75 },
  { year: '2022', rate: 12.4, height: 84 },
  { year: '2023', rate: 13.1, height: 89 },
  { year: '2024', rate: 14.3, height: 97 },
  { year: '2025 est.', rate: 15.2, height: 100, projected: true },
] as const;

// ── FAQ content (v3 docx — 8 questions) ─────────────────────────
export const FAQ_ITEMS = [
  {
    q: 'Is this actually $0 down?',
    a: 'Yes. You pay nothing to get started. You replace your existing utility bill with a fixed solar payment — typically lower than what you pay now. No large deposit, no upfront installation cost.',
  },
  {
    q: "What's the catch?",
    a: "There isn't one — but we understand why you'd ask. You're financing a physical asset on your home. Like a car loan, you make monthly payments. The difference: the payment is usually lower than your old utility bill, and at the end you own something.",
  },
  {
    q: 'What if I sell my house?',
    a: 'Solar increases home value. Homes with panels sell for an average of 4% more and faster. The agreement transfers to the buyer, or you pay it off at closing. Either way — it\'s an asset, not a liability.',
  },
  {
    q: 'Will this damage my roof?',
    a: "No. We inspect your roof before installation. The mounting hardware is designed to protect your shingles. Any existing roof issues get flagged before we start — not after.",
  },
  {
    q: 'What happens at night or on cloudy days?',
    a: 'Your system stays connected to the grid. Net metering credits you for excess daytime production. At night, you draw from the grid as normal. Most customers\' net annual bill drops to near zero.',
  },
  {
    q: 'How long does it take?',
    a: 'Typically 3–4 weeks from first call to live system. Installation itself takes one day. Permitting and utility approval is what takes the most time — we handle both.',
  },
  {
    q: 'What is the Federal Tax Credit?',
    a: 'Currently 30% of your total system cost, claimed on your federal tax return. In effect through 2032. Consult a tax professional to confirm your eligibility.',
  },
  {
    q: "My bill isn't that high. Does solar make sense?",
    a: "If you're paying under $75/month, probably not — and we'll tell you that before you book anything. At $75 and above, it almost always pencils out. We show you exact numbers, not estimates.",
  },
] as const;

// ── Benefits (8 cards, v3 docx) ──────────────────────────────────
export const BENEFITS = [
  {
    title: '$0 Down.',
    body:  'No upfront cost. Not $1. Your first month of solar production is also your first month of savings.',
    icon:  '💳',
  },
  {
    title: 'Your Rate Is Locked.',
    body:  'We fix your payment on day one. It doesn\'t move. Not in year 3. Not in year 10.',
    icon:  '🔒',
  },
  {
    title: 'Lower Monthly Bills.',
    body:  'Most KC homeowners see an immediate reduction. Average saving: $80–$150/month depending on system size.',
    icon:  '📉',
  },
  {
    title: 'Done in One Day.',
    body:  'Most installations are complete in a single day. Permits and utility coordination take 2–3 weeks.',
    icon:  '⚡',
  },
  {
    title: '25-Year Warranty.',
    body:  'Panels, inverter, and workmanship — all covered. Your investment is protected for the life of the system.',
    icon:  '🛡️',
  },
  {
    title: 'Your Home Is Worth More.',
    body:  'Homes with solar sell for an average of 4% more and spend less time on the market.*',
    icon:  '🏡',
  },
  {
    title: '30% Federal Tax Credit.',
    body:  'Currently in effect through 2032. You keep 30% of the system cost as a federal tax credit.**',
    icon:  '💰',
  },
  {
    title: 'Local KC Team.',
    body:  'We live here. We answer the phone. Same-day response. Real people.',
    icon:  '📍',
  },
] as const;
