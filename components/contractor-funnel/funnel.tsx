'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarCheck, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CAPACITY_OPTIONS, PROJECT_VALUE_OPTIONS, ROLE_OPTIONS, SERVICE_OPTIONS, SOURCE_OPTIONS, TIMELINE_OPTIONS,
  answersSchema, contactSchema, type Answers, type CalendarInfo,
} from '@/lib/contractor-funnel/schema';
import { calendlyEmbedUrl } from '@/lib/funnels/schema';
import { loadAttribution } from './attribution';
import { MeasurementToggle, readMeasurementChoice, trackContractor } from './tracking';

type Draft = Partial<Answers>;
type Contact = { name: string; company: string; email: string; phone: string; website: string; contactConsent: boolean; marketingConsent: boolean };
type Outcome = {
  status: 'qualified' | 'needs_review';
  token: string | null;
  calendar: CalendarInfo | null;
  calendarConfigured?: boolean;
};

const STEPS = ['services', 'area', 'role', 'value', 'capacity', 'sources', 'timeline', 'contact'] as const;
type Step = (typeof STEPS)[number];
const DRAFT_KEY = 'hqn-contractor-draft';
const emptyContact: Contact = { name: '', company: '', email: '', phone: '', website: '', contactConsent: false, marketingConsent: false };

const TITLES: Record<Step, { q: string; hint?: string }> = {
  services: { q: 'What services does your business provide?', hint: 'Select all that apply.' },
  area: { q: 'Where do you serve homeowners?', hint: 'Cities, counties or ZIP codes all work.' },
  role: { q: 'What is your role?' },
  value: { q: 'What is your typical project value?' },
  capacity: { q: 'How many additional homeowner appointments could your team handle each month?' },
  sources: { q: 'How do you currently get customers?', hint: 'Select all that apply.' },
  timeline: { q: 'When would you want to start?' },
  contact: { q: 'Where should we reach you?' },
};

function newId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16));
}

export function ContractorFunnel({ pixelId, fallbackContactEmail }: { pixelId: string | null; fallbackContactEmail: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const submissionId = useRef<string>('');
  const startedAt = useRef<number>(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  // Restore non-contact answers (never contact details) after an accidental refresh.
  useEffect(() => {
    startedAt.current = Date.now();
    submissionId.current = newId();
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
      if (saved?.draft) setDraft(saved.draft);
      if (typeof saved?.stepIndex === 'number') setStepIndex(Math.min(saved.stepIndex, STEPS.length - 1));
      if (typeof saved?.submissionId === 'string') submissionId.current = saved.submissionId;
    } catch { /* Fresh start. */ }
    loadAttribution();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || outcome) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, stepIndex, submissionId: submissionId.current })); } catch { /* Optional. */ }
  }, [draft, stepIndex, hydrated, outcome]);

  useEffect(() => { headingRef.current?.focus({ preventScroll: false }); }, [stepIndex, outcome]);

  const step = STEPS[stepIndex];

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const pick = (field: keyof Answers) => {
      const r = answersSchema.shape[field].safeParse(draft[field]);
      if (!r.success) e[field] = r.error.issues[0]?.message ?? 'Please answer this question.';
    };
    if (step === 'services') {
      pick('services');
      if (draft.services?.includes('other') && !draft.serviceOtherText?.trim()) e.serviceOtherText = 'Tell us briefly what you do.';
    }
    if (step === 'area') pick('serviceArea');
    if (step === 'role') pick('role');
    if (step === 'value') pick('projectValue');
    if (step === 'capacity') pick('capacity');
    if (step === 'sources') pick('sources');
    if (step === 'timeline') pick('timeline');
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [draft, step]);

  const next = () => {
    if (!validateStep()) return;
    if (step === 'timeline') trackContractor('QualificationComplete', `${submissionId.current}:QualificationComplete`, pixelId);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => { setErrors({}); setSubmitError(null); setStepIndex((i) => Math.max(0, i - 1)); };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return; // Duplicate-submit guard (the server is idempotent too).
    const parsedAnswers = answersSchema.safeParse(draft);
    const parsedContact = contactSchema.safeParse(contact);
    if (!parsedContact.success || !parsedAnswers.success) {
      const e: Record<string, string> = {};
      if (!parsedContact.success) for (const i of parsedContact.error.issues) e[String(i.path[0])] ??= i.message;
      setErrors(e);
      if (!parsedAnswers.success) setSubmitError('Some earlier answers are missing. Use Back to complete them.');
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contractor-funnel/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionId.current,
          answers: parsedAnswers.data,
          contact: { ...contact, website: contact.website },
          attribution: loadAttribution(),
          measurement: readMeasurementChoice(),
          honeypot: honeypot.current?.value ?? '',
          startedAt: startedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries<string>(data.fieldErrors)) fe[k.replace(/^contact\./, '')] = v;
        setErrors(fe);
        setSubmitError(data.error ?? 'Please check your details and try again.');
        return;
      }
      if (!res.ok) {
        setSubmitError(data.error ?? 'We could not save your details just now. Please try again in a moment.');
        return;
      }
      trackContractor('Lead', `${submissionId.current}:Lead`, pixelId);
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Optional. */ }
      setOutcome(data as Outcome);
    } catch {
      setSubmitError('We could not reach our server. Check your connection and try again. Your answers are still here.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = outcome ? 100 : Math.round((stepIndex / STEPS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-16 pt-6 sm:pt-12">
      {!outcome && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--hq-text-muted)]">
            <span>Step {stepIndex + 1} of {STEPS.length}</span>
            <span>About 2 minutes</span>
          </div>
          <div
            role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}
            className="h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]"
          >
            <div className="h-full rounded-full bg-[var(--hq-accent)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress + 100 / STEPS.length}%` }} />
          </div>
        </div>
      )}

      <div className="hq-card p-6 sm:p-8">
        {outcome ? (
          <Result outcome={outcome} contact={contact} submissionId={submissionId.current} pixelId={pixelId} headingRef={headingRef} fallbackContactEmail={fallbackContactEmail} />
        ) : (
          <form onSubmit={step === 'contact' ? submit : (e) => { e.preventDefault(); next(); }} noValidate>
            <h1 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-[1.75rem]">
              {TITLES[step].q}
            </h1>
            {TITLES[step].hint && <p className="mt-2 text-sm text-[var(--hq-text-muted)]">{TITLES[step].hint}</p>}

            <div className="mt-6 space-y-3">
              {step === 'services' && (
                <>
                  <OptionGroup legend={TITLES.services.q} multi options={SERVICE_OPTIONS} value={draft.services ?? []} onChange={(v) => setDraft((d) => ({ ...d, services: v as Answers['services'] }))} error={errors.services} />
                  {draft.services?.includes('other') && (
                    <Field id="c-other" label="What do you do?" error={errors.serviceOtherText}>
                      <input id="c-other" className={inputCls} value={draft.serviceOtherText ?? ''} maxLength={120} onChange={(e) => setDraft((d) => ({ ...d, serviceOtherText: e.target.value }))} />
                    </Field>
                  )}
                </>
              )}
              {step === 'area' && (
                <Field id="c-area" label="Cities, counties or ZIP codes" error={errors.serviceArea}>
                  <textarea id="c-area" className={cn(inputCls, 'min-h-28 py-3')} value={draft.serviceArea ?? ''} maxLength={300} placeholder="e.g. Encino, Sherman Oaks, Ventura County, 91436" autoComplete="off"
                    onChange={(e) => setDraft((d) => ({ ...d, serviceArea: e.target.value }))} />
                </Field>
              )}
              {step === 'role' && <OptionGroup legend={TITLES.role.q} options={ROLE_OPTIONS} value={draft.role ?? ''} onChange={(v) => setDraft((d) => ({ ...d, role: v as Answers['role'] }))} error={errors.role} />}
              {step === 'value' && <OptionGroup legend={TITLES.value.q} options={PROJECT_VALUE_OPTIONS} value={draft.projectValue ?? ''} onChange={(v) => setDraft((d) => ({ ...d, projectValue: v as Answers['projectValue'] }))} error={errors.projectValue} />}
              {step === 'capacity' && <OptionGroup legend={TITLES.capacity.q} options={CAPACITY_OPTIONS} value={draft.capacity ?? ''} onChange={(v) => setDraft((d) => ({ ...d, capacity: v as Answers['capacity'] }))} error={errors.capacity} />}
              {step === 'sources' && <OptionGroup legend={TITLES.sources.q} multi options={SOURCE_OPTIONS} value={draft.sources ?? []} onChange={(v) => setDraft((d) => ({ ...d, sources: v as Answers['sources'] }))} error={errors.sources} />}
              {step === 'timeline' && <OptionGroup legend={TITLES.timeline.q} options={TIMELINE_OPTIONS} value={draft.timeline ?? ''} onChange={(v) => setDraft((d) => ({ ...d, timeline: v as Answers['timeline'] }))} error={errors.timeline} />}
              {step === 'contact' && (
                <ContactFields contact={contact} setContact={setContact} errors={errors} honeypot={honeypot} />
              )}
            </div>

            {submitError && (
              <div role="alert" className="mt-5 rounded-xl border border-[var(--hq-bad)]/50 bg-[var(--hq-bad)]/10 px-4 py-3 text-sm leading-6 text-[var(--hq-text)]">
                {submitError}
              </div>
            )}

            <div className="mt-8 flex items-center gap-3">
              {stepIndex > 0 && (
                <button type="button" onClick={back} disabled={submitting} className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--hq-line-strong)] px-5 text-sm font-semibold text-[var(--hq-text)] hover:bg-[var(--hq-surface-2)] disabled:opacity-60">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </button>
              )}
              <button type="submit" disabled={submitting || !hydrated} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--hq-accent)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--hq-accent-bright)] disabled:opacity-60">
                {submitting ? (<><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…</>) : step === 'contact' ? (<>{submitError ? 'Try again' : 'Check my fit'} <ArrowRight className="size-4" aria-hidden="true" /></>) : (<>Continue <ArrowRight className="size-4" aria-hidden="true" /></>)}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-1 text-xs text-[var(--hq-text-dim)]">
        <MeasurementToggle pixelId={pixelId} />
        <p className="flex items-start gap-2 leading-5"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Your answers go to the HomeQuote Network team only. No sales results are promised or implied.</p>
      </div>
    </div>
  );
}

/* ---- Inputs ---------------------------------------------------------------- */

const inputCls = 'block w-full min-h-12 rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] px-4 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus:border-[var(--hq-accent-bright)] focus:outline-none focus:ring-2 focus:ring-[var(--hq-accent)]/40';

function Field({ label, error, optional, children, id }: { label: string; error?: string; optional?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">
        {label} {optional && <span className="font-normal text-[var(--hq-text-dim)]">(optional)</span>}
      </label>
      {children}
      {error && <p role="alert" className="mt-1.5 text-sm text-[var(--hq-bad)]">{error}</p>}
    </div>
  );
}

function OptionGroup({ legend, options, value, onChange, multi, error }: {
  legend: string; options: readonly { value: string; label: string }[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; error?: string;
}) {
  const selected = Array.isArray(value) ? value : [value];
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="space-y-2.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <label key={o.value} className={cn(
              'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--hq-accent)]/60',
              on ? 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] text-[var(--hq-text)]' : 'border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-text)] hover:border-[var(--hq-text-dim)]',
            )}>
              <input
                type={multi ? 'checkbox' : 'radio'} name={name} value={o.value} checked={on} className="sr-only"
                onChange={() => onChange(multi ? (on ? selected.filter((s) => s !== o.value) : [...selected, o.value]) : o.value)}
              />
              <span aria-hidden="true" className={cn('flex size-5 shrink-0 items-center justify-center border-2', multi ? 'rounded-md' : 'rounded-full', on ? 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent)]' : 'border-[var(--hq-text-dim)]')}>
                {on && <span className={cn('block bg-white', multi ? 'size-2 rounded-sm' : 'size-2 rounded-full')} />}
              </span>
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--hq-bad)]">{error}</p>}
    </fieldset>
  );
}

function ContactFields({ contact, setContact, errors, honeypot }: {
  contact: Contact; setContact: React.Dispatch<React.SetStateAction<Contact>>; errors: Record<string, string>; honeypot: React.RefObject<HTMLInputElement | null>;
}) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setContact((c) => ({ ...c, [k]: v }));
  return (
    <>
      <Field id="c-name" label="Your name" error={errors.name}>
        <input id="c-name" className={inputCls} autoComplete="name" value={contact.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field id="c-company" label="Company" error={errors.company}>
        <input id="c-company" className={inputCls} autoComplete="organization" value={contact.company} onChange={(e) => set('company', e.target.value)} />
      </Field>
      <Field id="c-email" label="Business email" error={errors.email}>
        <input id="c-email" type="email" inputMode="email" className={inputCls} autoComplete="email" value={contact.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field id="c-phone" label="Phone" error={errors.phone}>
        <input id="c-phone" type="tel" inputMode="tel" className={inputCls} autoComplete="tel" value={contact.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field id="c-website" label="Website" optional error={errors.website}>
        <input id="c-website" inputMode="url" className={inputCls} autoComplete="url" placeholder="yourcompany.com" value={contact.website} onChange={(e) => set('website', e.target.value)} />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Leave this field blank<input ref={honeypot} name="company_url" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <p className="rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 px-4 py-3 text-sm leading-6 text-[var(--hq-text-muted)]">
        HomeQuote Network uses these details only to review your answers, contact you about this inquiry and, if you are a fit, to set up a call. We do not sell them.
        See our <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--hq-accent-bright)] underline">Privacy Policy</a>.
      </p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text)]">
        <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--hq-accent)]" checked={contact.contactConsent} onChange={(e) => set('contactConsent', e.target.checked)} aria-describedby={errors.contactConsent ? 'c-consent-err' : undefined} />
        <span>I agree that HomeQuote Network may contact me by phone, email or text about this inquiry. Message and data rates may apply. Reply STOP to opt out.</span>
      </label>
      {errors.contactConsent && <p id="c-consent-err" role="alert" className="text-sm text-[var(--hq-bad)]">{errors.contactConsent}</p>}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]">
        <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--hq-accent)]" checked={contact.marketingConsent} onChange={(e) => set('marketingConsent', e.target.checked)} />
        <span>Optional: also send me occasional HomeQuote Network updates and offers by email. You can unsubscribe at any time.</span>
      </label>
    </>
  );
}

/* ---- Result ---------------------------------------------------------------- */

type BookingState = 'idle' | 'saving' | 'booked' | 'record_failed';

function Result({ outcome, contact, submissionId, pixelId, headingRef, fallbackContactEmail }: {
  outcome: Outcome; contact: Contact; submissionId: string; pixelId: string | null; headingRef: React.RefObject<HTMLHeadingElement | null>; fallbackContactEmail: string;
}) {
  const [booking, setBooking] = useState<BookingState>('idle');
  const [bookingVerified, setBookingVerified] = useState(false);
  const [calendarSlow, setCalendarSlow] = useState(false);
  const calendarSeen = useRef(false);
  const cal = outcome.calendar;
  const embedSrc = useMemo(() => {
    if (!cal || cal.provider !== 'calendly') return null;
    try {
      // Name/email go only to the Calendly iframe (prefill); the visible page URL and our analytics never carry them.
      return calendlyEmbedUrl(cal.url, location.hostname, { name: contact.name, email: contact.email }, loadAttribution());
    } catch { return null; }
  }, [cal, contact.name, contact.email]);

  useEffect(() => {
    if (!embedSrc) return;
    const timer = setTimeout(() => { if (!calendarSeen.current) setCalendarSlow(true); }, 12000);
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== 'https://calendly.com') return;
      const type = event.data?.event;
      if (typeof type !== 'string' || !type.startsWith('calendly.')) return;
      calendarSeen.current = true;
      setCalendarSlow(false);
      if (type !== 'calendly.event_scheduled') return;
      const eventUri = event.data?.payload?.event?.uri;
      const inviteeUri = event.data?.payload?.invitee?.uri;
      if (typeof eventUri !== 'string' || typeof inviteeUri !== 'string' || !outcome.token) return;
      setBooking('saving');
      try {
        const res = await fetch('/api/contractor-funnel/booking', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId, token: outcome.token, eventUri, inviteeUri }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setBookingVerified(data.status === 'confirmed');
          setBooking('booked');
          trackContractor('Schedule', `${submissionId}:Schedule`, pixelId);
        } else setBooking('record_failed');
      } catch { setBooking('record_failed'); }
    };
    window.addEventListener('message', onMessage);
    return () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
  }, [embedSrc, outcome.token, submissionId, pixelId]);

  if (outcome.status === 'needs_review') {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--hq-good)]" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight outline-none">Thanks, we have your details.</h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]">
          We&rsquo;ll review your answers and contact you. We haven&rsquo;t booked a call yet, and a reply is not guaranteed to mean an appointment is available in your area.
        </p>
      </div>
    );
  }

  if (booking === 'booked') {
    return (
      <div className="text-center">
        <CalendarCheck className="mx-auto size-10 text-[var(--hq-good)]" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight outline-none">Your call is booked.</h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]">
          {bookingVerified
            ? 'We checked the booking with our calendar. Look for the calendar invitation in your email.'
            : 'The calendar reported your booking. Look for the calendar invitation in your email. If it does not arrive, reply to us at the address below.'}
        </p>
        {!bookingVerified && <p className="mt-2 text-sm text-[var(--hq-text-dim)]">{fallbackContactEmail}</p>}
      </div>
    );
  }

  if (!cal) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--hq-good)]" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold tracking-tight outline-none">Thanks, we have your details.</h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--hq-text-muted)]">
          You look like a good fit to talk. Online booking isn&rsquo;t available right now, so we&rsquo;ll contact you to schedule your call. Nothing is booked yet.
        </p>
      </div>
    );
  }

  const slow = calendarSlow && booking === 'idle';
  const fallbackLink = (
    <a href={cal.url} target="_blank" rel="noopener noreferrer"
      className={cn('mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold', embedSrc && !slow ? 'border border-[var(--hq-line-strong)] text-[var(--hq-text-muted)] hover:bg-[var(--hq-surface-2)]' : 'bg-[var(--hq-accent)] text-white hover:bg-[var(--hq-accent-bright)]')}>
      {embedSrc ? 'Calendar not loading? Open it in a new tab' : 'Open booking calendar'} <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  );

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold tracking-tight outline-none">Your details are saved. Pick a time for your call.</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
        {embedSrc ? 'Choose a time below. Nothing is scheduled until the calendar confirms it.' : 'Open the calendar to choose a time. This page can’t see bookings made there, so you’ll get your confirmation by email from the calendar.'}
      </p>

      {slow && (
        <>
          <p role="alert" className="mt-4 rounded-xl border border-[var(--hq-warn)]/50 bg-[var(--hq-warn)]/10 px-4 py-3 text-sm leading-6">
            The calendar is taking a while to load. You can open it in a new tab instead. Your details are already saved.
          </p>
          {fallbackLink}
        </>
      )}
      {embedSrc && (
        <div className="mt-5 overflow-hidden rounded-xl border border-[var(--hq-line-strong)] bg-white">
          <iframe title="Book a call with HomeQuote Network" src={embedSrc} className="h-[640px] w-full sm:h-[700px]" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      {booking === 'saving' && <p role="status" className="mt-3 text-sm text-[var(--hq-text-muted)]">Checking your booking…</p>}
      {booking === 'record_failed' && (
        <p role="alert" className="mt-3 rounded-xl border border-[var(--hq-warn)]/50 bg-[var(--hq-warn)]/10 px-4 py-3 text-sm leading-6">
          The calendar showed a booking, but we couldn&rsquo;t record it on our side. Check your email for the calendar&rsquo;s confirmation, and email {fallbackContactEmail} if you don&rsquo;t see one.
        </p>
      )}
      {!slow && fallbackLink}
    </div>
  );
}
