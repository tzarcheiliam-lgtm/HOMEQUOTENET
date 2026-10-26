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
import {
  BUILD_STEPS,
  COLORS,
  EXTRAS,
  GOALS,
  MATERIALS,
  PLACEMENTS,
  SIZES,
  STYLES,
  designChips,
  describeDesign,
  isDesignComplete,
  type BuildId,
  type Design,
  type Option,
} from '@/lib/adu-quiz/design';
import type { PublicConfig } from '@/lib/adu-quiz/config';
import { AduPreview, usePrefersReducedMotion } from './adu-preview';
import {
  captureTracking,
  readMeasurement,
  scheduleTagLoad,
  track,
  trackingForSubmit,
  writeMeasurement,
  type TrackingConfig,
} from './tracking';

type Phase = 'hero' | 'step' | 'contact' | 'result';
type Estimate = { low: number; high: number } | null;
type Result = { qualified: boolean; token: string | null; estimate: Estimate; booked?: boolean };
type Saved = { id: string; phase: Phase; step: number; answers: Answers; startedAt: number; result?: Result };
type Step = { kind: 'build'; id: BuildId } | { kind: 'qual'; id: QuestionId };

/** The visitor's journey: six build steps (each updates the image), then the screening questions. */
const STEPS: Step[] = [
  ...BUILD_STEPS.map((s): Step => ({ kind: 'build', id: s.id })),
  ...QUESTIONS.map((q): Step => ({ kind: 'qual', id: q.id })),
];
const TOTAL = STEPS.length; // the contact step is index TOTAL
const FIRST_QUAL = BUILD_STEPS.length;

const STORE = 'hqn-adu-quiz-v2';
const ADVANCE_MS = 300;

const btn =
  'inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--hq-cta)] px-8 py-3.5 text-base font-semibold text-[var(--hq-cta-ink)] shadow-[0_8px_24px_-8px_rgba(245,183,0,0.4)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-56';
const field =
  'min-h-12 w-full rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-4 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
const optionBase =
  'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
const optionOn = 'border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] text-[var(--hq-text)]';
const optionOff = 'border-[var(--hq-line-strong)] bg-[var(--hq-surface)] text-[var(--hq-text)] hover:border-[var(--hq-accent-bright)]';

const HERO_DESIGN: Design = { placement: 'backyard', size: '1br', style: 'modern', color: 'sage', extras: ['landscaping'] };

function newId(): string {
  try { return crypto.randomUUID(); } catch { /* Very old browser. */ }
  const h = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}`;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const designOf = (a: Answers): Design => ({
  placement: a.placement, size: a.size, style: a.style, color: a.color, material: a.material, extras: a.extras, goal: a.goal,
});

function Chips({ design }: { design: Design }) {
  const chips = designChips(design);
  return (
    <div className="mt-1.5 flex min-h-6 flex-wrap items-center gap-1 sm:mt-2 sm:gap-1.5" aria-hidden="true">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hq-text-dim)]">Your ADU</span>
      {chips.length === 0 ? <span className="text-xs text-[var(--hq-text-dim)]">Make your first choice</span> : null}
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] px-2 py-px text-[11px] font-medium text-[var(--hq-text)] sm:px-2.5 sm:py-0.5 sm:text-xs">{c}</span>
      ))}
    </div>
  );
}

export function AduQuiz({ config }: { config: PublicConfig }) {
  const uid = useId();
  const reduced = usePrefersReducedMotion();
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
  const [revealing, setRevealing] = useState(false);

  const [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '', website: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const design = designOf(answers);

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
        setPhase(saved.phase === 'step' || saved.phase === 'contact' || saved.phase === 'result' ? saved.phase : 'hero');
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
    setPhase('step');
    if (step >= TOTAL) setStep(0);
    track(tracking, 'BuildStart', `${runId}:BuildStart`);
  };

  const goNext = useCallback((from: number) => {
    const next = from + 1;
    if (next === FIRST_QUAL) {
      // The design is done: the build half ends and the screening half begins.
      track(tracking, 'DesignComplete', `${id}:DesignComplete`);
      track(tracking, 'QuizStart', `${id}:QuizStart`);
    }
    setPhase(next >= TOTAL ? 'contact' : 'step');
    setStep(next);
  }, [id, tracking]);

  const advance = (from: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => goNext(from), reduced ? 120 : ADVANCE_MS);
  };

  const logStep = (s: Step, n: number, choice?: string) => {
    if (s.kind === 'build') track(tracking, 'BuildStep', `${id}:BuildStep:${n}`, { step: n, choice });
    else track(tracking, 'QuizStep', `${id}:QuizStep:${n - FIRST_QUAL}`, { step: n - FIRST_QUAL });
  };

  /** Records a single-choice answer, logs the step and (optionally) moves on after a beat so the image change is seen. */
  const answer = (key: string, value: string, auto = true) => {
    const next: Answers = { ...answers, [key]: value } as Answers;
    if (key === 'decision_makers' && value === 'just_me') delete next.decision_confirmed;
    setAnswers(next);
    logStep(STEPS[step], step + 1, STEPS[step].kind === 'build' ? value : undefined);
    if (auto) advance(step);
  };

  const back = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (phase === 'contact') { setPhase('step'); setStep(TOTAL - 1); return; }
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

  /* ---- Contact submit (the reveal) ---- */
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
      const data = (await res.json().catch(() => ({}))) as { qualified?: boolean; token?: string | null; estimate?: Estimate; error?: string; fieldErrors?: Record<string, string> };
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
      setRevealing(true);
      setResult({ qualified, token: data.token ?? null, estimate: data.estimate ?? null });
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

  /* ---- Reveal: start blurred, then unblur on the next frame ---- */
  const [unblurred, setUnblurred] = useState(true);
  useEffect(() => {
    if (phase !== 'result' || !revealing) { setUnblurred(true); return; }
    setUnblurred(false);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setUnblurred(true)));
    const done = setTimeout(() => setRevealing(false), 900);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [phase, revealing]);

  const current = STEPS[Math.min(step, TOTAL - 1)];
  const progress = phase === 'contact' ? TOTAL : step;
  const pct = Math.round((progress / (TOTAL + 1)) * 100);
  const progressText = phase === 'contact'
    ? 'Last step'
    : current.kind === 'build' ? `Design step ${step + 1} of ${BUILD_STEPS.length}` : `Question ${step - FIRST_QUAL + 1} of ${QUESTIONS.length}`;
  const description = describeDesign(design);

  /* ---------------------------------- Hero ---------------------------------- */
  if (phase === 'hero') {
    return (
      <section className="relative isolate overflow-hidden hq-grid" aria-labelledby={`${uid}-hero`}>
        <div className="hq-glow" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-2">
          <div>
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
            <ul className="mt-8 grid gap-3 text-sm text-[var(--hq-text-muted)] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
          <div className="order-last"><AduPreview design={HERO_DESIGN} /></div>
        </div>
      </section>
    );
  }

  /* ------------------------------ Result (the reveal) ------------------------------ */
  if (phase === 'result' && result) {
    return (
      <section className="mx-auto w-full max-w-3xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10" aria-label="Your ADU">
        <AduPreview design={design} locked={!unblurred} unlocking={revealing} />
        <Chips design={design} />
        <p className="sr-only" role="status">{description}</p>
        {result.qualified ? (
          <QualifiedResult headingRef={headingRef} config={config} estimate={result.estimate} booked={!!result.booked}
            prefill={{ first: contact.firstName, last: contact.lastName, email: contact.email, phone: contact.phone }} />
        ) : (
          <div className="mt-6">
            <CheckCircle2 className="size-10 text-[var(--hq-accent-bright)]" aria-hidden="true" />
            <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
              Thanks{contact.firstName ? `, ${contact.firstName.trim()}` : ''}. Here’s your design.
            </h2>
            <EstimateBox estimate={result.estimate} />
            <p className="mt-5 text-base leading-7 text-[var(--hq-text-muted)]">
              We are not able to schedule a feasibility visit for this project right now. We will keep your design and details on file
              and reach out if that changes or if we have resources that fit your situation.
            </p>
            <p className="mt-4 text-base leading-7 text-[var(--hq-text-muted)]">Thank you for your interest in building an ADU.</p>
          </div>
        )}
      </section>
    );
  }

  /* ------------------------------ Build + screening + contact: split screen ------------------------------ */
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8" aria-label="ADU designer">
      <div className="lg:grid lg:grid-cols-[55fr_45fr] lg:items-start lg:gap-10 lg:pt-8">
        {/* Preview: pinned to the top on phones, sticky beside the questions on desktop. */}
        <div className="sticky top-0 z-30 -mx-5 border-b border-[var(--hq-line)] bg-[var(--hq-bg)] px-5 pb-1.5 pt-2 [--adu-max-h:27dvh] sm:-mx-8 sm:px-8 lg:top-6 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:[--adu-max-h:2000px]">
          <AduPreview design={design} locked={phase === 'contact'} />
          <Chips design={design} />
          <p className="mt-1 flex items-center gap-2 text-[11px] text-[var(--hq-text-dim)] sm:text-xs" aria-hidden="true">
            <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-[var(--hq-surface-2)]">
              <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--hq-cta)]" style={{ width: `${Math.min(100, (designChips(design).length / 8) * 100)}%`, transition: reduced ? undefined : 'width 300ms ease' }} />
            </span>
            {phase === 'contact' ? 'Your price is ready' : 'Your estimate updates as you build'}
          </p>
          <p className="sr-only" aria-live="polite" role="status">{phase === 'step' && current.kind === 'build' ? description : ''}</p>
        </div>

        <div className="pt-5 lg:pt-0">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={back}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-[var(--hq-text-muted)] hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </button>
              <p className="text-sm text-[var(--hq-text-dim)]" aria-hidden="true">{progressText}</p>
            </div>
            <div
              role="progressbar"
              aria-label="Progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-valuetext={progressText}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--hq-surface-2)]"
            >
              <div className="h-full rounded-full bg-[var(--hq-cta)] transition-[width] duration-300" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          </div>

          {phase === 'step' ? StepPanel() : ContactPanel()}
        </div>
      </div>
    </section>
  );

  /* ---- the current step ---- */
  function StepPanel() {
    if (current.kind === 'build') return BuildPanel();
    return QualPanel();
  }

  function BuildPanel() {
    const meta = BUILD_STEPS[step];
    const single = (list: readonly Option[], key: BuildId, detail = true) => (
      <div role="group" aria-labelledby={`${uid}-q`} className="mt-6 grid gap-3">
        {list.map((o) => {
          const selected = (answers as Record<string, unknown>)[key] === o.value;
          return (
            <button key={o.value} type="button" aria-pressed={selected} onClick={() => answer(key, o.value)} className={cn(optionBase, selected ? optionOn : optionOff)}>
              <span>
                <span className="block">{o.label}</span>
                {detail && o.note ? <span className="mt-0.5 block text-sm font-normal text-[var(--hq-text-muted)]">{o.note}</span> : null}
              </span>
              {selected ? <Check className="size-5 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    );

    return (
      <div key={`build-${current.id}`}>
        <h2 ref={headingRef} tabIndex={-1} id={`${uid}-q`} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{meta.title}</h2>
        {meta.hint ? <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{meta.hint}</p> : null}

        {current.id === 'placement' ? single(PLACEMENTS, 'placement') : null}
        {current.id === 'size' ? single(SIZES, 'size') : null}
        {current.id === 'style' ? single(STYLES, 'style') : null}
        {current.id === 'goal' ? single(GOALS, 'goal', false) : null}

        {current.id === 'color' ? (
          <div className="mt-6 space-y-6">
            <div role="group" aria-label="Exterior color" className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
              {COLORS.map((c) => {
                const selected = answers.color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={c.label}
                    onClick={() => { setAnswers({ ...answers, color: c.value }); }}
                    className={cn('flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]', selected ? optionOn : optionOff)}
                  >
                    <span className="flex size-8 items-center justify-center rounded-full border border-white/40" style={{ backgroundColor: c.hex }}>
                      {selected ? <Check className="size-4" style={{ color: c.trim === '#3b4048' ? '#3b4048' : '#fff' }} aria-hidden="true" /> : null}
                    </span>
                    <span aria-hidden="true">{c.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--hq-text)]">Material <span className="font-normal text-[var(--hq-text-muted)]">(optional)</span></p>
              <div role="group" aria-label="Material" className="flex flex-wrap gap-2">
                {MATERIALS.map((m) => {
                  const selected = answers.material === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { const next = { ...answers }; if (selected) delete next.material; else next.material = m.value; setAnswers(next); }}
                      className={cn('min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]', selected ? optionOn : optionOff)}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" className={btn} disabled={!answers.color} onClick={() => { logStep(current, step + 1, `${answers.color}${answers.material ? `:${answers.material}` : ''}`); goNext(step); }}>Continue</button>
          </div>
        ) : null}

        {current.id === 'extras' ? (
          <div className="mt-6 space-y-6">
            <div role="group" aria-labelledby={`${uid}-q`} className="grid gap-3">
              {EXTRAS.map((x) => {
                const selected = (answers.extras ?? []).includes(x.value);
                return (
                  <button
                    key={x.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const set = new Set(answers.extras ?? []);
                      if (selected) set.delete(x.value); else set.add(x.value);
                      setAnswers({ ...answers, extras: EXTRAS.map((e) => e.value).filter((v) => set.has(v)) });
                    }}
                    className={cn(optionBase, selected ? optionOn : optionOff)}
                  >
                    <span>{x.label}</span>
                    {selected ? <Check className="size-5 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            <button type="button" className={btn} onClick={() => { const extras = answers.extras ?? []; setAnswers({ ...answers, extras }); logStep(current, step + 1, extras.join(',') || 'none'); goNext(step); }}>
              {(answers.extras ?? []).length ? 'Continue' : 'Skip, no extras'}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function QualPanel() {
    const q = QUESTIONS.find((x) => x.id === current.id)!;
    return (
      <div key={q.id}>
        {step === FIRST_QUAL ? (
          <p className="mb-4 rounded-xl border border-[var(--hq-accent-bright)]/50 bg-[var(--hq-accent-glow)] p-4 text-sm font-medium leading-6 text-[var(--hq-text)]">
            Nice design! A few last questions so we can match you with the right licensed builder.
          </p>
        ) : null}
        <h2 ref={headingRef} tabIndex={-1} id={`${uid}-q`} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{q.title}</h2>
        {q.hint ? <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{q.hint}</p> : null}

        {q.type === 'zip' ? (
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
            {q.options!.map((option) => {
              const selected = answers[q.id] === option.value;
              const needsConfirm = q.id === 'decision_makers' && option.value !== 'just_me';
              return (
                <button key={option.value} type="button" aria-pressed={selected} onClick={() => answer(q.id, option.value, !needsConfirm)} className={cn(optionBase, selected ? optionOn : optionOff)}>
                  <span>{option.label}</span>
                  {selected ? <Check className="size-5 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        )}

        {q.note ? <p className="mt-5 text-sm leading-6 text-[var(--hq-text-muted)]">{q.note}</p> : null}

        {q.id === 'decision_makers' && answers.decision_makers && answers.decision_makers !== 'just_me' ? (
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
    );
  }

  function ContactPanel() {
    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
          Your ADU is ready. Where should we send your price?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">Enter your details to unlock your design and your estimated price range.</p>
        {!isDesignComplete(design) ? <p className="mt-2 text-sm text-[var(--hq-bad)]">Some design choices are missing. Use Back to finish your design.</p> : null}
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
            {submitting ? 'Unlocking…' : submitError ? 'Try again' : 'Unlock my design and price'}
          </button>
        </form>
      </div>
    );
  }
}

function EstimateBox({ estimate, qualified = false }: { estimate: Estimate; qualified?: boolean }) {
  const has = !!estimate && estimate.low > 0 && estimate.high >= estimate.low;
  return (
    <div className="mt-5 rounded-2xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] p-5">
      {has ? (
        <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{money(estimate!.low)} – {money(estimate!.high)}</p>
      ) : (
        <p className="text-lg font-semibold leading-7">
          {qualified ? 'Your builder will confirm your price range at your free consultation.' : 'We will share a price range for your design when we follow up.'}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">Estimate only. Final cost depends on your lot, plans, and permits.</p>
    </div>
  );
}

function QualifiedResult({
  headingRef, config, estimate, booked, prefill,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  config: PublicConfig;
  estimate: Estimate;
  booked: boolean;
  prefill: { first: string; last: string; email: string; phone: string };
}) {
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
    <div className="mt-6">
      <h2 ref={headingRef} tabIndex={-1} className="text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">
        Great news. Here’s your estimated ADU range.
      </h2>
      <EstimateBox estimate={estimate} qualified />

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
