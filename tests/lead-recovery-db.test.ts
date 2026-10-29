/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
/**
 * Lead recovery end to end on the REAL migration chain in PGlite (lib/booking/recovery.server.ts, the recovery steps
 * of lib/sms/reminders.ts, lib/sms/recovery.ts, the R reply): speed-to-lead alert, no-show text + email, the
 * "did you reach them?" host prompt, "Couldn't reach them", and the follow-up to leads who never booked.
 * Dedupe, consent, opt-outs, texting hours, once-only, no links in texts, host-contact wording, the switches.
 * No network: push and email are injected; texts only land in the sms_messages queue.
 */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('tests pass their own db'); } }));
const alertPush = vi.fn(async (...args: any[]) => (void args, { recipients: 0, notified: 0, devices: 0, sent: 0, failed: 0, removed: 0 }));
vi.mock('@/lib/notifications/service', () => ({ sendPushNotification: (i: any) => alertPush(i) }));
process.env.BOOKING_TICKET_SECRET = 'test-booking-secret';
process.env.ESTIMATOR_RENDER_SECRET = 'test-share-secret';

import { runRecovery, sendMissedCallRecovery, sendSpeedToLeadAlert, type RecoveryEmail } from '@/lib/booking/recovery.server';
import { runTextReminders } from '@/lib/sms/reminders';
import { RECOVERY_REPLY } from '@/lib/sms/reminder-replies';
import { handleInbound } from '@/lib/sms/service';

const T0 = new Date('2026-11-03T18:15:00Z'); // Tue Nov 3, 10:15 AM in Los Angeles
const plus = (min: number, from = T0) => new Date(from.getTime() + min * 60_000);
const URL_RE = /https?:\/\/|www\./i;

let db: PGlite;
let sb: any;
let team: string;
let admin: string;
let host: string;
let mails: RecoveryEmail[] = [];
let pushes: any[] = [];
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const one = async (sql: string, p?: unknown[]) => (await q(sql, p))[0];
const deps = (now: Date) => ({ db: sb, now, siteUrl: 'https://hq.test', alertEmails: ['owner@hq.test'], sendEmail: async (m: RecoveryEmail) => { mails.push(m); }, push: async (i: any) => { pushes.push(i); } });
const texts = (leadId: string) => q(`select body, status, reminder_step, send_after from public.sms_messages where lead_id=$1 and direction='out' order by created_at`, [leadId]);

let seq = 0;
async function newLead(o: { consent?: boolean; email?: string | null; design?: boolean } = {}) {
  seq++;
  const phone = `+1818555${String(3000 + seq)}`;
  const id = (await one(`insert into public.leads(first_name, last_name, phone, email, city, state, zip, consent_granted) values ('Jordan','Rivera',$1,$2,'Calabasas','CA','91302',$3) returning id`,
    [phone, o.email === undefined ? `jordan${seq}@example.test` : o.email, o.consent ?? true])).id as string;
  if (o.design !== false) {
    await q(`insert into public.lead_activities(lead_id, type, body, metadata) values ($1,'system','Instant estimator',$2)`, [id, JSON.stringify({
      estimator: { slug: 'pool-masters', low: 85_000, high: 110_000, pricesConfirmed: false, funnel: { selection: { size: 'classic', finish: 'luxe', extras: 'spa', spa: 'zero_edge' } },
        configurator: { photos: [{ view: 'size', url: 'https://hq.test/size.webp', alt: 'Size' }, { view: 'extras', url: 'https://hq.test/spa.webp', alt: 'Pool with spa' }] } },
    })]);
  }
  return { id, phone };
}
async function call(leadId: string, o: { status?: string; startsAt?: Date } = {}) {
  const s = o.startsAt ?? T0;
  return (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at, time_zone, invitee_time_zone, source, meeting_type, status, created_at)
    values ($1,$2,$3,$4,'America/Los_Angeles','America/Los_Angeles','estimator','phone',$5,$6) returning id`,
    [leadId, team, s.toISOString(), plus(10, s).toISOString(), o.status ?? 'scheduled', plus(-2 * 24 * 60).toISOString()])).id as string;
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  sb = fakeSupabase(db);
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
  admin = randomUUID();
  host = randomUUID();
  await q(`insert into auth.users(id,email) values ($1,'admin@hq.test'),($2,'setter@hq.test')`, [admin, host]);
  await q(`update public.profiles set role='admin', is_active=true, account_status='active' where id=$1`, [admin]);
  await q(`update public.profiles set role='setter', is_active=true, account_status='active' where id=$1`, [host]);
  await q(`insert into public.booking_calendar_members(calendar_id, user_id, notify) values ($1,$2,true) on conflict do nothing`, [team, host]);
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await q(`update public.sms_settings set enabled=true, stopped_at=null, window_start_hour=0, window_end_hour=24, daily_cap=200, reminder_config='{}' where id`);
  await q(`update public.booking_calendars set host_display_name=null, host_first_name=null where id=$1`, [team]);
  // One live call per time on the team calendar (the booking guard refuses overlaps): start each test clean.
  await q(`update public.appointments set status='cancelled' where status <> 'cancelled'`);
  mails = [];
  pushes = [];
  alertPush.mockClear();
});

describe('speed-to-lead alert', () => {
  it('pushes the admins + calendar host and emails the owner, once per lead; again once when they book', async () => {
    const l = await newLead();
    const r = await sendSpeedToLeadAlert({ leadId: l.id, event: 'submitted' }, deps(T0));
    expect(r).toMatchObject({ status: 'sent', emailed: 2 });
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({ type: 'new_lead', title: '🔥 New Luxe pool lead — not booked yet', body: 'Calabasas · Classic · Luxe · Zero-edge spa', url: `/app/leads/${l.id}` });
    expect(pushes[0].userIds.sort()).toEqual([admin, host].sort());
    expect(`${pushes[0].title} ${pushes[0].body}`).not.toMatch(/Jordan|Rivera|555|\$/); // lock-screen safe
    expect(mails.map((m) => m.toEmail).sort()).toEqual(['owner@hq.test', 'setter@hq.test']);
    expect(mails[0].subject).toBe('🔥 New Luxe pool lead: Jordan R., Calabasas — not booked yet');
    expect(mails[0].html).toContain(`href="tel:${l.phone}"`);
    expect(mails[0].text).toContain(`Open the lead: https://hq.test/app/leads/${l.id}`);
    expect(mails[0].text).toContain('Ballpark: $85,000 – $110,000');
    // Dedupe: the same lead never alerts twice for the same moment.
    expect((await sendSpeedToLeadAlert({ leadId: l.id, event: 'submitted' }, deps(T0))).status).toBe('already');
    expect(pushes).toHaveLength(1);

    const appt = await call(l.id, { startsAt: plus(24 * 60) });
    pushes = []; mails = [];
    expect((await sendSpeedToLeadAlert({ leadId: l.id, event: 'booked', appointmentId: appt }, deps(T0))).status).toBe('sent');
    expect(pushes[0]).toMatchObject({ type: 'appointment_booked', title: '🔥 New Luxe pool lead — booked Wed 10:15 AM' });
    expect(mails[0].subject).toBe('🔥 New Luxe pool lead: Jordan R., Calabasas — booked Wed 10:15 AM');
    expect(mails[0].text).toContain('with Liam from HomeQuote');
    expect((await sendSpeedToLeadAlert({ leadId: l.id, event: 'booked', appointmentId: appt }, deps(T0))).status).toBe('already');
  });

  it('works for a network funnel lead without an estimator design, and has its own switch', async () => {
    const l = await newLead({ design: false });
    expect((await sendSpeedToLeadAlert({ leadId: l.id, event: 'submitted' }, deps(T0))).status).toBe('sent');
    expect(pushes[0].title).toBe('🔥 New homeowner lead — not booked yet');
    await q(`update public.sms_settings set reminder_config='{"recovery":{"speedAlert":false}}' where id`);
    const m = await newLead();
    expect((await sendSpeedToLeadAlert({ leadId: m.id, event: 'submitted' }, deps(T0))).status).toBe('off');
  });

  it('never reaches a contractor user through a calendar they do not own', async () => {
    const co = (await one(`insert into public.contractors(name) values ('Other Co') returning id`)).id;
    const u = randomUUID();
    await q(`insert into auth.users(id,email) values ($1,'co@hq.test')`, [u]);
    await q(`update public.profiles set role='contractor', contractor_id=$2, is_active=true, account_status='active' where id=$1`, [u, co]);
    await q(`insert into public.booking_calendar_members(calendar_id, user_id, notify) values ($1,$2,true)`, [team, u]).catch(() => undefined);
    const l = await newLead();
    await sendSpeedToLeadAlert({ leadId: l.id, event: 'submitted' }, deps(T0));
    expect(pushes[0].userIds).not.toContain(u);
    expect(mails.map((m) => m.toEmail)).not.toContain('co@hq.test');
    await q(`delete from public.booking_calendar_members where user_id=$1`, [u]);
  });
});

describe('no-show recovery', () => {
  it('one friendly text (no link, reply R) and one email with the "pick a new time" link, 30 minutes after it is marked', async () => {
    const l = await newLead();
    const a = await call(l.id);
    // Marked a no-show (before the call time in this test's clock, so the text is due 30 minutes after the call).
    await q(`update public.appointments set status='no_show' where id=$1`, [a]);
    await runTextReminders(sb, { now: plus(20) }); // not yet due
    await runRecovery(deps(plus(20)));
    expect(await texts(l.id)).toHaveLength(0);
    expect(mails).toHaveLength(0);

    await runTextReminders(sb, { now: plus(50) });
    await runTextReminders(sb, { now: plus(55) });
    await runRecovery(deps(plus(50)));
    await runRecovery(deps(plus(55)));
    const t = await texts(l.id);
    expect(t).toHaveLength(1);
    expect(t[0].reminder_step).toBe('no_show');
    expect(t[0].body).toBe('Sorry we missed you, Jordan! Want to pick a new time for your free pool design call? Check your email for a link to pick a new time, or reply R.');
    expect(t[0].body).not.toMatch(URL_RE);
    expect(mails).toHaveLength(1);
    expect(mails[0].toEmail).toMatch(/^jordan\d+@example\.test$/);
    expect(mails[0].subject).toBe('Sorry we missed you, Jordan');
    expect(mails[0].text).toMatch(/Pick a new time: https:\/\/hq\.test\/booking\/pick\/hqr1\./);
    expect(mails[0].text).toContain('See your design: https://hq.test/estimator/pool-masters/my-design?');

    // R hands it to a person and points to the email's link (lib/sms/reminder-replies.ts).
    await q(`update public.sms_messages set status='sent', sent_at=$2, created_at=$2 where lead_id=$1`, [l.id, plus(56).toISOString()]);
    const r = await handleInbound(sb, { phone: l.phone, body: 'R', guid: `g-${randomUUID()}` }, { now: () => plus(70) });
    expect(r.reason).toBe('recovery_reply');
    expect((await texts(l.id)).map((m) => m.body)).toContain(RECOVERY_REPLY);
    expect((await one(`select status from public.sms_conversations where lead_id=$1`, [l.id])).status).toBe('handoff');
  });

  it('opted out: no text, the email still goes; switched off: neither', async () => {
    const l = await newLead();
    await q(`insert into public.sms_opt_outs(phone_e164, source) values ($1,'stop_reply')`, [l.phone]);
    const a = await call(l.id);
    await q(`update public.appointments set status='no_show' where id=$1`, [a]);
    await runTextReminders(sb, { now: plus(50) });
    await runRecovery(deps(plus(50)));
    expect(await texts(l.id)).toHaveLength(0);
    expect(mails).toHaveLength(1);

    await q(`update public.sms_settings set reminder_config='{"recovery":{"noShow":false}}' where id`);
    const m = await newLead();
    const b = await call(m.id);
    await q(`update public.appointments set status='no_show' where id=$1`, [b]);
    mails = [];
    await runTextReminders(sb, { now: plus(50) });
    await runRecovery(deps(plus(50)));
    expect(await texts(m.id)).toHaveLength(0);
    expect(mails).toHaveLength(0);
  });
});

describe('"did you reach them?" host prompt', () => {
  it('pushes the host once, 30 minutes after a call that is still scheduled; never changes the status', async () => {
    const l = await newLead();
    const a = await call(l.id);
    await runRecovery(deps(plus(25))); // 15 min after it ended
    expect(pushes.filter((p) => p.entityId === a)).toHaveLength(0);
    await runRecovery(deps(plus(41)));
    await runRecovery(deps(plus(46)));
    const mine = pushes.filter((p) => p.entityId === a);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ type: 'workflow_alert', title: 'Did you reach them? (10:15 AM call)', userIds: [host], url: `/app/calendar?cal=${team}&view=day&date=2026-11-03` });
    expect((await one(`select status from public.appointments where id=$1`, [a])).status).toBe('scheduled');
  });
});

describe('"Couldn\'t reach them"', () => {
  it('texts (host-contact wording, no link) and emails the pick-a-new-time link, logs it, and rate-limits to once per 6 hours', async () => {
    await q(`update public.booking_calendars set host_display_name='Liam from Pool Masters', host_first_name='Liam' where id=$1`, [team]);
    const l = await newLead();
    const a = await call(l.id);
    const r = await sendMissedCallRecovery({ appointmentId: a, actorId: admin }, deps(plus(15)));
    expect(r).toMatchObject({ ok: true, sms: 'queued', email: 'sent' });
    const t = await texts(l.id);
    expect(t).toHaveLength(1);
    expect(t[0].body).toBe('Hi Jordan, Liam from Pool Masters here — tried calling you for your design call. Reply here or check your email to pick a new time.');
    expect(t[0].reminder_step).toBe('missed_call');
    expect(mails[0].subject).toBe('Liam from Pool Masters tried calling you');
    expect(mails[0].text).toMatch(/Pick a new time: https:\/\/hq\.test\/booking\/pick\/hqr1\./);
    const act = await one(`select type, actor_id, body from public.lead_activities where lead_id=$1 and metadata->>'missed_call'='true'`, [l.id]);
    expect(act).toMatchObject({ type: 'contact_attempt', actor_id: admin });
    expect(act.body).toContain('Couldn’t reach them for the call on Tue 10:15 AM. Sent a text and an email');

    const again = await sendMissedCallRecovery({ appointmentId: a, actorId: admin }, deps(plus(120)));
    expect(again.ok).toBe(false);
    expect((again as any).error).toMatch(/^Already sent at Tue 10:30 AM\. You can send it again after Tue 4:30 PM\.$/);
    expect(await texts(l.id)).toHaveLength(1);
    expect((await sendMissedCallRecovery({ appointmentId: a, actorId: admin }, deps(plus(6 * 60 + 20)))).ok).toBe(true);
  });

  it('respects consent and texting hours; still emails', async () => {
    await q(`update public.sms_settings set window_start_hour=8, window_end_hour=21 where id`);
    const l = await newLead({ consent: false });
    const a = await call(l.id);
    const r = await sendMissedCallRecovery({ appointmentId: a, actorId: admin }, deps(plus(15)));
    expect(r).toMatchObject({ ok: true, sms: 'no_consent', email: 'sent' });
    expect(await texts(l.id)).toHaveLength(0);

    const m = await newLead();
    const late = new Date('2026-11-04T05:30:00Z'); // 9:30 PM in Los Angeles: outside 8 AM–9 PM
    const b = await call(m.id, { startsAt: new Date('2026-11-04T05:00:00Z') });
    expect((await sendMissedCallRecovery({ appointmentId: b, actorId: admin }, deps(late))).ok).toBe(true);
    const t = await texts(m.id);
    expect(t).toHaveLength(1);
    expect(new Date(t[0].send_after).toISOString()).toBe('2026-11-04T16:00:00.000Z'); // 8:00 AM next morning
  });
});

describe('leads who gave their details but never booked', () => {
  let funnelId: string;
  beforeAll(async () => {
    funnelId = (await one(`insert into public.funnels(slug, contractor_id, published, config) values ('pool-unbooked-test', null, true, $1) returning id`,
      [JSON.stringify({ calendarProvider: 'homequote', industry: 'pool remodeling' })])).id;
  });
  async function submitted(l: { id: string }, at: Date) {
    await q(`insert into public.funnel_sessions(funnel_id, token_hash, rate_key, config_snapshot, current_step, lead_id, contact_submitted_at, qualified, contact)
      values ($1,$2,'t',$3,'calendar',$4,$5,true,'{}')`, [funnelId, randomUUID().replace(/-/g, '').padEnd(64, '0'), JSON.stringify({ calendarProvider: 'homequote', industry: 'pool remodeling' }), l.id, at.toISOString()]);
  }

  it('one text and one email, 2 hours later, once per lead', async () => {
    const now = new Date('2026-11-03T20:00:00Z');
    const l = await newLead();
    await submitted(l, plus(-115, now)); // 1 h 55 min ago
    await runTextReminders(sb, { now });
    await runRecovery(deps(now));
    expect(await texts(l.id)).toHaveLength(0);
    expect(mails.filter((m) => m.toEmail.startsWith('jordan'))).toHaveLength(0);

    for (const later of [plus(10, now), plus(20, now), plus(120, now)]) {
      await runTextReminders(sb, { now: later });
      await runRecovery(deps(later));
    }
    const t = await texts(l.id);
    expect(t).toHaveLength(1);
    expect(t[0].body).toBe('Hi Jordan, your Luxe pool design and ballpark are ready. Want a quick 10-minute call with Liam from HomeQuote to go over it? Reply with a good time, or check your email for a link to pick one.');
    expect(t[0].body).not.toMatch(URL_RE);
    const mine = mails.filter((m) => m.toEmail.startsWith('jordan'));
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toBe('Your Luxe pool design and ballpark');
    expect(mine[0].text).toMatch(/Pick a time: https:\/\/hq\.test\/booking\/pick\/hqb1\.e\./);
    expect(mine[0].html).toContain('src="https://hq.test/spa.webp"');
  });

  it('never when they booked, a person already texted or called, or they opted out; no consent: email only', async () => {
    const now = new Date('2026-11-03T22:00:00Z');
    const booked = await newLead();
    await submitted(booked, plus(-130, now));
    await call(booked.id, { startsAt: plus(24 * 60, now) });
    const texted = await newLead();
    await submitted(texted, plus(-130, now));
    const c = (await one(`insert into public.sms_conversations(lead_id, sender_name, phone_e164, status) values ($1,'HomeQuote',$2,'handoff') returning id`, [texted.id, texted.phone])).id;
    await q(`insert into public.sms_messages(conversation_id, lead_id, direction, body, status, ai, created_at) values ($1,$2,'out','Hey, Liam here','sent',false,$3)`, [c, texted.id, plus(-60, now).toISOString()]);
    const called = await newLead();
    await submitted(called, plus(-130, now));
    await q(`insert into public.lead_activities(lead_id, type, body, created_at) values ($1,'contact_attempt','Called, no answer',$2)`, [called.id, plus(-30, now).toISOString()]);
    const stop = await newLead();
    await submitted(stop, plus(-130, now));
    await q(`insert into public.sms_opt_outs(phone_e164, source) values ($1,'stop_reply')`, [stop.phone]);
    const noConsent = await newLead({ consent: false });
    await submitted(noConsent, plus(-130, now));

    await runTextReminders(sb, { now });
    await runRecovery(deps(now));
    // (The booked lead may get its own call reminder; never the not-booked follow-up.)
    for (const x of [booked, called, stop, noConsent]) expect((await texts(x.id)).filter((m) => m.reminder_step === 'unbooked')).toHaveLength(0);
    for (const x of [called, stop, noConsent]) expect(await texts(x.id)).toHaveLength(0);
    expect((await texts(texted.id)).map((m) => m.body)).toEqual(['Hey, Liam here']);
    const got = new Set(mails.map((m) => m.toEmail));
    const emailOf = async (x: { id: string }) => (await one(`select email from public.leads where id=$1`, [x.id])).email;
    for (const x of [booked, texted, called]) expect(got.has(await emailOf(x))).toBe(false);
    expect(got.has(await emailOf(stop))).toBe(true); // opted out of texts, not email
    expect(got.has(await emailOf(noConsent))).toBe(true);
  });
});
