'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ChevronsLeftRight, Download, ExternalLink, Loader2, RotateCcw, Share2, Sparkles, X } from 'lucide-react';
import { checkRender, startRender } from '@/lib/estimator/render-client';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { renderProgress, type DesignItem, type RenderHelp } from '../builder';
import type { TradeBuilder } from '../builders';
import { POOL_COPY } from '../builders/pool';
import type { PhotoProgress } from '../builder-progress';
import {
  AUTO_RENDER_DELAY_MS,
  formatElapsed,
  renderWorking,
  runRenderSession,
  sharePlan,
  shouldAutoRender,
  type RenderPhase,
  type ShareEnv,
} from '../builder-render';
import { builderFor, ScenePanel } from '../scene/scene-panel';
import { BURST_MS, GLIDE_DELAY_MS, GLIDE_MS, PHOTO_PANEL_DELAY_MS, RevealStyles } from './reveal-styles';

/** File name of the pool's "Save my design" download (each trade's is TradeCopy.designFile). */
export const DESIGN_FILE_NAME = POOL_COPY.designFile;

/** Quiet text action under the picture ("Save my design"). */
const quietButton =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[var(--hq-accent-bright)] transition-colors hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-wait disabled:opacity-60';
const glowButton =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--hq-accent-bright)] bg-[var(--hq-accent-glow)] px-4 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:bg-[var(--hq-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
/** Round icon button on the photo (close, open full size). 44px tap target around a 36px circle. */
const photoButton =
  "relative inline-flex size-9 items-center justify-center rounded-full bg-[#06122b]/80 text-white transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-[#06122b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white";
/** Under the pool's picture while the photo shows: says what it is (an AI render of their design, not their yard). */
export const PHOTO_CAPTION = POOL_COPY.photoCaption;

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
/* Realistic photo                                                     */
/* ------------------------------------------------------------------ */

/** Render tokens whose photo already started on its own: a remount never spends a second render. */
const autoStarted = new Set<string>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** How long the finished photo may take to download before the attempt counts as failed (a stalled phone network). */
const PRELOAD_TIMEOUT_MS = 45_000;

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('image took too long'));
    }, PRELOAD_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('image could not be loaded'));
    };
    img.src = url;
  });
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * The realistic photo for this lead. When the lead response carried a
 * renderToken it starts by itself, once (the snapshot waits
 * AUTO_RENDER_DELAY_MS so the price count-up stays smooth; the developing
 * overlay waits for the price to land, see ResultScene). `auto` is true while the current attempt is that automatic one:
 * its failures stay quiet. `start` is the manual retry.
 */
function useRealisticPhoto(slug: string, renderToken: string | undefined, capture: () => Promise<string>, help: RenderHelp) {
  const [phase, setPhase] = useState<RenderPhase>(() => (shouldAutoRender(renderToken, autoStarted) ? { kind: 'preparing' } : { kind: 'idle' }));
  const [auto, setAuto] = useState(() => shouldAutoRender(renderToken, autoStarted));
  // When this attempt started (the developing clock ticks inside DevelopingPhoto, not here).
  const [since, setSince] = useState(0);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (automatic: boolean) => {
      if (!renderToken || busy.current) return;
      busy.current = true;
      const t0 = Date.now();
      setAuto(automatic);
      setSince(t0);
      try {
        await runRenderSession(
          {
            capture: async () => {
              if (automatic) await sleep(AUTO_RENDER_DELAY_MS);
              return capture();
            },
            start: (png) => startRender(slug, renderToken, png),
            check: (taskId) => checkRender(slug, renderToken, taskId),
            preload: preloadImage,
            sleep,
            now: Date.now,
            cancelled: () => !alive.current,
          },
          setPhase,
          { help },
        );
      } finally {
        busy.current = false;
      }
    },
    [slug, renderToken, capture, help],
  );

  useEffect(() => {
    if (!shouldAutoRender(renderToken, autoStarted)) return;
    autoStarted.add(renderToken);
    void run(true);
  }, [renderToken, run]);

  return { phase, auto, start: () => void run(false), since };
}

/** The one line shown while the photo is made: generic on purpose (nothing here reports the model's real steps). */
export const DEVELOPING_LINE = 'Making your realistic photo';

/**
 * Shown while the realistic photo is being made, without hiding the design
 * they just finished: a soft light sweep crosses the picture, a compact chip
 * in the corner says what is happening with the elapsed time, and a slim bar
 * along the bottom edge fills (never claiming to be done early). The clock
 * ticks here, so only this small overlay re-renders, not the whole scene.
 * The bar and timer are decorative: the status line under the picture
 * describes the progress for screen readers.
 */
export function DevelopingPhoto({ preparing, since }: { preparing: boolean; since: number }) {
  // Only ever drawn on the client, after the result appears, so reading the clock here is safe.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const elapsedMs = since ? Math.max(0, now - since) : 0;
  const percent = renderProgress(elapsedMs);
  return (
    <div data-developing="" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div aria-hidden="true" className="er-sweep" />
      <div aria-hidden="true" className="er-in absolute bottom-3.5 left-2.5 inline-flex h-8 max-w-[calc(100%-1.25rem)] items-center gap-2 rounded-full bg-[#06122b]/85 pr-3 pl-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] sm:bottom-4 sm:left-3">
        <Sparkles className="size-3.5 shrink-0 text-[#ffd666]" />
        <span className="truncate">{preparing ? 'Getting your design ready' : 'Making your photo'}…</span>
        <span className="shrink-0 font-medium text-white/70 tabular-nums">{formatElapsed(elapsedMs)}</span>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#06122b]/35">
        <div
          className="er-bar h-full w-full bg-[linear-gradient(90deg,var(--es-aqua,#2ec5d3),#b9f6ff)]"
          style={{ transform: `translateX(${percent - 100}%)` }}
        />
      </div>
    </div>
  );
}

/** The one celebration: three rings spreading like a drop in the pool, and a few sparkles. Decorative. */
function RippleBurst() {
  const sparks = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className="er-burst pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {[0, 170, 340].map((delay) => (
        <span key={delay} className="er-ring" style={{ animationDelay: `${250 + delay}ms` }} />
      ))}
      {sparks.map((angle, i) => (
        <svg
          key={angle}
          viewBox="0 0 16 16"
          className="er-spark"
          style={{ '--a': `${angle + 22}deg`, '--d': `${-(70 + (i % 3) * 22)}px`, animationDelay: `${330 + (i % 2) * 90}ms` } as CSSProperties}
        >
          <path d="M8 0c.6 4.2 3.2 6.9 8 8-4.8 1.1-7.4 3.8-8 8-.6-4.2-3.2-6.9-8-8 4.8-1.1 7.4-3.8 8-8z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

/**
 * The finished photo over the design. The first time (`celebrate`) it
 * dissolves in from the pool outward, a ripple spreads once, then the compare
 * handle glides in from the left to the middle so they see the design and the
 * photo side by side. A native range input drives the handle, so it works with
 * a keyboard and screen readers. Under reduced motion it simply appears, with
 * the handle in the middle.
 */
export function PhotoReveal({
  before,
  after,
  celebrate,
  onClose,
  subject = 'pool',
}: {
  before: string;
  after: string;
  celebrate: boolean;
  onClose: () => void;
  /** What the photo shows ("pool", "bathroom"), for its alt text. */
  subject?: string;
}) {
  const [motion] = useState(() => celebrate && !prefersReducedMotion());
  const [pos, setPos] = useState(motion ? 0 : 50);
  const [gliding, setGliding] = useState(false);
  const [burst, setBurst] = useState(motion);
  const touched = useRef(false);

  useEffect(() => {
    if (!motion) return;
    const timers = [
      setTimeout(() => {
        if (touched.current) return;
        setGliding(true);
        setPos(50);
      }, GLIDE_DELAY_MS),
      setTimeout(() => setGliding(false), GLIDE_DELAY_MS + GLIDE_MS + 60),
      setTimeout(() => setBurst(false), BURST_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [motion]);

  const compare = pos > 0;
  return (
    <div
      data-photo-reveal=""
      className={cn(
        'absolute inset-0 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-[-4px] has-[input:focus-visible]:outline-white',
        gliding && 'er-glide',
      )}
    >
      {/* Plain img: the render is a remote image of unknown size, cropped to the frame. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`AI-rendered realistic photo of your ${subject} design`} className={cn('absolute inset-0 size-full object-cover', motion && 'er-reveal')} />
      <div className="er-before absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      {burst ? <RippleBurst /> : null}

      <div
        aria-hidden="true"
        className={cn('er-handle pointer-events-none absolute inset-y-0 left-0 w-full', compare ? 'opacity-100' : 'opacity-0')}
        style={{ transform: `translateX(${pos}%)` }}
      >
        <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
        <span className="absolute top-1/2 left-0 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#06122b] shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
          <ChevronsLeftRight className="size-5" strokeWidth={2.4} />
        </span>
      </div>

      {/* Two labels only, one at each end of the split. */}
      <span className={cn(pillClass, 'bottom-2.5 left-2.5 transition-opacity duration-300', compare ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
        Your design
      </span>
      <span className={cn(pillClass, 'right-2.5 bottom-2.5', motion && 'er-in')} style={motion ? { animationDelay: '700ms' } : undefined} aria-hidden="true">
        <Sparkles className="size-3.5 text-[#ffd666]" />
        Realistic photo
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => {
          touched.current = true;
          setGliding(false);
          setPos(Number(e.target.value));
        }}
        aria-label="Compare your design with its realistic photo"
        aria-valuetext={`${pos}% design, ${100 - pos}% realistic photo`}
        // pan-y: a vertical swipe that starts on the picture still scrolls the page (iOS).
        className="absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
      />
      <div className="absolute top-2.5 right-2.5 flex gap-2 sm:top-3 sm:right-3">
        <a href={after} target="_blank" rel="noopener" aria-label="Open the full-size photo" className={photoButton}>
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
        <button type="button" onClick={onClose} aria-label="Back to the illustration" className={photoButton}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const pillClass = 'pointer-events-none absolute inline-flex h-7 items-center gap-1.5 rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white';

/* ------------------------------------------------------------------ */
/* Share                                                               */
/* ------------------------------------------------------------------ */

let shareEnvCache: ShareEnv | null = null;
const noSubscribe = () => () => {};
/** What this browser can share, read once (stable object for useSyncExternalStore). */
function readShareEnv(): ShareEnv {
  if (shareEnvCache) return shareEnvCache;
  let canShareFiles = false;
  try {
    canShareFiles =
      typeof navigator.canShare === 'function' &&
      typeof File !== 'undefined' &&
      navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] });
  } catch {
    canShareFiles = false;
  }
  shareEnvCache = {
    canShareFiles,
    canShare: typeof navigator.share === 'function',
    canCopy: typeof navigator.clipboard?.writeText === 'function',
  };
  return shareEnvCache;
}

async function dataUrlFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

/** The photo as a file, when its host allows reading it from here; null otherwise. */
async function photoFile(url: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type.startsWith('image/') ? new File([blob], name, { type: blob.type }) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* The finished design                                                 */
/* ------------------------------------------------------------------ */

/**
 * The result's picture: the finished scene (day/night), "Save my design" (a
 * PNG of the scene), "Share" where the device can, and the realistic photo.
 * When the lead response carries a renderToken the photo starts by itself:
 * the picture "develops", then the photo dissolves in with one ripple and a
 * before/after slider. If it cannot be made the illustration simply stays (a
 * quiet "Make my realistic photo" retry only when another try can help).
 * Nothing here ever blocks the estimate or booking. `onPhotoProgress` tells
 * the flow's reward tracker how the photo is doing.
 */
export function ResultScene({
  template,
  builder: builderProp,
  answers,
  dimensions,
  night,
  onNightChange,
  slug,
  renderToken,
  designItems = [],
  onPhotoProgress,
}: {
  template: EstimatorTemplate;
  /** The trade adapter; picked from template.trade when omitted. */
  builder?: TradeBuilder<unknown>;
  answers: Answers;
  dimensions?: PoolDimensions;
  /** True = the adapter's second lighting mode (pool Night, bath Evening). */
  night: boolean;
  onNightChange: (night: boolean) => void;
  slug: string;
  renderToken?: string;
  /** "Your design", shown under the picture on desktop (the result screen lists it on phones). */
  designItems?: DesignItem[];
  onPhotoProgress?: (progress: PhotoProgress) => void;
}) {
  const builder = builderProp ?? builderFor(template);
  const { copy } = builder;
  const frame = useRef<HTMLDivElement>(null);
  // The scene in the frame as a PNG (the adapter knows whether it is an SVG or a canvas).
  const snapshot = useCallback(() => {
    const el = frame.current;
    return el ? builder.rasterize(el) : Promise.reject(new Error('scene not found'));
  }, [builder]);
  // Latest night value for the async snapshot (the prop changes under it once switched to day).
  const nightRef = useRef(night);
  nightRef.current = night;
  // The render prompt asks for daylight, so a night/evening snapshot would not match: switch to day for the
  // snapshot, then back to the view they chose.
  const capture = useCallback(async () => {
    const wasNight = nightRef.current;
    if (wasNight) {
      onNightChange(false);
      // Let React commit the day picture; the fading-out night layer is dropped from the snapshot.
      await sleep(120);
    }
    try {
      return await snapshot();
    } finally {
      if (wasNight) onNightChange(true);
    }
  }, [snapshot, onNightChange]);
  const { phase, auto, start, since } = useRealisticPhoto(slug, renderToken, capture, copy);
  // The reveal is one moment at a time: the price counts up first, then the photo's progress appears.
  const [priceSettled, setPriceSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPriceSettled(true), prefersReducedMotion() ? 0 : PHOTO_PANEL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  const [showRender, setShowRender] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'warn' | 'muted' } | null>(null);
  const shareEnv = useSyncExternalStore(noSubscribe, readShareEnv, () => null);

  const working = renderWorking(phase);
  const done = phase.kind === 'done' ? phase : null;
  const progress: PhotoProgress = working ? 'pending' : done ? 'done' : 'none';
  useEffect(() => {
    onPhotoProgress?.(progress);
  }, [progress, onPhotoProgress]);

  // The celebration plays once: reopening the photo after closing it just shows it.
  const [reopened, setReopened] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setNote(null);
    try {
      const url = await snapshot();
      const a = document.createElement('a');
      a.href = url;
      a.download = copy.designFile;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setNote({ text: 'Sorry, we could not save the image on this device. A screenshot works too.', tone: 'warn' });
    } finally {
      setSaving(false);
    }
  };

  // The picture to share, made ahead when possible: a share sheet has to open
  // while the tap still counts, and fetching or drawing can take a moment.
  const shareFile = useRef<{ key: string; file: File } | null>(null);
  const shareKey = done ? done.imageUrl : 'design';
  useEffect(() => {
    if (!done || !shareEnv?.canShareFiles || shareFile.current?.key === done.imageUrl) return;
    let cancelled = false;
    void photoFile(done.imageUrl, copy.photoFile).then((file) => {
      if (file && !cancelled) shareFile.current = { key: done.imageUrl, file };
    });
    return () => {
      cancelled = true;
    };
  }, [done, shareEnv, copy]);

  const plan = shareEnv ? sharePlan(shareEnv, Boolean(done)) : null;
  const share = async () => {
    if (sharing || !plan) return;
    setSharing(true);
    setNote(null);
    const title = copy.shareTitle;
    const text = done ? copy.sharePhotoText : copy.shareDesignText;
    try {
      if (plan === 'files') {
        let file = shareFile.current?.key === shareKey ? shareFile.current.file : null;
        let fresh = false;
        if (!file) {
          fresh = true;
          if (done) file = await photoFile(done.imageUrl, copy.photoFile);
          else file = await dataUrlFile(await snapshot(), copy.designFile);
          if (file) shareFile.current = { key: shareKey, file };
        }
        if (file && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title, text });
          } catch (e) {
            // Making the picture took long enough that the tap no longer counts: it is ready now.
            if (fresh && (e as Error)?.name === 'NotAllowedError') setNote({ text: 'Your picture is ready. Tap Share again to send it.', tone: 'muted' });
            else throw e;
          }
          return;
        }
        if (done && typeof navigator.share === 'function') {
          await navigator.share({ title, text, url: done.imageUrl });
          return;
        }
        throw new Error('nothing to share');
      }
      if (plan === 'link' && done) {
        await navigator.share({ title, text, url: done.imageUrl });
        return;
      }
      if (plan === 'copy' && done) {
        await navigator.clipboard.writeText(done.imageUrl);
        setNote({ text: 'Link to your realistic photo copied.', tone: 'muted' });
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote({ text: 'Sharing did not work on this device. Save my design works too.', tone: 'warn' });
    } finally {
      setSharing(false);
    }
  };

  // Closing the comparison removes its close button: keep keyboard focus on the button that brings it back.
  const reopenRef = useRef<HTMLButtonElement>(null);
  const closedByUser = useRef(false);
  useLayoutEffect(() => {
    if (done && !showRender && closedByUser.current) {
      closedByUser.current = false;
      reopenRef.current?.focus({ preventScroll: true });
    }
  }, [done, showRender]);

  const overlay = working ? (
    priceSettled ? <DevelopingPhoto preparing={phase.kind === 'preparing'} since={since} /> : null
  ) : done && showRender ? (
    <PhotoReveal
      before={done.before}
      after={done.imageUrl}
      celebrate={!reopened}
      subject={copy.subject}
      onClose={() => {
        closedByUser.current = true;
        setShowRender(false);
      }}
    />
  ) : null;

  // A retry only when another try can help: after a failure, or (rarely) a token that never started.
  const canRetry = Boolean(renderToken) && (phase.kind === 'failed' || phase.kind === 'idle');
  // A failure is explained only when they asked for this attempt; the automatic one fails quietly.
  const loud = !auto && (phase.kind === 'failed' || phase.kind === 'off');

  // One status line, always there with room for two lines, so nothing below it jumps.
  const status = note
    ? note
    : loud && (phase.kind === 'failed' || phase.kind === 'off')
      ? { text: phase.message, tone: phase.kind === 'failed' ? 'warn' : 'muted' }
      : working && priceSettled
        ? { text: `${DEVELOPING_LINE}. It usually takes 20 to 60 seconds, and your price is ready now.`, tone: 'muted' }
        : done
          ? { text: 'Your realistic photo is ready. Drag the handle to compare it with your design.', tone: 'muted' }
          : { text: 'Save a picture of your design to keep or share.', tone: 'dim' };

  const footer = (
    <div className="mt-2">
      <RevealStyles />
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1">
        <button type="button" onClick={save} disabled={saving} className={quietButton}>
          {saving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save my design'}
        </button>
        {plan ? (
          <button type="button" onClick={() => void share()} disabled={sharing} className={quietButton}>
            {sharing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
            Share
          </button>
        ) : null}
        {done && !showRender ? (
          <button
            ref={reopenRef}
            type="button"
            onClick={() => {
              setReopened(true);
              setShowRender(true);
            }}
            className={cn(glowButton, 'ml-auto')}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Show realistic photo
          </button>
        ) : canRetry ? (
          <button type="button" onClick={start} className={cn(glowButton, 'ml-auto')}>
            {loud ? <RotateCcw className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {loud ? 'Try again' : 'Make my realistic photo'}
          </button>
        ) : null}
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'min-h-10 text-xs leading-5 text-pretty',
          status.tone === 'warn' ? 'text-[var(--hq-warn)]' : status.tone === 'muted' ? 'text-[var(--hq-text-muted)]' : 'text-[var(--hq-text-dim)]',
        )}
      >
        {status.text}
      </p>
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
      builder={builder}
      answers={answers}
      dimensions={dimensions}
      night={night}
      onNightChange={onNightChange}
      variant="result"
      frameRef={frame}
      overlay={overlay}
      hideLighting={working || Boolean(done && showRender)}
      caption={done && showRender ? copy.photoCaption : undefined}
      footer={footer}
    />
  );
}
