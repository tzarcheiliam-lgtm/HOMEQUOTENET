'use client';

import { useId } from 'react';
import { formatRange } from '@/lib/estimator/engine';
import { picksFor } from '@/lib/estimator/engine';
import type { Answers, EstimatorOption, EstimatorQuestion, PoolShape } from '@/lib/estimator/types';
import { PoolShapeIcon } from '../pool-shapes';
import { Swatch } from '../swatches';
import { ChoiceTile, QuestionFieldset } from '../ui';
import { optionPriceHint, type FlowScreen } from '../use-estimator-flow';
import { cn } from '@/lib/utils';

/** What an option shows above its label: a shape drawing, a swatch or a photo. */
function visualFor(q: EstimatorQuestion, o: EstimatorOption) {
  if (q.role === 'shape') return <PoolShapeIcon shape={o.id as PoolShape} className="h-full w-full" />;
  if (o.image) {
    // Plain img: contractor photos are public paths of unknown size, and the card crops them to a fixed height.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={o.image} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  if (o.swatch) return <Swatch id={o.swatch} className="h-full w-full" />;
  return undefined;
}

/**
 * One or more questions that share a screen. Tiles are native radios (single)
 * or checkboxes (multi) inside a fieldset with the question as its legend.
 */
export function QuestionScreen({
  screen,
  answers,
  onPick,
  showPrices,
}: {
  screen: FlowScreen;
  answers: Answers;
  onPick: (q: EstimatorQuestion, optionId: string) => void;
  /** revealRange "immediately": option tiles carry a small price note. */
  showPrices: boolean;
}) {
  const uid = useId();
  const single = screen.questions.length === 1;
  return (
    <div className="space-y-7">
      {screen.questions.map((q) => {
        const picks = picksFor(q, answers);
        const hasVisual = q.role === 'shape' || q.options.some((o) => o.swatch || o.image);
        const columns = hasVisual
          ? 'grid-cols-2 sm:grid-cols-3'
          : q.role === 'project' || q.options.length <= 3
            ? 'sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2';
        return (
          <QuestionFieldset
            key={q.id}
            legend={q.label}
            help={q.help ?? (q.kind === 'multi' ? 'Pick all that apply.' : undefined)}
            hideLegend={single && q.label === screen.title}
          >
            <div className={cn('grid gap-3', columns, q.role === 'shape' && 'sm:grid-cols-4')}>
              {q.options.map((o) => (
                <ChoiceTile
                  key={o.id}
                  type={q.kind === 'single' ? 'radio' : 'checkbox'}
                  name={`${uid}-${q.id}`}
                  value={o.id}
                  checked={picks.includes(o.id)}
                  onChange={() => onPick(q, o.id)}
                  label={o.label}
                  note={o.note}
                  hint={showPrices ? optionPriceHint(o.price, formatRange) : undefined}
                  visual={visualFor(q, o)}
                />
              ))}
            </div>
          </QuestionFieldset>
        );
      })}
    </div>
  );
}
