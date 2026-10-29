'use client';

import { useEffect, useId, useRef } from 'react';
import type { EstimatorTemplate } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { Field, inputClass } from '../ui';
import type { DimensionsInput } from '../use-estimator-flow';

/**
 * "I know my dimensions": optional length / width (and depth) in feet. Values
 * outside the template limits are ignored and the size preset is used; the
 * hint says so instead of silently changing the number. A template without
 * depth (a room: maxDepthFt 0) asks for length and width only. While valid
 * numbers are in use a quiet note says they win over the size picked above,
 * and ticking the box brings the fields (and that line) into view.
 */
export function SizeDimensions({
  template,
  enabled,
  onToggle,
  value,
  onChange,
  hint,
  using = false,
}: {
  template: EstimatorTemplate;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  value: DimensionsInput;
  onChange: (next: DimensionsInput) => void;
  hint?: string;
  /** Valid typed dimensions are in use (they win over the size tiles). */
  using?: boolean;
}) {
  const uid = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const opened = useRef(enabled);
  useEffect(() => {
    if (enabled && !opened.current) {
      const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      boxRef.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
    }
    opened.current = enabled;
  }, [enabled]);
  const lim = template.geometry.limits;
  const depth = lim.maxDepthFt > 0;
  // Tabular figures: the digits do not jiggle as the picture resizes with each keystroke.
  const numberInput = cn(inputClass, 'tabular-nums');
  const set = (key: keyof DimensionsInput) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });
  return (
    <div className="mt-6 border-t border-[var(--hq-line)] pt-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--hq-text)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-controls={`${uid}-dims`}
          className="size-4 shrink-0 accent-[var(--hq-accent)]"
        />
        I know my dimensions
      </label>
      <div id={`${uid}-dims`} ref={boxRef} hidden={!enabled} className="scroll-mb-6">
        {enabled ? (
          <>
            <div className={cn('mt-2 grid gap-3', depth ? 'grid-cols-3' : 'grid-cols-2')}>
              <Field label="Length (ft)">
                {(p) => (
                  <input {...p} type="number" inputMode="decimal" min={lim.minFt} max={lim.maxLengthFt} step="any" value={value.length} onChange={set('length')} className={numberInput} />
                )}
              </Field>
              <Field label="Width (ft)">
                {(p) => (
                  <input {...p} type="number" inputMode="decimal" min={lim.minFt} max={lim.maxWidthFt} step="any" value={value.width} onChange={set('width')} className={numberInput} />
                )}
              </Field>
              {depth ? (
                <Field label="Avg depth (ft)" hint="Optional">
                  {(p) => (
                    <input {...p} type="number" inputMode="decimal" min={lim.minDepthFt} max={lim.maxDepthFt} step="any" value={value.depth} onChange={set('depth')} className={numberInput} />
                  )}
                </Field>
              ) : null}
            </div>
            <p role="status" className={cn('mt-2 min-h-5 text-sm', hint ? 'text-[var(--hq-warn)]' : 'text-[var(--hq-text-muted)]')}>
              {hint ?? (using ? 'Using your measurements instead of the size above.' : '')}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
