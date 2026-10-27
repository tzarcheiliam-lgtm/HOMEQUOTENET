/**
 * "Money on the table": the setter's next calls, ranked. Every row is a real
 * record; the ranking only decides the order. Pure — the data layer builds
 * the candidates, tests/setter-money.test.ts pins the order.
 */

export type QueueKind =
  | 'confirm' //   a booked meeting soon that is not confirmed — protects a pending sale
  | 'callback' //  a promised callback that is due
  | 'hot' //       an interested / follow-up prospect whose follow-up is due
  | 'emailed' //   emailed 3–10 days ago, no call or meeting since — call back
  | 'rescue' //    a recent no-show or cancellation to rebook
  | 'slipped' //   interested, but nobody has called in 7+ days
  | 'homeowner' // homeowner leads waiting (one summary row)
  | 'fresh'; //    never-called prospects: start a power hour (one summary row)

export interface QueueItem {
  kind: QueueKind;
  id: string;
  title: string;
  detail: string;
  href: string;
  /** The moment that makes it urgent (meeting time, callback time, last contact…). */
  at: string | null;
  phone?: string | null;
}

const ORDER: QueueKind[] = ['confirm', 'callback', 'hot', 'emailed', 'rescue', 'slipped', 'homeowner', 'fresh'];

export const QUEUE_LABELS: Record<QueueKind, { tag: string; tone: 'red' | 'amber' | 'blue' | 'slate' }> = {
  confirm: { tag: 'Confirm', tone: 'red' },
  callback: { tag: 'Callback due', tone: 'amber' },
  hot: { tag: 'Hot', tone: 'amber' },
  emailed: { tag: 'Emailed', tone: 'blue' },
  rescue: { tag: 'Rebook', tone: 'blue' },
  slipped: { tag: 'Slipping', tone: 'blue' },
  homeowner: { tag: 'Leads', tone: 'slate' },
  fresh: { tag: 'New', tone: 'slate' },
};

/**
 * Kind first; within a kind, the soonest/oldest moment first (a meeting in an
 * hour before one tomorrow; the longest-waiting callback first).
 */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const k = ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind);
    if (k !== 0) return k;
    const ta = a.at ? Date.parse(a.at) : Number.POSITIVE_INFINITY;
    const tb = b.at ? Date.parse(b.at) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
}

/** Rows that can turn into a booked (and so payable) meeting today. */
export function chancesToBook(items: QueueItem[]): number {
  return items.filter((i) => ['callback', 'hot', 'emailed', 'rescue', 'slipped'].includes(i.kind)).length;
}
