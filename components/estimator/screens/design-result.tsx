'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, ExternalLink, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { checkRender, startRender } from '@/lib/estimator/render-client';
import { rasterizeScene } from '@/lib/estimator/scene/rasterize';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import {
  RENDER_POLL_MS,
  RENDER_TIMEOUT_MS,
  renderProgress,
  renderStage,
  renderStartProblem,
  type DesignItem,
} from '../builder';
import { ScenePanel } from '../scene/scene-panel';

/** File name of the "Save my design" download. */
export const DESIGN_FILE_NAME = 'my-pool-design.png';

const actionButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--hq-line-strong)] px-5 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:border-[var(--hq-accent-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-wait disabled:opacity-60';
const glowButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] px-5 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:bg-[var(--hq-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-wait disabled:opacity-60';

/** The "Your design" list: the visible choices in plain words. */
export function DesignList({ items }: { items: DesignItem[] }) {
  const id = useId();
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className="rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)]/40 p-4">
      <h3 id={id} className="text-sm font-semibold text-[var(--hq-text)]">
        Your design
      </h3>
      <dl className="mt-2 divide-y divide-[var(--hq-line)] text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="shrink-0 text-[var(--hq-text-muted)]">{item.label}</dt>
            <dd className="text-right font-medium text-[var(--hq-text)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Photoreal render                                                    */
/* ------------------------------------------------------------------ */

type RenderState =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'running'; taskId: string; before: string; startedAt: number }
  | { kind: 'done'; before: string; imageUrl: string }
  /** Renders are off or the limit is reached: the button goes away, the note stays. */
  | { kind: 'off'; message: string }
  | { kind: 'failed'; message: string };

/**
 * The optional "See it for real" render: rasterize the live scene, start the
 * render with the lead's renderToken, poll until it is done (or give up after
 * RENDER_TIMEOUT_MS), then preload the image so it reveals in one go.
 */
function useRealisticRender(slug: string, renderToken: string | undefined, getSvg: () => SVGSVGElement | null) {
  const [state, setState] = useState<RenderState>({ kind: 'idle' });
  const [now, setNow] = useState(0);
  const busy = useRef(false);

  const start = useCallback(async () => {
    if (!renderToken || busy.current) return;
    busy.current = true;
    setState({ kind: 'preparing' });
    try {
      const svg = getSvg();
      let png: string;
      try {
        if (!svg) throw new Error('scene not found');
        png = await rasterizeScene(svg);
      } catch {
        setState({ kind: 'failed', message: 'We could not capture your design for the realistic preview. Please try again.' });
        return;
      }
      const res = await startRender(slug, renderToken, png).catch(
        () => ({ ok: false, reason: 'error', message: '' }) as const,
      );
      if (!res.ok) {
        const problem = renderStartProblem(res);
        setState(problem.retry ? { kind: 'failed', message: problem.message } : { kind: 'off', message: problem.message });
        return;
      }
      setNow(Date.now());
      setState({ kind: 'running', taskId: res.taskId, before: png, startedAt: Date.now() });
    } finally {
      busy.current = false;
    }
  }, [slug, renderToken, getSvg]);

  // Poll while running.
  useEffect(() => {
    if (state.kind !== 'running' || !renderToken) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const fail = (message: string) => !cancelled && setState({ kind: 'failed', message });
    const tick = async () => {
      if (Date.now() - state.startedAt > RENDER_TIMEOUT_MS) {
        fail('The realistic preview is taking longer than it should. Please try again in a minute.');
        return;
      }
      try {
        const status = await checkRender(slug, renderToken, state.taskId);
        if (cancelled) return;
        if (status.status === 'done') {
          const img = new Image();
          img.onload = () => !cancelled && setState({ kind: 'done', before: state.before, imageUrl: status.imageUrl });
          img.onerror = () => fail('We could not load the realistic preview. Please try again.');
          img.src = status.imageUrl;
        } else if (status.status === 'failed') {
          fail('We could not finish the realistic preview. Please try again.');
        } else {
          timer = setTimeout(tick, RENDER_POLL_MS);
        }
      } catch {
        // A dropped poll is retried; the timeout above still applies.
        if (!cancelled) timer = setTimeout(tick, RENDER_POLL_MS);
      }
    };
    timer = setTimeout(tick, RENDER_POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, slug, renderToken]);

  // Clock for the progress bar and stage line.
  useEffect(() => {
    if (state.kind !== 'running') return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [state.kind]);

  const elapsed = state.kind === 'running' ? Math.max(0, now - state.startedAt) : 0;
  return { state, start, elapsed };
}

/** Progress shown over the picture while the realistic preview is being made. */
export function RenderProgress({ preparing, elapsedMs }: { preparing: boolean; elapsedMs: number }) {
  const percent = preparing ? 2 : renderProgress(elapsedMs);
  const stage = preparing ? 'Capturing your design' : renderStage(elapsedMs);
  return (
    <div className="absolute inset-0 flex items-end bg-[#06122b]/40">
      <div className="eb-shimmer absolute inset-0" aria-hidden="true" />
      <div className="relative m-2.5 w-full rounded-xl bg-[#06122b]/85 p-3 text-white shadow-lg backdrop-blur-md sm:m-4 sm:p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-[var(--hq-cta)]" aria-hidden="true" />
          Creating your realistic preview
        </p>
        <p className="mt-0.5 text-xs text-white/80" aria-live="polite">
          {stage}…
        </p>
        <div
          role="progressbar"
          aria-label="Realistic preview progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20"
        >
          <div className="eb-bar h-full rounded-full bg-[var(--hq-cta)]" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-white/70">Usually 20 to 60 seconds. Feel free to read your estimate meanwhile.</p>
      </div>
    </div>
  );
}

/**
 * Illustration (left of the handle) over the realistic image (right). A native
 * range input drives the handle, so it works with a keyboard and screen readers.
 */
export function BeforeAfter({ before, after, onClose }: { before: string; after: string; onClose: () => void }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="eb-reveal absolute inset-0 bg-[#06122b] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-[-4px] has-[input:focus-visible]:outline-white">
      {/* Plain img: the render is a remote image of unknown size, cropped to the frame. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Realistic preview of your pool design" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ left: `${pos}%` }} aria-hidden="true">
        <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-[#06122b] shadow-lg">
          ⟷
        </span>
      </div>
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-[#06122b]/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md" aria-hidden="true">
        Illustration
      </span>
      <span className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-full bg-[#06122b]/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md" aria-hidden="true">
        Realistic
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare the illustration with the realistic preview"
        aria-valuetext={`${pos}% illustration, ${100 - pos}% realistic`}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Back to the illustration"
        className="absolute top-2.5 right-2.5 inline-flex size-9 items-center justify-center rounded-full bg-[#06122b]/70 text-white backdrop-blur-md hover:bg-[#06122b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The finished design                                                 */
/* ------------------------------------------------------------------ */

/**
 * The result's picture: the finished scene (day/night), "Save my design"
 * (a PNG of the scene) and, when the lead response carries a renderToken,
 * "See it for real" (the photoreal render with a before/after slider). Every
 * failure is explained in place and never blocks the estimate or booking.
 */
export function ResultScene({
  template,
  answers,
  dimensions,
  night,
  onNightChange,
  slug,
  renderToken,
  designItems = [],
}: {
  template: EstimatorTemplate;
  answers: Answers;
  dimensions?: PoolDimensions;
  night: boolean;
  onNightChange: (night: boolean) => void;
  slug: string;
  renderToken?: string;
  /** "Your design", shown under the picture on desktop (the result screen lists it on phones). */
  designItems?: DesignItem[];
}) {
  const frame = useRef<HTMLDivElement>(null);
  const getSvg = useCallback(
    () => frame.current?.querySelector<SVGSVGElement>('svg.ps-root') ?? frame.current?.querySelector<SVGSVGElement>('svg') ?? null,
    [],
  );
  const { state, start, elapsed } = useRealisticRender(slug, renderToken, getSvg);
  const [showRender, setShowRender] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const svg = getSvg();
      if (!svg) throw new Error('scene not found');
      const url = await rasterizeScene(svg);
      const a = document.createElement('a');
      a.href = url;
      a.download = DESIGN_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setSaveError('Sorry, we could not save the image on this device. A screenshot works too.');
    } finally {
      setSaving(false);
    }
  };

  const working = state.kind === 'preparing' || state.kind === 'running';
  const overlay = working ? (
    <RenderProgress preparing={state.kind === 'preparing'} elapsedMs={elapsed} />
  ) : state.kind === 'done' && showRender ? (
    <BeforeAfter before={state.before} after={state.imageUrl} onClose={() => setShowRender(false)} />
  ) : null;

  const footer = (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={save} disabled={saving} className={actionButton}>
          {saving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save my design'}
        </button>
        {renderToken && state.kind !== 'off' ? (
          state.kind === 'done' ? (
            showRender ? (
              <a href={state.imageUrl} target="_blank" rel="noopener" className={actionButton}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Open realistic image
              </a>
            ) : (
              <button type="button" onClick={() => setShowRender(true)} className={glowButton}>
                <Sparkles className="size-4" aria-hidden="true" />
                Show the realistic preview
              </button>
            )
          ) : (
            <button type="button" onClick={() => void start()} disabled={working} className={glowButton}>
              {state.kind === 'failed' ? <RotateCcw className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {working ? 'Creating…' : state.kind === 'failed' ? 'Try again' : 'See it for real'}
            </button>
          )
        ) : null}
      </div>
      <div role="status" aria-live="polite" className="space-y-1 text-xs leading-5 empty:hidden">
        {saveError ? <p className="text-[var(--hq-warn)]">{saveError}</p> : null}
        {state.kind === 'failed' || state.kind === 'off' ? (
          <p className={cn(state.kind === 'failed' ? 'text-[var(--hq-warn)]' : 'text-[var(--hq-text-muted)]')}>{state.message}</p>
        ) : null}
        {state.kind === 'done' ? (
          <p className="text-[var(--hq-text-muted)]">Your realistic preview is ready. Drag the handle to compare it with the illustration.</p>
        ) : null}
      </div>
      {renderToken && state.kind === 'idle' ? (
        <p className="text-xs leading-5 text-[var(--hq-text-dim)]">See it for real turns your design into a realistic aerial photo in about a minute.</p>
      ) : null}
      {designItems.length ? (
        <div className="hidden pt-3 lg:block">
          <DesignList items={designItems} />
        </div>
      ) : null}
    </div>
  );

  return (
    <ScenePanel
      template={template}
      answers={answers}
      dimensions={dimensions}
      night={night}
      onNightChange={onNightChange}
      variant="result"
      frameRef={frame}
      overlay={overlay}
      hideLighting={Boolean(overlay)}
      footer={footer}
    />
  );
}
