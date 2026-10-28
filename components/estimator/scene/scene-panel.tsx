'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, Moon, Sun } from 'lucide-react';
import { picksFor } from '@/lib/estimator/engine';
import type { CameraFocus } from '@/lib/estimator/scene/geometry';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { addedOptions, answerChanges, chipText, designSummary, optionLabeler, sceneChanges, sceneDescription } from '../builder';
import { BuilderStyles, CHIP_MS } from '../motion';
import { PoolScene } from './pool-scene';

export const SCENE_CAPTION = 'Illustration — your final design is confirmed at the on-site visit';
/** Phones, where the pinned picture needs every line it can get. */
const SCENE_CAPTION_SHORT = 'Illustration — final design confirmed on site';

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
  const shown = ghost ?? scene;
  // The committed design as pills under the picture on desktop (fills the column and grows as they build).
  const items = useMemo(() => (variant === 'builder' ? designSummary(scene, labeler) : []), [variant, scene, labeler]);

  const [ownNight, setOwnNight] = useState(false);
  const isNight = night ?? ownNight;
  const setNight = (value: boolean) => (onNightChange ? onNightChange(value) : setOwnNight(value));
  const [collapsed, setCollapsed] = useState(false);

  // Change chip: diff the committed answers and scene against the last ones (previews never chip).
  const [chip, setChip] = useState<{ key: number; text: string; image?: string } | null>(null);
  // A new screen starts clean: a chip about the last screen's pick would read as wrong.
  useEffect(() => setChip(null), [stepKey]);
  const last = useRef({ scene, answers });
  useEffect(() => {
    const prev = last.current;
    last.current = { scene, answers };
    if (variant !== 'builder' || (prev.scene === scene && prev.answers === answers)) return;
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
    setChip({ key: Date.now(), text, image });
  }, [scene, answers, template, labeler, variant]);
  useEffect(() => {
    if (!chip) return;
    const t = setTimeout(() => setChip(null), CHIP_MS);
    return () => clearTimeout(t);
  }, [chip]);

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
        <PoolScene scene={shown} night={isNight} focus={focus} label={sceneDescription(shown, labeler)} className="absolute inset-0 block size-full" />
        {/* Re-keyed on every chip so the frame glows once per visible change. */}
        {chip ? <div key={`glow-${chip.key}`} className="eb-glow pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" /> : null}

        {ghost ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/75" aria-hidden="true">
            <span className={cn(pill, 'eb-badge absolute right-2.5 top-2.5 h-8 max-w-[70%] sm:right-3 sm:top-3')}>
              <Eye className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Preview: {preview?.label}</span>
            </span>
          </div>
        ) : null}

        {!hideLighting ? (
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
          <div key={`chip-${chip.key}`} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
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

      <div className="mt-1.5 flex min-h-8 items-center justify-between gap-3">
        <p className="text-[11px] leading-4 text-[var(--hq-text-dim)] sm:text-xs">
          {collapsed ? (
            <span className="lg:hidden">Your pool picture is hidden.</span>
          ) : (
            <>
              <span className={cn(variant === 'builder' && 'max-sm:hidden')}>{SCENE_CAPTION}</span>
              {variant === 'builder' ? <span className="sm:hidden">{SCENE_CAPTION_SHORT}</span> : null}
            </>
          )}
          {collapsed ? <span className="max-lg:hidden">{SCENE_CAPTION}</span> : null}
        </p>
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
