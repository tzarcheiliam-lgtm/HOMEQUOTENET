/**
 * Spreading unassigned prospects across callers. Pure, so the dialog's
 * preview and the server action split the same way.
 *
 * Each prospect goes to whoever currently has the shortest open list
 * (their existing list plus what this spread has given them so far), so a
 * caller who is behind catches up before everyone gets more. Ties go to the
 * person listed first. `maxEach` caps how many one person gets from this
 * spread; prospects left over stay unassigned.
 */

export interface SpreadPerson {
  id: string;
  /** Prospects already on this person's open list. */
  load: number;
}

export function planSpread<T>(
  items: readonly T[],
  people: readonly SpreadPerson[],
  maxEach?: number | null
): Map<string, T[]> {
  const out = new Map<string, T[]>(people.map((p) => [p.id, []]));
  if (people.length === 0) return out;
  const cap = maxEach && maxEach > 0 ? Math.floor(maxEach) : Infinity;
  const total = new Map(people.map((p) => [p.id, Math.max(0, p.load)]));
  for (const item of items) {
    let pick: SpreadPerson | null = null;
    for (const p of people) {
      if (out.get(p.id)!.length >= cap) continue;
      if (!pick || total.get(p.id)! < total.get(pick.id)!) pick = p;
    }
    if (!pick) break; // everyone is at the cap
    out.get(pick.id)!.push(item);
    total.set(pick.id, total.get(pick.id)! + 1);
  }
  return out;
}

/** How many each person would get, for the preview. */
export function spreadCounts(
  count: number,
  people: readonly SpreadPerson[],
  maxEach?: number | null
): Map<string, number> {
  const plan = planSpread(Array.from({ length: Math.max(0, count) }, (_, i) => i), people, maxEach);
  return new Map([...plan].map(([id, items]) => [id, items.length]));
}

/** The niche filter value for prospects with no niche set. */
export const NO_NICHE = '__none__';
