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
  // 20-year compounded cost at $190/mo, 3.4%/yr
  TWENTY_YR_UTILITY_COST: 52000,
  AVG_ANNUAL_SAVINGS:     1800,
} as const;

// ── GHL tags applied on lead submission ──────────────────────────
export const BASE_TAGS = ['solar-lead-website'] as const;

// ── Michael AI chat script (demo conversation in phone mockup) ───
// Delays are ms from section entering viewport. Kept fast — this is a demo.
// Copy updated to match rate-increase positioning (no tax credit language).
export const CHAT_SCRIPT: ChatMessage[] = [
  { from: 'michael', text: "Hey! I'm Michael with KC Energy Advisors. Real quick — do you own your home?",                                                                   delay: 250 },
  { from: 'user',    text: "Yeah, I own the place.",                                                                                                                         delay: 650 },
  { from: 'michael', text: "Nice. Are you in the KC metro area?",                                                                                                            delay: 480 },
  { from: 'user',    text: "Yep, out in Overland Park.",                                                                                                                     delay: 700 },
  { from: 'michael', text: "Perfect — Evergy territory. What's your average monthly electric bill? Ballpark is fine.",                                                       delay: 540 },
  { from: 'user',    text: "Around $180 a month, more in summer.",                                                                                                           delay: 780 },
  { from: 'michael', text: "$180 is starting to get up there. That’s where most homeowners start looking to lock in something more predictable and protect themselves from Evergy’s rate hikes. Solar can help stabilize your costs depending on your setup. Want to see what it would look like for your home?", delay: 600 },
  { from: 'user',    text: "That sounds good. How do I find out what I'd actually save?",                                                                                    delay: 800 },
  { from: ‘michael’, text: "Simple — I come out to your home, look at your actual Evergy bill, and map out exactly what solar would save you. No pressure, no commitment. We only move forward if the numbers actually make sense for you. Want me to send you a link to pick a time?",                delay: 420 },
];

// ── KC utility rate chart data (2019–2025) ───────────────────────
export const RATE_CHART = [
  { year: '2019', rate: 10.9, height: 68 },
  { year: '2020', rate: 11.2, height: 72 },
  { year: '2021', rate: 11.5, height: 75 },
  { year: '2022', rate: 12.4, height: 84 },
  { year: '2023', rate: 13.1, height: 89 },
  { year: '2024', rate: 14.3, height: 97 },
  { year: '2025 est.', rate: 15.2, height: 100, projected: true },
] as const;

// ── FAQ content ───────────────────────────────────────────────────
// Updated: removed tax credit Q&A (expired Dec 31 2025), added Evergy-specific answers.
export const FAQ_ITEMS = [
  {
    q: 'Is this really $0 down?',
    a: 'Yes. You pay nothing to get started. Your first solar payment replaces your Evergy bill — and it\'s typically lower. No deposit, no installation cost, no surprises.',
  },
  {
    q: "What's the catch?",
    a: "There isn't one — but we get why you'd ask. You're financing a physical asset on your home. Like a car loan, you make monthly payments. The difference: the payment is usually less than your old Evergy bill, and at the end you own something that added value to your home.",
  },
  {
    q: 'Does Evergy allow solar? How does the billing work?',
    a: "Yes — Evergy is required by state law to offer net metering to solar customers in both Kansas and Missouri. When your panels produce more than you use, Evergy credits your account. At night you draw from the grid as normal. Most KC solar homeowners see near-zero bills several months a year. We handle the Evergy interconnection application — you don't deal with them directly.",
  },
  {
    q: 'What happens to extra energy my panels produce?',
    a: "It gets credited to your Evergy account. On good production days — spring and fall especially — those credits roll forward and offset future bills. One important note: we size your system to match your actual usage, not to overproduce, because Evergy compensates excess generation beyond your annual usage at a much lower rate. Right-sizing protects your investment.",
  },
  {
    q: 'Is solar still worth it?',
    a: "Yes — and the math is actually straightforward. If you're paying $150+ to Evergy today, and Evergy keeps raising rates (which they have, every year or two), your bill keeps growing. Solar replaces that with one fixed monthly payment — immune to future rate increases — for 25 years. The longer Evergy raises rates, the better solar looks by comparison.",
  },
  {
    q: 'What if I sell my house?',
    a: "Solar increases your home's appraised value — typically 3–4% according to national studies. A $280,000 home can appraise $8,000–$11,000 higher with panels. Your financing transfers to the buyer at closing or can be paid off from the sale proceeds. Either way, it's an asset.",
  },
  {
    q: 'How long does installation take?',
    a: 'Installation itself is one day. The full process — permits, Evergy interconnection approval, inspection — typically runs 6–8 weeks. We manage all of it. You have one point of contact from your first call to the day your system goes live.',
  },
  {
    q: "My bill isn't that high. Does solar make sense?",
    a: "If you're under $75/month, honestly, probably not — and we'll tell you that before you commit to anything. At $75 and above, it almost always pencils out. We show you real numbers for your home, not estimates.",
  },
] as const;

// ── Benefits (8 cards) ────────────────────────────────────────────
// Updated: replaced "30% Federal Tax Credit" card (expired Dec 31 2025)
// with "Rate Increase Protection" — the actual value prop in 2026.
export const BENEFITS = [
  {
    title: '$0 Down.',
    body:  'No upfront cost. Not $1. Your first month of solar production is your first month of energy independence',
    icon:  '💳',
  },
  {
    title: 'Your Rate Is Locked.',
    body:  'Your solar payment is fixed on day one. Evergy can raise rates as much as they want — your cost doesn\'t move.',
    icon:  '🔒',
  },
  {
   title: "Take Control of Your Energy Costs",
body: "Most KC homeowners aren’t trying to gamble on utility rates anymore — they’re looking for something predictable. Solar gives you control over your energy costs instead of being at the mercy of Evergy’s increases.",
  },
  {
    title: 'Done in One Day.',
    body:  'Installation takes one day. Permits and Evergy interconnection take 2–3 weeks — we handle both.',
    icon:  '⚡',
  },
  {
    title: '25-Year Warranty.',
    body:  'Panels, inverter, and workmanship — all covered. Your system is protected for the life of the agreement.',
    icon:  '🛡️',
  },
  {
    title: 'Your Home Is Worth More.',
    body:  'Homes with solar typically appraise 3–4% higher. That\'s $8,000–$11,000 on a $280k home.*',
    icon:  '🏡',
  },
  {
    title: 'Protection From Rate Hikes.',
    body:  'Evergy raised rates in 2024, again in 2025, and has filed for another increase. Solar puts you off that treadmill.',
    icon:  '📊',
  },
  {
    title: 'Local KC Team.',
    body:  'We live here. We answer the phone. Same-day response. Real people who know Evergy\'s territory.',
    icon:  '📍',
  },
] as const;
