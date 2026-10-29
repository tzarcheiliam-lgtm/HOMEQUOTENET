'use client';

import { useId, type ReactNode } from 'react';
import { formatRange, picksFor } from '@/lib/estimator/engine';
import type { Answers, EstimatorOption, EstimatorQuestion, PoolShape } from '@/lib/estimator/types';
import { PoolShapeIcon } from '../pool-shapes';
import { optionMaterial } from '../scene/materials';
import { MaterialSample, MaterialSampler, Swatch } from '../swatches';
import { ChoiceTile, QuestionFieldset } from '../ui';
import { optionPriceHint, type FlowScreen } from '../use-estimator-flow';
import { cn } from '@/lib/utils';

/** The trade's own option picture (TradeBuilder.optionVisual), or null. */
type OptionVisual = (questionId: string, optionId: string) => ReactNode | null;

/**
 * What an option shows above its label: a shape drawing, a photo (a real job,
 * or a labelled style idea), the trade's own material sample (bathroom tile,
 * paint, fixture finish), a crop of the real pool material (the texture the
 * live picture paints, a finish shown under water), or the drawn swatch for
 * anything else.
 */
function visualFor(q: EstimatorQuestion, o: EstimatorOption, tradeVisual?: OptionVisual) {
  if (q.role === 'shape') return <PoolShapeIcon shape={o.id as PoolShape} className="h-full w-full" />;
  if (o.image) {
    // Plain img: contractor photos are public paths of unknown size, and the card crops them to a fixed height.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={o.image} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  const own = tradeVisual?.(q.id, o.id);
  if (own) return own;
  if (optionMaterial(q.id, o.id)) return <MaterialSample questionId={q.id} optionId={o.id} swatch={o.swatch} className="h-full w-full" />;
  if (o.swatch) return <Swatch id={o.swatch} className="h-full w-full" />;
  if (o.id === 'unsure') {
    // "Help me choose": a strip of every material on offer, so the row of pictures stays even.
    const others = q.options.map((x) => x.id).filter((id) => id !== o.id);
    if (others.filter((id) => optionMaterial(q.id, id)).length >= 2) return <MaterialSampler questionId={q.id} optionIds={others} className="h-full w-full" />;
  }
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
  onPreview,
  optionVisual,
}: {
  screen: FlowScreen;
  answers: Answers;
  onPick: (q: EstimatorQuestion, optionId: string) => void;
  /** revealRange "immediately": option tiles carry a small price note. */
  showPrices: boolean;
  /** Live builder: hover / keyboard focus on an option (null when it ends). */
  onPreview?: (q: EstimatorQuestion, optionId: string | null) => void;
  /** The trade's material samples for option tiles (live builder). */
  optionVisual?: OptionVisual;
}) {
  const uid = useId();
  const single = screen.questions.length === 1;
  return (
    <div className="space-y-7">
      {screen.questions.map((q) => {
        const picks = picksFor(q, answers);
        const hasVisual =
          q.role === 'shape' || q.options.some((o) => o.swatch || o.image || optionMaterial(q.id, o.id) || optionVisual?.(q.id, o.id));
        // Container queries (the form card is an @container), so tiles fit both the full-width
        // card and the narrower question column beside the live picture (~500 px: two across,
        // so labels like "Resurface existing" never break mid-word).
        const columns = hasVisual
          ? 'grid-cols-2 @xl:grid-cols-3'
          : q.role === 'project' || q.options.length <= 3
            ? '@md:grid-cols-2'
            : 'grid-cols-1 @md:grid-cols-2';
        return (
          <QuestionFieldset
            key={q.id}
            legend={q.label}
            help={q.help ?? (q.kind === 'multi' ? 'Pick all that apply.' : undefined)}
            hideLegend={single && q.label === screen.title}
          >
            <div className={cn('grid gap-3', columns, q.role === 'shape' && '@xl:grid-cols-4')}>
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
                  visual={visualFor(q, o, optionVisual)}
                  onPreview={onPreview ? (on) => onPreview(q, on ? o.id : null) : undefined}
                />
              ))}
            </div>
          </QuestionFieldset>
        );
      })}
    </div>
  );
}
