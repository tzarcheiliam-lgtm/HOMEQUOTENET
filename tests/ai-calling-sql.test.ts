import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs migrations 0037 + 0038 in an in-process Postgres (PGlite) against minimal stand-ins for the
 * existing tables, so the enqueue trigger, the claim function and the permissions are exercised for
 * real without needing SUPABASE_DB_URL. The stand-ins only model the columns these objects touch.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
let c1: string, c2: string;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const lead = async (phone: string) => (await q<{ id: string }>(
  `insert into leads(first_name,last_name,phone_e164,zip,consent_granted,consent_at,consent_source,consent_disclosure)
   values ('Ada','L',$1,'90210',true,now(),'funnel:pool-masters-la','may call me') returning id`, [phone]))[0].id;
const assign = (l: string, c: string) => db.query(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2)`, [l, c]);
const jobCount = async () => (await q<{ n: number }>(`select count(*)::int n from ai_call_jobs`))[0].n;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true);
    create function public.is_admin() returns boolean language sql as $$ select false $$;
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid(), first_name text, last_name text, phone_e164 text, state text, zip text,
      consent_granted boolean default false, consent_at timestamptz, consent_source text, consent_disclosure text, archived_at timestamptz);
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id), contractor_id uuid references contractors(id), unique(lead_id, contractor_id));
    create table public.contractor_prospects (id uuid primary key default gen_random_uuid());
  `);
  await db.exec(read('0037_ai_call_events.sql'));
  await db.exec(read('0038_ai_calling_queue.sql'));
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('Pool Masters LA') returning id`))[0].id;
  c2 = (await q<{ id: string }>(`insert into contractors(name) values ('Other Co') returning id`))[0].id;
}, 60_000);
afterAll(async () => { await db?.close(); });

describe('migration 0038', () => {
  it('can be applied twice (idempotent) and starts with calling OFF', async () => {
    await db.exec(read('0038_ai_calling_queue.sql'));
    expect((await q(`select enabled, window_start_hour, window_end_hour, max_attempts from ai_calling_settings`))[0]).toEqual({ enabled: false, window_start_hour: 8, window_end_hour: 21, max_attempts: 3 });
  });

  it('enqueues nothing for a contractor with no settings, "off" or "manual_only"', async () => {
    await assign(await lead('+13105550120'), c1);
    await db.query(`insert into ai_calling_contractor_settings(contractor_id, mode, agent_id, phone_number_id) values ($1,'off','a','p'), ($2,'manual_only','a','p')`, [c1, c2]);
    const l = await lead('+13105550121'); await assign(l, c1); await assign(l, c2);
    expect(await jobCount()).toBe(0);
  });

  it('enqueues exactly one automatic job per lead for an automatic contractor, and never duplicates it', async () => {
    await db.query(`update ai_calling_contractor_settings set mode='automatic' where contractor_id=$1`, [c1]);
    const l = await lead('+13105550122'); await assign(l, c1);
    const rows = await q(`select trigger_source, status, contact_phone, contact_zip, consent_basis, max_attempts, dedupe_key = 'lead:' || lead_id::text as key_ok from ai_call_jobs`);
    expect(rows).toEqual([{ trigger_source: 'auto_form', status: 'queued', contact_phone: '+13105550122', contact_zip: '90210', consent_basis: 'funnel:pool-masters-la', max_attempts: 3, key_ok: true }]);
    await db.query(`delete from lead_assignments where lead_id=$1`, [l]); await assign(l, c1);
    expect(await jobCount()).toBe(1);
  });

  it('never fails or slows a lead assignment, even if enqueueing breaks', async () => {
    await db.exec(`alter table ai_call_jobs add constraint force_fail check (false) not valid`);
    const l = await lead('+13105550123');
    await expect(assign(l, c1)).resolves.toBeDefined();
    expect(await jobCount()).toBe(1);
    await db.exec(`alter table ai_call_jobs drop constraint force_fail`);
  });

  it('claim: only due jobs, one worker at a time, lease reclaim, and single-job claim', async () => {
    await db.exec(`update ai_call_jobs set run_at = now() - interval '1 minute'`);
    const a = await q<{ status: string; locked_by: string }>(`select status, locked_by from claim_ai_call_jobs(10, 'w1')`);
    expect(a).toEqual([{ status: 'dispatching', locked_by: 'w1' }]);
    expect(await q(`select id from claim_ai_call_jobs(10, 'w2')`)).toHaveLength(0);
    await db.exec(`update ai_call_jobs set locked_until = now() - interval '1 second'`);
    expect((await q<{ locked_by: string }>(`select locked_by from claim_ai_call_jobs(10, 'w3')`))[0].locked_by).toBe('w3');
    await db.exec(`update ai_call_jobs set status='queued', run_at = now() + interval '1 hour'`);
    expect(await q(`select id from claim_ai_call_jobs(10, 'w4')`)).toHaveLength(0);
    const id = (await q<{ id: string }>(`select id from ai_call_jobs limit 1`))[0].id;
    await db.exec(`update ai_call_jobs set run_at = now() - interval '1 minute'`);
    expect(await q(`select id from claim_ai_call_jobs(10, 'w5', 300, '${id}')`)).toHaveLength(1);
  });

  it('rejects a second manual call with the same form token', async () => {
    await db.exec(`insert into ai_call_jobs(trigger_source, dedupe_key, contact_phone) values ('manual','manual:tok','+13105550199')`);
    await expect(db.exec(`insert into ai_call_jobs(trigger_source, dedupe_key, contact_phone) values ('manual','manual:tok','+13105550199')`)).rejects.toThrow();
  });

  it('browser roles cannot write, cannot claim jobs, and the admin-only read policy hides rows', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.exec(`insert into ai_call_opt_outs(phone_e164, source) values ('+1','x')`)).rejects.toThrow();
      await expect(db.exec(`select * from claim_ai_call_jobs(1,'x')`)).rejects.toThrow();
      await expect(db.exec(`update ai_calling_settings set enabled = true`)).rejects.toThrow();
      if (role === 'authenticated') expect((await q(`select id from ai_call_jobs`))).toHaveLength(0); // is_admin() false -> RLS hides everything
      await db.exec('reset role');
    }
  });
});
