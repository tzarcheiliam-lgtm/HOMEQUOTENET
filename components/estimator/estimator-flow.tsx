'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { estimatorConsentText, submitEstimatorLead, type EstimatorLeadRequest } from '@/lib/estimator/lead-client';
import type { Answers, ContractorEstimatorConfig, EstimatorQuestion, EstimatorTemplate } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { LooksScreen } from './screens/looks-screen';
import { ContactScreen, ZipScreen } from './screens/lead-screens';
import { PackageScreen } from './screens/package-screen';
import { QuestionScreen } from './screens/question-screen';
import { ResultScreen, type LeadSuccess } from './screens/result-screen';
import { SizeDimensions } from './screens/size-dimensions';
import { LiveSummary } from './summary';
import { card, linkButton, primaryButton, secondaryButton } from './ui';
import {
  buildLeadRequest,
  contactErrors,
  customizeTargetId,
  detailsHidden,
  flowScreens,
  initialFlowState,
  nextScreenId,
  parseDimensions,
  pickOption,
  pickedPackage,
  prevScreenId,
  screenComplete,
  screenForErrorKey,
  type FlowState,
} from './use-estimator-flow';
import { CUSTOM_PACKAGE_ID } from '@/lib/estimator/types';

/** Error keys that belong to a field; anything else is shown as a general message. */
const FIELD_KEYS = new Set(['zip', 'homeowner', 'timeline', 'firstName', 'lastName', 'email', 'phone', 'consent', 'note', 'website']);

/** Start somewhere other than the first screen (tests and previews); never used by the live pages. */
export type EstimatorSeed = { screenId?: string; answers?: Answers; state?: Partial<FlowState>; result?: LeadSuccess };

/**
 * The page URL (with its UTM / click-id query, which attribution reads) and, only
 * when the visitor allowed advertising measurement, the Meta browser ids.
 */
function readTracking(measurement: boolean): EstimatorLeadRequest['tracking'] {
  try {
    const pageUrl = window.location.href.slice(0, 4000);
    if (!measurement) return { pageUrl };
    const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
    return {
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc'),
      eventId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined,
      pageUrl,
    };
  } catch {
    return undefined;
  }
}

export function EstimatorFlow({
  template,
  contractor,
  embedded = false,
  seed,
}: {
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  embedded?: boolean;
  seed?: EstimatorSeed;
}) {
  const gallery = contractor.gallery?.filter((g) => g.src) ?? [];
  const hasGallery = gallery.length > 0;
  const immediate = contractor.revealRange === 'immediately';

  const [state, setState] = useState<FlowState>(() => ({
    ...initialFlowState(seed?.answers, contractor.adMeasurement === 'opt_out'),
    ...seed?.state,
  }));
  const [screenId, setScreenId] = useState<string | undefined>(seed?.screenId);
  const [result, setResult] = useState<LeadSuccess | null>(seed?.result ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(false);
  const [focusErrorTick, setFocusErrorTick] = useState(0);

  const screens = useMemo(
    () => flowScreens(template, state.answers, { customize: state.customize, hasGallery }),
    [template, state.answers, state.customize, hasGallery],
  );
  const index = Math.max(0, screens.findIndex((s) => s.id === screenId));
  const current = screens[index];
  const dims = useMemo(
    () => parseDimensions(template, state.dimensions, state.knowDimensions),
    [template, state.dimensions, state.knowDimensions],
  );

  // Move focus to the new heading when the screen changes (not on first paint).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [current.id, result]);

  // After a failed submit, focus the first invalid field.
  useEffect(() => {
    if (focusErrorTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusErrorTick]);

  const update = (patch: Partial<FlowState>, clear: string[] = []) => {
    setState((s) => ({ ...s, ...patch }));
    if (clear.length) {
      setErrors((e) => {
        const next = { ...e };
        for (const key of clear) delete next[key];
        return next;
      });
    }
  };

  const onPick = (q: EstimatorQuestion, optionId: string) => setState((s) => pickOption(template, s, q, optionId));
  const goTo = (id: string | undefined) => {
    if (!id) return;
    setErrors({});
    setScreenId(id);
  };

  const submit = async () => {
    if (submittingRef.current) return;
    const local = contactErrors(state.contact);
    if (Object.keys(local).length) {
      setErrors(local);
      setFocusErrorTick((n) => n + 1);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    const res = await submitEstimatorLead(contractor.slug, buildLeadRequest(template, state, readTracking(state.measurement), estimatorConsentText(contractor.contractorName)));
    submittingRef.current = false;
    setSubmitting(false);
    if (res.ok) {
      setResult(res);
      return;
    }
    setErrors(res.errors);
    // A rejected ZIP, homeowner or timeline lives on the earlier screen.
    const owners = Object.keys(res.errors).map(screenForErrorKey);
    const target = owners.includes('contact') ? 'contact' : owners.find(Boolean);
    if (target && target !== current.id) setScreenId(target);
    setFocusErrorTick((n) => n + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (current.kind === 'contact') void submit();
    else if (screenComplete(current, state)) goTo(nextScreenId(screens, current.id));
  };

  /* ---- Package helpers ---- */
  const packageQ = template.questions.find((q) => q.role === 'package');
  const hidden = detailsHidden(template, state.answers, state.customize);
  const readyPackage = hidden && (pickedPackage(template, state.answers) ?? CUSTOM_PACKAGE_ID) !== CUSTOM_PACKAGE_ID;
  const customize = () => {
    const next = { ...state, customize: true };
    setState(next);
    goTo(customizeTargetId(template, next.answers, hasGallery));
  };

  const generalErrors = Object.entries(errors)
    .filter(([key]) => !FIELD_KEYS.has(key))
    .map(([, message]) => message);
  const fieldErrorCount = Object.keys(errors).filter((k) => FIELD_KEYS.has(k)).length;

  const backId = prevScreenId(screens, current.id);
  const nextLabel =
    current.kind === 'contact'
      ? submitting
        ? 'Sending…'
        : 'See my estimate'
      : current.kind === 'looks' && state.likedLooks.length === 0
        ? 'Skip'
        : 'Next';

  const showSummary = immediate && !result;
  // The screen count grows as answers reveal detail screens, so show the step without a
  // total and keep the bar from sliding backwards while moving forward.
  const stepText = `Step ${index + 1}`;
  const rawPercent = Math.round(((index + 1) / screens.length) * 100);
  const progress = useRef({ index, percent: rawPercent });
  if (progress.current.index !== index) {
    progress.current = { index, percent: index > progress.current.index ? Math.max(progress.current.percent, rawPercent) : rawPercent };
  }
  const percent = Math.min(100, progress.current.percent);

  return (
    <section
      aria-label={template.title}
      data-estimator={template.trade}
      className={cn('hq text-[var(--hq-text)]', embedded ? 'px-3 py-4 sm:px-5' : 'px-4 py-8 sm:py-12', showSummary && !embedded && 'pb-40 lg:pb-12')}
    >
      <div className={cn('mx-auto', showSummary && !embedded ? 'max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8' : 'max-w-2xl')}>
        <div className="min-w-0">
          {result ? null : (
            <div className="mb-5">
              <div className="flex items-center justify-between gap-3 text-xs text-[var(--hq-text-muted)]">
                <span>{stepText}</span>
                {!template.pricesConfirmed ? (
                  <span className="rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5">Example prices</span>
                ) : null}
              </div>
              <div
                role="progressbar"
                aria-label="Estimator progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={stepText}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--hq-accent-bright)] transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {!immediate ? <p className="mt-2 text-xs text-[var(--hq-text-dim)]">Your price range appears at the end.</p> : null}
            </div>
          )}

          {result ? (
            <div className={card}>
              <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-2xl font-semibold tracking-tight focus:outline-none">
                Your ballpark estimate
              </h2>
              {!template.pricesConfirmed ? (
                <p className="mb-4 inline-block rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5 text-xs text-[var(--hq-text-muted)]">
                  Example prices
                </p>
              ) : null}
              <ResultScreen
                template={template}
                contractor={contractor}
                result={result}
                firstName={state.contact.firstName.trim() || undefined}
                embedded={embedded}
              />
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className={card}>
              <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-2xl font-semibold tracking-tight focus:outline-none">
                {current.title}
              </h2>

              {current.kind === 'questions' && current.group === 'package' && packageQ ? (
                <PackageScreen
                  template={template}
                  question={current.questions.find((q) => q.role === 'package') ?? packageQ}
                  answers={state.answers}
                  onPick={(id) => onPick(packageQ, id)}
                  canCustomize={readyPackage}
                  onCustomize={customize}
                />
              ) : current.kind === 'questions' ? (
                <>
                  <QuestionScreen screen={current} answers={state.answers} onPick={onPick} showPrices={immediate} />
                  {current.questions.some((q) => q.role === 'size') ? (
                    <SizeDimensions
                      template={template}
                      enabled={state.knowDimensions}
                      onToggle={(on) => update({ knowDimensions: on })}
                      value={state.dimensions}
                      onChange={(dimensions) => update({ dimensions })}
                      hint={dims.hint}
                    />
                  ) : null}
                </>
              ) : current.kind === 'looks' ? (
                <LooksScreen
                  gallery={gallery}
                  liked={state.likedLooks}
                  onToggle={(src) =>
                    update({ likedLooks: state.likedLooks.includes(src) ? state.likedLooks.filter((x) => x !== src) : [...state.likedLooks, src] })
                  }
                />
              ) : current.kind === 'zip' ? (
                <ZipScreen state={state} errors={errors} onChange={(patch) => update(patch, Object.keys(patch))} />
              ) : (
                <ContactScreen
                  contractor={contractor}
                  contact={state.contact}
                  errors={errors}
                  onChange={(patch) => update({ contact: { ...state.contact, ...patch } }, Object.keys(patch))}
                  measurement={state.measurement}
                  onMeasurementChange={(measurement) => update({ measurement })}
                />
              )}

              {readyPackage && current.kind === 'questions' && current.group === 'other' ? (
                <p className="mt-4">
                  <button type="button" onClick={customize} className={linkButton}>
                    Customize this package
                  </button>
                </p>
              ) : null}

              <div role="alert" aria-live="assertive" className="empty:hidden">
                {fieldErrorCount > 0 && current.kind === 'contact' ? (
                  <p className="mt-4 text-sm text-[var(--hq-bad)]">Please fix the highlighted fields.</p>
                ) : null}
                {generalErrors.map((message) => (
                  <p key={message} className="mt-4 text-sm text-[var(--hq-bad)]">
                    {message}
                  </p>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                {backId ? (
                  <button type="button" onClick={() => goTo(backId)} className={secondaryButton}>
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit" disabled={!screenComplete(current, state) || submitting} className={primaryButton}>
                  {nextLabel}
                </button>
              </div>
            </form>
          )}
        </div>

        {showSummary ? <LiveSummary template={template} answers={state.answers} dimensions={dims.dimensions} embedded={embedded} /> : null}
      </div>
    </section>
  );
}
