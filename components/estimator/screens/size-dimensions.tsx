'use client';

import { useId } from 'react';
import type { EstimatorTemplate } from '@/lib/estimator/types';
import { Field, inputClass } from '../ui';
import type { DimensionsInput } from '../use-estimator-flow';

/**
 * "I know my dimensions": optional length / width (and depth) in feet. Values
 * outside the template limits are ignored and the size preset is used; the
 * hint says so instead of silently changing the number.
 */
export function SizeDimensions({
  template,
  enabled,
  onToggle,
  value,
  onChange,
  hint,
}: {
  template: EstimatorTemplate;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  value: DimensionsInput;
  onChange: (next: DimensionsInput) => void;
  hint?: string;
}) {
  const uid = useId();
  const lim = template.geometry.limits;
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
      <div id={`${uid}-dims`} hidden={!enabled}>
        {enabled ? (
          <>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <Field label="Length (ft)">
                {(p) => (
                  <input {...p} type="number" inputMode="decimal" min={lim.minFt} max={lim.maxLengthFt} step="any" value={value.length} onChange={set('length')} className={inputClass} />
                )}
              </Field>
              <Field label="Width (ft)">
                {(p) => (
                  <input {...p} type="number" inputMode="decimal" min={lim.minFt} max={lim.maxWidthFt} step="any" value={value.width} onChange={set('width')} className={inputClass} />
                )}
              </Field>
              <Field label="Avg depth (ft)" hint="Optional">
                {(p) => (
                  <input {...p} type="number" inputMode="decimal" min={lim.minDepthFt} max={lim.maxDepthFt} step="any" value={value.depth} onChange={set('depth')} className={inputClass} />
                )}
              </Field>
            </div>
            <p role="status" className="mt-2 min-h-5 text-sm text-[var(--hq-warn)]">
              {hint ?? ''}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
