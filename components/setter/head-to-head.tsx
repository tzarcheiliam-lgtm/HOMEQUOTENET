import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/setter/money';

type Rival = { id: string; name: string; weekBookings: number; monthEarned: number };

/**
 * The race (shown only while the leaderboard is on). With one teammate it is a
 * duel; with more, a short ranked list. Bookings this week decide the lead,
 * money this month is the score.
 */
export function HeadToHead({
  rivals,
  me,
}: {
  rivals: Rival[];
  me: { weekBookings: number; monthEarned: number };
}) {
  if (rivals.length === 0) return null;
  const all = [{ id: 'me', name: 'You', ...me }, ...rivals].sort(
    (a, b) => b.weekBookings - a.weekBookings || b.monthEarned - a.monthEarned
  );
  const top = rivals.reduce((a, b) => (b.weekBookings > a.weekBookings ? b : a), rivals[0]);
  const gap = top.weekBookings - me.weekBookings;
  const line =
    gap > 0
      ? `${top.name.split(' ')[0]} is ${gap} ${gap === 1 ? 'booking' : 'bookings'} ahead this week — ${gap === 1 ? 'one booking ties it' : 'go get them'}`
      : gap === 0
        ? me.weekBookings === 0
          ? 'Nobody has booked this week yet — first one takes the lead'
          : 'Dead even this week — one booking takes the lead'
        : `You're ${-gap} ahead this week — keep the gap`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The race</CardTitle>
        <p className={cn('text-sm', gap < 0 ? 'text-emerald-700' : gap > 0 ? 'text-amber-800' : 'text-muted-foreground')}>{line}</p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {all.map((r, i) => {
            const isMe = r.id === 'me';
            const max = Math.max(1, ...all.map((x) => x.weekBookings));
            return (
              <li key={r.id} className={cn('rounded-lg p-2', isMe && 'bg-primary/5')}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={cn('truncate', isMe ? 'font-semibold' : 'font-medium')}>
                    {i === 0 && r.weekBookings > 0 ? '👑 ' : ''}
                    {isMe ? 'You' : r.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{r.weekBookings}</strong> <span className="text-xs text-muted-foreground">booked</span>
                    <span className="ml-2 text-emerald-700">{formatMoney(r.monthEarned)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', isMe ? 'bg-primary' : 'bg-muted-foreground/40')}
                    style={{ width: `${(r.weekBookings / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">Bookings this week · earned this month</p>
      </CardContent>
    </Card>
  );
}
