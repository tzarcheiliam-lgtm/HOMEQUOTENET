/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * "Spread unassigned" against every real migration (PGlite): only unassigned,
 * callable prospects move; the shortest list fills first; a niche filter and a
 * cap are honoured; the admin check runs; and it is audited.
 */
const h = vi.hoisted(() => ({ client: null as any, me: null as any, requireRole: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/auth', () => ({
  requireCallWorkspace: async () => h.me,
  requireRole: async (roles: string[]) => {
    h.requireRole(roles);
    return h.me;
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => {} }));

import { spreadUnassignedProspects } from '@/lib/actions/prospects';
import { getSpreadOverview, listCallers } from '@/lib/data/prospects';

const ADMIN = '00000000-0000-4000-8000-000000064a01';
const A = '00000000-0000-4000-8000-000000064c01';
const B = '00000000-0000-4000-8000-000000064c02';
const ID = (n: number) => `00000000-0000-4000-8000-0000000641${String(n).padStart(2, '0')}`;

let db: PGlite;

async function addProspect(n: number, f: { assigned_to?: string | null; niche?: string | null; disposition?: string } = {}) {
  await db.query(
    `insert into public.contractor_prospects (id, company_name, assigned_to, niche, disposition, created_at)
     values ($1, $2, $3, $4, $5, now() - ($6 || ' minutes')::interval)`,
    [ID(n), `Prospect ${n}`, f.assigned_to ?? null, 'niche' in f ? f.niche : 'Pool Contractors', f.disposition ?? 'new', String(1000 - n)]
  );
}

const spread = (assignees: string[], extra: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const a of assignees) fd.append('assignee', a);
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return spreadUnassignedProspects(undefined, fd);
};

const ownerOf = async () => {
  const { rows } = await db.query<any>('select id, assigned_to from public.contractor_prospects order by id');
  return Object.fromEntries(rows.map((r) => [r.id, r.assigned_to]));
};

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.client = fakeSupabase(db);
  for (const [uid, role, name] of [
    [ADMIN, 'admin', 'Admin'],
    [A, 'caller', 'Caller A'],
    [B, 'setter', 'Setter B'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${role}@spread.test`]);
    await db.query(
      `update public.profiles set role = $2, is_active = true, account_status = 'active', full_name = $3 where id = $1`,
      [uid, role, name]
    );
  }
  const { rows } = await db.query<any>('select * from public.profiles where id = $1', [ADMIN]);
  h.me = rows[0];
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.query('delete from public.audit_logs');
  await db.query('delete from public.contractor_prospects');
  h.requireRole.mockClear();
});

describe('spreadUnassignedProspects', () => {
  it('is admin-only', async () => {
    await addProspect(1);
    await spread([A]);
    expect(h.requireRole).toHaveBeenCalledWith(['admin']);
  });

  it('fills the shorter list first and moves only unassigned, callable prospects', async () => {
    await addProspect(1, { assigned_to: A }); // A already has 2 open
    await addProspect(2, { assigned_to: A });
    await addProspect(3, { disposition: 'do_not_call' }); // never handed out
    await addProspect(4, { disposition: 'not_interested' }); // left the queue
    for (const n of [5, 6, 7, 8]) await addProspect(n);

    const res = await spread([A, B]);
    expect(res).toMatchObject({ ok: true, left: 0 });
    const owner = await ownerOf();
    expect(owner[ID(3)]).toBeNull();
    expect(owner[ID(4)]).toBeNull();
    // B starts at 0, so B gets the first two; then they alternate.
    expect([5, 6, 7, 8].map((n) => owner[ID(n)])).toEqual([B, B, A, B]);
    expect(owner[ID(1)]).toBe(A);

    const { rows } = await db.query<any>(`select action, metadata from public.audit_logs`);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('prospect.spread');
    expect(rows[0].metadata.total).toBe(4);
  });

  it('honours the niche filter and the per-person cap', async () => {
    for (const n of [1, 2, 3, 4, 5]) await addProspect(n, { niche: 'Pool Contractors' });
    await addProspect(6, { niche: 'Roofing Contractors' });
    const res = await spread([A, B], { niche: 'Pool Contractors', max_each: '2' });
    expect(res).toMatchObject({ ok: true, left: 1 });
    const owner = await ownerOf();
    expect(owner[ID(6)]).toBeNull(); // other niche untouched
    expect(Object.values(owner).filter((o) => o === A)).toHaveLength(2);
    expect(Object.values(owner).filter((o) => o === B)).toHaveLength(2);
  });

  it('refuses people who are not active call assignees, and bad caps', async () => {
    await addProspect(1);
    expect(await spread([])).toMatchObject({ ok: false });
    expect(await spread(['00000000-0000-4000-8000-0000000000ff'])).toMatchObject({ ok: false });
    expect(await spread([A], { max_each: '0' })).toMatchObject({ ok: false });
    expect((await ownerOf())[ID(1)]).toBeNull();
  });

  it('the overview counts unassigned per niche and each open list', async () => {
    await addProspect(1, { assigned_to: A });
    await addProspect(2);
    await addProspect(3, { niche: null });
    const o = await getSpreadOverview(await listCallers());
    expect(o.unassignedTotal).toBe(2);
    expect(o.unassignedByNiche).toEqual(
      expect.arrayContaining([{ niche: 'Pool Contractors', count: 1 }, { niche: '', count: 1 }])
    );
    expect(o.loads.find((l) => l.id === A)?.load).toBe(1);
  });
});
