import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** `prize`: the stage that unlocks the rewards (drawn with a small lock until it is reached). */
export type Stage = { id: string; label: string; prize?: boolean };
export type StageState = 'done' | 'current' | 'upcoming';

/** Where each stage stands relative to `current`. An unknown current leaves every stage upcoming. */
export function stageStates(stages: readonly Stage[], current: string | undefined): StageState[] {
  const at = stages.findIndex((s) => s.id === current);
  return stages.map((_, i) => (at < 0 ? 'upcoming' : i < at ? 'done' : i === at ? 'current' : 'upcoming'));
}

/** Screen-reader summary, e.g. "Finishes, stage 2 of 5". Empty when current is not a stage. */
export function stageSummary(stages: readonly Stage[], current: string | undefined): string {
  const at = stages.findIndex((s) => s.id === current);
  return at < 0 ? '' : `${stages[at]!.label}, stage ${at + 1} of ${stages.length}`;
}

const EASE = 'ease-[cubic-bezier(.65,0,.35,1)]';

/**
 * Named stages instead of "Step N" (Pool, Style, Details, Unlock): one bar
 * segment per stage, filled up to the current one, with its label underneath.
 * The current segment fills part-way (`fraction`, how far through that stage
 * they are), so a long stage still shows movement on every screen. The prize
 * stage carries a small lock. Purely presentational; the parent maps screens
 * to stages. The fill grows with a transform (no layout work) and does not
 * animate under reduced motion. Labels change color only, never weight, so
 * nothing shifts.
 */
export function StageStepper({
  stages,
  current,
  fraction = 1,
  className,
  label = 'Progress',
}: {
  stages: readonly Stage[];
  current: string | undefined;
  /** How far through the current stage (0 to 1). */
  fraction?: number;
  className?: string;
  label?: string;
}) {
  // Never empty (the current stage has started) and never more than full.
  const part = Math.min(1, Math.max(0.2, Number.isFinite(fraction) ? fraction : 1));
  const states = stageStates(stages, current);
  const summary = stageSummary(stages, current);
  return (
    <div role="group" aria-label={label} className={cn('min-w-0', className)}>
      {summary ? <p className="sr-only">{summary}</p> : null}
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(0, 1fr))` }}>
        {stages.map((stage, i) => {
          const state = states[i]!;
          return (
            <li key={stage.id} data-state={state} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0">
              <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-[var(--hq-line)]">
                <span
                  className={cn(
                    'block h-full w-full origin-left rounded-full transition-[transform,background-color] duration-500 motion-reduce:transition-none',
                    EASE,
                    state === 'done' ? 'bg-[var(--es-aqua,#2ec5d3)]' : 'bg-[var(--hq-text)]',
                  )}
                  // One property for every state (an inline transform), so moving between states always glides.
                  style={{ transform: `scaleX(${state === 'done' ? 1 : state === 'upcoming' ? 0 : Math.round(part * 1000) / 1000})` }}
                />
              </span>
              <span
                className={cn(
                  'mt-1.5 flex min-w-0 items-center gap-1 text-xs leading-4',
                  state === 'current' ? 'text-[var(--hq-text)]' : state === 'done' ? 'text-[var(--hq-text-muted)]' : 'text-[var(--hq-text-dim)]',
                )}
              >
                {stage.prize && state !== 'done' ? <Lock aria-hidden="true" className="size-3 shrink-0" strokeWidth={2.6} /> : null}
                <span className="truncate">{stage.label}</span>
                {state === 'done' ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
