import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';

/**
 * Migration 0042 against the REAL schema (all 42 migrations applied, nothing hand-modelled): the ledger triggers fire
 * on the real leads / appointments / sales / lead_assignments tables, RLS uses the real profiles-based helpers, and the
 * funnel booking RPCs create ledger rows. In-process disposable database - this is not Supabase and not Meta.
 */
let db: PGlite;
const q = async <T = Record<string, unknown>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
let c1: string, c2: string, admin: string, owner1: string, owner2: string, lead: string, assign: string;

async function actAs(uid: string | null, fn: () => Promise<unknown>) {
  await db.exec(`select set_config('app.uid', '${uid ?? ''}', false); set role authenticated`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('app.uid', '', false)`); }
}
const profile = async (role: string, contractor: string | null, contractorRole: string | null = null) => {
  const id = (await q<{ id: string }>(`insert into auth.users(email) values ($1) returning id`, [`${role}-${Math.random()}@x.test`]))[0].id;
  await db.query(`insert into profiles(id, full_name, role, contractor_id, contractor_role, is_active, account_status) values ($1,'t',$2,$3,$4,true,'active')
    on conflict (id) do update set role=excluded.role, contractor_id=excluded.contractor_id, contractor_role=excluded.contractor_role, is_active=true, account_status='active'`, [id, role, contractor, contractorRole]);
  return id;
};

beforeAll(async () => {
  db = await fullSchema();
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('Pool Masters') returning id`))[0].id;
  c2 = (await q<{ id: string }>(`insert into contractors(name) values ('Other Co') returning id`))[0].id;
  admin = await profile('admin', null);
  owner1 = await profile('contractor', c1, 'owner');
  owner2 = await profile('contractor', c2, 'owner');
  lead = (await q<{ id: string }>(`insert into leads(first_name, last_name, email, source, platform, campaign_id, ad_set_id, ad_id) values ('Jo','Lee','jo@x.test','website','web','111111','222222','333333') returning id`))[0].id;
  assign = (await q<{ id: string }>(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [lead, c1]))[0].id;
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('0042 on the real schema', () => {
  it('applied cleanly after 0040 and is idempotent', async () => {
    const sql = (await import('node:fs')).readFileSync(new URL('../supabase/migrations/0042_meta_ads_analytics_outcomes.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    expect((await q(`select delivery_mode, legacy_direct_qualified from meta_settings`))[0]).toEqual({ delivery_mode: 'off', legacy_direct_qualified: true });
  });

  it('ledgers a real qualification through the real status constraint (incl. out_of_service_area)', async () => {
    await db.query(`update leads set qualification_status='qualified', qualification_reason='confirmed_by_call', qualification_source='human', qualified_at=now() where id=$1`, [lead]);
    await db.query(`update leads set qualification_status='out_of_service_area' where id=$1`, [lead]);
    const o = await q<{ outcome: string }>(`select outcome from lead_outcome_events where lead_id=$1 order by recorded_at, outcome`, [lead]);
    expect(o.map((x) => x.outcome)).toEqual(['qualified', 'not_qualified']);
  });

  it('ledgers appointments and sales created the way the app creates them', async () => {
    const ap = (await q<{ id: string }>(`insert into appointments(assignment_id, scheduled_at) values ($1, now() + interval '2 days') returning id`, [assign]))[0].id;
    const ap2 = (await q<{ id: string }>(`insert into appointments(assignment_id, scheduled_at) values ($1, now() + interval '3 days') returning id`, [assign]))[0].id;
    const sale = (await q<{ id: string }>(`insert into sales(assignment_id, amount) values ($1, 12500) returning id`, [assign]))[0].id;
    const rows = await q<{ outcome: string; appointment_id: string | null; sale_id: string | null; occurred_at: string }>(`select outcome, appointment_id, sale_id, occurred_at from lead_outcome_events where outcome in ('appointment_booked','won')`);
    expect(rows.filter((r) => r.outcome === 'appointment_booked').map((r) => r.appointment_id).sort()).toEqual([ap, ap2].sort());
    expect(rows.find((r) => r.outcome === 'won')?.sale_id).toBe(sale);
    // occurred_at is when the booking was RECORDED, not the future appointment time
    expect(new Date(rows.find((r) => r.outcome === 'appointment_booked')!.occurred_at).getTime()).toBeLessThan(Date.now() + 60_000);
  });

  it('records a visitor booking made through the funnel RPCs (the GHL and Calendly paths) in the ledger', async () => {
    const integ = (await q<{ id: string }>(`select id from integrations limit 1`))[0]?.id;
    expect(integ).toBeTruthy(); // seeded by migration 0004
    const funnel = (await q<{ id: string }>(`insert into funnels(slug, contractor_id, integration_id, published, config) values ('t1',$1,$2,true,'{}') returning id`, [c1, integ]))[0].id;
    const l2 = (await q<{ id: string }>(`insert into leads(first_name, email, source, platform) values ('Al','al@x.test','website','web') returning id`))[0].id;
    const a2 = (await q<{ id: string }>(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l2, c1]))[0].id;
    const sess = (await q<{ id: string }>(`insert into funnel_sessions(funnel_id, token_hash, rate_key, config_snapshot, current_step, qualified, contact_submitted_at, lead_id, assignment_id, expires_at)
      values ($1,'h','r','{"calendarId":"cal1","calendarProvider":"ghl"}','calendar',true,now(),$2,$3, now() + interval '1 day') returning id`, [funnel, l2, a2]))[0].id;
    await db.query(`select record_funnel_booking($1,$2,'ext1','cal1', now() + interval '1 day')`, [sess, integ]);
    const fb = (await q<{ provider: string; appointment_id: string }>(`select provider, appointment_id from funnel_bookings where session_id=$1`, [sess]))[0];
    expect(fb.provider).toBe('ghl'); // -> the queue treats it as funnelBooking 'other' (browser fires Schedule, no server event existed)
    expect((await q(`select 1 from lead_outcome_events where appointment_id=$1 and outcome='appointment_booked'`, [fb.appointment_id]))).toHaveLength(1);
  });

  it('tenant isolation with the real helpers: owners see only their mapped campaigns; spend only when opted in', async () => {
    await db.exec(`
      insert into meta_ad_accounts(id,name,currency,contractor_id) values ('act_1','A','USD','${c1}'),('act_2','B','USD','${c2}');
      insert into meta_campaigns(id,account_id,name) values ('c_a','act_1','A'),('c_b','act_2','B');
      insert into meta_insights_daily(ad_id,date,account_id,campaign_id,adset_id,spend) values ('ad1','2026-10-01','act_1','c_a','s1',10),('ad2','2026-10-01','act_2','c_b','s2',20);`);
    const camps = async (uid: string) => ((await actAs(uid, () => q<{ id: string }>(`select id from meta_campaigns`))) as { id: string }[]).map((r) => r.id);
    expect(await camps(owner1)).toEqual(['c_a']);
    expect(await camps(owner2)).toEqual(['c_b']);
    expect((await camps(admin)).sort()).toEqual(['c_a', 'c_b']);
    expect(await actAs(owner1, () => q(`select * from meta_insights_daily`))).toHaveLength(0);
    await db.exec(`update meta_ad_accounts set show_spend_to_contractor=true where id='act_1'`);
    expect(await actAs(owner1, () => q(`select * from meta_insights_daily`))).toHaveLength(1);
    expect(await actAs(owner2, () => q(`select * from meta_insights_daily`))).toHaveLength(0);
  });

  it('outcome rows are scoped by contractor; the queue and settings are admin-only', async () => {
    const mine = (await actAs(owner1, () => q<{ lead_id: string }>(`select lead_id from lead_outcome_events`))) as unknown[];
    expect(mine.length).toBeGreaterThan(0);
    expect(await actAs(owner2, () => q(`select * from lead_outcome_events`))).toHaveLength(0);
    await db.query(`insert into meta_conversion_events(lead_id,stage,source_kind,event_name,action_source,dataset_id,event_id,event_time) values ($1,'qualified','website_pixel','QualifiedLead','other','1234567','e1',now())`, [lead]);
    expect(await actAs(owner1, () => q(`select * from meta_conversion_events`))).toHaveLength(0);
    expect(await actAs(admin, () => q(`select * from meta_conversion_events`))).toHaveLength(1);
    await expect(actAs(admin, () => db.query(`update meta_conversion_events set status='accepted'`))).rejects.toThrow();
  });

  it('a legacy direct-send audit row blocks the queue from inserting the same event id', async () => {
    await db.query(`insert into meta_conversion_events(lead_id,stage,source_kind,event_name,action_source,origin,dataset_id,event_id,event_time,status) values ($1,'lead','website_pixel','Lead','website','legacy_direct','1234567','sessX:Lead',now(),'accepted')`, [lead]);
    await expect(db.query(`insert into meta_conversion_events(lead_id,stage,source_kind,event_name,action_source,dataset_id,event_id,event_time) values ($1,'lead','website_pixel','Lead','website','1234567','sessX:Lead',now())`, [lead])).rejects.toThrow(/uq_mce_event/);
  });

  it('refund / cancellation appends a correction and keeps the original won entry', async () => {
    const s = (await q<{ id: string }>(`select id from sales where assignment_id=$1 limit 1`, [assign]))[0].id;
    await db.query(`update sales set sale_status='refunded' where id=$1`, [s]);
    expect(await q(`select 1 from lead_outcome_events where sale_id=$1 and outcome in ('won','correction')`, [s])).toHaveLength(2);
  });
});
