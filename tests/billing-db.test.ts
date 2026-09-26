import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

/**
 * Stripe billing columns (migration 0028) under real RLS, inside one
 * transaction that always rolls back. Skipped unless SUPABASE_DB_URL is set.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = { companyA: randomUUID(), companyB: randomUUID(), ownerA: randomUUID(), admin: randomUUID() };
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await q('savepoint u');
  try {
    await q('set local role authenticated');
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const result = await fn();
    await q('reset role');
    await q('release savepoint u');
    return result;
  } catch (e) {
    await q('rollback to savepoint u');
    await q('reset role');
    throw e;
  }
}
const file = (service: string, extra: Record<string, unknown> = {}) => {
  const cols = ['contractor_id', 'requested_by', 'service', ...Object.keys(extra)];
  const vals = [ids.companyA, ids.ownerA, service, ...Object.values(extra)];
  return q(`insert into public.service_requests(${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) returning id`, vals);
};

let connected = false;
let requestA = '';
beforeAll(async () => {
  if (!url) return;
  await db.connect();
  connected = true;
  await q('begin');
  const [has] = await q(
    "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_requests' and column_name='payment_status') as has"
  );
  if (!has.has) await q(readFileSync('supabase/migrations/0028_stripe_service_billing.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values ($1,'Billing A (test)'), ($2,'Billing B (test)')", [ids.companyA, ids.companyB]);
  for (const [user, role, company] of [
    [ids.ownerA, 'contractor', ids.companyA],
    [ids.admin, 'admin', null],
  ]) {
    await q(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`,
      [user, `${user}@billing.test`]
    );
    await q(
      `update public.profiles set role=$2, account_status='active', is_active=true, contractor_id=$3, contractor_role=$4 where id=$1`,
      [user, role, company, role === 'contractor' ? 'owner' : null]
    );
  }
}, 60000);
afterAll(async () => {
  if (connected) {
    await q('rollback');
    await db.end();
  }
});

const suite = url ? describe : describe.skip;
suite('Stripe billing columns (rolled back)', () => {
  it('a new request starts with no price and no payment', async () => {
    const [row] = await as(ids.ownerA, () => file('ai_receptionist'));
    requestA = row.id;
    const [r] = await q('select price_cents, payment_status, stripe_subscription_id from public.service_requests where id=$1', [requestA]);
    expect(r).toEqual({ price_cents: null, payment_status: 'none', stripe_subscription_id: null });
  });

  it('a contractor cannot file a pre-priced or pre-paid request', async () => {
    for (const extra of [
      { price_cents: 100, price_interval: 'one_time' },
      { price_cents: 100, price_interval: 'one_time', payment_status: 'paid' },
      { stripe_subscription_id: 'sub_fake' },
      { paid_at: new Date().toISOString() },
    ]) {
      await expect(as(ids.ownerA, () => file('crm_setup', extra))).rejects.toThrow(/row-level security|check constraint/);
    }
  });

  it('a contractor cannot change a price or mark it paid', async () => {
    await as(ids.ownerA, () => q("update public.service_requests set price_cents = 50, price_interval = 'one_time', payment_status = 'paid' where id=$1", [requestA]));
    const [r] = await q('select price_cents, payment_status from public.service_requests where id=$1', [requestA]);
    expect(r).toEqual({ price_cents: null, payment_status: 'none' });
  });

  it('a contractor cannot set their company’s Stripe customer', async () => {
    await as(ids.ownerA, () => q("update public.contractors set stripe_customer_id = 'cus_hijack' where id=$1", [ids.companyA]));
    const [c] = await q('select stripe_customer_id from public.contractors where id=$1', [ids.companyA]);
    expect(c.stripe_customer_id).toBeNull();
  });

  it('an admin sets a price; the database enforces sane amounts', async () => {
    await as(ids.admin, () =>
      q("update public.service_requests set price_cents=49900, price_interval='month', setup_fee_cents=50000, payment_status='awaiting_payment' where id=$1", [requestA])
    );
    const [r] = await q('select price_cents, payment_status from public.service_requests where id=$1', [requestA]);
    expect(r).toEqual({ price_cents: 49900, payment_status: 'awaiting_payment' });
    const bad = [
      "price_cents = 10",
      "price_interval = 'year'",
      "price_interval = 'one_time'", // a setup fee is only allowed on a monthly price
      "price_cents = null, price_interval = null, setup_fee_cents = null", // awaiting payment needs a price
      "payment_status = 'bogus'",
    ];
    for (const set of bad) {
      await expect(as(ids.admin, () => q(`update public.service_requests set ${set} where id=$1`, [requestA]))).rejects.toThrow(/check constraint/);
    }
  });

  it('webhook bookkeeping is invisible to signed-in users', async () => {
    await q("insert into public.stripe_events(id, type) values ('evt_test_billing', 'checkout.session.completed')");
    expect(await as(ids.admin, () => q('select id from public.stripe_events'))).toEqual([]);
    expect(await as(ids.ownerA, () => q('select id from public.stripe_events'))).toEqual([]);
    await expect(as(ids.ownerA, () => q("insert into public.stripe_events(id, type) values ('evt_forged', 'x')"))).rejects.toThrow(/row-level security/);
  });
});
