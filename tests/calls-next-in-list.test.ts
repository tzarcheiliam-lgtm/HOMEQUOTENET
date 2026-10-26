/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import { contextFrom, contextQuery, hasListContext, withContext } from '@/lib/calls/context';

const h = vi.hoisted(() => ({ client: null as any }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));

import { nextProspectInContext } from '@/lib/data/prospects';

const ID = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const me = { id: ID(99), role: 'admin' } as any;

describe('list context in the URL', () => {
  it('round-trips the filters and drops empties', () => {
    const ctx = contextFrom((k) => ({ view: 'liam', niche: 'pool', city: ' ', q: undefined } as Record<string, string | undefined>)[k]);
    expect(ctx).toEqual({ view: 'liam', niche: 'pool' });
    expect(contextQuery(ctx)).toBe('view=liam&niche=pool');
    expect(withContext('/app/calls/x', contextQuery(ctx))).toBe('/app/calls/x?view=liam&niche=pool');
    expect(withContext('/app/calls/x', '')).toBe('/app/calls/x');
  });
  it('only counts as a narrowed list when something beyond the default queue is set', () => {
    expect(hasListContext({})).toBe(false);
    expect(hasListContext({ view: 'mine' })).toBe(false);
    expect(hasListContext({ view: 'liam' })).toBe(true);
    expect(hasListContext({ view: 'mine', niche: 'pool' })).toBe(true);
  });
});

describe('Next stays inside the list being worked', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await fullSchema({ supabaseGrants: true });
    h.client = fakeSupabase(db);
    const rows = [
      [1, 'Pool A', 'pool'], [2, 'Electric A', 'electrician'], [3, 'Pool B', 'pool'],
      [4, 'Roof A', 'roofing'], [5, 'Pool C', 'pool'],
    ] as const;
    for (const [n, name, niche] of rows) {
      await db.query(`insert into public.contractor_prospects (id, company_name, niche, disposition, created_at) values ($1,$2,$3,'new', now() + ($4 || ' minutes')::interval)`, [ID(n), name, niche, String(n)]);
    }
  }, 180_000);
  afterAll(async () => { await db?.close(); });

  const next = (current: number, filters: any) => nextProspectInContext(me, ID(current), { view: 'all', ...filters }, []);

  it('skips prospects from other niches', async () => {
    expect(await next(1, { niche: 'pool' })).toBe(ID(3)); // not the electrician in between
    expect(await next(3, { niche: 'pool' })).toBe(ID(5)); // not the roofer
  });
  it('ends the list instead of wandering into another niche', async () => {
    expect(await next(5, { niche: 'pool' })).toBeNull();
  });
  it('falls back to the first one in the list when the current prospect has left it', async () => {
    expect(await next(2, { niche: 'pool' })).toBe(ID(1));
  });
  it('without a niche, follows the whole list in order', async () => {
    expect(await next(1, {})).toBe(ID(2));
  });
});
