import { cn } from '@/lib/utils';

export type Stage = { id: string; label: string };
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
 * Named stages instead of "Step N" (Pool, Finishes, Features, Backyard,
 * Unlock): one bar segment per stage, filled up to the current one, with its
 * label underneath. Purely presentational; the parent maps screens to stages.
 * The fill grows with a transform (no layout work) and does not animate under
 * reduced motion. Labels change colour only, never weight, so nothing shifts.
 */
export function StageStepper({
  stages,
  current,
  className,
  label = 'Progress',
}: {
  stages: readonly Stage[];
  current: string | undefined;
  className?: string;
  label?: string;
}) {
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
                    state === 'done' && 'scale-x-100 bg-[var(--es-aqua,#2ec5d3)]',
                    state === 'current' && 'scale-x-100 bg-[var(--hq-text)]',
                    state === 'upcoming' && 'scale-x-0 bg-[var(--hq-text)]',
                  )}
                />
              </span>
              <span
                className={cn(
                  'mt-1.5 block truncate text-xs leading-4',
                  state === 'current' ? 'text-[var(--hq-text)]' : state === 'done' ? 'text-[var(--hq-text-muted)]' : 'text-[var(--hq-text-dim)]',
                )}
              >
                {stage.label}
                {state === 'done' ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
