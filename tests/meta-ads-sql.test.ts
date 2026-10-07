import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs migration 0041 in an in-process Postgres (PGlite) against minimal stand-ins for the existing
 * tables: ledger triggers, append-only guard, queue uniqueness + claim, and the tenant-isolation RLS.
 * This proves the SQL, not any behaviour at Meta.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
let c1: string, c2: string, lead1: string, assign1: string;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
/** Run as an authenticated user: role admin / contractor (with contractor id) / none. */
async function as<T>(kind: 'admin' | 'staff' | 'contractor1' | 'contractor2', fn: () => Promise<T>): Promise<T> {
  const cid = kind === 'contractor1' ? c1 : kind === 'contractor2' ? c2 : '';
  await db.exec(`set role authenticated; set app.is_admin='${kind === 'admin' ? 1 : 0}'; set app.is_staff='${kind === 'admin' || kind === 'staff' ? 1 : 0}'; set app.cid='${cid}'`);
  try { return await fn(); } finally { await db.exec(`reset role; reset app.is_admin; reset app.is_staff; reset app.cid`); }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
    create table public.profiles (id uuid primary key default gen_random_uuid());
    create function public.is_admin() returns boolean language sql as $$ select coalesce(current_setting('app.is_admin', true), '0') = '1' $$;
    create function public.is_staff() returns boolean language sql as $$ select coalesce(current_setting('app.is_staff', true), '0') = '1' $$;
    create function public.auth_contractor_id() returns uuid language sql as $$ select nullif(current_setting('app.cid', true), '')::uuid $$;
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid(), qualification_status text not null default 'needs_qualification',
      qualified_at timestamptz, qualified_by uuid);
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id) on delete cascade,
      contractor_id uuid references contractors(id), status text not null default 'assigned', unique(lead_id, contractor_id));
    create table public.appointments (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id) on delete cascade,
      status text not null default 'scheduled', created_by uuid, created_at timestamptz not null default now());
    create table public.sales (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id) on delete cascade,
      amount numeric(12,2) not null, closed_at date not null default current_date, sale_status text not null default 'won', created_by uuid,
      created_at timestamptz not null default now());
  `);
  await db.exec(read('0041_meta_ads_analytics_outcomes.sql'));
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('A') returning id`))[0].id;
  c2 = (await q<{ id: string }>(`insert into contractors(name) values ('B') returning id`))[0].id;
  lead1 = (await q<{ id: string }>(`insert into leads default values returning id`))[0].id;
  assign1 = (await q<{ id: string }>(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [lead1, c1]))[0].id;
}, 60_000);
afterAll(async () => { await db?.close(); });

const outcomes = async (lead = lead1) => (await q<{ outcome: string; actor_kind: string; reason_code: string | null }>(
  `select outcome, actor_kind, reason_code from lead_outcome_events where lead_id=$1 order by recorded_at, outcome`, [lead]));

describe('migration 0041', () => {
  it('is idempotent and starts with delivery OFF', async () => {
    await db.exec(read('0041_meta_ads_analytics_outcomes.sql'));
    expect((await q(`select delivery_mode from meta_settings`))[0]).toEqual({ delivery_mode: 'off' });
  });

  it('ledgers a qualification change with its source and reason, once per real change', async () => {
    await db.query(`update leads set qualification_status='qualified', qualification_reason='budget_ok', qualification_source='human', qualified_at=now() where id=$1`, [lead1]);
    await db.query(`update leads set qualification_reason='budget_ok' where id=$1`, [lead1]); // no status change
    expect(await outcomes()).toEqual([{ outcome: 'qualified', actor_kind: 'system', reason_code: 'budget_ok' }]);
  });

  it('refuses an AI qualification without supporting evidence', async () => {
    await expect(db.query(`update leads set qualification_source='ai' where id=$1`, [lead1])).rejects.toThrow();
    await db.query(`update leads set qualification_status='not_qualified', qualification_source='ai', qualification_evidence='{"criteria":"v1","call":"s1"}' where id=$1`, [lead1]);
    const rows = await outcomes();
    expect(rows.at(-1)).toMatchObject({ outcome: 'not_qualified', actor_kind: 'ai' });
  });

  it('records "booked" only from a real appointments row, and only once', async () => {
    const ap = (await q<{ id: string }>(`insert into appointments(assignment_id) values ($1) returning id`, [assign1]))[0].id;
    await db.query(`update appointments set status='scheduled' where id=$1`, [ap]);
    const booked = await q(`select 1 from lead_outcome_events where outcome='appointment_booked' and appointment_id=$1`, [ap]);
    expect(booked).toHaveLength(1);
    await expect(db.query(`insert into lead_outcome_events(lead_id, outcome, occurred_at) values ($1,'appointment_booked',now())`, [lead1])).rejects.toThrow(/outcome_booked_needs_booking/);
    await db.query(`update appointments set status='no_show' where id=$1`, [ap]);
    expect((await outcomes()).map((o) => o.outcome)).toContain('appointment_no_show');
  });

  it('records won with the real amount, date-precision for back-dated sales, and a correction on refund', async () => {
    const s = (await q<{ id: string }>(`insert into sales(assignment_id, amount) values ($1, 18500) returning id`, [assign1]))[0].id;
    const old = (await q<{ id: string }>(`insert into sales(assignment_id, amount, closed_at) values ($1, 900, current_date - 40) returning id`, [assign1]))[0].id;
    const won = await q<{ amount: string; currency: string; occurred_precision: string }>(`select amount, currency, occurred_precision from lead_outcome_events where outcome='won' order by amount desc`);
    expect(won).toEqual([{ amount: '18500.00', currency: 'USD', occurred_precision: 'exact' }, { amount: '900.00', currency: 'USD', occurred_precision: 'date' }]);
    await db.query(`update sales set sale_status='refunded' where id=$1`, [s]);
    const corr = await q<{ corrects_id: string | null; reason_code: string }>(`select corrects_id, reason_code from lead_outcome_events where outcome='correction' and sale_id=$1`, [s]);
    expect(corr[0].reason_code).toBe('sale_refunded');
    expect(corr[0].corrects_id).not.toBeNull();
    // the original 'won' entry is still there — history is never erased
    expect(await q(`select 1 from lead_outcome_events where outcome='won' and sale_id=$1`, [s])).toHaveLength(1);
    void old;
  });

  it('is append-only', async () => {
    await expect(db.query(`update lead_outcome_events set note='x'`)).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from lead_outcome_events`)).rejects.toThrow(/append-only/);
  });

  it('allows the lead cascade delete to remove its own history', async () => {
    const l = (await q<{ id: string }>(`insert into leads default values returning id`))[0].id;
    await db.query(`update leads set qualification_status='qualified' where id=$1`, [l]);
    await db.query(`delete from leads where id=$1`, [l]);
    expect(await q(`select 1 from lead_outcome_events where lead_id=$1`, [l])).toHaveLength(0);
  });
});

describe('conversion event queue', () => {
  const ins = (eventId: string, extra = '') => db.query(
    `insert into meta_conversion_events(lead_id, stage, source_kind, event_name, action_source, dataset_id, event_id, event_time ${extra ? ',' + extra.split('=')[0] : ''})
     values ($1,'qualified','website_pixel','QualifiedLead','website','123456',$2, now() ${extra ? ',' + extra.split('=')[1] : ''})`, [lead1, eventId]);

  it('rejects a duplicate (dataset, event id) in the same mode, but allows a test copy', async () => {
    await ins('s1:QualifiedLead');
    await expect(ins('s1:QualifiedLead')).rejects.toThrow(/uq_mce_event/);
    await ins('s1:QualifiedLead', 'test_mode=true');
  });

  it('claims a due event exactly once and leases it; an expired lease is reclaimable', async () => {
    const first = await q(`select id, attempt_count from claim_meta_conversion_events(10, 'w1', 60)`);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].attempt_count).toBe(1);
    expect(await q(`select id from claim_meta_conversion_events(10, 'w2', 60)`)).toHaveLength(0);
    await db.query(`update meta_conversion_events set locked_until = now() - interval '1 minute' where status='processing'`);
    expect((await q(`select attempt_count from claim_meta_conversion_events(10, 'w2', 60)`)).length).toBeGreaterThan(0);
  });

  it('requires a reason for skipped events', async () => {
    await expect(ins('x:Skip', `status='skipped'`)).rejects.toThrow(/mce_skipped_has_reason/);
  });
});

describe('tenant isolation (RLS)', () => {
  beforeAll(async () => {
    await db.exec(`
      insert into meta_ad_accounts(id, name, currency, contractor_id) values ('act_1','Acct A','USD','${c1}'), ('act_2','Acct B','USD','${c2}'), ('act_hq','HQ','USD',null);
      insert into meta_campaigns(id, account_id, name) values ('camp_a','act_1','A camp'), ('camp_b','act_2','B camp'), ('camp_hq','act_hq','HQ camp');
      insert into meta_campaigns(id, account_id, name, contractor_id) values ('camp_hq_c1','act_hq','HQ shared -> A','${c1}');
      insert into meta_insights_daily(ad_id,date,account_id,campaign_id,adset_id,spend) values ('ad1','2026-10-01','act_1','camp_a','as1',10), ('ad2','2026-10-01','act_2','camp_b','as2',20), ('ad3','2026-10-01','act_hq','camp_hq_c1','as3',30);
    `);
  });
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

  it('contractor sees only its mapped campaigns (account mapping and campaign override)', async () => {
    expect(ids(await as('contractor1', () => q<{ id: string }>(`select id from meta_campaigns`)))).toEqual(['camp_a', 'camp_hq_c1']);
    expect(ids(await as('contractor2', () => q<{ id: string }>(`select id from meta_campaigns`)))).toEqual(['camp_b']);
    expect(ids(await as('admin', () => q<{ id: string }>(`select id from meta_campaigns`)))).toHaveLength(4);
  });

  it('hides spend from contractors until an admin opts the account in', async () => {
    expect(await as('contractor1', () => q(`select * from meta_insights_daily`))).toHaveLength(0);
    await db.exec(`update meta_ad_accounts set show_spend_to_contractor=true where id='act_1'`);
    const rows = await as('contractor1', () => q<{ ad_id: string }>(`select ad_id from meta_insights_daily`));
    expect(rows.map((r) => r.ad_id)).toEqual(['ad1']);
    expect(await as('contractor2', () => q(`select * from meta_insights_daily`))).toHaveLength(0);
  });

  it('contractors cannot read settings, sync runs, or the conversion queue; staff cannot read the queue', async () => {
    for (const t of ['meta_settings', 'meta_sync_runs', 'meta_conversion_events']) {
      expect(await as('contractor1', () => q(`select * from ${t}`))).toHaveLength(0);
    }
    expect(await as('staff', () => q(`select * from meta_conversion_events`))).toHaveLength(0);
  });

  it('contractors see only their own contractor-scoped outcome rows, and cannot write', async () => {
    const mine = await as('contractor1', () => q<{ lead_id: string }>(`select lead_id from lead_outcome_events`));
    expect(mine.length).toBeGreaterThan(0);
    expect(await as('contractor2', () => q(`select * from lead_outcome_events`))).toHaveLength(0);
    await expect(as('contractor1', () => db.query(`insert into lead_outcome_events(lead_id, outcome, occurred_at) values ($1,'won',now())`, [lead1]))).rejects.toThrow();
    await expect(as('admin', () => db.query(`update meta_ad_accounts set contractor_id=null`))).rejects.toThrow();
  });
});
