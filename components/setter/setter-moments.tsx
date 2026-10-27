'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { Celebrations, celebrate } from '@/components/calls/goal/celebrations';
import { playSound } from '@/lib/calls/sound';
import { formatMoney } from '@/lib/setter/money';

const SOLD_KEY = 'hq.setter.soldSeen';
const RECAP_KEY = 'hq.setter.recapSeen';
const DAY = 86_400_000;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: it just plays again next time */
  }
}

/**
 * The payoff moment: when a meeting this setter booked has been marked sold
 * since they last looked, the dashboard celebrates it — jackpot banner for the
 * first, toasts for any others. Remembered per browser; on a first visit only
 * sales from the last two days play.
 */
export function SaleCelebrator({ sold }: { sold: { id: string; company: string; pay: number; decidedAt: string }[] }) {
  useEffect(() => {
    const seen = read<string[]>(SOLD_KEY);
    const fresh = sold.filter((s) =>
      seen ? !seen.includes(s.id) : Date.now() - Date.parse(s.decidedAt) < 2 * DAY
    );
    if (fresh.length > 0) {
      const total = fresh.reduce((a, s) => a + s.pay, 0);
      const t = setTimeout(() => {
        playSound('jackpot');
        celebrate({
          intensity: 'jackpot',
          title: `💰 ${fresh.length === 1 ? `${fresh[0].company} signed!` : `${fresh.length} of your meetings sold!`}`,
          sub: `+${formatMoney(total)} earned. Book the next one.`,
        });
        fresh.slice(1).forEach((s) => toast(`${s.company} sold · +${formatMoney(s.pay)}`));
      }, 600);
      write(SOLD_KEY, [...new Set([...(seen ?? []), ...sold.map((s) => s.id)])].slice(-200));
      return () => clearTimeout(t);
    }
    if (!seen) write(SOLD_KEY, sold.map((s) => s.id));
  }, [sold]);
  return <Celebrations />;
}

/**
 * The weekly recap: last week's bookings, sales and pay, once per week until
 * dismissed. Hidden when last week had nothing to show.
 */
export function WeeklyRecap({
  weekKey,
  bookings,
  sold,
  earned,
  goal,
}: {
  weekKey: string;
  bookings: number;
  sold: number;
  earned: number;
  goal: number | null;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(read<string>(RECAP_KEY) !== weekKey && (bookings > 0 || sold > 0));
  }, [weekKey, bookings, sold]);
  if (!open) return null;
  const hit = goal !== null && bookings >= goal;
  return (
    <section
      aria-label="Last week"
      className="relative rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-card p-4"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2"
        aria-label="Dismiss last week's recap"
        onClick={() => {
          write(RECAP_KEY, weekKey);
          setOpen(false);
        }}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Last week</p>
      <p className="mt-1 text-lg font-semibold">
        {bookings} {bookings === 1 ? 'meeting' : 'meetings'} booked · {sold} sold ·{' '}
        <span className="text-emerald-700">{formatMoney(earned)} earned</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {hit
          ? `You hit your goal of ${goal}. Do it again — then beat it.`
          : goal !== null
            ? `${goal - bookings} short of your goal of ${goal}. New week, clean board.`
            : 'New week, clean board. Beat it.'}
      </p>
    </section>
  );
}
