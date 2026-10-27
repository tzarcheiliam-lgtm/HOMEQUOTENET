import { AlertTriangle, Flag, Hourglass, MinusCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StoryItem, StoryTone } from '@/lib/workflows/graph/run-story';
import { NodeIcon } from '@/components/workflows/builder/node-icons';

const TONE: Record<StoryTone, { ring: string; label: string }> = {
  start: { ring: 'bg-primary text-primary-foreground border-primary', label: 'Started' },
  done: { ring: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900', label: 'Done' },
  skipped: { ring: 'bg-muted text-muted-foreground border-border', label: 'Skipped' },
  waiting: { ring: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900', label: 'In progress' },
  problem: { ring: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900', label: 'Problem' },
  end: { ring: 'bg-zinc-800 text-zinc-50 border-zinc-800', label: 'Finished' },
};

function ToneIcon({ item }: { item: StoryItem }) {
  const cls = 'size-3.5';
  if (item.tone === 'problem') return <AlertTriangle className={cls} aria-hidden />;
  if (item.tone === 'skipped') return <MinusCircle className={cls} aria-hidden />;
  if (item.nodeType) return <NodeIcon type={item.nodeType} className={cls} />;
  if (item.tone === 'waiting') return <Hourglass className={cls} aria-hidden />;
  if (item.tone === 'start') return <PlayCircle className={cls} aria-hidden />;
  return <Flag className={cls} aria-hidden />;
}

/**
 * The run as a readable timeline. Sentences come from buildRunStory (pure, tested); this only lays them out.
 * Colour is a hint only: every line also carries its state in words for screen readers.
 */
export function RunStory({ items, onSelectStep, selectedNodeId, timeZoneLabel }: {
  items: StoryItem[];
  /** Optional: clicking a line highlights that step on the canvas. */
  onSelectStep?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  timeZoneLabel?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing has happened in this run yet.</p>;
  return (
    <div>
      <ol className="relative space-y-4" aria-label="What happened">
        {items.map((item, i) => {
          const tone = TONE[item.tone];
          const last = i === items.length - 1;
          const clickable = !!onSelectStep && !!item.nodeId;
          return (
            <li key={item.key} className="relative flex gap-3" data-testid="run-story-item">
              {!last && <span className="absolute left-[13px] top-7 h-[calc(100%-0.25rem)] w-px bg-border" aria-hidden />}
              <span className={cn('relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border', tone.ring)}>
                <ToneIcon item={item} />
              </span>
              <div className={cn('min-w-0 flex-1 pt-0.5', selectedNodeId && item.nodeId === selectedNodeId && 'rounded-md ring-2 ring-primary/30')}>
                <p className="text-sm leading-snug" suppressHydrationWarning>
                  <span className="sr-only">{tone.label}: </span>
                  {clickable ? (
                    <button type="button" onClick={() => onSelectStep!(item.nodeId!)} className="text-left hover:underline focus-visible:underline focus-visible:outline-none">
                      {item.text}
                    </button>
                  ) : item.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {timeZoneLabel && <p className="mt-4 text-xs text-muted-foreground">Times in the sentences are {timeZoneLabel}.</p>}
    </div>
  );
}
