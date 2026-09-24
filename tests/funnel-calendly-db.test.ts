import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { funnelSchema } from '@/lib/funnels/schema';

/** Ethan-style contractor funnel with Calendly, inside one always-rolled-back transaction. */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = { contractor: randomUUID(), funnel: randomUUID(), booked: randomUUID(), abandoned: randomUUID() };
const config = funnelSchema.parse({ ...JSON.parse(readFileSync('content/funnels/clients/pool-masters-la.json', 'utf8')), calendarUrl: 'https://calendly.com/test/consult' });
const answers = { service: 'full_build', zip: '91423', homeowner: 'yes', timeline: 'asap' };
const contact = (id: string) => ({ firstName: 'Cal', lastName: 'Test', phone: '8185550166', email: `cal-${id}@example.test`, consent: true });
const event = 'https://api.calendly.com/scheduled_events/ev-test';
const invitee = `${event}/invitees/in-test`;
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  for (const [file, probe] of [['0013_house_funnels_private_sharing', 'activity_visible_to_contractor'], ['0015_funnel_calendly_bookings', 'record_calendly_booking']]) {
    const [fn] = await q('select to_regproc($1) as name', [`public.${probe}`]);
    if (!fn.name) await q(readFileSync(`supabase/migrations/${file}.sql`, 'utf8'));
  }
  await q("insert into public.contractors(id,name) values($1,'Calendly test pools')", [ids.contractor]);
  await q('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [ids.funnel, `cal-${ids.funnel}`, ids.contractor, config]);
  for (const session of [ids.booked, ids.abandoned]) {
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1,$2,$3,'test',$4,'contact')", [session, ids.funnel, session, config]);
    await q("select public.save_funnel_session($1,$2,0,$3,'calendar',null,$4,true,'consent')", [session, session, answers, contact(session)]);
  }
}, 30000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });
const suite = url ? describe : describe.skip;
suite('Calendly bookings (rolled back)', () => {
  it('saves the lead and contractor assignment before Calendly', async () => {
    for (const session of [ids.booked, ids.abandoned]) {
      const [s] = await q('select lead_id, assignment_id, current_step, booked_at from public.funnel_sessions where id=$1', [session]);
      expect(s).toMatchObject({ current_step: 'calendar', booked_at: null });
      const [a] = await q('select contractor_id, status from public.lead_assignments where id=$1', [s.assignment_id]);
      expect(a).toEqual({ contractor_id: ids.contractor, status: 'assigned' });
    }
  });
  it('upgrades a submitted lead to booked with an appointment, once', async () => {
    await q("select public.record_calendly_booking($1,$2,$3,$4,'2026-10-01T17:00:00Z',true)", [ids.booked, ids.booked, invitee, event]);
    await q('select public.record_calendly_booking($1,$2,$3,$4,null,false)', [ids.booked, ids.booked, invitee, event]);
    const [s] = await q('select booked_at, assignment_id, lead_id from public.funnel_sessions where id=$1', [ids.booked]);
    expect(s.booked_at).toBeTruthy();
    const appointments = await q('select scheduled_at from public.appointments where assignment_id=$1', [s.assignment_id]);
    expect(appointments).toHaveLength(1);
    expect(new Date(appointments[0].scheduled_at).toISOString()).toBe('2026-10-01T17:00:00.000Z');
    const [a] = await q('select status from public.lead_assignments where id=$1', [s.assignment_id]);
    expect(a.status).toBe('appointment_set');
    const [activity] = await q("select metadata from public.lead_activities where lead_id=$1 and type='appointment'", [s.lead_id]);
    expect(activity.metadata).toMatchObject({ contractor_id: ids.contractor, calendly_invitee: invitee, verified: true });
    expect(await q("select 1 from public.funnel_events where session_id=$1 and event='appointment_booked'", [ids.booked])).toHaveLength(1);
  });
  it('keeps abandoned Calendly leads as submitted-not-booked, and rejects reused or forged bookings', async () => {
    const [s] = await q('select booked_at, lead_id from public.funnel_sessions where id=$1', [ids.abandoned]);
    expect(s.booked_at).toBeNull(); expect(s.lead_id).toBeTruthy();
    await q('savepoint reuse');
    await expect(q('select public.record_calendly_booking($1,$2,$3,$4)', [ids.abandoned, ids.abandoned, invitee, event])).rejects.toThrow(/another session/);
    await q('rollback to savepoint reuse');
    await q('savepoint forged');
    await expect(q('select public.record_calendly_booking($1,$2,$3,$4)', [ids.abandoned, 'wrong-token', `${event}/invitees/x`, event])).rejects.toThrow();
    await q('rollback to savepoint forged');
  });
});
