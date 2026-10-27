import { Moon, PauseCircle } from 'lucide-react';
import { restStateOf } from '@/lib/calls/cadence';
import { fmtDate, fmtDateTime } from './format';

/**
 * Where the call cadence has a prospect: "Next try …" while it rests after a
 * missed call, "Parked until …" after too many misses in a row. Renders nothing
 * when the prospect is due, so callers only see it when it explains a wait.
 */
export function CadenceLabel({
  prospect,
}: {
  prospect: { next_attempt_at: string | null; parked_at: string | null };
}) {
  const state = restStateOf(prospect);
  if (state === 'due') return null;
  if (state === 'resting') {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Moon className="size-3.5" aria-hidden="true" />
        Next try {fmtDateTime(prospect.next_attempt_at)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <PauseCircle className="size-3.5" aria-hidden="true" />
      {state === 'parked' ? `Parked until ${fmtDate(prospect.next_attempt_at)}` : 'Parked'}
    </span>
  );
}
