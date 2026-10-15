import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';

/** Real migration chain (incl. 0048) in PGlite: payment_requests is admin-read, server-write, and constrained. */
let db: PGlite;
const id = { admin: randomUUID(), setter: randomUUID(), owner: randomUUID(), co: randomUUID() };
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows; // eslint-disable-line @typescript-eslint/no-explicit-any
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('app.uid','${userId}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('app.uid','', false)`); }
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'Co')`, [id.co]);
  for (const [uid, role, company, crole] of [[id.admin, 'admin', null, null], [id.setter, 'setter', null, null], [id.owner, 'contractor', id.co, 'owner']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active' where id=$1`, [uid, role, company, crole]);
  }
  await q(`insert into public.payment_requests(amount_cents, description) values (250000, 'October')`);
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('payment_requests', () => {
  it('lets only admins read them', async () => {
    expect(await as(id.admin, () => q(`select id from public.payment_requests`))).toHaveLength(1);
    expect(await as(id.setter, () => q(`select id from public.payment_requests`))).toHaveLength(0);
    expect(await as(id.owner, () => q(`select id from public.payment_requests`))).toHaveLength(0);
  });
  it('has no client write path, even for admins', async () => {
    await expect(as(id.admin, () => q(`insert into public.payment_requests(amount_cents, description) values (1000,'x')`))).rejects.toThrow();
    await expect(as(id.admin, () => q(`update public.payment_requests set status='paid'`))).resolves.toBeDefined();
    expect((await q(`select status from public.payment_requests`))[0].status).toBe('sent');
  });
  it('enforces amount, status and setup-fee rules', async () => {
    await expect(q(`insert into public.payment_requests(amount_cents, description) values (10,'x')`)).rejects.toThrow();
    await expect(q(`insert into public.payment_requests(amount_cents, description, status) values (1000,'x','weird')`)).rejects.toThrow();
    await expect(q(`insert into public.payment_requests(amount_cents, description, setup_fee_cents) values (1000,'x',5000)`)).rejects.toThrow();
    await q(`insert into public.payment_requests(amount_cents, description, interval, setup_fee_cents) values (250000,'m','month',75000)`);
  });
});
