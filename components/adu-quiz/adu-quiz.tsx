'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CheckCircle2, Home, ShieldCheck, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseUsPhone } from '@/lib/leads/normalize';
import {
  DECISION_CONFIRM_LABEL,
  DECISION_NOTE,
  QUESTIONS,
  consentText,
  isValidZip,
  type Answers,
  type QuestionId,
} from '@/lib/adu-quiz/quiz';
import type { PublicConfig } from '@/lib/adu-quiz/config';
import {
  captureTracking,
  readMeasurement,
  scheduleTagLoad,
  track,
  trackingForSubmit,
  writeMeasurement,
  type TrackingConfig,
} from './tracking';

type Phase = 'hero' | 'quiz' | 'contact' | 'result';
type Result = { qualified: boolean; token: string | null; booked?: boolean };
type Saved = { id: string; phase: Phase; step: number; answers: Answers; startedAt: number; result?: Result };

const STORE = 'hqn-adu-quiz-v1';
const TOTAL = QUESTIONS.length; // contact is step TOTAL
const ADVANCE_MS = 220;

const btn =
  'inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--hq-cta)] px-8 py-3.5 text-base font-semibold text-[var(--hq-cta-ink)] shadow-[0_8px_24px_-8px_rgba(245,183,0,0.4)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:pointer-events-none disabled:opacity-60 sm:w-auto sm:min-w-56';
const field =
  'min-h-12 w-full rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-4 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';

function newId(): string {
  try { return crypto.randomUUID(); } catch { /* Very old browser. */ }
  const h = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}`;
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function AduQuiz({ config }: { config: PublicConfig }) {
  const uid = useId();
  const tracking: TrackingConfig = useMemo(
    () => ({ metaPixelId: config.metaPixelId, googleTagId: config.googleTagId, measurementMode: config.measurementMode }),
    [config.metaPixelId, config.googleTagId, config.measurementMode],
  );
  const consent = consentText(config.brandName);

  const [phase, setPhase] = useState<Phase>('hero');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [id, setId] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [ready, setReady] = useState(false);
  const [measure, setMeasure] = useState(config.measurementMode === 'opt_out');
  const [zipError, setZipError] = useState('');

  const [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '', website: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Restore progress (sessionStorage) and capture campaign attribution on load ---- */
  useEffect(() => {
    captureTracking();
    setMeasure(readMeasurement(config.measurementMode));
    scheduleTagLoad(tracking);
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? 'null') as Saved | null;
      if (saved && typeof saved.id === 'string' && saved.answers && typeof saved.step === 'number') {
        setId(saved.id); setAnswers(saved.answers); setStep(Math.min(Math.max(saved.step, 0), TOTAL));
        setStartedAt(saved.startedAt);
        setPhase(saved.phase === 'contact' || saved.phase === 'quiz' || saved.phase === 'result' ? saved.phase : 'hero');
        if (saved.result) setResult(saved.result);
      }
    } catch { /* Storage blocked: the quiz still works, a refresh just restarts it. */ }
    setReady(true);
  }, [config.measurementMode, tracking]);

  useEffect(() => {
    if (!ready || !id) return;
    try {
      const saved: Saved = { id, phase, step, answers, startedAt, ...(result ? { result } : {}) };
      sessionStorage.setItem(STORE, JSON.stringify(saved));
    } catch { /* Optional. */ }
  }, [ready, id, phase, step, answers, startedAt, result]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  /* Move focus to the new screen's heading so keyboard and screen-reader users land on it. */
  useEffect(() => {
    if (ready && phase !== 'hero') headingRef.current?.focus({ preventScroll: true });
    if (ready && phase !== 'hero') window.scrollTo({ top: 0 });
  }, [ready, phase, step]);

  const start = () => {
    const runId = id || newId();
    setId(runId);
    if (!startedAt) setStartedAt(Date.now());
    setPhase('quiz');
    if (step >= TOTAL) setStep(0);
    track(tracking, 'QuizStart', `${runId}:QuizStart`);
  };

  const question = QUESTIONS[Math.min(step, TOTAL - 1)];

  const goNext = useCallback((from: number) => {
    setPhase(from + 1 >= TOTAL ? 'contact' : 'quiz');
    setStep(from + 1);
  }, []);

  const answer = (qid: QuestionId, value: string, advance: boolean) => {
    const next: Answers = { ...answers, [qid]: value };
    if (qid === 'decision_makers' && value === 'just_me') delete next.decision_confirmed;
    setAnswers(next);
    track(tracking, 'QuizStep', `${id}:QuizStep:${step + 1}`, { step: step + 1 });
    if (advance) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const from = step;
      advanceTimer.current = setTimeout(() => goNext(from), ADVANCE_MS);
    }
  };

  const back = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (phase === 'contact') { setPhase('quiz'); setStep(TOTAL - 1); return; }
    if (step === 0) { setPhase('hero'); return; }
    setStep(step - 1);
  };

  const submitZip = (e: FormEvent) => {
    e.preventDefault();
    const zip = (answers.zip ?? '').trim();
    if (!isValidZip(zip)) { setZipError('Enter a 5-digit ZIP code.'); return; }
    setZipError('');
    answer('zip', zip, true);
  };

  /* ---- Contact submit ---- */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!contact.firstName.trim()) next.firstName = 'Enter your first name.';
    if (!contact.lastName.trim()) next.lastName = 'Enter your last name.';
    if (!parseUsPhone(contact.phone).ok) next.phone = 'Enter a valid US mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) next.email = 'Enter a valid email address.';
    if (!agree) next.consent = 'Please check the box to continue.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/adu-quiz/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: id,
          answers,
          contact: { firstName: contact.firstName.trim(), lastName: contact.lastName.trim(), email: contact.email.trim(), phone: contact.phone },
          consent: true,
          consentText: consent,
          pageUrl: `${location.origin}${location.pathname}`,
          tracking: trackingForSubmit(),
          measurement: readMeasurement(config.measurementMode),
          honeypot: contact.website,
          startedAt,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { qualified?: boolean; token?: string | null; error?: string; fieldErrors?: Record<string, string> };
      if (!res.ok) {
        if (data.fieldErrors) {
          const mapped: Record<string, string> = {};
          if (data.fieldErrors['contact.phone']) mapped.phone = data.fieldErrors['contact.phone'];
          if (data.fieldErrors['contact.email']) mapped.email = 'Enter a valid email address.';
          setErrors(mapped);
        }
        setSubmitError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      const qualified = data.qualified === true;
      track(tracking, 'Lead', `${id}:Lead`);
      if (qualified) track(tracking, 'QualifiedLead', `${id}:QualifiedLead`);
      setResult({ qualified, token: data.token ?? null });
      setPhase('result');
    } catch {
      setSubmitError('We could not reach the server. Your answers are saved on this device. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Booking confirmation: the calendar redirects (inside the iframe) to /adu-quiz/booked, which messages us ---- */
  const resultRef = useRef(result);
  resultRef.current = result;
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.data?.type !== 'adu-quiz-booked') return;
      const current = resultRef.current;
      if (!current?.qualified || current.booked) return;
      setResult({ ...current, booked: true });
      track(tracking, 'Schedule', `${id}:Schedule`);
      if (current.token) {
        void fetch('/api/adu-quiz/booked', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: id, token: current.token }),
        }).catch(() => undefined);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, tracking]);

  const progress = phase === 'contact' ? TOTAL : step;
  const pct = Math.round((progress / (TOTAL + 1)) * 100);

  /* ---------------------------------- Hero ---------------------------------- */
  if (phase === 'hero') {
    return (
      <section className="relative isolate overflow-hidden hq-grid" aria-labelledby={`${uid}-hero`}>
        <div className="hq-glow" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-3xl px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
          <h1 id={`${uid}-hero`} className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            What Would an ADU Cost on Your Lot?
          </h1>
          <p className="mt-5 text-pretty text-lg leading-8 text-[var(--hq-text-muted)] sm:text-xl">
            Answer a few quick questions and see your price range. Takes about 60 seconds.
          </p>
          <div className="mt-8">
            <button type="button" onClick={start} className={btn}>
              {ready && id && step > 0 ? 'Continue' : 'Start'}
            </button>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-[var(--hq-text-muted)] sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: 'Licensed local builders' },
              { icon: Home, label: 'Homeowners only' },
              { icon: UserCheck, label: 'Financing options available' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="size-5 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          {config.metaPixelId || config.googleTagId ? (
            <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--hq-text-dim)]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--hq-accent)]"
                checked={measure}
                onChange={(e) => { setMeasure(e.target.checked); writeMeasurement(e.target.checked); if (e.target.checked) scheduleTagLoad(tracking); }}
              />
              Allow optional advertising measurement
            </label>
          ) : null}
        </div>
      </section>
    );
  }

  /* ----------------------------- Quiz / contact / result frame ----------------------------- */
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10" aria-label="ADU price quiz">
      {phase !== 'result' ? (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={back}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-[var(--hq-text-muted)] hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Back
            </button>
            <p className="text-sm text-[var(--hq-text-dim)]" aria-hidden="true">
              {phase === 'contact' ? 'Last step' : `Question ${step + 1} of ${TOTAL}`}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={phase === 'contact' ? 'Last step' : `Question ${step + 1} of ${TOTAL}`}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--hq-surface-2)]"
          >
            <div className="h-full rounded-full bg-[var(--hq-cta)] transition-[width] duration-300" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>
      ) : null}

      {phase === 'quiz' ? (
        <div key={question.id}>
          <h2 ref={headingRef} tabIndex={-1} id={`${uid}-q`} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
            {question.title}
          </h2>
          {question.hint ? <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{question.hint}</p> : null}

          {question.type === 'zip' ? (
            <form onSubmit={submitZip} className="mt-6 space-y-4" noValidate>
              <label htmlFor={`${uid}-zip`} className="sr-only">ZIP code</label>
              <input
                id={`${uid}-zip`}
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[0-9]{5}"
                maxLength={5}
                value={answers.zip ?? ''}
                onChange={(e) => { setAnswers({ ...answers, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }); setZipError(''); }}
                aria-invalid={zipError ? true : undefined}
                aria-describedby={zipError ? `${uid}-zip-err` : undefined}
                placeholder="90210"
                className={cn(field, 'text-xl tracking-widest')}
              />
              {zipError ? <p id={`${uid}-zip-err`} role="alert" className="text-sm text-[var(--hq-bad)]">{zipError}</p> : null}
              <button type="submit" className={btn}>Continue</button>
            </form>
          ) : (
            <div role="group" aria-labelledby={`${uid}-q`} className="mt-6 grid gap-3">
              {question.options!.map((option) => {
                const selected = answers[question.id] === option.value;
                const needsConfirm = question.id === 'decision_makers' && option.value !== 'just_me';
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => answer(question.id, option.value, !needsConfirm)}
                    className={cn(
                      'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]',
                      selected
                        ? 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] text-[var(--hq-text)]'
                        : 'border-[var(--hq-line-strong)] bg-[var(--hq-surface)] text-[var(--hq-text)] hover:border-[var(--hq-accent-bright)]',
                    )}
                  >
                    <span>{option.label}</span>
                    {selected ? <Check className="size-5 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          )}

          {question.note ? <p className="mt-5 text-sm leading-6 text-[var(--hq-text-muted)]">{question.note}</p> : null}

          {question.id === 'decision_makers' && answers.decision_makers && answers.decision_makers !== 'just_me' ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] p-4 text-sm leading-6 text-[var(--hq-text)]">{DECISION_NOTE}</p>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text)]">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-[var(--hq-accent)]"
                  checked={answers.decision_confirmed === true}
                  onChange={(e) => setAnswers({ ...answers, decision_confirmed: e.target.checked })}
                />
                {DECISION_CONFIRM_LABEL}
              </label>
              <button type="button" className={btn} onClick={() => goNext(step)}>Continue</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'contact' ? (
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
            Where should we send your results?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">Last step. We use this to show your range and set up your free visit.</p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {(
              [
                ['firstName', 'First name', 'text', 'given-name', 'text'],
                ['lastName', 'Last name', 'text', 'family-name', 'text'],
                ['phone', 'Mobile phone', 'tel', 'tel-national', 'tel'],
                ['email', 'Email', 'email', 'email', 'email'],
              ] as const
            ).map(([key, label, type, auto, mode]) => (
              <div key={key}>
                <label htmlFor={`${uid}-${key}`} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">{label}</label>
                <input
                  id={`${uid}-${key}`}
                  type={type}
                  inputMode={mode === 'tel' ? 'tel' : mode === 'email' ? 'email' : 'text'}
                  autoComplete={auto}
                  value={contact[key]}
                  onChange={(e) => setContact({ ...contact, [key]: key === 'phone' ? formatPhone(e.target.value) : e.target.value })}
                  aria-invalid={errors[key] ? true : undefined}
                  aria-describedby={errors[key] ? `${uid}-${key}-err` : undefined}
                  className={field}
                />
                {errors[key] ? <p id={`${uid}-${key}-err`} className="mt-1.5 text-sm text-[var(--hq-bad)]">{errors[key]}</p> : null}
              </div>
            ))}
            {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input id={`${uid}-website`} type="text" tabIndex={-1} autoComplete="off" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} />
            </div>

            <div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--hq-text-muted)]">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={errors.consent ? `${uid}-consent-err` : undefined}
                  className="mt-1 size-5 shrink-0 accent-[var(--hq-accent)]"
                />
                <span>
                  {consent.split('See our Privacy Policy and Terms.')[0]}See our{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--hq-accent-bright)] underline">Privacy Policy</a> and{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--hq-accent-bright)] underline">Terms</a>.
                </span>
              </label>
              {errors.consent ? <p id={`${uid}-consent-err`} className="mt-1.5 text-sm text-[var(--hq-bad)]">{errors.consent}</p> : null}
            </div>

            <p className="text-sm leading-6 text-[var(--hq-text-dim)]">We connect homeowners with licensed local ADU builders.</p>

            {submitError ? <p role="alert" className="rounded-xl border border-[var(--hq-bad)]/60 p-3 text-sm leading-6 text-[var(--hq-bad)]">{submitError}</p> : null}
            <button type="submit" disabled={submitting} className={btn}>
              {submitting ? 'Sending…' : submitError ? 'Try again' : 'See my results'}
            </button>
          </form>
        </div>
      ) : null}

      {phase === 'result' && result ? (
        result.qualified ? (
          <QualifiedResult
            headingRef={headingRef}
            config={config}
            placement={answers.location as keyof PublicConfig["priceRanges"] | undefined}
            booked={!!result.booked}
            prefill={{ first: contact.firstName, last: contact.lastName, email: contact.email, phone: contact.phone }}
          />
        ) : (
          <div>
            <CheckCircle2 className="size-10 text-[var(--hq-accent-bright)]" aria-hidden="true" />
            <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
              Thanks{contact.firstName ? `, ${contact.firstName.trim()}` : ''}. We have your details.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--hq-text-muted)]">
              We are not able to schedule a feasibility visit for this project right now. We will keep your information on file
              and reach out if that changes or if we have resources that fit your situation.
            </p>
            <p className="mt-4 text-base leading-7 text-[var(--hq-text-muted)]">Have a great day, and thank you for your interest in building an ADU.</p>
          </div>
        )
      ) : null}
    </section>
  );
}

function QualifiedResult({
  headingRef, config, placement, booked, prefill,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  config: PublicConfig;
  placement?: keyof PublicConfig["priceRanges"];
  booked: boolean;
  prefill: { first: string; last: string; email: string; phone: string };
}) {
  const range = placement ? config.priceRanges[placement] : undefined;
  const hasRange = !!range && range.low > 0 && range.high >= range.low;
  const src = useMemo(() => {
    if (!config.bookingUrl) return '';
    const url = new URL(config.bookingUrl);
    if (prefill.first) url.searchParams.set('first_name', prefill.first.trim());
    if (prefill.last) url.searchParams.set('last_name', prefill.last.trim());
    if (prefill.email) url.searchParams.set('email', prefill.email.trim());
    const phone = parseUsPhone(prefill.phone);
    if (phone.ok) url.searchParams.set('phone', phone.e164);
    return url.toString();
  }, [config.bookingUrl, prefill.first, prefill.last, prefill.email, prefill.phone]);

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
        Great news. Here’s your estimated ADU range.
      </h2>
      <div className="mt-5 rounded-2xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] p-5">
        {hasRange ? (
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{money(range.low)} – {money(range.high)}</p>
        ) : (
          <p className="text-lg font-semibold leading-7">Your builder will confirm your price range at your free consultation.</p>
        )}
        <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">Estimate only. Final cost depends on your lot, plans, and permits.</p>
      </div>

      <p className="mt-5 text-base leading-7 text-[var(--hq-text-muted)]">
        Financing programs are available for qualified homeowners. Your builder will walk you through your options at your free consultation.
      </p>

      {booked ? (
        <p role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--hq-good)]/60 p-5 text-lg font-semibold leading-7">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-[var(--hq-good)]" aria-hidden="true" />
          You’re booked. Watch for a confirmation text.
        </p>
      ) : (
        <>
          <p className="mt-6 text-base font-semibold leading-7">
            Book your free ADU feasibility visit. Everyone on title and everyone involved in the decision should be present.
          </p>
          {src ? (
            <iframe
              title="Book your free ADU feasibility visit"
              src={src}
              loading="lazy"
              className="mt-4 h-[760px] w-full rounded-2xl border border-[var(--hq-line-strong)] bg-white"
            />
          ) : (
            <p className="mt-4 rounded-2xl border border-[var(--hq-line-strong)] p-5 text-sm leading-6 text-[var(--hq-text-muted)]">
              Our team will text you shortly to schedule your visit.
            </p>
          )}
        </>
      )}
    </div>
  );
}
