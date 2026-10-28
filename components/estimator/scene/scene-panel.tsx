'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, Moon, Sparkles, Sun } from 'lucide-react';
import { picksFor } from '@/lib/estimator/engine';
import { EXAMPLE_SCENE, hasAnyPick } from '@/lib/estimator/scene/example';
import type { CameraFocus } from '@/lib/estimator/scene/geometry';
import { HIGHLIGHT_MS, sceneHighlights, type SceneHighlight } from '@/lib/estimator/scene/highlights';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { addedOptions, answerChanges, chipText, designSummary, optionLabeler, sceneChanges, sceneDescription } from '../builder';
import { BuilderStyles, CHIP_MS } from '../motion';
import { ExampleCompare } from './example-compare';
import { PoolScene } from './pool-scene';

export const SCENE_CAPTION = 'Illustration — your final design is confirmed at the on-site visit';
/** Phones, where the pinned picture needs every line it can get. */
const SCENE_CAPTION_SHORT = 'Illustration — final design confirmed on site';
/** Under the example split (renders on): what the two pictures are. */
export const EXAMPLE_PHOTO_CAPTION = 'Example: a design made here, and the realistic photo made from it';
/** On the example design shown before the first answer, so it is never mistaken for their choice. */
export const EXAMPLE_CAPTION = 'Example — your picks will change it';

/** How long the first-look build-up runs (keep in sync with the ps-intro CSS in pool-scene). */
const INTRO_MS = 1200;
/** The example fades out over the homeowner's own picture for this long after their first answer. */
const LEAVE_MS = 400;
/** The build-up plays once per page visit, even if the builder remounts (client-side navigation). */
let introPlayed = false;

export type ScenePanelProps = {
  template: EstimatorTemplate;
  /** The homeowner's real answers (package answers already merged). */
  answers: Answers;
  dimensions?: PoolDimensions;
  /** Hover/focus preview: these answers are drawn instead, as a ghost, until it ends. */
  preview?: { answers: Answers; label: string } | null;
  /** Controlled day/night (shared by the builder and the result); internal state when omitted. */
  night?: boolean;
  onNightChange?: (night: boolean) => void;
  /** builder: live panel with change chips and a phone collapse control. result: the finished design. */
  variant?: 'builder' | 'result';
  /** Camera: the whole design, or close on the pool while finish, tile and coping are chosen. */
  focus?: CameraFocus;
  /** The current screen: a change chip from the previous screen is cleared when it changes. */
  stepKey?: string;
  /** The frame element (the scene's <svg> is inside it), for "Save my design" and the photoreal render. */
  frameRef?: Ref<HTMLDivElement>;
  /** Drawn over the picture inside the frame (render progress, before/after). */
  overlay?: ReactNode;
  /** Hides the day/night switch (e.g. while a photoreal image covers the scene). */
  hideLighting?: boolean;
  /** Below the caption (actions). */
  footer?: ReactNode;
  /**
   * Renders are on: before the first answer the frame shows an example design
   * beside its realistic photo (ExampleCompare) instead of the example
   * illustration, so the promise of a photo is shown, not just said.
   */
  examplePhoto?: boolean;
  /** Replaces the illustration caption under the picture (e.g. while the realistic photo is shown). */
  caption?: string;
  className?: string;
};

// Solid, not backdrop-blur: a blur is recomputed every time the animated picture under it repaints.
const pill = 'pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[#06122b]/80 px-3 text-xs font-semibold text-white shadow-sm';

/** Questions whose "help me choose" answer the chip names ("We'll help you pick a finish"). */
const MATERIAL_IDS = ['surface', 'tile', 'coping', 'deck'];

/**
 * The live top-down picture of the homeowner's pool beside the questions:
 * <PoolScene> drawn from the flow's answers (buildScene), framed at 3:2, with a
 * Day/Night switch, the illustration caption, a ghost state while an option is
 * previewed, and a short chip when a pick visibly changes the picture
 * ("Baja shelf added", with a photo of a real job when the option has one;
 * "Signature package applied"; "Equipment upgrade added to your plan"),
 * announced politely to screen readers.
 * Before the first answer it shows an example design captioned as one
 * (EXAMPLE_CAPTION); the first look builds up in three quick beats, and each
 * committed pick briefly highlights the spot it changed on the picture.
 * On phones the builder variant can be collapsed so long screens stay usable.
 * The frame's width is capped by --eb-max-h (set by the parent) so the
 * picture never takes over a short screen. Memoized: typing in the contact
 * fields re-renders the flow but never redraws the picture.
 */
export const ScenePanel = memo(function ScenePanel({
  template,
  answers,
  dimensions,
  preview,
  night,
  onNightChange,
  variant = 'builder',
  focus = 'yard',
  stepKey,
  frameRef,
  overlay,
  hideLighting,
  footer,
  examplePhoto = false,
  caption,
  className,
}: ScenePanelProps) {
  const uid = useId();
  const frameId = `${uid}-frame`;
  const labeler = useMemo(() => optionLabeler(template), [template]);
  const scene = useMemo(() => buildScene(template, { answers, dimensions }), [template, answers, dimensions]);
  const previewAnswers = preview?.answers;
  // A preview that would not change the picture (typed dimensions win over a size, "not sure") shows no ghost.
  const ghost = useMemo(() => {
    if (!previewAnswers) return null;
    const next = buildScene(template, { answers: previewAnswers, dimensions });
    return JSON.stringify(next) === JSON.stringify(scene) ? null : next;
  }, [template, previewAnswers, dimensions, scene]);
  // Nothing answered yet: an example design (captioned as one) instead of a bare pool on a lawn.
  const example = variant === 'builder' && !hasAnyPick(answers, Boolean(dimensions));
  const shown = ghost ?? (example ? EXAMPLE_SCENE : scene);
  // The committed design as pills under the picture on desktop (fills the column and grows as they build).
  const items = useMemo(() => (variant === 'builder' ? designSummary(scene, labeler) : []), [variant, scene, labeler]);

  const [ownNight, setOwnNight] = useState(false);
  const isNight = night ?? ownNight;
  const setNight = (value: boolean) => (onNightChange ? onNightChange(value) : setOwnNight(value));
  const [collapsed, setCollapsed] = useState(false);

  // First look: build the picture up once (state, so server and first client render agree), then switch it off.
  const [intro, setIntro] = useState(() => variant === 'builder' && !introPlayed);
  useEffect(() => {
    if (!intro) return;
    introPlayed = true;
    const t = setTimeout(() => setIntro(false), INTRO_MS + 150);
    return () => clearTimeout(t);
  }, [intro]);

  // The first answer: the example fades away over their own picture instead of vanishing.
  const [leaving, setLeaving] = useState<number | null>(null);
  const wasExample = useRef(example);
  useEffect(() => {
    if (wasExample.current && !example) setLeaving(Date.now());
    wasExample.current = example;
  }, [example]);
  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => setLeaving(null), LEAVE_MS + 50);
    return () => clearTimeout(t);
  }, [leaving]);

  // Change chip: diff the committed answers and scene against the last ones (previews never chip).
  // `onPicture`: the picture also highlights the spot itself, so the frame does not glow as well.
  const [chip, setChip] = useState<{ key: number; text: string; image?: string; onPicture?: boolean } | null>(null);
  // ...and the spot on the picture that changed (a shimmer, ripple or sparkle), for under HIGHLIGHT_MS.
  const [flash, setFlash] = useState<{ key: number; items: SceneHighlight[] } | null>(null);
  // A new screen starts clean: a chip about the last screen's pick would read as wrong.
  useEffect(() => setChip(null), [stepKey]);
  const last = useRef({ scene, answers });
  useEffect(() => {
    const prev = last.current;
    last.current = { scene, answers };
    if (variant !== 'builder' || (prev.scene === scene && prev.answers === answers)) return;
    const highlights = sceneHighlights(prev.scene, scene);
    if (highlights.length) setFlash({ key: Date.now(), items: highlights });
    const fromAnswers = answerChanges(template, prev.answers, answers, labeler);
    const unsure = new Set(
      MATERIAL_IDS.filter((id) => {
        const q = template.questions.find((question) => question.id === id);
        return q ? picksFor(q, answers).includes('unsure') : false;
      }),
    );
    const text = fromAnswers.package ?? chipText([...sceneChanges(prev.scene, scene, labeler, unsure), ...fromAnswers.added]);
    if (!text) return;
    // A just-added feature with a photo shows that real job beside the words.
    const image = fromAnswers.package
      ? undefined
      : addedOptions(prev.scene, scene)
          .map(({ questionId, optionId }) => template.questions.find((q) => q.id === questionId)?.options.find((o) => o.id === optionId)?.image)
          .find(Boolean);
    setChip({ key: Date.now(), text, image, onPicture: highlights.length > 0 });
  }, [scene, answers, template, labeler, variant]);
  useEffect(() => {
    if (!chip) return;
    const t = setTimeout(() => setChip(null), CHIP_MS);
    return () => clearTimeout(t);
  }, [chip]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), HIGHLIGHT_MS + 100);
    return () => clearTimeout(t);
  }, [flash]);
  // The frame glows only for picks the picture cannot point at (a plan item, "help me choose").
  const glow = chip && !chip.onPicture;
  // The example split (renders on) covers the frame until the first answer or a hover preview.
  const compare = examplePhoto && example && !ghost;

  return (
    <div className={cn('min-w-0', className)} data-scene-panel={variant}>
      <BuilderStyles />
      <div
        id={frameId}
        ref={frameRef}
        data-preview={ghost ? 'true' : undefined}
        className={cn(
          'relative mx-auto overflow-hidden rounded-2xl border border-[var(--hq-line-strong)] bg-[#d8d2c3] shadow-[0_22px_48px_-24px_rgba(0,0,0,0.75)]',
          collapsed && 'max-lg:hidden',
        )}
        style={{ aspectRatio: '3 / 2', width: 'min(100%, calc(var(--eb-max-h, 4000px) * 1.5))' }}
      >
        <PoolScene
          scene={shown}
          night={isNight}
          focus={focus}
          intro={intro}
          highlight={flash}
          label={example && !ghost ? `Example design, not your picks yet. ${sceneDescription(shown, labeler)}` : sceneDescription(shown, labeler)}
          className="absolute inset-0 block size-full"
        />
        {leaving !== null ? (
          // The example, fading out over their first picture (decorative; gone after LEAVE_MS).
          examplePhoto ? (
            <ExampleCompare key={leaving} leaving />
          ) : (
            <div key={leaving} className="pointer-events-none absolute inset-0" aria-hidden="true">
              <PoolScene scene={EXAMPLE_SCENE} night={isNight} focus={focus} label="" className="ps-leave absolute inset-0 block size-full" />
            </div>
          )
        ) : null}
        {compare ? <ExampleCompare /> : null}
        {/* Re-keyed on every chip so the frame glows once per visible change. */}
        {glow ? <div key={`glow-${chip.key}`} className="eb-glow pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" /> : null}

        {example && !ghost && !compare ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
            <span data-example-caption="" className={cn(pill, 'h-8 max-w-full')}>
              <Sparkles className="size-3.5 shrink-0 text-[#ffd666]" aria-hidden="true" />
              <span className="truncate">{EXAMPLE_CAPTION}</span>
            </span>
          </div>
        ) : null}

        {ghost ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/75" aria-hidden="true">
            <span className={cn(pill, 'eb-badge absolute right-2.5 top-2.5 h-8 max-w-[70%] sm:right-3 sm:top-3')}>
              <Eye className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Preview: {preview?.label}</span>
            </span>
          </div>
        ) : null}

        {!hideLighting && !compare ? (
          <div role="group" aria-label="Lighting" className="absolute left-2.5 top-2.5 flex rounded-full bg-[#06122b]/80 p-0.5 shadow-sm sm:left-3 sm:top-3">
            {([false, true] as const).map((value) => {
              const Icon = value ? Moon : Sun;
              return (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={isNight === value}
                  onClick={() => setNight(value)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white sm:h-8 sm:px-3 sm:text-xs',
                    isNight === value ? 'bg-white text-[#06122b]' : 'text-white/85 hover:text-white',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {value ? 'Night' : 'Day'}
                </button>
              );
            })}
          </div>
        ) : null}

        {chip ? (
          // Tablet and up: over the bottom of the picture. Phones show it under the picture instead (below).
          <div key={`chip-${chip.key}`} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3 max-sm:hidden">
            <span
              className={cn(
                'eb-chip inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/95 py-1.5 pr-3.5 text-xs font-semibold text-[#06122b] shadow-lg sm:text-sm',
                chip.image ? 'gap-2 pl-1.5' : 'pl-3.5',
              )}
            >
              {chip.image ? (
                // Plain img: a contractor photo of unknown size, cropped to a round thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chip.image} alt="" className="size-9 shrink-0 rounded-full object-cover sm:size-10" />
              ) : (
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-1">
                  {chip.image ? <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
                  <span className="truncate">{chip.text}</span>
                </span>
                {chip.image ? <span className="block truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">Like this finished job</span> : null}
              </span>
            </span>
          </div>
        ) : null}

        {overlay}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {chip?.text ?? ''}
      </p>

      <div className="relative mt-1.5 flex min-h-8 items-center justify-between gap-3">
        <p className={cn('text-[11px] leading-4 text-[var(--hq-text-dim)] sm:text-xs', chip && !collapsed && 'max-sm:invisible')}>
          {collapsed ? (
            <span className="lg:hidden">Your pool picture is hidden.</span>
          ) : caption || compare ? (
            (caption ?? EXAMPLE_PHOTO_CAPTION)
          ) : (
            <>
              <span className={cn(variant === 'builder' && 'max-sm:hidden')}>{SCENE_CAPTION}</span>
              {variant === 'builder' ? <span className="sm:hidden">{SCENE_CAPTION_SHORT}</span> : null}
            </>
          )}
          {collapsed ? <span className="max-lg:hidden">{SCENE_CAPTION}</span> : null}
        </p>
        {chip && !collapsed ? (
          // Phones: the chip sits just under the picture, over the caption (same height, so nothing moves),
          // and never covers the spot on the picture that just changed. It stops short of "Hide picture".
          <div key={`chip-m-${chip.key}`} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-28 flex items-center sm:hidden">
            <span className="eb-chip inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-white/95 pr-3 pl-1 text-xs font-semibold text-[#06122b] shadow-md">
              {chip.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chip.image} alt="" className="size-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center">
                  <Check className="size-4 text-emerald-600" aria-hidden="true" />
                </span>
              )}
              <span className="truncate">{chip.text}</span>
            </span>
          </div>
        ) : null}
        {variant === 'builder' ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={frameId}
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-[var(--hq-accent-bright)] hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] lg:hidden"
          >
            {collapsed ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
            {collapsed ? 'Show picture' : 'Hide picture'}
          </button>
        ) : null}
      </div>
      {variant === 'builder' && items.length > 1 ? (
        <ul aria-label="Your design so far" className="mt-3 hidden flex-wrap gap-2 lg:flex">
          {items.map((item) => (
            <li
              key={item.label}
              className="rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface)]/60 px-3 py-1 text-xs text-[var(--hq-text-muted)]"
            >
              <span className="text-[var(--hq-text-dim)]">{item.label}: </span>
              <span className="font-medium text-[var(--hq-text)]">{item.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {footer}
    </div>
  );
});
