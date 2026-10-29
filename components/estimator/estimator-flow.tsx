'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { estimatorConsentText, submitEstimatorLead, type EstimatorLeadRequest } from '@/lib/estimator/lead-client';
import type { Answers, ContractorEstimatorConfig, EstimatorQuestion, EstimatorTemplate } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { optionLabeler, previewAnswers, scrollDelta } from './builder';
import { getTradeBuilder, type ExampleMedia } from './builders';
import { Loader2 } from 'lucide-react';
import { flowStages, rewardSteps, stageFraction, unlockCopy, type FlowPhase, type PhotoProgress } from './builder-progress';
import { BuilderStyles } from './motion';
import { ScenePanel } from './scene/scene-panel';
import { DesignList, ResultScene } from './screens/design-result';
import { LooksScreen } from './screens/looks-screen';
import { ContactScreen, ZipScreen } from './screens/lead-screens';
import { PackageScreen } from './screens/package-screen';
import { QuestionScreen } from './screens/question-screen';
import { ResultScreen, type LeadSuccess } from './screens/result-screen';
import { SizeDimensions } from './screens/size-dimensions';
import { UnlockPreview } from './screens/unlock-preview';
import { RewardTracker } from './shell/reward-tracker';
import { StageStepper } from './shell/stage-stepper';
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

/**
 * Scroll the builder's top (the picture, with the result card under it) to
 * just under the site header and resolve when the scroll has finished, or at
 * once when it is already there or motion is reduced. Never waits long.
 */
function scrollToReveal(section: HTMLElement | null): Promise<void> {
  if (!section || typeof window === 'undefined') return Promise.resolve();
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const delta = section.getBoundingClientRect().top - margin;
  if (Math.abs(delta) < 4) return Promise.resolve();
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', finish);
      clearTimeout(timer);
      resolve();
    };
    // scrollend where supported; a time cap everywhere else (a smooth scroll this long takes about half a second).
    const timer = setTimeout(finish, smooth ? 650 : 0);
    if (smooth) window.addEventListener('scrollend', finish, { once: true });
    section.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  });
}

/**
 * Switch the browser's scroll anchoring off for the whole page for a moment:
 * when the form is swapped for the (taller) result, anchoring would keep
 * whatever it picked (often the footer) in place and nudge the page down
 * for a frame. Restored shortly after.
 */
function holdScrollAnchoring() {
  const root = document.documentElement;
  const before = root.style.overflowAnchor;
  root.style.overflowAnchor = 'none';
  setTimeout(() => {
    root.style.overflowAnchor = before;
  }, 1500);
}

/** The photo's arrival is announced by the picture's own status line; the tracker stays quiet about it. */
const QUIET_REWARDS: readonly string[] = ['photo'];

/** Hover-intent delays: a quick sweep across tiles does not flicker the picture. */
const PREVIEW_IN_MS = 70;
const PREVIEW_OUT_MS = 140;

/**
 * The homeowner estimator, one screen at a time. For a trade with a live
 * builder adapter (getTradeBuilder: pool, bathroom) it is a live builder: the
 * picture of their project (ScenePanel, drawn by the adapter: the top-down
 * pool, the eye-level bathroom) sits beside the questions on desktop and
 * pinned above them on phones, redraws on every pick,
 * previews an option on hover or keyboard focus, and becomes the finished
 * design on the result (save as PNG, share, and the realistic photo, which
 * starts by itself when the lead response carries a render token).
 * Progress reads as named stages (StageStepper) and as rewards being earned
 * (RewardTracker: Design, then Price and, with renders on, the realistic
 * photo); the ZIP and contact screens are the "unlock" step, with a locked
 * preview of what they get. Prices never reach this screen before the lead
 * is sent: the server's estimate comes back with the lead response.
 */
export function EstimatorFlow({
  template,
  contractor,
  embedded = false,
  rendersEnabled = false,
  example,
  seed,
}: {
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  embedded?: boolean;
  /** See EstimatorProps.rendersEnabled. */
  rendersEnabled?: boolean;
  /** See EstimatorProps.example. */
  example?: ExampleMedia | null;
  seed?: EstimatorSeed;
}) {
  const gallery = contractor.gallery?.filter((g) => g.src) ?? [];
  const hasGallery = gallery.length > 0;
  const immediate = contractor.revealRange === 'immediately';
  // The trade's adapter (everything that differs between pool and bathroom); null = the plain flow.
  const trade = getTradeBuilder(template.trade);
  const builder = trade !== null;

  const [state, setState] = useState<FlowState>(() => ({
    ...initialFlowState(seed?.answers, contractor.adMeasurement === 'opt_out'),
    ...seed?.state,
  }));
  const [screenId, setScreenId] = useState<string | undefined>(seed?.screenId);
  const [result, setResult] = useState<LeadSuccess | null>(seed?.result ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [night, setNight] = useState(false);
  // How the realistic photo is doing on the result (reported by ResultScene, for the reward tracker).
  const [photo, setPhoto] = useState<PhotoProgress>(() => (rendersEnabled && seed?.result?.renderToken ? 'pending' : 'none'));
  const [preview, setPreview] = useState<{ q: EstimatorQuestion; optionId: string } | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [focusErrorTick, setFocusErrorTick] = useState(0);
  const formId = `${useId()}-questions`;

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
  const labeler = useMemo(() => optionLabeler(template), [template]);
  // Phones pin the picture over the questions; on the ZIP and contact screens it scrolls away
  // instead, so the on-screen keyboard never hides the field being typed in (WCAG 2.4.11).
  const pinned = builder && !result && (current.kind === 'questions' || current.kind === 'looks');
  const focus = trade && current.kind === 'questions' && current.questions.some((q) => trade.closeUpIds.has(q.id)) ? 'close' : 'overview';

  // Move focus to the new heading when the screen changes (not on first paint). With the live
  // builder the browser's own focus scroll would tuck the heading under the pinned picture, so
  // scroll the new screen (or, for the result, the finished design) just below whatever is pinned.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const heading = headingRef.current;
    if (!heading) return;
    if (!builder) {
      heading.focus();
      return;
    }
    heading.focus({ preventScroll: true });
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (result) {
      // The reveal: submit() already scrolled here before showing the result; this only covers a result
      // that appears some other way. Never a second smooth scroll (scroll-margin clears the site header).
      const section = sectionRef.current;
      if (section && Math.abs(section.getBoundingClientRect().top - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0)) > 4) {
        section.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
      return;
    }
    const form = formRef.current;
    const pin = pinRef.current;
    if (!form) return;
    const formBox = form.getBoundingClientRect();
    const pinBox = pin?.getBoundingClientRect();
    const stacked = pinBox ? pinBox.right > formBox.left && pinBox.left < formBox.right : false;
    // Side by side (desktop) the progress above the form stays in view too. Phones spend that room on the
    // question, except on the unlock screens (nothing pinned), where seeing "Design done" is the point.
    const targetBox = (!stacked || !pinned) && progressRef.current ? progressRef.current.getBoundingClientRect() : formBox;
    // The site header (top-16 / sm:top-20 below; none in the embed).
    let offset = embedded ? 0 : window.matchMedia?.('(min-width: 640px)').matches ? 80 : 64;
    if (pin && pinBox && pinned) {
      // Stacked (phones): clear the whole pinned picture. Side by side: clear only its sticky top (the site header).
      offset = stacked ? pinBox.bottom : parseFloat(getComputedStyle(pin).top) || offset;
    }
    const delta = scrollDelta(targetBox.top, window.innerHeight, offset + 12);
    if (delta !== null) window.scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on screen changes only; pinned/embedded follow from them
  }, [current.id, result, builder]);

  // After a failed submit, focus the first invalid field.
  useEffect(() => {
    if (focusErrorTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusErrorTick]);

  useEffect(() => () => clearTimeout(previewTimer.current), []);

  /* ---- Live preview (hover / keyboard focus) ---- */
  const endPreview = () => {
    clearTimeout(previewTimer.current);
    setPreview(null);
  };
  const requestPreview = (q: EstimatorQuestion, optionId: string | null) => {
    if (!trade || !trade.isVisual(q)) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreview(optionId ? { q, optionId } : null), optionId ? PREVIEW_IN_MS : PREVIEW_OUT_MS);
  };
  const ghost = useMemo(() => {
    if (!preview || !trade) return null;
    const answers = previewAnswers(template, state.answers, preview.q, preview.optionId, trade.isVisual);
    if (!answers) return null;
    const label = trade.optionPhrase(preview.q.role === 'package' ? 'package' : preview.q.id, preview.optionId, labeler);
    return { answers, label };
  }, [preview, template, state.answers, labeler, trade]);

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

  const onPick = (q: EstimatorQuestion, optionId: string) => {
    // The pick is now the real answer: drop the ghost so the change chip shows it.
    endPreview();
    setState((s) => pickOption(template, s, q, optionId));
  };
  const goTo = (id: string | undefined) => {
    if (!id) return;
    endPreview();
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
    // The live builder scrolls once, to where the reveal happens, BEFORE swapping the form for the result:
    // the price then counts up in a page that is standing still, and nothing on screen jumps.
    if (res.ok && builder) {
      await scrollToReveal(sectionRef.current);
      holdScrollAnchoring();
    }
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
  // The live builder keeps the price for the end and makes the lead screens the "unlock" step
  // (with revealRange "immediately" the range is live all along, so there is nothing to unlock).
  const unlocking = builder && !immediate;
  const unlock = unlockCopy(rendersEnabled, trade?.copy.subject);
  const nextLabel =
    current.kind === 'contact'
      ? unlocking
        ? submitting
          ? unlock.submitting
          : unlock.submit
        : submitting
          ? 'Sending…'
          : 'See my estimate'
      : current.kind === 'looks' && state.likedLooks.length === 0
        ? 'Skip'
        : 'Next';
  // The live builder names the unlock step for what it gives them.
  const heading = unlocking && current.kind === 'zip' ? unlock.zipTitle : unlocking && current.kind === 'contact' ? unlock.contactTitle : current.title;

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
  // Live builder: named stages and the rewards being earned.
  const { stages, stageOf } = useMemo(() => flowStages(screens, trade?.copy.stageLabel), [screens, trade]);
  const stagePart = stageFraction(screens, stageOf, current.id);
  const flowPhase: FlowPhase = result ? 'result' : current.kind === 'zip' || current.kind === 'contact' ? 'unlock' : 'design';
  const rewards = useMemo(() => rewardSteps(flowPhase, rendersEnabled, photo), [flowPhase, rendersEnabled, photo]);
  const examplePrices = !template.pricesConfirmed ? (
    <span className="shrink-0 rounded-full border border-[var(--hq-line-strong)] px-2.5 py-0.5 text-xs text-[var(--hq-text-muted)]">Example prices</span>
  ) : null;
  // Slide direction of the screen change, fixed when the index changes (so a re-render never replays it).
  const slide = useRef({ index, className: 'eb-fwd' });
  if (slide.current.index !== index) slide.current = { index, className: index > slide.current.index ? 'eb-fwd' : 'eb-back' };

  // The finished design (result only): its spec names the heading, its summary is the "Your design" list.
  const resultSpec = useMemo(
    () => (trade && result ? trade.buildSpec(template, { answers: state.answers, dimensions: dims.dimensions }) : null),
    [trade, result, template, state.answers, dims.dimensions],
  );
  const designItems = useMemo(() => (trade && resultSpec !== null ? trade.designSummary(resultSpec, labeler) : []), [trade, resultSpec, labeler]);

  const unlockPreview = unlocking ? (
    <UnlockPreview
      template={template}
      builder={trade ?? undefined}
      answers={state.answers}
      dimensions={dims.dimensions}
      rendersEnabled={rendersEnabled}
      promise={unlock.promise}
    />
  ) : undefined;

  /* ---- Layout ---- */
  const container = builder
    ? 'max-w-7xl lg:grid lg:grid-cols-[minmax(0,57fr)_minmax(0,43fr)] lg:items-start lg:gap-8 xl:gap-10'
    : showSummary && !embedded
      ? 'max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8'
      : 'max-w-2xl';
  // Phones: the picture is pinned under the site header (top of the frame when embedded), full
  // bleed, capped at ~42% of the screen height. Desktop: sticky in the left column.
  const scenePin = embedded
    ? 'sticky top-0 z-30 -mx-3 px-3 sm:-mx-5 sm:px-5 [--eb-max-h:36svh] lg:top-3'
    : 'sticky top-16 z-30 -mx-5 px-5 sm:top-20 sm:-mx-8 sm:px-8 [--eb-max-h:42svh] lg:top-24';
  const sceneColumn = result
    ? 'mb-6 lg:mb-0'
    : pinned
      ? cn(
          scenePin,
          'border-b border-[var(--hq-line)] bg-[var(--hq-bg)] pt-2 pb-1 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:[--eb-max-h:4000px]',
        )
      : // ZIP and contact: not pinned on phones (desktop keeps it beside the form).
        cn(embedded ? 'lg:sticky lg:top-3' : 'lg:sticky lg:top-24', '[--eb-max-h:30svh] lg:[--eb-max-h:4000px]');

  return (
    <section
      ref={sectionRef}
      aria-label={template.title}
      data-estimator={template.trade}
      className={cn(
        'hq text-[var(--hq-text)]',
        builder && !embedded && 'scroll-mt-20 sm:scroll-mt-24',
        // The builder places the page itself (one scroll before the reveal); the browser's scroll anchoring
        // would otherwise nudge it again when the form is swapped for the result.
        builder && '[overflow-anchor:none]',
        embedded ? 'px-3 py-4 sm:px-5' : builder ? 'py-2 sm:py-4' : 'px-4 py-8 sm:py-12',
        showSummary && !embedded && 'pb-40 lg:pb-12',
      )}
    >
      {builder ? <BuilderStyles /> : null}
      {builder && !result ? (
        // Keyboard users skip the picture's controls straight to the questions.
        <a
          href={`#${formId}`}
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-[var(--hq-cta)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--hq-cta-ink)]"
        >
          Skip to the questions
        </a>
      ) : null}
      <div className={cn('mx-auto', container)}>
        {builder ? (
          <div ref={pinRef} className={sceneColumn}>
            {result ? (
              <ResultScene
                template={template}
                builder={trade ?? undefined}
                answers={state.answers}
                dimensions={dims.dimensions}
                night={night}
                onNightChange={setNight}
                slug={contractor.slug}
                // Only start a photo when this page promised one (the copy follows rendersEnabled too).
                renderToken={rendersEnabled ? result.renderToken : undefined}
                designItems={designItems}
                onPhotoProgress={setPhoto}
              />
            ) : (
              <ScenePanel
                template={template}
                builder={trade ?? undefined}
                answers={state.answers}
                dimensions={dims.dimensions}
                preview={ghost}
                night={night}
                onNightChange={setNight}
                focus={focus}
                stepKey={current.id}
                examplePhoto={rendersEnabled}
                example={example}
              />
            )}
          </div>
        ) : null}

        {/* Re-keyed for the result: a new screen, not the form sliding down under a taller picture. */}
        <div key={result ? 'result' : 'flow'} className={cn('min-w-0', builder && !result && 'pt-5 lg:pt-0')}>
          {builder ? (
            (unlocking && flowPhase !== 'design') || (!result && examplePrices) ? (
              // One progress indicator at a time: the stage bar while designing, then the rewards (Design done,
              // Price and the photo to unlock) from the unlock screens to the result, where Price ticks over.
              <div ref={progressRef} className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                {unlocking && flowPhase !== 'design' ? <RewardTracker steps={rewards} label="What you get" quiet={QUIET_REWARDS} /> : null}
                {result ? null : examplePrices}
              </div>
            ) : null
          ) : result ? null : (
            <div ref={progressRef} className="mb-5">
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
            <div className={cn(card, builder && 'eb-rise')}>
              <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-2xl font-semibold tracking-tight text-balance focus:outline-none">
                {trade ? trade.resultHeading(state.contact.firstName, designItems, resultSpec) : 'Your ballpark estimate'}
              </h2>
              {/* The builder says "Example prices" once, right under the figure (ResultScreen). */}
              {!template.pricesConfirmed && !builder ? (
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
                builder={builder}
                copy={trade?.copy}
                design={
                  designItems.length ? (
                    // Desktop shows the list under the picture instead (ResultScene).
                    <div className="lg:hidden">
                      <DesignList items={designItems} />
                    </div>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <form
              ref={formRef}
              id={formId}
              tabIndex={-1}
              onSubmit={onSubmit}
              noValidate
              // Focused fields scroll clear of the site header (and the pinned picture is off on these screens).
              className={cn(card, '@container overflow-hidden focus:outline-none [&_input]:scroll-mt-28 [&_textarea]:scroll-mt-28 [&_select]:scroll-mt-28')}
            >
              {builder && !(unlocking && flowPhase === 'unlock') ? (
                <StageStepper stages={stages} current={stageOf[current.id]} fraction={stagePart} label="Your progress" className="mb-5" />
              ) : null}
              <div key={current.id} className={builder ? slide.current.className : undefined}>
                <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-2xl font-semibold tracking-tight text-balance focus:outline-none">
                  {heading}
                </h2>

                {current.kind === 'questions' && current.group === 'package' && packageQ ? (
                  <PackageScreen
                    template={template}
                    question={current.questions.find((q) => q.role === 'package') ?? packageQ}
                    answers={state.answers}
                    onPick={(id) => onPick(packageQ, id)}
                    canCustomize={readyPackage}
                    onCustomize={customize}
                    onPreview={builder ? (id) => requestPreview(packageQ, id) : undefined}
                  />
                ) : current.kind === 'questions' ? (
                  <>
                    <QuestionScreen
                      screen={current}
                      answers={state.answers}
                      onPick={onPick}
                      showPrices={immediate}
                      onPreview={builder ? requestPreview : undefined}
                      optionVisual={trade?.optionVisual}
                    />
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
                  <ZipScreen state={state} errors={errors} onChange={(patch) => update(patch, Object.keys(patch))} preview={unlockPreview} />
                ) : (
                  <ContactScreen
                    preview={unlockPreview}
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
              </div>

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
                  <button type="button" onClick={() => goTo(backId)} className={cn(secondaryButton, 'shrink-0 max-sm:px-4')}>
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={!screenComplete(current, state) || submitting}
                  aria-busy={submitting || undefined}
                  className={cn(
                    primaryButton,
                    'min-w-0 whitespace-nowrap max-sm:px-5',
                    // Sending keeps the brand color (not the grey "not ready yet" look) and shows it is working.
                    submitting && 'gap-2 disabled:cursor-wait disabled:bg-[var(--hq-cta)] disabled:text-[var(--hq-cta-ink)] disabled:hover:bg-[var(--hq-cta)]',
                  )}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                  {nextLabel}
                </button>
              </div>
            </form>
          )}

          {builder && showSummary ? (
            <LiveSummary
              template={template}
              answers={state.answers}
              dimensions={dims.dimensions}
              embedded={embedded}
              className="lg:static lg:mt-6"
            />
          ) : null}
        </div>

        {!builder && showSummary ? <LiveSummary template={template} answers={state.answers} dimensions={dims.dimensions} embedded={embedded} /> : null}
      </div>
    </section>
  );
}
