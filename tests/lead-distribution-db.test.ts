import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { funnelSchema } from '@/lib/funnels/schema';

/**
 * Lead review + distribution (migration 0016), end to end in the database,
 * inside one transaction that always rolls back:
 *   Ethan-form submission -> lead saved, internal alert queued, NOT assigned or
 *   visible to Pool Masters -> Calendly booking recorded -> qualify -> send to
 *   Ethan + Gio -> assignment + appointment + history -> no duplicate sends.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = {
  contractor: randomUUID(), funnel: randomUUID(), session: randomUUID(), repeat: randomUUID(),
  ethan: randomUUID(), gio: randomUUID(), nadavR: randomUUID(), inactive: randomUUID(),
  ethanUser: randomUUID(), admin: randomUUID(),
};
const config = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/clients/pool-masters-la.json', 'utf8')));
const answers = { service: 'full_remodel', zip: '91436', homeowner: 'yes', timeline: '1_3_months' };
const contact = { firstName: 'Test', lastName: 'Homeowner', phone: '8185550142', email: `dist-${ids.session}@example.test`, consent: true };
const event = `https://api.calendly.com/scheduled_events/ev-${ids.session}`;
const invitee = `${event}/invitees/in-1`;
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await q('savepoint u');
  try {
    await q('set local role authenticated');
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const result = await fn();
    await q('reset role'); await q('release savepoint u');
    return result;
  } catch (e) { await q('rollback to savepoint u'); await q('reset role'); throw e; }
}
const distribute = (recipients: string[], resend = false) =>
  q('select public.distribute_lead($1,$2,$3,$4) as r', [lead, recipients, ids.admin, resend]).then((rows) => rows[0].r);

let connected = false;
let lead = '';
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  for (const [file, probe] of [['0013_house_funnels_private_sharing', 'activity_visible_to_contractor'], ['0015_funnel_calendly_bookings', 'record_calendly_booking'], ['0016_lead_review_distribution', 'distribute_lead']]) {
    const [fn] = await q('select to_regproc($1) as name', [`public.${probe}`]);
    if (!fn.name) await q(readFileSync(`supabase/migrations/${file}.sql`, 'utf8'));
  }
  await q("insert into public.contractors(id,name) values($1,'Pool Masters (test)')", [ids.contractor]);
  for (const [user, role, contractor] of [[ids.ethanUser, 'contractor', ids.contractor], [ids.admin, 'admin', null]]) {
    await q(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`, [user, `${user}@dist.test`]);
    await q("update public.profiles set role=$2, account_status='active', is_active=true, contractor_id=$3 where id=$1", [user, role, contractor]);
  }
  await q(`insert into public.lead_recipients(id,name,company,email,kind,contractor_id,is_active) values
    ($1,'Ethan','Pool Masters LA','ethan-${ids.ethan}@example.test','contractor',$5,true),
    ($2,'Gio','Pool Masters LA','gio-${ids.gio}@example.test','contractor',$5,true),
    ($3,'Nadav','HomeQuote','nadav-${ids.nadavR}@example.test','team_member',null,true),
    ($4,'Old contractor',null,'old-${ids.inactive}@example.test','contractor',null,false)`,
    [ids.ethan, ids.gio, ids.nadavR, ids.inactive, ids.contractor]);
  await q('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [ids.funnel, `dist-${ids.funnel}`, ids.contractor, config]);
  for (const s of [ids.session, ids.repeat]) {
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step,attribution) values($1,$2,$3,'test',$4,'contact',$5)",
      [s, ids.funnel, s, config, { utm_source: 'facebook', utm_campaign: 'pool-remodel-sept' }]);
  }
}, 60000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });

const suite = url ? describe : describe.skip;
suite('lead review + distribution (rolled back)', () => {
  it('saves an Ethan-form lead as Needs Qualification, assigned to Pool Masters in HomeQuote, with only the team alert', async () => {
    await q("select public.save_funnel_session($1,$2,0,$3,'calendar',null,$4,true,'consent')", [ids.session, ids.session, answers, contact]);
    // Replayed submit (double click / retry) must not create a second lead, assignment or alert.
    await q("select public.save_funnel_session($1,$2,1,$3,'calendar',null,$4,true,'consent')", [ids.session, ids.session, answers, contact]);
    const [s] = await q('select lead_id, assignment_id from public.funnel_sessions where id=$1', [ids.session]);
    lead = s.lead_id;
    expect(lead).toBeTruthy(); expect(s.assignment_id).toBeTruthy();
    const [l] = await q('select qualification_status, qualified, consent_source from public.leads where id=$1', [lead]);
    expect(l).toMatchObject({ qualification_status: 'needs_qualification', qualified: false, consent_source: `funnel:dist-${ids.funnel}` });
    expect(await q('select contractor_id from public.lead_assignments where lead_id=$1', [lead])).toEqual([{ contractor_id: ids.contractor }]);
    // Exactly one email queued: the internal alert (addressed to Liam + Nadav at send time). Nothing for Ethan or Gio.
    const emails = await q('select kind, status, recipient_email, is_repeat from public.lead_email_deliveries where lead_id=$1', [lead]);
    expect(emails).toEqual([{ kind: 'new_lead_alert', status: 'pending', recipient_email: null, is_repeat: false }]);
    // A contractor login never sees HomeQuote's recipients or email records.
    const seen = await as(ids.ethanUser, async () => ({
      deliveries: await q('select id from public.lead_email_deliveries'),
      recipients: await q('select id from public.lead_recipients'),
    }));
    expect(seen).toEqual({ deliveries: [], recipients: [] });
  });

  it('records a Calendly booking as the Pool Masters appointment without emailing anyone', async () => {
    await q("select public.record_calendly_booking($1,$2,$3,$4,'2026-10-02T18:30:00Z',true)", [ids.session, ids.session, invitee, event]);
    const [b] = await q('select fb.scheduled_at, fb.appointment_id from public.funnel_bookings fb join public.funnel_sessions s on s.id=fb.session_id where s.lead_id=$1', [lead]);
    expect(new Date(b.scheduled_at).toISOString()).toBe('2026-10-02T18:30:00.000Z');
    expect(b.appointment_id).toBeTruthy();
    expect(await q("select 1 from public.lead_email_deliveries where lead_id=$1 and kind='qualified_lead'", [lead])).toHaveLength(0);
  });

  it('a repeat request from the same homeowner reuses the lead and flags the alert as a repeat', async () => {
    await q("select public.save_funnel_session($1,$2,0,$3,'calendar',null,$4,true,'consent')", [ids.repeat, ids.repeat, answers, contact]);
    const [s] = await q('select lead_id from public.funnel_sessions where id=$1', [ids.repeat]);
    expect(s.lead_id).toBe(lead);
    const alerts = await q("select is_repeat from public.lead_email_deliveries where lead_id=$1 and kind='new_lead_alert' order by created_at", [lead]);
    expect(alerts.map((a) => a.is_repeat).sort()).toEqual([false, true]);
  });

  it('refuses to send before the lead is qualified', async () => {
    await q('savepoint early');
    await expect(distribute([ids.ethan])).rejects.toThrow(/Qualify the lead/);
    await q('rollback to savepoint early');
  });

  it('sends a qualified lead to Ethan + Gio only when selected: one assignment, one appointment, history recorded', async () => {
    await q("update public.leads set qualification_status='qualified', qualified=true, qualified_at=now(), qualified_by=$2, qualification_notes='Confirmed full remodel, 25-50k' where id=$1", [lead, ids.admin]);
    const r = await distribute([ids.ethan, ids.gio, ids.inactive]);
    expect(r.queued).toHaveLength(2);
    expect(r.skipped).toEqual([expect.objectContaining({ name: 'Old contractor', reason: 'inactive' })]);
    const sends = await q("select recipient_name, recipient_email, status, is_resend, requested_by from public.lead_email_deliveries where lead_id=$1 and kind='qualified_lead' order by recipient_name", [lead]);
    expect(sends.map((d) => d.recipient_name)).toEqual(['Ethan', 'Gio']);
    expect(sends.every((d) => d.status === 'pending' && !d.is_resend && d.requested_by === ids.admin)).toBe(true);
    // Both are linked to the same business -> exactly one assignment.
    const assignments = await q('select id, contractor_id, status, assigned_by from public.lead_assignments where lead_id=$1', [lead]);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ contractor_id: ids.contractor, status: 'appointment_set' });
    const appts = await q('select scheduled_at from public.appointments where assignment_id=$1', [assignments[0].id]);
    expect(appts).toHaveLength(1);
    expect(new Date(appts[0].scheduled_at).toISOString()).toBe('2026-10-02T18:30:00.000Z');
    const [l] = await q('select status from public.leads where id=$1', [lead]);
    expect(l.status).toBe('assigned');
    const history = await q("select body from public.lead_activities where lead_id=$1 and type='assignment' order by body", [lead]);
    expect(history.map((h) => h.body)).toEqual(['Lead sent to Ethan (Pool Masters LA)', 'Lead sent to Gio (Pool Masters LA)']);
    const seen = await as(ids.ethanUser, async () => ({
      deliveries: await q('select id from public.lead_email_deliveries where lead_id=$1', [lead]),
      internal: await q("select body from public.lead_activities where lead_id=$1 and type='assignment'", [lead]),
    }));
    expect(seen).toEqual({ deliveries: [], internal: [] });
  });

  it('never double-sends by accident, but an admin can deliberately resend', async () => {
    const again = await distribute([ids.ethan, ids.gio]);
    expect(again.queued).toHaveLength(0);
    expect(again.skipped.map((s: { reason: string }) => s.reason)).toEqual(['already_sent', 'already_sent']);
    // Even a direct duplicate insert is blocked by the unique index.
    await q('savepoint dup');
    await expect(q("insert into public.lead_email_deliveries(lead_id,kind,recipient_email) values($1,'qualified_lead',$2)", [lead, `ethan-${ids.ethan}@example.test`])).rejects.toThrow(/lead_email_send_once/);
    await q('rollback to savepoint dup');
    const resend = await distribute([ids.ethan], true);
    expect(resend.queued).toHaveLength(1);
    const [row] = await q('select is_resend, recipient_name from public.lead_email_deliveries where id=$1', [resend.queued[0]]);
    expect(row).toEqual({ is_resend: true, recipient_name: 'Ethan' });
    expect(await q('select 1 from public.lead_assignments where lead_id=$1', [lead])).toHaveLength(1);
    expect(await q('select 1 from public.appointments a join public.lead_assignments la on la.id=a.assignment_id where la.lead_id=$1', [lead])).toHaveLength(1);
  });

  it('team-member recipients get the email without a contractor assignment', async () => {
    const r = await distribute([ids.nadavR]);
    expect(r.queued).toHaveLength(1);
    expect(await q('select 1 from public.lead_assignments where lead_id=$1', [lead])).toHaveLength(1);
  });

  it('leases queued emails once, and failed ones can be claimed again for retry', async () => {
    const all = await q('select id from public.lead_email_deliveries where lead_id=$1', [lead]);
    const claimed = await q('select * from public.claim_lead_email_deliveries($1)', [all.map((r) => r.id)]);
    expect(claimed).toHaveLength(all.length);
    expect(claimed.every((c) => c.status === 'sending' && c.attempts === 1)).toBe(true);
    expect(await q('select * from public.claim_lead_email_deliveries($1)', [all.map((r) => r.id)])).toHaveLength(0);
    await q("update public.lead_email_deliveries set status='failed' where id=$1", [claimed[0].id]);
    const retry = await q('select * from public.claim_lead_email_deliveries($1)', [[claimed[0].id]]);
    expect(retry).toHaveLength(1); expect(retry[0].attempts).toBe(2);
  });

  it('queues exactly one alert for leads from any intake source (Meta, GHL, API), none for errors', async () => {
    const [other] = await q("insert into public.leads(first_name,source) values('Meta','meta') returning id");
    const [ev] = await q("insert into public.lead_intake_events(provider,status,lead_id) values('meta','created',$1) returning id", [other.id]);
    await q("insert into public.lead_intake_events(provider,status,error) values('meta','error','bad payload')");
    const alerts = await q("select intake_event_id from public.lead_email_deliveries where lead_id=$1 and kind='new_lead_alert'", [other.id]);
    expect(alerts).toEqual([{ intake_event_id: ev.id }]);
  });

  it('keeps recipients and email history out of reach of anonymous and non-admin callers', async () => {
    const [anon] = await q("select has_function_privilege('anon','public.distribute_lead(uuid,uuid[],uuid,boolean)','execute') as ok");
    const [auth] = await q("select has_function_privilege('authenticated','public.distribute_lead(uuid,uuid[],uuid,boolean)','execute') as ok");
    expect(anon.ok).toBe(false); expect(auth.ok).toBe(false);
    await expect(as(ids.ethanUser, () => q("insert into public.lead_recipients(name,email,kind) values('Sneaky','s@example.test','contractor')"))).rejects.toThrow();
    // Admin manages recipients through RLS.
    await as(ids.admin, () => q("update public.lead_recipients set is_active=false where id=$1", [ids.gio]));
    const [gio] = await q('select is_active from public.lead_recipients where id=$1', [ids.gio]);
    expect(gio.is_active).toBe(false);
  });
});
