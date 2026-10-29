'use client';

import './funnel.css';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import { FunnelFooter, FunnelLogo } from './chrome';
import type { FunnelLeadResult } from './screens';
import { FunnelBookingScreen, FunnelContactScreen } from './slots';
import { StepPhoto } from './step-photo';
import {
  nextScreen,
  parseScreen,
  prevScreen,
  photoSrcSet,
  progress,
  readStored,
  resolvePhoto,
  sameScreen,
  screenOrder,
  screenParam,
  screenUrl,
  stepCta,
  stepLabel,
  writeStored,
  type FunnelScreen,
} from './state';

export type FunnelProps = {
  slug: string;
  spec: FunnelSpec;
  contractor: ContractorEstimatorConfig;
  /** publicTemplate(...): no prices before the contact step (revealRange 'after_contact'). */
  template: EstimatorTemplate;
  /** iframe on the contractor's own site: no logo bar (their site has one). */
  embedded?: boolean;
  /** From the URL (server page): ?step=… */
  initialScreen?: FunnelScreen;
  /** From the URL (server page): ?size=…&finish=…&extras=… (normalized). */
  initialSelection: FunnelSelection;
  /** True when the URL carried a pick: it wins over the sessionStorage copy. */
  fromUrl?: boolean;
  /** Photo files the server found missing (they show their fallback, never a broken image). */
  missingPhotos?: string[];
  /** The logo links here (the landing page). */
  homeHref?: string;
};

const HEADING_ID = 'fn-title';

/** History entries this funnel pushed carry the screen they came from, so the back arrow can use the browser's own Back. */
type HistoryState = { fn?: string; fnFrom?: string } | null;

/**
 * The simple funnel's screens, one question each (Buildoly's mobile flow):
 * "STEP 1 OF 3" + photo + question + option cards + one blue button, then
 * the contact step and the booking step (their content comes from ./slots).
 *
 * The URL holds the screen and the picks (?step=2&size=classic&finish=luxe…):
 * Continue pushes a history entry so the browser's Back works, a tap rewrites
 * the current one in place. sessionStorage keeps the picks and the lead
 * result, so a refresh never loses progress. Each screen fits on one phone
 * screen with nothing sticky; the photo swaps instantly (all option photos
 * are loaded) and screens change with a 200 ms fade and slide (none with
 * reduced motion, none on first paint).
 */
export function Funnel({
  slug,
  spec,
  contractor,
  template,
  embedded = false,
  initialScreen = { kind: 'step', index: 0 },
  initialSelection,
  fromUrl = false,
  missingPhotos = [],
  homeHref,
}: FunnelProps) {
  const [selection, setSelection] = useState<FunnelSelection>(initialSelection);
  const [screen, setScreen] = useState<FunnelScreen>(initialScreen);
  const [result, setResult] = useState<FunnelLeadResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [direction, setDirection] = useState<'fwd' | 'back' | null>(null);
  const missing = useMemo(() => new Set(missingPhotos), [missingPhotos]);

  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const resultRef = useRef(result);
  resultRef.current = result;

  /* ---------------- Restore once, then keep URL + storage in step ---------------- */

  useEffect(() => {
    const stored = readStored(spec, slug);
    let sel = selectionRef.current;
    if (stored && !fromUrl) sel = stored.selection;
    const res = stored?.result ?? null;
    let scr = screenRef.current;
    // The booking step needs a sent lead; without one (new tab, cleared storage) the contact step opens.
    if (scr.kind === 'book' && !res) scr = { kind: 'contact' };
    setSelection(sel);
    setResult(res);
    setScreen(scr);
    window.history.replaceState({ ...(window.history.state ?? {}), fn: screenParam(scr) }, '', screenUrl(spec, window.location.pathname, scr, sel, window.location.search));
    setHydrated(true);

    const onPop = () => {
      let next = parseScreen(spec, new URLSearchParams(window.location.search).get('step'));
      if (next.kind === 'book' && !resultRef.current) next = { kind: 'contact' };
      const cur = screenRef.current;
      setDirection(screenOrder(spec, next) < screenOrder(spec, cur) ? 'back' : 'fwd');
      setScreen(next);
      // An older entry carries the picks of its time: keep the current ones.
      window.history.replaceState(window.history.state, '', screenUrl(spec, window.location.pathname, next, selectionRef.current, window.location.search));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [spec, slug, fromUrl]);

  useEffect(() => {
    if (!hydrated) return;
    writeStored(slug, { v: 1, selection, result: result ?? undefined });
    const url = screenUrl(spec, window.location.pathname, screen, selection, window.location.search);
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url);
  }, [hydrated, slug, spec, selection, screen, result]);

  /* ---------------- Navigation ---------------- */

  const firstPaint = useRef(true);
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    // New content at the top, focus on its question (keyboard and screen-reader users land where the page changed).
    window.scrollTo({ top: 0 });
    document.getElementById(HEADING_ID)?.focus({ preventScroll: true });
  }, [screen]);

  const go = useCallback(
    (next: FunnelScreen) => {
      const cur = screenRef.current;
      if (sameScreen(cur, next)) return;
      setDirection(screenOrder(spec, next) < screenOrder(spec, cur) ? 'back' : 'fwd');
      setScreen(next);
      const state: HistoryState = { fn: screenParam(next), fnFrom: screenParam(cur) };
      window.history.pushState(state, '', screenUrl(spec, window.location.pathname, next, selectionRef.current, window.location.search));
    },
    [spec],
  );

  const back = useCallback(() => {
    const cur = screenRef.current;
    const prev = prevScreen(spec, cur);
    if (!prev) return;
    const state = window.history.state as HistoryState;
    // We pushed this entry from the previous screen: the browser's Back is the same move (and keeps history tidy).
    if (state?.fn === screenParam(cur) && state.fnFrom === screenParam(prev)) {
      window.history.back();
      return;
    }
    setDirection('back');
    setScreen(prev);
    window.history.replaceState({ fn: screenParam(prev) }, '', screenUrl(spec, window.location.pathname, prev, selectionRef.current, window.location.search));
  }, [spec]);

  const onDone = useCallback(
    (res: FunnelLeadResult) => {
      setResult(res);
      resultRef.current = res;
      go({ kind: 'book' });
    },
    [go],
  );

  /* ---------------- Preload the next step's photos while this one is looked at ---------------- */

  useEffect(() => {
    if (!hydrated || screen.kind !== 'step') return;
    const next = spec.steps[screen.index + 1];
    if (!next) return;
    const t = window.setTimeout(() => {
      for (const p of Object.values(stepOptionPhotos(spec, next.id, selection))) {
        const shown = resolvePhoto(p, missing);
        const img = new window.Image();
        img.decoding = 'async';
        const srcset = photoSrcSet(shown);
        if (srcset) {
          img.sizes = window.innerWidth >= 1024 ? '560px' : `${window.innerWidth - 64}px`;
          img.srcset = srcset;
        }
        img.src = shown.src;
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [hydrated, screen, spec, selection, missing]);

  /* ---------------- Render ---------------- */

  const label = stepLabel(spec, screen);
  const canGoBack = screen.kind !== 'book' && prevScreen(spec, screen) !== null;
  const enter = direction === 'back' ? 'fn-enter-back' : direction === 'fwd' ? 'fn-enter-fwd' : '';
  // The embed layout already wraps the page in <main id="main">.
  const Main = embedded ? 'div' : 'main';

  return (
    <div className="es-fn flex min-h-[100dvh] flex-1 flex-col" data-funnel-screen={screenParam(screen)}>
      {embedded ? null : (
        <header className="mx-auto flex h-[46px] w-full max-w-[1120px] items-center px-5 sm:px-8 lg:h-[68px]">
          <Link href={homeHref ?? `/estimator/${slug}`} aria-label={`${contractor.contractorName} home`} className="-mx-1 rounded-[4px] px-1 py-1 focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]">
            <span className="lg:hidden">
              <FunnelLogo contractor={contractor} height={26} priority />
            </span>
            <span className="hidden lg:block">
              <FunnelLogo contractor={contractor} height={32} />
            </span>
          </Link>
        </header>
      )}
      <Main id={embedded ? undefined : 'main'} className={`flex-1 ${embedded ? 'pt-3' : ''}`}>
        <div className="mx-auto w-full max-w-[624px] px-8 pb-12 lg:pb-16 lg:pt-2">
          {label ? <StepBar label={label} value={progress(spec, screen)} onBack={canGoBack ? back : undefined} /> : null}
          <div key={screenParam(screen)} className={enter}>
            {screen.kind === 'step' ? (
              <StepScreen
                spec={spec}
                index={screen.index}
                selection={selection}
                missing={missing}
                first={screen.index === 0}
                onPick={(stepId, optionId) => setSelection((s) => ({ ...s, [stepId]: optionId }))}
                onContinue={() => go(nextScreen(spec, screen))}
              />
            ) : screen.kind === 'contact' ? (
              <div className="pt-[22px] lg:pt-10">
                <FunnelContactScreen
                  slug={slug}
                  spec={spec}
                  contractor={contractor}
                  template={template}
                  selection={selection}
                  embedded={embedded}
                  headingId={HEADING_ID}
                  onDone={onDone}
                />
              </div>
            ) : result ? (
              <div className="pt-6 lg:pt-8">
                <FunnelBookingScreen
                  slug={slug}
                  spec={spec}
                  contractor={contractor}
                  template={template}
                  selection={selection}
                  result={result}
                  embedded={embedded}
                  headingId={HEADING_ID}
                />
              </div>
            ) : (
              // Server render of ?step=book: the result is only in this browser's storage (read right after hydration).
              <div className="min-h-[60vh]" aria-busy="true" />
            )}
          </div>
        </div>
      </Main>
      {embedded ? null : <FunnelFooter contractor={contractor} note={spec.photoNote} />}
    </div>
  );
}

/** "STEP 2 OF 3" over a thin progress bar, with the back arrow in the gutter. */
function StepBar({ label, value, onBack }: { label: string; value: number; onBack?: () => void }) {
  return (
    <div className="relative pl-[26px] pt-[7px] lg:pt-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-[-14px] top-[2px] flex size-11 touch-manipulation items-center justify-center rounded-full text-[#3d3b37] transition-colors duration-150 hover:text-[var(--fn-ink)] focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)] motion-reduce:transition-none lg:top-[11px]"
        >
          <ArrowLeft aria-hidden="true" className="size-[17px]" strokeWidth={1.6} />
        </button>
      ) : null}
      <p className="fn-eyebrow">{label}</p>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="mt-[9px] h-1 overflow-hidden rounded-full bg-[var(--fn-track)]"
      >
        <div className="fn-bar-fill h-full w-full rounded-full bg-[var(--fn-blue)]" style={{ transform: `scaleX(${value})` }} />
      </div>
    </div>
  );
}

/** One question: the photo, the question, the option cards and the button. */
function StepScreen({
  spec,
  index,
  selection,
  missing,
  first,
  onPick,
  onContinue,
}: {
  spec: FunnelSpec;
  index: number;
  selection: FunnelSelection;
  missing: ReadonlySet<string>;
  first: boolean;
  onPick: (stepId: string, optionId: string) => void;
  onContinue: () => void;
}) {
  const step = spec.steps[index];
  const picked = selection[step.id];
  const photos = useMemo(
    () => Object.entries(stepOptionPhotos(spec, step.id, selection)).map(([id, p]) => [id, resolvePhoto(p, missing)] as [string, ReturnType<typeof resolvePhoto>]),
    [spec, step.id, selection, missing],
  );
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onContinue();
  };
  const isView = step.photo.kind === 'view';

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="pt-[19px] lg:pt-7">
        <StepPhoto
          photos={photos}
          selected={picked}
          fit={isView ? 'cover' : 'contain'}
          caption={isView && spec.photoNote ? 'Example design' : undefined}
          priority={first}
        />
      </div>
      <h1 id={HEADING_ID} tabIndex={-1} className="fn-h1 mt-[18px] text-balance outline-none lg:mt-7 lg:text-[30px]">
        {step.label}
      </h1>
      <fieldset className="mt-5 lg:mt-6">
        <legend className="sr-only">{step.label}</legend>
        <div className="flex flex-col gap-3">
          {step.options.map((o) => {
            const on = o.id === picked;
            return (
              <label key={o.id} className="fn-option px-[15px] py-[10px] lg:px-5 lg:py-[14px]" data-selected={on ? '' : undefined}>
                <input
                  type="radio"
                  name={step.id}
                  value={o.id}
                  checked={on}
                  onChange={() => onPick(step.id, o.id)}
                  className="sr-only"
                />
                <span className="block text-[17px] font-[480] leading-[22px] tracking-[-0.01em] lg:text-[18px] lg:leading-[24px] text-[var(--fn-ink)]">{o.title}</span>
                <span className="block mt-[3px] text-pretty text-[15px] leading-[20px] text-[var(--fn-muted)] lg:text-[16px] lg:leading-[22px]">{o.subtitle}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <button type="submit" className="fn-btn mt-[13px] h-[47px] w-full text-[17px] lg:mt-4 lg:h-[52px] lg:text-[18px]">
        {stepCta(spec, index)}
      </button>
    </form>
  );
}
