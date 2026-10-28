'use client';

import { useId } from 'react';
import { picksFor } from '@/lib/estimator/engine';
import { CUSTOM_PACKAGE_ID, type Answers, type EstimatorQuestion, type EstimatorTemplate } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { CheckBadge, linkButton, pressable, previewHandlers } from '../ui';

const cardClass = cn(
  'group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-bg)] p-4 text-sm hover:border-[var(--hq-line-strong)] has-[:checked]:border-[var(--hq-accent-bright)] has-[:checked]:bg-[var(--hq-accent-glow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--hq-accent-bright)]',
  pressable,
);

/**
 * The starting-point screen: a card per package (label, description, what is
 * included, "Most popular") plus "Build my own". Picking a package skips the
 * scope and detail screens; the link underneath brings them back. Cards
 * squeeze slightly when pressed and pop a check when picked.
 */
export function PackageScreen({
  template,
  question,
  answers,
  onPick,
  canCustomize,
  onCustomize,
  onPreview,
}: {
  template: EstimatorTemplate;
  question: EstimatorQuestion;
  answers: Answers;
  onPick: (optionId: string) => void;
  /** A ready-made package is picked and the details are still hidden. */
  canCustomize: boolean;
  onCustomize: () => void;
  /** Live builder: hovering or keyboard-focusing a card previews the package's look (null when it ends). */
  onPreview?: (optionId: string | null) => void;
}) {
  const uid = useId();
  const picked = picksFor(question, answers)[0];
  return (
    <div>
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">{question.label}</legend>
        <div className="grid gap-3 @xl:grid-cols-2">
          {question.options.map((o) => {
            const pkg = template.packages.find((p) => p.id === o.id);
            const custom = o.id === CUSTOM_PACKAGE_ID;
            const labelId = `${uid}-${o.id}-l`;
            const descId = `${uid}-${o.id}-d`;
            const preview = previewHandlers(onPreview ? (on) => onPreview(on ? o.id : null) : undefined);
            return (
              <label key={o.id} className={cn(cardClass, custom && '@xl:col-span-2')} {...preview.label}>
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`${uid}-package`}
                    value={o.id}
                    checked={picked === o.id}
                    onChange={() => onPick(o.id)}
                    {...preview.input}
                    aria-labelledby={labelId}
                    aria-describedby={descId}
                    className="mt-1 size-4 shrink-0 accent-[var(--hq-accent)]"
                  />
                  <span className="min-w-0 flex-1 pr-8">
                    <span className="flex flex-wrap items-center gap-2">
                      <span id={labelId} className="text-base font-semibold text-[var(--hq-text)]">
                        {pkg?.label ?? o.label}
                      </span>
                      {pkg?.popular ? (
                        <span className="rounded-full bg-[var(--hq-cta)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hq-cta-ink)]">
                          Most popular
                        </span>
                      ) : null}
                    </span>
                    <span id={descId} className="mt-1 block leading-6 text-[var(--hq-text-muted)]">
                      {pkg?.description ?? o.note ?? (custom ? 'Choose exactly what you want included.' : '')}
                    </span>
                    {pkg?.includes.length ? (
                      <ul className="mt-2 space-y-1 text-[var(--hq-text)]">
                        {pkg.includes.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span aria-hidden="true" className="text-[var(--hq-good)]">
                              ✓
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </span>
                </span>
                <CheckBadge className="absolute right-3 top-3" />
              </label>
            );
          })}
        </div>
      </fieldset>
      {canCustomize && picked && picked !== CUSTOM_PACKAGE_ID ? (
        <p className="mt-3">
          <button type="button" onClick={onCustomize} className={linkButton}>
            Customize this package
          </button>
        </p>
      ) : null}
    </div>
  );
}
