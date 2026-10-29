/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
/**
 * One set of reminders per booking: calls booked on a HomeQuote calendar (0070)
 * get their booking / reschedule / cancellation text and every email from
 * lib/booking, and their reminder TEXTS only from runTextReminders
 * (lib/sms/reminders.ts, 0068), which also handles YES / R. Real migration chain in PGlite.
 */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('tests pass their own db'); } }));
const push = vi.fn(async (...args: any[]) => (void args, { recipients: 0, notified: 0, devices: 0, sent: 0, failed: 0, removed: 0 }));
vi.mock('@/lib/notifications/service', () => ({ sendPushNotification: (i: any) => push(i) }));

import { sendBookingCancellation, sendBookingConfirmation, sendBookingReminder, type OutgoingEmail } from '@/lib/booking/notify.server';
import { homeownerHow, runTextReminders } from '@/lib/sms/reminders';
import { MANAGE_REPLY } from '@/lib/sms/reminder-replies';
import { handleInbound } from '@/lib/sms/service';

const T = new Date('2026-10-21T19:00:00Z'); // Wed noon Pacific: booked
const CALL = '2026-10-23T17:30:00Z'; // Fri 10:30 AM Pacific, a 10-minute call
const at = (iso: string) => new Date(iso);

let db: PGlite;
let sb: any;
let team: string;
let sales: string;
let sent: OutgoingEmail[] = [];
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const one = async (sql: string, p?: unknown[]) => (await q(sql, p))[0];
const deps = (now: Date) => ({ db: sb, sendEmail: async (m: OutgoingEmail) => { sent.push(m); }, siteUrl: 'https://hq.test', linkSecret: 'secret', now: () => now });
const run = (now: Date) => runTextReminders(sb, { now });
const outTexts = (phone: string) => q(`select m.body, m.status, m.reminder_step, m.workflow_step_run_id from public.sms_messages m join public.sms_conversations c on c.id=m.conversation_id
  where c.phone_e164=$1 and m.direction='out' order by m.created_at`, [phone]);
const bridgeSends = () => q(`update public.sms_messages set status='sent', sent_at=now() where status='queued'`);

let seq = 0;
async function nativeCall(o: { consent?: boolean; email?: string | null; startsAt?: string } = {}) {
  seq++;
  const phone = `+1818555${String(1200 + seq)}`;
  const leadId = (await one(`insert into public.leads(first_name, last_name, phone, email, state, consent_granted) values ('Pat','Doe',$1,$2,'CA',$3) returning id`,
    [phone, o.email === undefined ? `pat${seq}@example.test` : o.email, o.consent ?? true])).id;
  const startsAt = o.startsAt ?? CALL;
  const id = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at, time_zone, invitee_time_zone, source, meeting_type, created_at)
    values ($1,$2,$3,$4,'America/Los_Angeles','America/Los_Angeles','funnel','phone',$5) returning id`,
    [leadId, team, startsAt, new Date(Date.parse(startsAt) + 600_000).toISOString(), T.toISOString()])).id;
  return { id, leadId, phone };
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  sb = fakeSupabase(db);
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
  sales = (await one(`select id from public.booking_calendars where kind='sales'`)).id;
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await q(`update public.sms_settings set enabled=true, stopped_at=null, window_start_hour=0, window_end_hour=24, daily_cap=200, reminder_config='{}' where id`);
  sent = [];
  push.mockClear();
});

describe('a call booked on a HomeQuote calendar gets exactly one set of reminders', () => {
  it('booking text + emails from lib/booking, reminder texts from runTextReminders only, once per step; YES confirms', async () => {
    const c = await nativeCall();
    // Booked: our confirmation (email + text). The text reminders skip their own "booked" step.
    expect(await sendBookingConfirmation('appointment', c.id, deps(T))).toMatchObject({ notice: 'confirmed', email: 'sent', sms: 'queued' });
    expect((await run(T)).queued).toBe(0);
    await run(new Date(T.getTime() + 5 * 60_000));
    let t = await outTexts(c.phone);
    expect(t).toHaveLength(1);
    expect(t[0].body).toContain('you’re booked: a quick 10-minute call with Liam from HomeQuote');
    await bridgeSends();

    // Day before, 10:00 Pacific: ONE reminder text (with YES / R and who calls from which number) ...
    await run(at('2026-10-22T17:05:00Z'));
    await run(at('2026-10-22T17:10:00Z'));
    // ... and the 24 h reminder is an EMAIL only.
    sent = [];
    expect(await sendBookingReminder('appointment', c.id, '24h', deps(at('2026-10-22T17:30:00Z')))).toMatchObject({ notice: 'reminder_24h', email: 'sent', sms: 'text_reminders' });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('https://hq.test/booking/manage/'); // the reschedule / cancel link lives in the email
    await run(at('2026-10-22T17:35:00Z'));
    t = await outTexts(c.phone);
    expect(t.map((x) => x.reminder_step)).toEqual([null, 'day_before']);
    expect(t[1].body).toBe('Hi Pat, Liam from HomeQuote here. Confirming your quick 10-minute call tomorrow at 10:30 AM. Reply YES to confirm or R to reschedule. Liam will call you from (747) 217-5713.');
    await bridgeSends();

    // YES works for a calendar booking (the conversation was started by the booking text).
    const r = await handleInbound(sb, { phone: c.phone, body: 'Yes', guid: `g-${randomUUID()}` }, { now: () => at('2026-10-22T18:00:00Z') });
    expect(r.reason).toBe('reminder_confirmed');
    expect((await outTexts(c.phone)).at(-1)!.body).toBe("You're all set, talk to you tomorrow at 10:30 AM. - HomeQuote");
    expect((await q(`select body from public.lead_activities where lead_id=$1`, [c.leadId])).map((x) => x.body).join('\n')).toContain('Confirmed the call');
    await bridgeSends();

    // Morning of (8:00): one text; the 2-hour one is too close to it. The 1 h reminder is an email only.
    await run(at('2026-10-23T15:01:00Z'));
    await run(at('2026-10-23T15:31:00Z'));
    sent = [];
    expect(await sendBookingReminder('appointment', c.id, '1h', deps(at('2026-10-23T16:31:00Z')))).toMatchObject({ email: 'sent', sms: 'text_reminders' });
    await run(at('2026-10-23T16:31:00Z'));
    t = await outTexts(c.phone);
    const steps = t.map((x) => x.reminder_step).filter(Boolean);
    expect(steps).toEqual(['day_before', 'morning_of']);
    expect(new Set(steps).size).toBe(steps.length); // never twice
    // No booking-side reminder text exists at all.
    expect(t.filter((x) => x.workflow_step_run_id)).toHaveLength(1); // the confirmation only
  });

  it('R points to the manage link in the confirmation email and hands the conversation to a person', async () => {
    const c = await nativeCall({ startsAt: '2026-10-23T18:00:00Z' });
    await sendBookingConfirmation('appointment', c.id, deps(T));
    await run(at('2026-10-22T17:05:00Z'));
    await bridgeSends();
    const r = await handleInbound(sb, { phone: c.phone, body: 'R', guid: `g-${randomUUID()}` }, { now: () => at('2026-10-22T18:00:00Z') });
    expect(r.reason).toBe('reminder_reschedule');
    expect((await outTexts(c.phone)).at(-1)!.body).toBe(MANAGE_REPLY);
    expect((await one(`select status from public.sms_conversations where lead_id=$1`, [c.leadId])).status).toBe('handoff');
    expect((await q(`select body from public.lead_activities where lead_id=$1`, [c.leadId])).map((x) => x.body).join('\n')).toContain('Wants to reschedule the call');
  });

  it('a reschedule voids reminder texts still waiting for the old time; a cancel voids the rest', async () => {
    const c = await nativeCall({ startsAt: '2026-10-23T22:00:00Z' });
    await sendBookingConfirmation('appointment', c.id, deps(T));
    await bridgeSends();
    await run(at('2026-10-22T17:05:00Z')); // day_before, still queued (the bridge hasn't sent it)
    const newStart = '2026-10-27T22:00:00Z';
    await q(`update public.appointments set scheduled_at=$2, ends_at=$3, reschedule_count=reschedule_count+1, confirmed_at=null where id=$1`,
      [c.id, newStart, new Date(Date.parse(newStart) + 600_000).toISOString()]);
    expect(await sendBookingConfirmation('appointment', c.id, deps(at('2026-10-22T17:20:00Z')))).toMatchObject({ notice: 'rescheduled', sms: 'queued' });
    let t = await outTexts(c.phone);
    expect(t.find((x) => x.reminder_step === 'day_before')!.status).toBe('failed');
    expect(t.at(-1)!.body).toContain('is moved to');
    // The new time re-arms its own reminders.
    await run(at('2026-10-26T17:05:00Z'));
    t = await outTexts(c.phone);
    expect(t.filter((x) => x.reminder_step === 'day_before').map((x) => x.status)).toEqual(['failed', 'queued']);

    await q(`update public.appointments set status='cancelled', cancelled_at=$2 where id=$1`, [c.id, '2026-10-26T18:00:00Z']);
    expect(await sendBookingCancellation('appointment', c.id, deps(at('2026-10-26T18:00:00Z')))).toMatchObject({ notice: 'cancelled', sms: 'queued' });
    t = await outTexts(c.phone);
    expect(t.filter((x) => x.reminder_step).every((x) => x.status === 'failed')).toBe(true);
    await run(at('2026-10-27T15:01:00Z'));
    expect((await outTexts(c.phone)).length).toBe(t.length); // nothing for a cancelled call
  });

  it('no text consent: no reminder texts, the emails still go', async () => {
    const c = await nativeCall({ consent: false, startsAt: '2026-10-23T18:30:00Z' });
    expect(await sendBookingConfirmation('appointment', c.id, deps(T))).toMatchObject({ email: 'sent', sms: 'no_consent' });
    await run(at('2026-10-22T17:05:00Z'));
    expect(await outTexts(c.phone)).toHaveLength(0);
    expect((await one(`select status, detail from public.sms_reminders where ref_id=$1`, [c.id]))).toMatchObject({ status: 'skipped', detail: 'The homeowner did not agree to texts.' });
    expect(await sendBookingReminder('appointment', c.id, '24h', deps(at('2026-10-22T17:30:00Z')))).toMatchObject({ email: 'sent', sms: 'text_reminders' });
  });

  it('describes the booking for the reminder wording', () => {
    expect(homeownerHow({ calendar_id: null })).toBe('free estimate visit');
    expect(homeownerHow({ calendar_id: 'c', meeting_type: 'phone', scheduled_at: CALL, ends_at: '2026-10-23T17:40:00Z' })).toBe('quick 10-minute call');
    expect(homeownerHow({ calendar_id: 'c', meeting_type: 'phone', scheduled_at: CALL, ends_at: '2026-10-23T18:00:00Z' })).toBe('30-minute call');
    expect(homeownerHow({ calendar_id: 'c', meeting_type: 'video' })).toBe('video call');
  });
});

describe('a sales meeting booked on the HomeQuote sales calendar', () => {
  it('one "booked" text and the reminder texts from runTextReminders; confirmation + reminder emails from lib/booking; R points to the email', async () => {
    const pr = (await one(`insert into public.contractor_prospects(company_name, phone, email, decision_maker_name) values ('Builder Co','(818) 555-0142','sam@builder.test','Sam Builder') returning id`)).id;
    const sa = (await one(`insert into public.prospect_sales_appointments(prospect_id, decision_maker_name, scheduled_at, ends_at, time_zone, appointment_type, calendar_id, source, created_at)
      values ($1,'Sam Builder','2026-10-30T21:00:00Z','2026-10-30T21:30:00Z','America/Los_Angeles','phone',$2,'sales_funnel',$3) returning id`, [pr, sales, T.toISOString()])).id;
    expect(await sendBookingConfirmation('sales_appointment', sa, deps(T))).toMatchObject({ email: 'sent', sms: 'not_supported' });
    await run(T);
    await run(new Date(T.getTime() + 5 * 60_000));
    let t = await outTexts('+18185550142');
    expect(t.map((x) => x.reminder_step)).toEqual(['booked']);
    await bridgeSends();
    sent = [];
    expect(await sendBookingReminder('sales_appointment', sa, '24h', deps(at('2026-10-29T21:00:00Z')))).toMatchObject({ email: 'sent', sms: 'text_reminders' });
    expect(sent.map((m) => m.toEmail)).toEqual(['sam@builder.test']);
    await run(at('2026-10-29T17:05:00Z'));
    t = await outTexts('+18185550142');
    expect(t.map((x) => x.reminder_step)).toEqual(['booked', 'day_before']);
    await bridgeSends();
    const r = await handleInbound(sb, { phone: '+18185550142', body: 'R', guid: `g-${randomUUID()}` }, { now: () => at('2026-10-29T18:00:00Z') });
    expect(r.reason).toBe('reminder_reschedule');
    expect((await outTexts('+18185550142')).at(-1)!.body).toBe(MANAGE_REPLY);
  });
});
