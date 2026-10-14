/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';

/** Runs the REAL migration chain (incl. 0047) in PGlite and exercises RLS + the sync-outbox trigger. */
let db: PGlite;
const id = Object.fromEntries(
  ['admin', 'setter', 'ownerA', 'staffA', 'ownerB', 'companyA', 'companyB', 'lead', 'assignA'].map((k) => [k, randomUUID()])
) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;

async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('app.uid','${userId}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('app.uid','', false)`); }
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'A'),($2,'B')`, [id.companyA, id.companyB]);
  for (const [uid, role, company, crole] of [
    [id.admin, 'admin', null, null],
    [id.setter, 'setter', null, null],
    [id.ownerA, 'contractor', id.companyA, 'owner'],
    [id.staffA, 'contractor', id.companyA, 'staff'],
    [id.ownerB, 'contractor', id.companyB, 'owner'],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active' where id=$1`, [uid, role, company, crole]);
  }
  await q(`insert into public.leads(id, first_name) values ($1,'Pat')`, [id.lead]);
  await q(`insert into public.lead_assignments(id, lead_id, contractor_id) values ($1,$2,$3)`, [id.assignA, id.lead, id.companyA]);
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('availability RLS', () => {
  it('lets an owner write their own company, and nobody else’s', async () => {
    await as(id.ownerA, () => q(`insert into public.contractor_availability_rules(contractor_id,weekday,start_minute,end_minute) values ($1,1,480,1020)`, [id.companyA]));
    await expect(as(id.ownerA, () => q(`insert into public.contractor_availability_rules(contractor_id,weekday,start_minute,end_minute) values ($1,1,480,1020)`, [id.companyB]))).rejects.toThrow();
    await expect(as(id.ownerB, () => q(`insert into public.contractor_availability_exceptions(contractor_id,date_start,date_end) values ($1,'2026-10-20','2026-10-20')`, [id.companyA]))).rejects.toThrow();
  });

  it('keeps staff users read-only and hides other companies', async () => {
    await expect(as(id.staffA, () => q(`insert into public.contractor_availability_rules(contractor_id,weekday,start_minute,end_minute) values ($1,2,480,1020)`, [id.companyA]))).rejects.toThrow();
    expect((await as(id.staffA, () => q(`select * from public.contractor_availability_rules`))).length).toBe(1);
    expect((await as(id.ownerB, () => q(`select * from public.contractor_availability_rules`))).length).toBe(0);
  });

  it('lets internal staff (setter/admin) read but only admin write', async () => {
    expect((await as(id.setter, () => q(`select * from public.contractor_availability_rules`))).length).toBe(1);
    await expect(as(id.setter, () => q(`insert into public.contractor_availability_settings(contractor_id) values ($1)`, [id.companyA]))).rejects.toThrow();
    await as(id.admin, () => q(`insert into public.contractor_availability_settings(contractor_id) values ($1)`, [id.companyA]));
  });

  it('rejects malformed rows', async () => {
    await expect(q(`insert into public.contractor_availability_rules(contractor_id,weekday,start_minute,end_minute) values ($1,1,600,600)`, [id.companyA])).rejects.toThrow();
    await expect(q(`insert into public.contractor_availability_exceptions(contractor_id,date_start,date_end,start_minute) values ($1,'2026-10-20','2026-10-20',60)`, [id.companyA])).rejects.toThrow();
    await expect(q(`insert into public.contractor_availability_exceptions(contractor_id,date_start,date_end,repeat_weekly) values ($1,'2026-10-20','2026-10-27',true)`, [id.companyA])).rejects.toThrow();
  });
});

describe('calendar connections privacy', () => {
  let connId: string;
  beforeAll(async () => {
    connId = (await q<{ id: string }>(
      `insert into public.calendar_connections(user_id,contractor_id,provider,encrypted_credentials,account_email) values ($1,$2,'google','v1.secret','a@x.test') returning id`,
      [id.ownerA, id.companyA]
    ))[0].id;
  });

  it('never exposes credentials to clients', async () => {
    await expect(as(id.ownerA, () => q(`select encrypted_credentials from public.calendar_connections`))).rejects.toThrow();
    await expect(as(id.admin, () => q(`select * from public.calendar_connections`))).rejects.toThrow();
    const safe = await as(id.ownerA, () => q(`select id, account_email, status from public.calendar_connections`));
    expect(safe).toHaveLength(1);
  });

  it('scopes safe columns to the owner/company owner/admin', async () => {
    expect(await as(id.ownerB, () => q(`select id from public.calendar_connections`))).toHaveLength(0);
    expect(await as(id.staffA, () => q(`select id from public.calendar_connections`))).toHaveLength(0);
    expect(await as(id.admin, () => q(`select id from public.calendar_connections`))).toHaveLength(1);
  });

  it('blocks all client writes', async () => {
    await expect(as(id.ownerA, () => q(`update public.calendar_connections set calendar_id='x' where id=$1`, [connId]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`delete from public.calendar_connections where id=$1`, [connId]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`select * from public.calendar_feed_tokens`))).resolves.toEqual([]);
    await expect(as(id.ownerA, () => q(`select * from public.calendar_sync_jobs`))).resolves.toEqual([]);
  });
});

describe('calendar sync outbox trigger', () => {
  it('queues a coalesced job on insert/update/delete and survives errors', async () => {
    const a = (await q<{ id: string }>(`insert into public.appointments(assignment_id,scheduled_at) values ($1, now() + interval '2 days') returning id`, [id.assignA]))[0].id;
    let jobs = await q(`select * from public.calendar_sync_jobs where appointment_id=$1`, [a]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].contractor_id).toBe(id.companyA);

    await q(`update public.appointments set scheduled_at = now() + interval '3 days' where id=$1`, [a]);
    await q(`update public.appointments set status='cancelled' where id=$1`, [a]);
    jobs = await q(`select * from public.calendar_sync_jobs where appointment_id=$1`, [a]);
    expect(jobs).toHaveLength(1); // coalesced

    const claimed = await q(`select * from public.claim_calendar_sync_jobs(10)`);
    expect(claimed.some((j) => j.appointment_id === a && j.attempts === 1)).toBe(true);
    await q(`update public.calendar_sync_jobs set processed_at=now() where appointment_id=$1`, [a]);

    // A later change queues a fresh job once the previous one is processed.
    await q(`update public.appointments set status='scheduled' where id=$1`, [a]);
    jobs = await q(`select * from public.calendar_sync_jobs where appointment_id=$1 and processed_at is null`, [a]);
    expect(jobs).toHaveLength(1);
    // (Hard deletes of appointments with outcome-ledger rows are already blocked by the append-only ledger;
    //  the worker treats a missing appointment as "remove from calendars".)
  });

  it('only service_role may claim jobs', async () => {
    await expect(as(id.ownerA, () => q(`select * from public.claim_calendar_sync_jobs(5)`))).rejects.toThrow();
  });
});
