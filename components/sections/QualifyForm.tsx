'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BILL_OPTIONS } from '@/lib/constants';
import { toE164 } from '@/lib/solar-calc';
import { useUTM, getStoredUTMs } from '@/hooks/useUTM';
import { LinkButton } from '@/components/ui/Button';
import type { FormState, LeadPayload } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  consent: boolean;
}

function ProgressBar({ step }: { step: Step }) {
  const pct = ((step - 1) / 3) * 100;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-brand-blue rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct === 0 ? 8 : pct}%` }}
      />
    </div>
  );
}

function StepLabel({ step, total }: { step: Step; total: number }) {
  return (
    <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">
      Step {step} of {total}
    </div>
  );
}

export default function QualifyForm() {
  const router = useRouter();
  useUTM(); // writes UTMs from URL → sessionStorage on mount

  const [fs, setFs] = useState<FormState>({
    step: 1,
    isOwner: null,
    locationOK: null,
    billCode: null,
    billLabel: null,
    billMidpoint: null,
  });

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    consent: false,
  });

  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const topRef                = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
   // topRef.current?.scrollIntoView({ behavior: 'auto', block: 'start'// });
  };

  // ── Step 1: Ownership ────────────────────────────────────────────
  const handleOwnership = useCallback((owns: boolean) => {
    if (!owns) {
      // Renter — soft disqualify (fire-and-forget, no personal info to send)
      submitToAPI({
        ...buildBasePayload('no', 'no', '', '', 0),
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        tags: ['solar-dq-renter', 'solar-lead-website'],
      } as LeadPayload, false).catch(() => {});
      router.push('/not-yet');
      return;
    }
    setFs(p => ({ ...p, step: 2, isOwner: true }));
    scrollToTop();
  }, [router]);

  // ── Step 2: Location ─────────────────────────────────────────────
  const handleLocation = useCallback((inArea: boolean) => {
    if (!inArea) {
      submitToAPI({
        ...buildBasePayload('yes', 'no', '', '', 0),
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        tags: ['solar-dq-location', 'solar-lead-website'],
      } as LeadPayload, false).catch(() => {});
      router.push('/not-yet');
      return;
    }
    setFs(p => ({ ...p, step: 3, locationOK: true }));
    scrollToTop();
  }, [router]);

  // ── Step 3: Bill ─────────────────────────────────────────────────
  const handleBill = useCallback((code: string) => {
    const option = BILL_OPTIONS.find(b => b.code === code)!;
    const newFs: FormState = {
      ...fs,
      billCode: code,
      billLabel: option.label,
      billMidpoint: option.midpoint,
    };

    if (!option.qualifies) {
      // Low bill disqualify
      submitToAPI({
        ...buildBasePayload('yes', 'yes', code, option.label, option.midpoint),
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        tags: [option.tag, 'solar-lead-website'],
      } as LeadPayload, false).catch(() => {});
      router.push('/not-yet');
      return;
    }

    setFs({ ...newFs, step: 4 });
    scrollToTop();
  }, [fs, router]);

  // ── Step 4: Contact info ─────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.firstName.trim()) { setError('Please enter your first name.'); return; }
    if (!form.lastName.trim())  { setError('Please enter your last name.'); return; }
    const e164 = toE164(form.phone);
    if (!e164) { setError('Please enter a valid 10-digit phone number.'); return; }
    if (!form.consent) { setError('Please agree to receive SMS messages to continue.'); return; }

    const billOption = BILL_OPTIONS.find(b => b.code === fs.billCode)!;
    const tags = ['solar-lead-website', '[QUALIFIED]'];
    if (billOption.tag) tags.push(billOption.tag);

    const utms = getStoredUTMs();

    const payload: LeadPayload = {
      locationId: process.env.NEXT_PUBLIC_LOCATION_ID || '',
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: e164,
      email: form.email.trim(),
      is_owner: 'yes',
      location_ok: 'yes',
      bill_amount: String(fs.billMidpoint),
      bill_label: fs.billLabel || '',
      bill_midpoint: String(fs.billMidpoint),
      tags,
      utm_source:   utms.utm_source,
      utm_medium:   utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content:  utms.utm_content,
      utm_term:     utms.utm_term,
      formVersion: 'nextjs-v1',
      submittedAt: new Date().toISOString(),
      source: 'website-qualify-form',
    };

    setLoading(true);
    try {
      await submitToAPI(payload, true);
      console.log('[QualifyForm] ✅ submission succeeded — redirecting to /thank-you');
      router.push('/thank-you');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[QualifyForm] ❌ submission failed:', msg);
      setError(msg || 'Something went wrong. Please try again or call us directly.');
      setLoading(false);
    }
  }, [form, fs, router]);

  return (
    <section id="qualify" className="py-28 relative overflow-hidden" style={{ background: '#0C1322' }}>
      {/* Subtle dot-grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '28px 28px' }}
        aria-hidden
      />
      <div className="max-w-site mx-auto px-6 relative z-10">
        <div className="max-w-[560px] mx-auto">

          {/* Header — docx spec copy */}
          <div className="text-center mb-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#F59E0B' }}>
              See If Your Home Qualifies
            </p>
            <h2 className="text-display-md font-black text-white mb-4" style={{ letterSpacing: '-0.01em' }}>
              Find Out Exactly What You&apos;d Save.
            </h2>
            <p className="text-[17px] leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
              No credit check. No sales call until you want one.
              Just your custom Savings Report — built for your home, your bill, your zip code.
            </p>
            {/* Urgency — distinct from Hero copy */}
            <p className="text-[14px] font-medium" style={{ color: '#F59E0B' }}>
              → Takes 60 seconds.{' '}
              <span style={{ color: '#94A3B8' }}>Michael texts you within minutes with your custom numbers.</span>
            </p>
          </div>

          {/* Form card */}
          <div ref={topRef} className="rounded-3xl p-8 border border-white/10" style={{ background: 'rgba(30,45,69,0.7)', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
            <ProgressBar step={fs.step} />
            <StepLabel step={fs.step} total={4} />

            {/* ── Step 1 ─────────────────────────────────────────── */}
            {fs.step === 1 && (
              <div className="animate-step-slide">
                <h3 className="text-[22px] font-black text-white mb-2">Do you own your home?</h3>
                <p className="text-sm text-white/45 mb-7">Renters aren&apos;t eligible for federal solar incentives.</p>
                <div className="grid grid-cols-2 gap-4">
                  <ChoiceCard
                    label="Yes, I own it"
                    icon="🏡"
                    onClick={() => handleOwnership(true)}
                    highlight
                  />
                  <ChoiceCard
                    label="No, I rent"
                    icon="🔑"
                    onClick={() => handleOwnership(false)}
                  />
                </div>
              </div>
            )}

            {/* ── Step 2 ─────────────────────────────────────────── */}
            {fs.step === 2 && (
              <div className="animate-step-slide">
                <h3 className="text-[22px] font-black text-white mb-2">Are you in the Kansas City area?</h3>
                <p className="text-sm text-white/45 mb-7">We serve homeowners within about 2 hours of Kansas City.</p>
                <div className="grid grid-cols-2 gap-4">
                  <ChoiceCard
                    label="Yes — KC area"
                    icon="📍"
                    onClick={() => handleLocation(true)}
                    highlight
                  />
                  <ChoiceCard
                    label="No, somewhere else"
                    icon="🗺️"
                    onClick={() => handleLocation(false)}
                  />
                </div>
                <BackButton onClick={() => { setFs(p => ({ ...p, step: 1 })); scrollToTop(); }} />
              </div>
            )}

            {/* ── Step 3 ─────────────────────────────────────────── */}
            {fs.step === 3 && (
              <div className="animate-step-slide">
                <h3 className="text-[22px] font-black text-white mb-2">What&apos;s your average monthly electric bill?</h3>
                <p className="text-sm text-white/45 mb-7">Ballpark is totally fine — this determines your savings estimate.</p>
                <div className="flex flex-col gap-3">
                  {BILL_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => handleBill(opt.code)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl px-5 py-4 border text-left transition-all duration-150',
                        opt.qualifies
                          ? 'bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.10] hover:border-brand-blue text-white'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/60'
                      )}
                    >
                      <span className="text-[15px] font-semibold">{opt.label}</span>
                      {opt.badge && (
                        <span className={cn(
                          'text-[10.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0',
                          opt.code === '250-plus'
                            ? 'bg-brand-gold/20 text-brand-gold-lt border border-brand-gold/30'
                            : opt.code === '150-250'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-white/10 text-white/50 border border-white/15'
                        )}>
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <BackButton onClick={() => { setFs(p => ({ ...p, step: 2 })); scrollToTop(); }} />
              </div>
            )}

            {/* ── Step 4 ─────────────────────────────────────────── */}
            {fs.step === 4 && (
              <div className="animate-step-slide">
                <h3 className="text-[22px] font-black text-white mb-1">Where should we send your savings report?</h3>
                <p className="text-sm text-white/45 mb-6">Michael will text you within minutes.</p>

                {/* Qualification badge */}
                <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-green-400 flex-shrink-0" aria-hidden>
                    <path d="M9 2a7 7 0 1 1 0 14A7 7 0 0 1 9 2Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div className="text-[12px] font-bold text-green-400">Your home qualifies!</div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      Based on your bill ({fs.billLabel}), you&apos;re a strong solar candidate.
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5" htmlFor="firstName">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={form.firstName}
                        onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                        placeholder="Jane"
                        className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-brand-blue focus:bg-white/[0.10] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5" htmlFor="lastName">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={form.lastName}
                        onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                        placeholder="Smith"
                        className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-brand-blue focus:bg-white/[0.10] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5" htmlFor="phone">Mobile Phone *</label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(816) 555-0100"
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-brand-blue focus:bg-white/[0.10] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5" htmlFor="email">Email (optional)</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="jane@example.com"
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-brand-blue focus:bg-white/[0.10] transition-all"
                    />
                  </div>

                  {/* TCPA Consent */}
                  <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={form.consent}
                      onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-brand-blue flex-shrink-0 cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-[11px] text-white/38 leading-relaxed cursor-pointer">
                      By checking this box, I agree to receive SMS messages from KC Energy Advisors regarding my solar estimate. Message &amp; data rates may apply. Reply STOP to opt out at any time.{' '}
                      <a href="/privacy" className="text-white/55 underline hover:text-white transition-colors">Privacy Policy</a>.
                    </label>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-[13px] text-red-400">
                      <p className="font-medium mb-1">{error}</p>
                      <p className="text-red-400/60 text-[11px]">
                        Your info is saved — tap the button below to try again.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue hover:bg-brand-blue-dk text-white font-bold text-[15px] rounded-xl py-4 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Sending your report…
                      </>
                    ) : (
                      'Get My Free Savings Report →'
                    )}
                  </button>

                  <p className="text-[10.5px] text-white/25 text-center leading-relaxed">
                    No obligation. No credit check. Your info is never sold.
                  </p>
                </form>
                <BackButton onClick={() => { setFs(p => ({ ...p, step: 3 })); scrollToTop(); }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function ChoiceCard({ label, icon, onClick, highlight }: {
  label: string; icon: string; onClick: () => void; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border transition-all duration-150 text-center',
        highlight
          ? 'bg-white/[0.08] border-white/[0.18] hover:bg-brand-blue hover:border-brand-blue text-white'
          : 'bg-white/[0.04] border-white/[0.09] hover:bg-white/[0.08] text-white/70 hover:text-white'
      )}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-[14px] font-bold leading-tight">{label}</span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-5 flex items-center gap-1.5 text-[12px] font-semibold text-white/35 hover:text-white/60 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Back
    </button>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildBasePayload(
  isOwner: 'yes'|'no',
  locationOk: 'yes'|'no',
  billCode: string,
  billLabel: string,
  billMidpoint: number,
) {
  return {
    locationId: process.env.NEXT_PUBLIC_LOCATION_ID || '',
    is_owner: isOwner,
    location_ok: locationOk,
    bill_amount: String(billMidpoint),
    bill_label: billLabel,
    bill_midpoint: String(billMidpoint),
    utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '',
    formVersion: 'nextjs-v1',
    submittedAt: new Date().toISOString(),
    source: 'website-qualify-form',
  };
}

async function submitToAPI(payload: LeadPayload, qualified: boolean): Promise<void> {
  console.log('[QualifyForm] → submitting', {
    qualified,
    phone:  payload.phone,
    source: payload.source,
    bill:   payload.bill_label,
  });

  const res = await fetch('/api/submit-lead', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...payload, qualified }),
  });

  // Always try to parse the response body for logging, even on error
  const data = await res.json().catch(() => ({}));
  console.log('[QualifyForm] ← response', { status: res.status, ok: res.ok, data });

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
}
