import Link from 'next/link';
import { cn } from '@/lib/utils';
import { tierFor } from '@/lib/calls/goals';
import type { BoardRow } from '@/lib/data/call-stats';
import { ROLE_LABELS } from '@/lib/nav';
import { GoalRing } from '@/components/calls/goal/goal-ring';
import { GoalInput } from './goal-input';
import { PayInput } from './pay-input';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Today's board, most calls first. Admins see goal editors and can open
 * anyone's stats; teammates (leaderboard on) see counts only.
 */
export function TeamBoard({ rows, meId, isAdmin }: { rows: BoardRow[]; meId: string; isAdmin: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No one in the calling workspace yet.</p>;
  }
  return (
    <ol className="divide-y">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className={cn('flex flex-wrap items-center gap-3 py-2.5', r.id === meId && 'rounded-lg bg-primary/5 px-2')}
        >
          <span className="w-6 text-center text-base" aria-label={`Rank ${i + 1}`}>
            {r.today > 0 && i < 3 ? MEDALS[i] : <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>}
          </span>
          <GoalRing count={r.today} goal={r.goal} tier={tierFor(r.today, r.goal)} size={36} stroke={4} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {isAdmin ? (
                <Link href={`/app/calls/stats?caller=${r.id}`} className="hover:underline">
                  {r.name}
                </Link>
              ) : (
                r.name
              )}
              {r.id === meId ? <span className="text-muted-foreground"> (you)</span> : null}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {r.today}/{r.goal} today · {r.week} this week
              {r.bookedWeek > 0 ? <span className="text-emerald-700"> · 💰 {r.bookedWeek} booked</span> : null}
              {r.streak > 0 ? ` · 🔥 ${r.streak}` : ''}
              {isAdmin ? ` · ${ROLE_LABELS[r.role]}` : ''}
            </p>
          </div>
          {isAdmin ? (
            <div className="flex flex-col items-end gap-1.5">
              <GoalInput userId={r.id} goal={r.goal} name={r.name} />
              {r.role !== 'admin' ? (
                <PayInput userId={r.id} name={r.name} payPerSale={r.payPerSale} weeklyGoal={r.weeklyBookingGoal} />
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
