import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * LOCAL DATABASE test (PGlite, an in-process Postgres - no shared or production database is touched).
 * Runs migrations 0042 then 0043 against minimal stand-ins for existing tables and proves the SQL: RLS tenant
 * isolation, atomic claims, uniqueness / duplicate prevention, rule constraints + versioning, append-only log.
 * It proves nothing about Meta, and PGlite is not Supabase (no real auth/storage), so RLS is exercised with
 * the same session-variable stand-ins the 0042 test uses.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
let c1: string, c2: string;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
async function as<T>(kind: 'admin' | 'contractor1' | 'contractor2', fn: () => Promise<T>): Promise<T> {
  const cid = kind === 'contractor1' ? c1 : kind === 'contractor2' ? c2 : '';
  await db.exec(`set role authenticated; set app.is_admin='${kind === 'admin' ? 1 : 0}'; set app.is_staff='${kind === 'admin' ? 1 : 0}'; set app.cid='${cid}'`);
  try { return await fn(); } finally { await db.exec(`reset role; reset app.is_admin; reset app.is_staff; reset app.cid`); }
}
const rejects = async (sql: string, p?: unknown[]) => { try { await db.query(sql, p); return false; } catch { return true; } };

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
    create table public.leads (id uuid primary key default gen_random_uuid(), qualification_status text not null default 'needs_qualification', qualified_at timestamptz, qualified_by uuid);
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id) on delete cascade, contractor_id uuid references contractors(id), status text not null default 'assigned', unique(lead_id, contractor_id));
    create table public.appointments (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id) on delete cascade, status text not null default 'scheduled', created_by uuid, created_at timestamptz not null default now());
    create table public.sales (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id) on delete cascade, amount numeric(12,2) not null, closed_at date not null default current_date, sale_status text not null default 'won', created_by uuid, created_at timestamptz not null default now());
  `);
  await db.exec(read('0042_meta_ads_analytics_outcomes.sql'));
  await db.exec(read('0043_meta_ads_studio.sql'));
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('A') returning id`))[0].id;
  c2 = (await q<{ id: string }>(`insert into contractors(name) values ('B') returning id`))[0].id;
  await db.exec(`insert into meta_ad_accounts(id, name, currency, timezone_name) values ('act_1', 'Acct', 'USD', 'America/Los_Angeles')`);
}, 60_000);
afterAll(async () => { await db?.close(); });

describe('migration 0043', () => {
  it('is idempotent and ships everything switched off', async () => {
    await db.exec(read('0043_meta_ads_studio.sql'));
    expect((await q(`select live_writes_enabled, automation_enabled from meta_studio_settings`))[0]).toEqual({ live_writes_enabled: false, automation_enabled: false });
    expect(await q(`select 1 from meta_account_controls`)).toHaveLength(0);
  });

  it('isolates tenants: contractors see only assets/creatives mapped to them, and nothing else', async () => {
    await db.exec(`
      insert into meta_assets(kind, meta_id, name, contractor_id) values ('page','1001','Page A','${c1}'), ('page','1002','Page B','${c2}'), ('page','1003','Network page', null);
      insert into meta_creatives(contractor_id, name, kind, mime_type, bytes, storage_path, duration_seconds) values ('${c1}','A pic','image','image/png',10,'a/1.png',null), ('${c2}','B pic','image','image/png',10,'b/1.png',null), (null,'Net pic','image','image/png',10,'n/1.png',null);
      insert into meta_ad_drafts(contractor_id, account_id, name, config, idempotency_key) values ('${c1}','act_1','d','{}','k-iso');
      insert into meta_rules(name, owner_id, account_id, scope_type, action_type, condition, eval_window_days, min_evidence) select 'r', id, 'act_1', 'account', 'notify', '{}', 7, '{}' from profiles limit 0;
    `);
    expect(await as('contractor1', () => q(`select meta_id from meta_assets order by meta_id`))).toEqual([{ meta_id: '1001' }]);
    expect(await as('contractor2', () => q(`select name from meta_creatives`))).toEqual([{ name: 'B pic' }]);
    expect((await as('admin', () => q(`select 1 from meta_assets`))).length).toBe(3);
    for (const t of ['meta_ad_drafts', 'meta_change_proposals', 'meta_rules', 'meta_audits', 'meta_activity_log', 'meta_studio_settings', 'meta_account_controls', 'meta_object_state']) {
      expect(await as('contractor1', () => q(`select 1 from ${t}`)), t).toHaveLength(0);
    }
    expect((await as('admin', () => q(`select 1 from meta_ad_drafts`))).length).toBe(1);
  });

  it('gives browser roles no write access to any Studio table', async () => {
    for (const sql of [
      `insert into meta_studio_settings(id, live_writes_enabled) values (false, true)`,
      `update meta_studio_settings set live_writes_enabled = true`,
      `insert into meta_activity_log(action) values ('x')`,
      `delete from meta_assets`,
    ]) expect(await as('admin', () => rejects(sql)), sql).toBe(true);
    expect((await q(`select live_writes_enabled from meta_studio_settings`))[0]).toEqual({ live_writes_enabled: false });
  });

  it('claims a draft only once and only after human confirmation', async () => {
    const id = (await q<{ id: string }>(`select id from meta_ad_drafts where idempotency_key='k-iso'`))[0].id;
    expect(await q(`select * from claim_meta_draft($1)`, [id])).toHaveLength(0); // not confirmed
    await db.exec(`update meta_ad_drafts set status='ready', confirmed_at=now() where id='${id}'`);
    expect(await q(`select status, attempt_count from claim_meta_draft($1)`, [id])).toEqual([{ status: 'creating', attempt_count: 1 }]);
    expect(await q(`select * from claim_meta_draft($1)`, [id])).toHaveLength(0); // second caller loses
    await db.exec(`update meta_ad_drafts set status='partial' where id='${id}'`);
    expect(await q(`select * from claim_meta_draft($1)`, [id])).toHaveLength(1); // a partial draft can resume
  });

  it('refuses to mark a draft as sent without a confirmation, and keeps idempotency keys unique', async () => {
    expect(await rejects(`insert into meta_ad_drafts(account_id, name, config, idempotency_key, status) values ('act_1','x','{}','k-x','created_paused')`)).toBe(true);
    expect(await rejects(`insert into meta_ad_drafts(account_id, name, config, idempotency_key) values ('act_1','dup','{}','k-iso')`)).toBe(true);
  });

  it('allows one OPEN proposal per target+change and claims approved ones exactly once', async () => {
    const ins = (key: string, status = 'proposed') => db.query(
      `insert into meta_change_proposals(account_id, target_type, target_id, change_type, current_value, proposed_value, rationale, source_kind, idempotency_key, status)
       values ('act_1','campaign','111','pause','{"status":"ACTIVE"}','{"status":"PAUSED"}','r','user',$1,$2) returning id`, [key, status]);
    const first = (await ins('p1')).rows[0] as { id: string };
    await expect(ins('p2')).rejects.toThrow(); // second open proposal on the same target+change
    expect(await q(`select * from claim_meta_proposal($1)`, [first.id])).toHaveLength(0); // not approved yet
    await db.exec(`update meta_change_proposals set status='approved' where id='${first.id}'`);
    expect(await q(`select status from claim_meta_proposal($1)`, [first.id])).toEqual([{ status: 'applying' }]);
    expect(await q(`select * from claim_meta_proposal($1)`, [first.id])).toHaveLength(0);
    await db.exec(`update meta_change_proposals set status='applied' where id='${first.id}'`);
    await expect(ins('p3')).resolves.toBeTruthy(); // a new one is fine once the first is closed
  });

  it('will not claim an expired proposal', async () => {
    const id = (await q<{ id: string }>(`insert into meta_change_proposals(account_id, target_type, target_id, change_type, current_value, proposed_value, rationale, source_kind, idempotency_key, status, expires_at)
      values ('act_1','adset','222','pause','{}','{}','r','user','p-old','approved', now() - interval '1 day') returning id`))[0].id;
    expect(await q(`select * from claim_meta_proposal($1)`, [id])).toHaveLength(0);
  });

  it('enforces rule safety constraints', async () => {
    await db.exec(`insert into profiles default values`);
    const owner = (await q<{ id: string }>(`select id from profiles limit 1`))[0].id;
    const base = (over: Record<string, string>) => {
      const v = { mode: `'recommend'`, action: `'notify'`, scope: `'account'`, scopeId: 'null', pct: 'null', ceiling: 'null', expires: 'null', ...over };
      return `insert into meta_rules(name, owner_id, account_id, scope_type, scope_id, mode, action_type, condition, eval_window_days, min_evidence, max_adjust_pct, budget_ceiling, expires_at)
        values ('r','${owner}','act_1',${v.scope},${v.scopeId},${v.mode},${v.action},'{}'::jsonb,7,'{}'::jsonb,${v.pct},${v.ceiling},${v.expires})`;
    };
    await db.exec(base({}));
    expect(await rejects(base({ mode: `'auto'` }))).toBe(true); // auto needs expiry
    expect(await rejects(base({ action: `'budget_decrease'` }))).toBe(true); // budget action needs a percentage
    expect(await rejects(base({ action: `'budget_increase'`, pct: '10' }))).toBe(true); // increase needs a ceiling
    expect(await rejects(base({ scope: `'campaign'` }))).toBe(true); // campaign scope needs an id
    expect(await rejects(base({ scopeId: `'111'` }))).toBe(true); // account scope must not have one
    await db.exec(base({ mode: `'auto'`, expires: `now() + interval '30 days'` }));
  });

  it('bumps a rule version and switches it off when its behaviour changes, but not for a rename', async () => {
    const id = (await q<{ id: string }>(`select id from meta_rules limit 1`))[0].id;
    await db.exec(`update meta_rules set enabled = true where id = '${id}'`);
    await db.exec(`update meta_rules set name = 'renamed' where id = '${id}'`);
    expect((await q(`select version, enabled from meta_rules where id='${id}'`))[0]).toEqual({ version: 1, enabled: true });
    await db.exec(`update meta_rules set cooldown_hours = 12 where id = '${id}'`);
    expect((await q(`select version, enabled from meta_rules where id='${id}'`))[0]).toEqual({ version: 2, enabled: false });
  });

  it('keeps the activity log append-only', async () => {
    await db.exec(`insert into meta_activity_log(action) values ('test.event')`);
    expect(await rejects(`update meta_activity_log set action = 'tampered'`)).toBe(true);
    expect(await rejects(`delete from meta_activity_log`)).toBe(true);
  });

  it('flags exact-duplicate creative files per contractor but allows the same file for another', async () => {
    const ins = (cid: string | null, path: string) => db.query(`insert into meta_creatives(contractor_id, name, kind, mime_type, bytes, storage_path, sha256) values ($1,'x','image','image/png',5,$2,'abc123')`, [cid, path]);
    await ins(c1, 'dup/1.png');
    await expect(ins(c1, 'dup/2.png')).rejects.toThrow();
    await expect(ins(c2, 'dup/3.png')).resolves.toBeTruthy();
    await expect(ins(null, 'dup/4.png')).resolves.toBeTruthy();
    await expect(ins(null, 'dup/5.png')).rejects.toThrow(); // network-level duplicates are caught too
  });

  it('requires a video to record its duration unless it was rejected', async () => {
    expect(await rejects(`insert into meta_creatives(name, kind, mime_type, bytes, storage_path, status) values ('v','video','video/mp4',5,'v/1.mp4','ready')`)).toBe(true);
    await db.exec(`insert into meta_creatives(name, kind, mime_type, bytes, storage_path, status) values ('v','video','video/mp4',5,'v/2.mp4','rejected')`);
  });
});
