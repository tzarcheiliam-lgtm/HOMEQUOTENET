'use client';

import { useId, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared look of the estimator screens. Same visual language as the ADU
 * estimator (components/marketing/adu-estimator.tsx): hq tokens, bordered
 * cards, tiles whose selected state is a border + tint (not colour alone), and
 * the shared focus outline.
 */

export const card = 'rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/60 p-4 sm:p-6';
export const eyebrow = 'text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]';
export const inputClass =
  'h-11 w-full rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-bg)] px-3 text-base text-[var(--hq-text)] placeholder:text-[var(--hq-text-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] aria-[invalid=true]:border-[var(--hq-bad)]';
export const textareaClass = cn(inputClass, 'h-auto min-h-24 py-2.5 leading-6');
export const primaryButton =
  'inline-flex h-12 items-center justify-center rounded-full bg-[var(--hq-cta)] px-7 text-sm font-semibold text-[var(--hq-cta-ink)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-not-allowed disabled:bg-[var(--hq-surface-2)] disabled:text-[var(--hq-text-dim)] disabled:hover:bg-[var(--hq-surface-2)]';
export const secondaryButton =
  'inline-flex h-12 items-center justify-center rounded-full border border-[var(--hq-line-strong)] px-6 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:border-[var(--hq-accent-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
export const linkButton =
  'inline-flex min-h-11 items-center text-sm font-medium text-[var(--hq-accent-bright)] underline underline-offset-4 hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';

/**
 * Press feel shared by option tiles and package cards: a quick squeeze to 97%
 * while pressed, then a small spring back on release (scale only, so nothing
 * around it moves). Colours keep a plain 150 ms ease. Nothing moves under reduced motion.
 */
export const pressable =
  'touch-manipulation [transition:scale_380ms_cubic-bezier(.34,1.56,.64,1),border-color_150ms_ease,background-color_150ms_ease] active:scale-[.97] active:[transition:scale_90ms_ease-out,border-color_150ms_ease,background-color_150ms_ease] motion-reduce:transition-none! motion-reduce:scale-100!';

const tile = cn(
  'group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-3.5 text-sm hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]',
  pressable,
);

/**
 * The selected mark: a round check that pops in (small overshoot) when the
 * tile's input is checked and fades out quickly when it is not. Lives inside a
 * `group` tile; decorative (the input carries the state).
 */
export function CheckBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-check-badge=""
      className={cn(
        'pointer-events-none grid size-7 place-items-center rounded-full bg-[var(--hq-accent-bright)] text-[var(--hq-bg)] opacity-0 shadow-[0_0_0_2px_var(--hq-bg),0_4px_12px_rgba(0,0,0,0.35)] [scale:.4] [transition:opacity_120ms_ease-out,scale_120ms_ease-out] group-has-[:checked]:opacity-100 group-has-[:checked]:[scale:1] group-has-[:checked]:[transition:opacity_140ms_ease-out,scale_420ms_cubic-bezier(.34,1.8,.64,1)] motion-reduce:transition-none!',
        className,
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </span>
  );
}

/**
 * Hover / keyboard-focus handlers for a previewable option (the live builder
 * draws it as a ghost). Hover starts on the first real pointer MOVE over the
 * tile, not on enter: after "Next" the new screen slides in under a resting
 * cursor, and that must not preview an option nobody pointed at. Touch is
 * ignored: a tap picks the option anyway, and a mouse click's focus is not
 * :focus-visible, so only real keyboard focus previews.
 */
export function previewHandlers(onPreview: ((on: boolean) => void) | undefined) {
  if (!onPreview) return { label: {}, input: {} };
  return {
    label: {
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'touch' || e.currentTarget.dataset.preview === 'on') return;
        // Layout shifts under a still cursor can produce moves of zero distance.
        if (e.movementX === 0 && e.movementY === 0) return;
        e.currentTarget.dataset.preview = 'on';
        onPreview(true);
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'touch' || e.currentTarget.dataset.preview !== 'on') return;
        delete e.currentTarget.dataset.preview;
        onPreview(false);
      },
    },
    input: {
      onFocus: (e: FocusEvent<HTMLInputElement>) => {
        let keyboard = false;
        try {
          keyboard = e.currentTarget.matches(':focus-visible');
        } catch {
          // Very old browsers: no :focus-visible, no focus preview.
        }
        if (keyboard) onPreview(true);
      },
      onBlur: () => onPreview(false),
    },
  };
}

/**
 * One selectable option: a native radio (single) or checkbox (multi) with the
 * label as its accessible name and the note/price as its description. `visual`
 * is a shape drawing, swatch or photo shown above the label. `onPreview` (live
 * builder) reports hover and keyboard focus so the picture can preview it.
 */
export function ChoiceTile({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  note,
  hint,
  visual,
  onPreview,
  className,
  children,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  note?: string;
  /** Price note, only passed when the range is revealed immediately. */
  hint?: string;
  visual?: ReactNode;
  onPreview?: (on: boolean) => void;
  className?: string;
  children?: ReactNode;
}) {
  const uid = useId();
  const describedBy = note || hint ? `${uid}-d` : undefined;
  const preview = previewHandlers(onPreview);
  return (
    <label className={cn(tile, className)} {...preview.label}>
      {visual ? (
        <span className="relative block">
          {/* A hairline inside the picture keeps light materials (plaster, concrete) from melting into the card. */}
          <span className="relative block h-24 overflow-hidden rounded-lg after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:h-28 [&>*]:block [&>*]:h-full [&>*]:w-full [&>img]:object-cover">
            {visual}
          </span>
          <CheckBadge className="absolute right-2 top-2" />
        </span>
      ) : null}
      <span className="flex items-start gap-3">
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          {...preview.input}
          aria-labelledby={`${uid}-l`}
          aria-describedby={describedBy}
          className="mt-0.5 size-4 shrink-0 accent-[var(--hq-accent)]"
        />
        <span className="min-w-0 flex-1">
          <span id={`${uid}-l`} className="block font-medium text-[var(--hq-text)]">
            {label}
          </span>
          {note || hint ? (
            <span id={describedBy} className="mt-0.5 block text-xs leading-5 text-[var(--hq-text-muted)]">
              {note}
              {note && hint ? ' · ' : null}
              {hint}
            </span>
          ) : null}
          {children}
        </span>
      </span>
    </label>
  );
}

/** A question group: native fieldset + legend. `hideLegend` keeps it for screen readers only. */
export function QuestionFieldset({
  legend,
  help,
  hideLegend,
  children,
}: {
  legend: string;
  help?: string;
  hideLegend?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className={cn('mb-1 text-base font-semibold text-[var(--hq-text)]', hideLegend && 'sr-only')}>{legend}</legend>
      {help ? <p className="mb-3 text-sm leading-6 text-[var(--hq-text-muted)]">{help}</p> : null}
      {children}
    </fieldset>
  );
}

/** Label + input + error, wired with ids so errors are announced with the field. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  /** Render prop gets the props the input needs for its label and description. */
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}) {
  const uid = useId();
  const describedBy = [error ? `${uid}-e` : null, hint ? `${uid}-h` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={uid} className="mb-1.5 block text-sm font-medium text-[var(--hq-text)]">
        {label}
      </label>
      {children({ id: uid, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint ? (
        <p id={`${uid}-h`} className="mt-1 text-xs text-[var(--hq-text-dim)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${uid}-e`} className="mt-1 text-sm text-[var(--hq-bad)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
