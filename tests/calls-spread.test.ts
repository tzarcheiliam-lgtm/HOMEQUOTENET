import { describe, expect, it } from 'vitest';
import { planSpread, spreadCounts } from '@/lib/calls/spread';

const items = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const counts = (m: Map<string, unknown[]>) => Object.fromEntries([...m].map(([id, v]) => [id, v.length]));

describe('planSpread', () => {
  it('splits evenly when everyone starts level, in order', () => {
    const plan = planSpread(items(5), [
      { id: 'a', load: 0 },
      { id: 'b', load: 0 },
    ]);
    expect(plan.get('a')).toEqual(['p1', 'p3', 'p5']);
    expect(plan.get('b')).toEqual(['p2', 'p4']);
  });

  it('fills the shortest list first so someone behind catches up', () => {
    const plan = planSpread(items(10), [
      { id: 'busy', load: 8 },
      { id: 'light', load: 2 },
    ]);
    // light gets 6 to reach 8, then they alternate: 8+2 vs 2+8.
    expect(counts(plan)).toEqual({ busy: 2, light: 8 });
  });

  it('respects a per-person cap and leaves the rest unassigned', () => {
    const plan = planSpread(items(10), [
      { id: 'a', load: 0 },
      { id: 'b', load: 0 },
    ], 3);
    expect(counts(plan)).toEqual({ a: 3, b: 3 });
  });

  it('keeps going to the others once one person hits the cap', () => {
    const plan = planSpread(items(6), [
      { id: 'a', load: 0 },
      { id: 'b', load: 50 },
    ], 2);
    expect(counts(plan)).toEqual({ a: 2, b: 2 });
  });

  it('never assigns an item twice', () => {
    const plan = planSpread(items(37), [
      { id: 'a', load: 3 },
      { id: 'b', load: 0 },
      { id: 'c', load: 9 },
    ]);
    const all = [...plan.values()].flat();
    expect(all.length).toBe(37);
    expect(new Set(all).size).toBe(37);
  });

  it('handles nobody picked and nothing to spread', () => {
    expect(planSpread(items(3), []).size).toBe(0);
    expect(counts(planSpread([], [{ id: 'a', load: 0 }]))).toEqual({ a: 0 });
  });

  it('spreadCounts matches planSpread', () => {
    const people = [
      { id: 'a', load: 4 },
      { id: 'b', load: 1 },
    ];
    expect(Object.fromEntries(spreadCounts(9, people))).toEqual(counts(planSpread(items(9), people)));
  });
});
