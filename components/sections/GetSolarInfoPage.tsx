'use client';
import { useState } from 'react';
import Script from 'next/script';

// ─────────────────────────────────────────────────────────────────
//  Types — local to this page, not shared with other components
// ─────────────────────────────────────────────────────────────────

type FormStep  = 1 | 2 | 3;
type PageState = 'form' | 'qualified' | 'disqualified';

type BillCode    = '' | 'under-100' | '100-150' | '150-200' | '200-plus';
type RoofCode    = '' | 'asphalt'   | 'metal'   | 'tile'    | 'unsure';
type TimelineCode= '' | 'exploring' | 'interested' | 'ready';

interface FormData {
  // Step 1
  name      : string;
  phone     : string;
  address   : string;
  // Step 2
  ownsHome  : '' | 'yes' | 'no';
  monthlyBill: BillCode;
  roofType  : RoofCode;
  // Step 3
  timeline  : TimelineCode;
}

const EMPTY_FORM: FormData = {
  name: '', phone: '', address: '',
  ownsHome: '', monthlyBill: '', roofType: '',
  timeline: '',
};

// ─────────────────────────────────────────────────────────────────
//  Micro-components — page-scoped, not exported
// ─────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: FormStep }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {([1, 2, 3] as FormStep[]).map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              s < current
                ? 'bg-brand-teal text-white'
                : s === current
                  ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20'
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            {s < current ? '✓' : s}
          </div>
          {i < 2 && (
            <div
              className={`h-px w-10 transition-all duration-500 ${
                s < current ? 'bg-brand-teal' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
        Step {current} of 3
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11.5px] font-semibold uppercase tracking-widest text-[#111827] mb-3">
      {children}
    </label>
  );
}

function TextInput({
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  placeholder: string;
  value      : string;
  onChange   : (v: string) => void;
  type?      : string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-h-[52px] bg-[#f9fafb] border border-[#d1d5db] rounded-xl px-4 py-[14px]
                 text-[#111827] text-[14.5px] placeholder-[#6b7280]
                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
                 transition-all duration-200"
      style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}
    />
  );
}

function ChoiceCard({
  selected,
  onClick,
  label,
  sublabel,
  badge,
}: {
  selected  : boolean;
  onClick   : () => void;
  label     : string;
  sublabel? : string;
  badge?    : string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
        selected
          ? 'border-blue-500 bg-blue-50 text-[#1e40af]'
          : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[13.5px] font-semibold block leading-tight">{label}</span>
          {sublabel && (
            <span className="text-[11.5px] text-[#6b7280] mt-0.5 block">{sublabel}</span>
          )}
        </div>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2 py-0.5 rounded-full flex-shrink-0">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

function PrimaryBtn({
  onClick,
  disabled = false,
  children,
}: {
  onClick  : () => void;
  disabled?: boolean;
  children : React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-[15px] rounded-xl font-bold text-[16px] tracking-wide transition-all duration-200 ${
        disabled
          ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
          : 'bg-[#2563eb] text-white hover:bg-[#1D4ED8] hover:scale-[1.01] active:scale-[0.985]'
      }`}
      style={
        disabled
          ? undefined
          : { boxShadow: '0 8px 32px rgba(37,99,235,0.52)' }
      }
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[#6b7280] hover:text-[#374151] text-[13px] transition-colors flex items-center gap-1.5 mx-auto"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M8 10L4 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Back
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Shared sub-sections (used in both form and result views)
// ─────────────────────────────────────────────────────────────────

function ExpectationSection() {
  const items = [
    {
      icon : '📋',
      title: 'We review your current energy usage',
      body : 'Your actual Evergy bill — real numbers specific to your home, not national averages.',
    },
    {
      icon : '🏡',
      title: 'We show you what solar looks like on your home',
      body : 'System design based on your roof, your usage, and your goals. No guesswork.',
    },
    {
      icon : '📊',
      title: 'We give you honest numbers — whatever they are',
      body : "If solar doesn't make financial sense for your home, we'll say so. No pitch.",
    },
  ];

  return (
    <section className="w-full max-w-[580px] mx-auto px-6 py-10">
      <div className="text-center mb-7">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-white/30 mb-3">
          What happens at the consultation
        </p>
        <h3 className="text-display-sm font-black text-white">
          No surprises. Here's exactly<br className="hidden sm:block" /> what to expect.
        </h3>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-4 p-5 rounded-2xl border border-white/[0.07]"
            style={{ background: 'rgba(255,255,255,0.022)' }}
          >
            <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden>{item.icon}</span>
            <div>
              <p className="text-[13.5px] font-bold text-white mb-1">{item.title}</p>
              <p className="text-[12.5px] text-white/40 leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { stat: '500+', label: 'KC homeowners served' },
    { stat: '25yr',  label: 'Panel warranty' },
    { stat: '$0',    label: 'Down options available' },
  ];

  return (
    <section className="w-full max-w-[580px] mx-auto px-6 pb-16">
      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 py-8 px-6 rounded-2xl border border-white/[0.07]"
        style={{ background: 'rgba(255,255,255,0.018)' }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[30px] font-black text-white tracking-tight leading-none">
              {item.stat}
            </span>
            <span className="text-[11.5px] font-medium text-white/35 tracking-wide">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Page background wrapper
// ─────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: '#0C1322' }}>
      {/* Dot-grid texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(37,99,235,0.055) 1px,transparent 1px)',
          backgroundSize : '32px 32px',
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* Ambient glow — top-right */}
      <div
        className="fixed pointer-events-none"
        style={{
          top    : '-200px',
          right  : '-120px',
          width  : '700px',
          height : '700px',
          borderRadius: '50%',
          background  : 'rgba(37,99,235,0.05)',
          filter      : 'blur(100px)',
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* Ambient glow — bottom-left */}
      <div
        className="fixed pointer-events-none"
        style={{
          bottom : '-100px',
          left   : '-80px',
          width  : '480px',
          height : '480px',
          borderRadius: '50%',
          background  : 'rgba(245,158,11,0.05)',
          filter      : 'blur(80px)',
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main exported component
// ─────────────────────────────────────────────────────────────────

export default function GetSolarInfoPage() {
  const [pageState, setPageState] = useState<PageState>('form');
  const [step, setStep]           = useState<FormStep>(1);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Enter-key handler factory — reuses existing step functions, no logic duplication.
  // Skips when Enter is on a <button> (buttons already self-handle Enter/Space).
  const stepEnter = (action: () => void, valid: boolean) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter') return;
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      if (!valid) return;
      e.preventDefault();
      action();
    };

  // Per-step validation
  const step1OK = form.name.trim().length >= 2 &&
                  form.phone.replace(/\D/g, '').length >= 10;
  const step2OK = form.ownsHome !== '' &&
                  form.monthlyBill !== '' &&
                  form.roofType !== '';
  const step3OK = form.timeline !== '';

  function goStep2() {
    if (!step1OK) return;
    setStep(2);
  }

  function goStep3() {
    if (!step2OK) return;
    if (form.ownsHome === 'no') { setPageState('disqualified'); return; }
    setStep(3);
  }

  function goResult() {
    if (!step3OK) return;
    setPageState('qualified');
    // ── TODO: POST lead to /api/submit-lead here ─────────────────
    // Payload shape matches LeadPayload in lib/types.ts.
    // Wire up after GHL calendar is connected so the booking
    // confirmation can reference the same contact record.
    // ─────────────────────────────────────────────────────────────
  }

  // ── DISQUALIFIED ─────────────────────────────────────────────
  if (pageState === 'disqualified') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center">
          <div
            className="w-14 h-14 rounded-full border border-white/[0.12] flex items-center justify-center mb-6"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              <path d="M11 7v5M11 15.5h.01" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-display-sm font-black text-white mb-3">
            {form.name ? `Thanks, ${form.name}.` : 'Thanks for letting us know.'}
          </h2>
          <p className="text-white/50 text-[15px] leading-relaxed max-w-[380px] mb-8">
            Solar really only works for homeowners — the system needs to be tied to a property you own.
            If your situation ever changes, we&rsquo;d be glad to take another look.
          </p>
          <a
            href="/"
            className="text-[13.5px] font-semibold text-brand-blue hover:text-brand-blue-lt transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </PageShell>
    );
  }

  // ── QUALIFIED → BOOKING ────────────────────────────────────────
  if (pageState === 'qualified') {
    // ── Prefill GHL calendar with Step 1 data ─────────────────────
    // GHL booking widget reads these URL params and pre-populates its
    // own contact form, so the user only needs to pick a time slot.
    const _p = new URLSearchParams();

    // name / first_name / last_name → GHL checks all three formats
    // Split on whitespace so "Mike Smith" → first="Mike", last="Smith"
    if (form.name) {
      const parts = form.name.trim().split(/\s+/);
      const first = parts[0] ?? '';
      const last  = parts.slice(1).join(' ');
      _p.set('name',       form.name.trim()); // full-name field
      _p.set('first_name', first);                 // split first-name field
      if (last) _p.set('last_name', last);         // split last-name field (if provided)
    }

    // phone → E.164 format (+1XXXXXXXXXX for US)
    // Handles: (816) 319-0932 / 816-319-0932 / 8163190932 / 18163190932
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, '');
      const e164 =
        digits.length === 10                          ? `+1${digits}`  // 10-digit US number
        : digits.length === 11 && digits[0] === '1'  ? `+${digits}`   // already has country code
        : `+1${digits}`;                                               // fallback: prepend +1
      _p.set('phone', e164);
    }

    // address → no standard booking-widget param exists for this field.
    // To prefill it you need the custom field's UUID key from GHL:
    //   GHL → Settings → Custom Fields → copy the field "key" value
    //   Then add: _p.set('<field-uuid-key>', form.address);

    const _calendarSrc =
      `https://api.leadconnectorhq.com/widget/booking/0fu9WVucPWOYhM0tSEGE?${_p.toString()}`;

    return (
      <PageShell>
        {/* Booking confirmation — single compact inline row, no stacked icon block */}
        <div className="pt-3 pb-2 px-6 flex items-center justify-center gap-2">
          <svg width="15" height="15" viewBox="0 0 26 26" fill="none" aria-hidden className="flex-shrink-0">
            <path
              d="M4.5 13.5L10.5 19.5L21.5 7"
              stroke="#0D9488" strokeWidth="2.8"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <p className="text-[15px] font-semibold text-white leading-tight">
            {form.name
              ? `${form.name}, your home looks like a great fit.`
              : 'Your home looks like a great fit.'}
            <span className="text-white/45 font-normal"> Pick a time below.</span>
          </p>
        </div>

        {/* Calendar — immediately below the confirmation line */}
        <section className="px-6 pb-10 flex justify-center" style={{ marginTop: '6px' }}>
          <div className="w-full max-w-[800px]">

            {/* ── GHL CALENDAR EMBED ─────────────────────────────────── */}
            <div
              id="ghl-calendar-embed"
              className="w-full rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                background : 'rgba(255,255,255,0.022)',
                minHeight  : '650px',
                boxShadow  : '0 8px 40px rgba(0,0,0,0.28)',
              }}
            >
              <iframe
                src={_calendarSrc}
                id="0fu9WVucPWOYhM0tSEGE_1776708128843"
                scrolling="no"
                style={{
                  width     : '100%',
                  minHeight : '650px',
                  border    : 'none',
                  overflow  : 'hidden',
                  display   : 'block',
                }}
              />
            </div>

            {/* GHL widget script — loads after page is interactive */}
            <Script
              src="https://link.msgsndr.com/js/form_embed.js"
              strategy="afterInteractive"
            />
          </div>
        </section>

        <ExpectationSection />
        <TrustSection />
      </PageShell>
    );
  }

  // ── MULTI-STEP FORM ────────────────────────────────────────────
  return (
    <PageShell>
      {/* ── SECTION 1: HERO ───────────────────────────────────── */}
      <section className="pt-14 pb-8 text-center px-6">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-white/65 bg-white/[0.07] border border-white/[0.09] px-3.5 py-1.5 rounded-full mb-6">
          Free Consultation &nbsp;·&nbsp; No Obligation
        </div>
        <h1 className="text-display-md font-black text-white mb-4">
          See If Solar Makes Sense<br />
          <span className="text-brand-gold">For Your Home</span>
        </h1>
        <p className="text-[17px] text-white/55 max-w-[400px] mx-auto leading-relaxed mb-3">
          Takes 30 seconds. We&rsquo;ll only schedule if it actually benefits you.
        </p>
        <p className="text-[12.5px] text-white/30 font-medium tracking-wide">
          No pressure.&nbsp; No obligation.&nbsp; Just clarity.
        </p>
      </section>

      {/* ── SECTION 2: QUALIFICATION FORM ─────────────────────── */}
      <section className="px-6 pb-8 flex justify-center">
        <div
          className="w-full max-w-[480px] rounded-2xl border border-black/[0.07] p-7 sm:p-8"
          style={{ background: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        >
          <StepIndicator current={step} />

          {/* ── STEP 1: Contact info ──────────────────────────── */}
          {step === 1 && (
            <div className="animate-step-slide" onKeyDown={stepEnter(goStep2, step1OK)}>
              <h2 className="text-[21px] font-black text-[#0f172a] mb-2">Tell us about yourself</h2>
              <p className="text-[13px] text-[#4b5563] mb-8">
                We&rsquo;ll reach out to confirm your consultation.
              </p>

              <div className="flex flex-col gap-5 mb-8">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <TextInput
                    placeholder="Your full name"
                    value={form.name}
                    onChange={v => set('name', v)}
                  />
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <TextInput
                    placeholder="(816) 000-0000"
                    value={form.phone}
                    onChange={v => set('phone', v)}
                    type="tel"
                  />
                </div>
                <div>
                  <FieldLabel>Property Address</FieldLabel>
                  <TextInput
                    placeholder="123 Main St, Kansas City, MO"
                    value={form.address}
                    onChange={v => set('address', v)}
                  />
                </div>
              </div>

              <PrimaryBtn onClick={goStep2} disabled={!step1OK}>
                Continue →
              </PrimaryBtn>
              <p className="text-center text-[11px] text-[#9ca3af] mt-4">
                Your information is never sold or shared.
              </p>
            </div>
          )}

          {/* ── STEP 2: Home qualification ────────────────────── */}
          {step === 2 && (
            <div className="animate-step-slide" onKeyDown={stepEnter(goStep3, step2OK)}>
              <h2 className="text-[21px] font-black text-[#0f172a] mb-2">Quick home check</h2>
              <p className="text-[13px] text-[#4b5563] mb-8">
                Helps us know if solar is a fit before we talk.
              </p>

              <div className="flex flex-col gap-7 mb-8">
                {/* Own the home? */}
                <div>
                  <FieldLabel>Do you own the home?</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceCard
                      selected={form.ownsHome === 'yes'}
                      onClick={() => set('ownsHome', 'yes')}
                      label="Yes, I own it"
                    />
                    <ChoiceCard
                      selected={form.ownsHome === 'no'}
                      onClick={() => set('ownsHome', 'no')}
                      label="No, I rent"
                    />
                  </div>
                </div>

                {/* Monthly electric bill */}
                <div>
                  <FieldLabel>Average monthly electric bill</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {([
                      { code: 'under-100', label: 'Under $100 / month'    },
                      { code: '100-150',   label: '$100 – $150 / month'   },
                      { code: '150-200',   label: '$150 – $200 / month',  badge: 'Strong fit' },
                      { code: '200-plus',  label: '$200+ / month',        badge: 'Priority'  },
                    ] as { code: BillCode; label: string; badge?: string }[]).map(opt => (
                      <ChoiceCard
                        key={opt.code}
                        selected={form.monthlyBill === opt.code}
                        onClick={() => set('monthlyBill', opt.code)}
                        label={opt.label}
                        badge={opt.badge}
                      />
                    ))}
                  </div>
                </div>

                {/* Roof type */}
                <div>
                  <FieldLabel>Roof type</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { code: 'asphalt', label: 'Asphalt shingle' },
                      { code: 'metal',   label: 'Metal'           },
                      { code: 'tile',    label: 'Tile'            },
                      { code: 'unsure',  label: 'Not sure'        },
                    ] as { code: RoofCode; label: string }[]).map(opt => (
                      <ChoiceCard
                        key={opt.code}
                        selected={form.roofType === opt.code}
                        onClick={() => set('roofType', opt.code)}
                        label={opt.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <PrimaryBtn onClick={goStep3} disabled={!step2OK}>
                Continue →
              </PrimaryBtn>
              <div className="mt-4 flex justify-center">
                <BackBtn onClick={() => setStep(1)} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Timeline / intent ─────────────────────── */}
          {step === 3 && (
            <div className="animate-step-slide" onKeyDown={stepEnter(goResult, step3OK)}>
              <h2 className="text-[21px] font-black text-[#0f172a] mb-2">One last thing</h2>
              <p className="text-[13px] text-[#4b5563] mb-8">
                Helps us come prepared to your consultation.
              </p>

              <div className="mb-7">
                <FieldLabel>Where are you in the decision process?</FieldLabel>
                <div className="flex flex-col gap-2">
                  {([
                    {
                      code    : 'exploring',
                      label   : 'Just exploring',
                      sublabel: 'Curious — not in a rush',
                    },
                    {
                      code    : 'interested',
                      label   : 'I\'m interested',
                      sublabel: 'Want to understand my real options',
                    },
                    {
                      code    : 'ready',
                      label   : 'Ready if it makes sense',
                      sublabel: 'Looking to move forward soon',
                    },
                  ] as { code: TimelineCode; label: string; sublabel: string }[]).map(opt => (
                    <ChoiceCard
                      key={opt.code}
                      selected={form.timeline === opt.code}
                      onClick={() => set('timeline', opt.code)}
                      label={opt.label}
                      sublabel={opt.sublabel}
                    />
                  ))}
                </div>
              </div>

              <PrimaryBtn onClick={goResult} disabled={!step3OK}>
                See My Options →
              </PrimaryBtn>
              <div className="mt-4 flex justify-center">
                <BackBtn onClick={() => setStep(2)} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 4: EXPECTATION SETTING ────────────────────── */}
      <ExpectationSection />

      {/* ── SECTION 5: TRUST ──────────────────────────────────── */}
      <TrustSection />
    </PageShell>
  );
}
