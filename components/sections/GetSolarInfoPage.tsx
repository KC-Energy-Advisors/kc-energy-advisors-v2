'use client';
import { useState, useEffect, useRef } from 'react';
import type { CalendarSlot } from '@/lib/types';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────
//  Types — local to this page, not shared with other components
// ─────────────────────────────────────────────────────────────────

type FormStep  = 1 | 2 | 3;
type PageState = 'form' | 'submitting' | 'submit-error' | 'booking' | 'booked' | 'disqualified';

type BillCode    = '' | 'under-100' | '100-150' | '150-200' | '200-plus';
type RoofCode    = '' | 'asphalt'   | 'metal'   | 'tile'    | 'unsure';
type TimelineCode= '' | 'exploring' | 'interested' | 'ready';

interface FormData {
  // Step 1
  name      : string;
  phone     : string;
  address   : string;
  consent   : boolean;   // TCPA SMS consent — required before Step 1 can advance
  // Step 2
  ownsHome  : '' | 'yes' | 'no';
  monthlyBill: BillCode;
  roofType  : RoofCode;
  // Step 3
  timeline  : TimelineCode;
}

const EMPTY_FORM: FormData = {
  name: '', phone: '', address: '', consent: false,
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

function PageShell({
  children,
  topAligned = false,
}: {
  children   : React.ReactNode;
  topAligned?: boolean;
}) {
  return (
    <div
      className={`${topAligned ? 'flex flex-col items-start' : 'min-h-screen'} relative overflow-x-hidden`}
      style={{ background: '#0C1322' }}
    >
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
      <div className={`relative z-10 ${topAligned ? 'w-full' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Helpers — phone formatting
// ─────────────────────────────────────────────────────────────────

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10)                         return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1')    return `+${digits}`;
  return `+1${digits}`;
}

// ─────────────────────────────────────────────────────────────────
//  Bill code → label / midpoint map
// ─────────────────────────────────────────────────────────────────

const BILL_META: Record<string, { label: string; midpoint: number }> = {
  'under-100': { label: 'Under $100/mo',  midpoint: 75  },
  '100-150':   { label: '$100–$150/mo',   midpoint: 125 },
  '150-200':   { label: '$150–$200/mo',   midpoint: 175 },
  '200-plus':  { label: '$200+/mo',       midpoint: 250 },
};

// ─────────────────────────────────────────────────────────────────
//  Main exported component
// ─────────────────────────────────────────────────────────────────

export default function GetSolarInfoPage() {
  console.error('🔥 COMPONENT: GetSolarInfoPage IS RUNNING 🔥');

  const [pageState,   setPageState]   = useState<PageState>('form');
  const [step,        setStep]        = useState<FormStep>(1);
  const [form,        setForm]        = useState<FormData>(EMPTY_FORM);
  const [contactId,   setContactId]   = useState<string | null>(null);

  // Ref mirror — survives re-renders and stale closures.
  // Always set in sync with the state setter below.
  const contactIdRef = useRef<string | null>(null);

  // Wrapper: keeps state + ref in lockstep.
  const setContactIdSafe = (id: string | null) => {
    console.error('[FUNNEL] setContactIdSafe RECEIVED:', id);
    console.log('[FUNNEL] setContactIdSafe RECEIVED:', id);
    contactIdRef.current = id;
    console.error('[FUNNEL] ref set to:', contactIdRef.current);
    setContactId(id);
    console.error('[FUNNEL] setContactId(id) called — React will re-render');
  };

  console.error('[FUNNEL] render — contactId state:', contactId, '| ref:', contactIdRef.current);
  const [submitError, setSubmitError] = useState<string>('');
  const [bookedSlot,  setBookedSlot]  = useState<CalendarSlot | null>(null);

  // Prevents re-firing the Step 1 partial upsert if the user navigates
  // back to Step 1 and clicks Continue again. One upsert per session.
  const step1UpsertFired = useRef(false);

  // Prevents goResult() from firing twice on rapid double-click.
  // Reset on any error path so the user can retry.
  const isSubmitting = useRef(false);

  // Mount detector — fires once; if seen twice the component is remounting.
  useEffect(() => {
    console.error('[FUNNEL] component mounted — initial contactIdRef:', contactIdRef.current);
  }, []);

  // Log every time contactId resolves to a real value.
  useEffect(() => {
    console.error('[FUNNEL] contactId effect — value:', contactId ?? 'null', '| ref:', contactIdRef.current);
  }, [contactId]);

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
                  form.phone.replace(/\D/g, '').length >= 10 &&
                  form.consent === true;
  const step2OK = form.ownsHome !== '' &&
                  form.monthlyBill !== '' &&
                  form.roofType !== '';
  const step3OK = form.timeline !== '';

  function goStep2() {
    if (!step1OK) return;

    setStep(2); // ← immediate — user is never blocked

    // ── Background partial upsert — non-blocking ──────────────────────────
    // Fires as soon as Step 1 is complete (name + phone + address + consent).
    // Captures this lead in GHL immediately so no data is lost if they drop off
    // at Steps 2 or 3. goResult() will update the same contact via phone dedup.
    if (step1UpsertFired.current) {
      console.error('[S1 UPSERT] dedup guard already fired — skipping');
      return;
    }
    step1UpsertFired.current = true;

    const phone     = toE164(form.phone);
    const nameParts = form.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName  = nameParts.slice(1).join(' ');

    const s1Payload = {
      locationId:            process.env.NEXT_PUBLIC_LOCATION_ID || 'GzCNeSvcjSom5bMGtmt6',
      firstName,
      lastName,
      phone,
      email:                 '',
      address:               form.address,
      is_owner:              '',
      location_ok:           'yes',
      bill_amount:           '',
      bill_label:            '',
      bill_midpoint:         '0',
      tags:                  ['partial-lead-step1'],
      utm_source:            (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_source'))   || '',
      utm_medium:            (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_medium'))   || '',
      utm_campaign:          (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_campaign')) || '',
      utm_content:           (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_content'))  || '',
      utm_term:              (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_term'))     || '',
      formVersion:           'get-solar-info-v2',
      submittedAt:           new Date().toISOString(),
      source:                'website',
      stage:                 'step1',
      sms_consent:           'yes',
      sms_consent_timestamp: new Date().toISOString(),
      sms_consent_language:  'TCPA-v2-2026',
      qualified:             false,
    };

    console.error('[S1 UPSERT] firing — phone:', phone, 'firstName:', firstName, 'lastName:', lastName);
    console.error('[S1 UPSERT] full payload:', JSON.stringify(s1Payload));

    fetch('/api/submit-lead', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(s1Payload),
    })
      .then(async r => {
        const text = await r.text();
        console.error('[S1 UPSERT] response status:', r.status, 'body:', text);
        try { return JSON.parse(text); } catch { return {}; }
      })
      .then((data: { contactId?: string | null; success?: boolean; ghl_ok?: boolean }) => {
        console.error('[S1 UPSERT] full parsed response:', JSON.stringify(data));
        const extractedId = data.contactId ?? null;
        console.error('[FUNNEL] extracted contactId:', extractedId);
        console.log('[FUNNEL] extracted contactId:', extractedId);
        console.error('[FUNNEL] calling setContactIdSafe unconditionally with:', extractedId);
        setContactIdSafe(extractedId);
        console.error('[FUNNEL] after setContactIdSafe — ref is now:', contactIdRef.current);
      })
      .catch(err => {
        console.error('[S1 UPSERT] fetch threw:', err);
      });
  }

  function goStep3() {
    if (!step2OK) return;
    if (form.ownsHome === 'no') { setPageState('disqualified'); return; }
    setStep(3);
  }

  // Scroll to top when the booking state becomes active.
  // Double-rAF ensures we fire after React has painted the new layout.
  useEffect(() => {
    if (pageState !== 'booking') return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    });
  }, [pageState]);

  // ── Submit lead + transition to booking ────────────────────────
  async function goResult() {
    if (!step3OK) return;
    // Double-submit guard — ref is synchronous so it blocks even on rapid clicks
    // before React has re-rendered with the new pageState.
    if (isSubmitting.current) {
      console.error('[FUNNEL] goResult blocked — already in flight');
      return;
    }
    isSubmitting.current = true;
    console.error('[FUNNEL] goResult — contactId at call time:', contactIdRef.current ?? contactId ?? 'null');
    setSubmitError('');
    setPageState('submitting');

    // ── Build payload ─────────────────────────────────────────────
    const phone = toE164(form.phone);
    const nameParts = form.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName  = nameParts.slice(1).join(' ');
    const billMeta  = BILL_META[form.monthlyBill] ?? { label: form.monthlyBill, midpoint: 0 };

    // Read UTM params if stored by homepage
    const utmSource   = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_source'))   || '';
    const utmMedium   = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_medium'))   || '';
    const utmCampaign = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_campaign')) || '';
    const utmContent  = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_content'))  || '';
    const utmTerm     = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('utm_term'))     || '';

    const payload = {
      locationId:   process.env.NEXT_PUBLIC_LOCATION_ID || 'GzCNeSvcjSom5bMGtmt6',
      // Pass contactId if Step 1 partial upsert already created the record.
      // The API route uses this to update in place rather than re-upsert on phone.
      ...(contactId ? { contactId } : {}),
      firstName,
      lastName,
      phone,
      email:        '',
      is_owner:     form.ownsHome as 'yes' | 'no',
      location_ok:  'yes' as const,
      bill_amount:  form.monthlyBill,
      bill_label:   billMeta.label,
      bill_midpoint: String(billMeta.midpoint),
      tags:         [`bill-${form.monthlyBill}`, `roof-${form.roofType}`, `timeline-${form.timeline}`],
      utm_source:   utmSource,
      utm_medium:   utmMedium,
      utm_campaign: utmCampaign,
      utm_content:  utmContent,
      utm_term:     utmTerm,
      formVersion:  'get-solar-info-v2',
      submittedAt:  new Date().toISOString(),
      source:       'website',
      stage:        'complete',
      // ── TCPA consent record ────────────────────────────────────
      // form.consent is guaranteed true here — step1OK blocks
      // goStep2() if consent is false, so this code is only reached
      // after the checkbox has been checked.
      sms_consent:           'yes',
      sms_consent_timestamp: new Date().toISOString(),
      sms_consent_language:  'TCPA-v2-2026',
    };

    try {
      const res  = await fetch('/api/submit-lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json() as {
        success?: boolean;
        contactId?: string | null;
        error?: string;
        dev_mode?: boolean;
      };

      // ── Dev mode (no GHL env vars configured locally) ────────────
      // Proceed to booking with no contactId so the dev flow is testable.
      if (data.dev_mode) {
        console.error('[FUNNEL] dev_mode — skipping contactId set, proceeding to booking');
        // isSubmitting stays true — flow is complete
        setPageState('booking');
        return;
      }

      // ── Hard failure — GHL webhook did not succeed ─────────────────
      // The lead is NOT confirmed in GHL. Block transition and show retry.
      // The user keeps all their form data; goResult() can be called again.
      if (!res.ok) {
        const msg = data.error || 'Something went wrong submitting your info. Please try again.';
        console.error('[GetSolarInfoPage] submit-lead hard failure:', res.status, msg);
        isSubmitting.current = false;   // allow retry
        setSubmitError(msg);
        setPageState('submit-error');
        return;
      }

      // ── Soft success — GHL webhook succeeded ──────────────────────
      // Prefer the fresh contactId from the full submit; fall back to the
      // one captured at Step 1. Block booking entirely if neither resolved.
      const resolvedId = data.contactId ?? contactIdRef.current ?? contactId ?? null;
      console.error('[FUNNEL] resolved contactId after full submit:', resolvedId ?? 'null',
        '| data.contactId:', data.contactId ?? 'null',
        '| ref:', contactIdRef.current ?? 'null',
        '| state:', contactId ?? 'null');
      if (!resolvedId) {
        console.error('[FUNNEL] blocking booking — contactId is null after full submit');
        isSubmitting.current = false;   // allow retry
        setSubmitError('Could not confirm your profile. Please try again.');
        setPageState('submit-error');
        return;
      }
      // isSubmitting stays true — flow is complete, do not allow re-submit
      setContactIdSafe(resolvedId);
      setPageState('booking');

    } catch (err) {
      // ── Network / parse error ────────────────────────────────────
      // Cannot confirm GHL received the lead. Block and surface retry.
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out. Please check your connection and try again.'
        : 'Network error. Please check your connection and try again.';
      console.error('[GetSolarInfoPage] submit-lead network error:', err);
      isSubmitting.current = false;     // allow retry
      setSubmitError(msg);
      setPageState('submit-error');
    }
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

  // ── SUBMIT ERROR — GHL or network failure; user can retry ────────
  // All form data is still in state. goResult() re-runs the full submit.
  // Not a full-page redesign — matches disqualified screen structure.
  if (pageState === 'submit-error') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center">
          {/* Warning icon — reuses same circle style as disqualified screen */}
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
            Something went wrong.
          </h2>

          <p className="text-white/50 text-[15px] leading-relaxed max-w-[380px] mb-2">
            We weren&rsquo;t able to reach our system right now.
            Your information is saved — tap below to try again.
          </p>

          {/* Show specific error only if it adds user value */}
          {submitError && (
            <p className="text-white/30 text-[12px] mb-8 max-w-[380px]">{submitError}</p>
          )}

          {/* Primary retry — re-runs full goResult() with existing form state */}
          <PrimaryBtn onClick={goResult}>
            Try Again →
          </PrimaryBtn>

          {/* Phone escape hatch */}
          <p className="mt-6 text-white/35 text-[13px]">
            Or call us directly:{' '}
            <a href={PHONE_HREF} className="text-white/60 underline hover:text-white/80 transition-colors">
              {PHONE_DISPLAY}
            </a>
          </p>
        </div>
      </PageShell>
    );
  }

  // ── SUBMITTING — brief loading screen while we POST the lead ───
  if (pageState === 'submitting') {
    return (
      <div style={{ display: 'block', width: '100%', background: '#0C1322', minHeight: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>Setting things up…</p>
        </div>
      </div>
    );
  }

  // ── BOOKED — confirmation screen ──────────────────────────────
  if (pageState === 'booked' && bookedSlot) {
    const startDate = new Date(bookedSlot.startTime);
    const dateLine  = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeLine  = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
      <div style={{ display: 'block', width: '100%', background: '#0C1322' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>

          {/* Check circle */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(13,148,136,0.15)', border: '2px solid rgba(13,148,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <path d="M6 14l6 6 10-10" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{ color: '#ffffff', fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>
            You're booked{form.name ? `, ${form.name.split(' ')[0]}` : ''}!
          </h2>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{dateLine}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{timeLine}</p>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
            We'll send a confirmation text to {toE164(form.phone)}.
            Our team will reach out to confirm the details.
          </p>

          {submitError && (
            <p style={{ color: '#fbbf24', fontSize: 13, marginBottom: 16 }}>
              Note: {submitError}
            </p>
          )}

          <a
            href="/"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}
          >
            ← Back to home
          </a>
        </div>
        <ExpectationSection />
        <TrustSection />
      </div>
    );
  }

  // ── BOOKING — slot picker ─────────────────────────────────────
  if (pageState === 'booking') {
    const resolvedContactId = contactIdRef.current ?? contactId;
    console.error('[FUNNEL] booking page rendering — contactId:', resolvedContactId ?? 'null');

    // Safety net: goResult() already blocks this path, but if contactId is
    // somehow null here we cannot create a valid appointment — show recovery.
    if (!resolvedContactId) {
      console.error('[FUNNEL] ❌ booking reached with null contactId — showing recovery screen');
      return (
        <PageShell>
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center">
            <h2 className="text-display-sm font-black text-white mb-3">
              Something went wrong.
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-[380px] mb-8">
              We couldn&rsquo;t verify your profile. Please try again or call us directly.
            </p>
            <PrimaryBtn onClick={() => {
              isSubmitting.current = false;
              setPageState('form');
              setStep(3);
            }}>
              Try Again →
            </PrimaryBtn>
            <p className="mt-6 text-white/35 text-[13px]">
              Or call us:{' '}
              <a href={PHONE_HREF} className="text-white/60 underline hover:text-white/80 transition-colors">
                {PHONE_DISPLAY}
              </a>
            </p>
          </div>
        </PageShell>
      );
    }

    const phone = toE164(form.phone);

    return (
      <div style={{ display: 'block', width: '100%', background: '#0C1322', margin: 0, padding: 0 }}>
        <div style={{ display: 'block', width: '100%', paddingTop: '24px', paddingBottom: '64px' }}>

          {/* Status line */}
          <p style={{
            textAlign   : 'center',
            fontSize    : '15px',
            fontWeight  : 600,
            color       : '#ffffff',
            marginBottom: '20px',
            paddingLeft : '16px',
            paddingRight: '16px',
            lineHeight  : 1.4,
          }}>
            <span style={{ color: '#0D9488' }}>✓</span>{' '}
            {form.name
              ? `${form.name}, your home looks like a great fit.`
              : 'Your home looks like a great fit.'}
            {' '}<span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>Pick a time below.</span>
          </p>

          {/* Slot picker card */}
          <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
            <div
              className="w-full rounded-2xl border border-white/[0.08]"
              style={{
                background : 'rgba(255,255,255,0.022)',
                boxShadow  : '0 8px 40px rgba(0,0,0,0.28)',
                padding    : '28px 24px',
              }}
            >
              {/* SlotPicker (Phase 2) — temporarily replaced with GHL iframe until SlotPicker is deployed */}
              <iframe
                src={`https://api.leadconnectorhq.com/widget/booking/0fu9WVucPWOYhM0tSEGE?name=${encodeURIComponent(form.name)}&phone=${encodeURIComponent(phone)}`}
                style={{ width: '100%', minHeight: 520, border: 'none', borderRadius: 8, display: 'block' }}
                title="Schedule your free solar consultation"
              />
            </div>
          </div>

        </div>

        <ExpectationSection />
        <TrustSection />
      </div>
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
                  {/* Micro-momentum — shows once address has meaningful content */}
                  {form.address.trim().length >= 8 && (
                    <p className="text-[12px] font-medium mt-2" style={{ color: '#0D9488' }}>
                      ✓ Nice — I can already use that to estimate what solar could look like for your home.
                    </p>
                  )}
                </div>

                {/* ── TCPA SMS Consent ───────────────────────────── */}
                <div className="flex items-start gap-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4">
                  <input
                    type="checkbox"
                    id="gsi-consent"
                    checked={form.consent}
                    onChange={e => set('consent', e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="gsi-consent" className="text-[11px] text-[#6b7280] leading-relaxed cursor-pointer">
                    By checking this box, I agree to receive{' '}
                    <strong className="text-[#374151]">automated</strong> text messages from
                    KC Energy Advisors at the number above regarding my solar estimate.
                    Message frequency varies. Msg &amp; data rates may apply.
                    Reply STOP to opt out. Reply HELP for help.
                    Consent is not a condition of purchase.{' '}
                    <a href="/privacy" className="underline hover:text-[#111827] transition-colors">
                      Privacy Policy
                    </a>
                  </label>
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
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, ownsHome: 'yes' }))}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${form.ownsHome === 'yes' ? 'border-blue-500 bg-blue-50 text-[#1e40af]' : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'}`}
                    >
                      <span className="text-[13.5px] font-semibold block leading-tight">Yes, I own it</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, ownsHome: 'no' }))}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${form.ownsHome === 'no' ? 'border-blue-500 bg-blue-50 text-[#1e40af]' : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'}`}
                    >
                      <span className="text-[13.5px] font-semibold block leading-tight">No, I rent</span>
                    </button>
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
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, monthlyBill: opt.code }))}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${form.monthlyBill === opt.code ? 'border-blue-500 bg-blue-50 text-[#1e40af]' : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-[13.5px] font-semibold leading-tight">{opt.label}</span>
                          {opt.badge && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2 py-0.5 rounded-full flex-shrink-0">{opt.badge}</span>
                          )}
                        </span>
                      </button>
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
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, roofType: opt.code }))}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${form.roofType === opt.code ? 'border-blue-500 bg-blue-50 text-[#1e40af]' : 'border-[#d1d5db] bg-white text-[#374151] hover:border-[#6b7280] hover:bg-gray-50 hover:text-[#111827]'}`}
                      >
                        <span className="text-[13.5px] font-semibold leading-tight">{opt.label}</span>
                      </button>
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

              <PrimaryBtn
                onClick={goResult}
                disabled={!step3OK || !contactId || pageState === 'submitting'}
              >
                {pageState === 'submitting' ? 'Submitting…' : 'See My Options →'}
              </PrimaryBtn>
              {!contactId && pageState !== 'submitting' && (
                <p className="text-center text-[11px] text-[#9ca3af] mt-2">
                  Setting up your profile…
                </p>
              )}
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
