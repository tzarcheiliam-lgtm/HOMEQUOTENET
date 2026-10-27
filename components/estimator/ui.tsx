'use client';

import { useId, type ReactNode } from 'react';
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
  'inline-flex h-12 items-center justify-center rounded-full bg-[var(--hq-cta)] px-7 text-sm font-semibold text-[var(--hq-cta-ink)] transition-colors hover:bg-[var(--hq-cta-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--hq-cta)]';
export const secondaryButton =
  'inline-flex h-12 items-center justify-center rounded-full border border-[var(--hq-line-strong)] px-6 text-sm font-semibold text-[var(--hq-text)] transition-colors hover:border-[var(--hq-accent-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';
export const linkButton =
  'inline-flex min-h-11 items-center text-sm font-medium text-[var(--hq-accent-bright)] underline underline-offset-4 hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)]';

const tile =
  'flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-3.5 text-sm transition-colors hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]';

/**
 * One selectable option: a native radio (single) or checkbox (multi) with the
 * label as its accessible name and the note/price as its description. `visual`
 * is a shape drawing, swatch or photo shown above the label.
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
  className?: string;
  children?: ReactNode;
}) {
  const uid = useId();
  const describedBy = note || hint ? `${uid}-d` : undefined;
  return (
    <label className={cn(tile, className)}>
      {visual ? <span className="block overflow-hidden rounded-lg [&>*]:block [&>*]:h-full [&>*]:w-full">{visual}</span> : null}
      <span className="flex items-start gap-3">
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
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
