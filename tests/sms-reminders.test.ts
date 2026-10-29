/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
const push = vi.fn(async (...args: any[]) => (void args, { recipients: 0, notified: 0, devices: 0, sent: 0, failed: 0, removed: 0 }));
vi.mock('@/lib/notifications/service', () => ({ sendPushNotification: (i: any) => push(i) }));

import { describeWhen, planFollowUps, planMeetingReminders, planNoShow } from '@/lib/sms/reminder-plan';
import { DEFAULT_REMINDER_CONFIG, isConfirmReply, isRescheduleReply, reminderConfig, reminderTemplateProblem, renderReminder } from '@/lib/sms/reminder-config';
import { reminderChip } from '@/lib/sms/reminder-status';
import { runTextReminders } from '@/lib/sms/reminders';
import { handleInbound } from '@/lib/sms/service';

const LA = 'America/Los_Angeles';
const H = 3_600_000; const D = 24 * H;
const T = new Date('2026-10-21T19:00:00Z'); // Wed noon Pacific
const steps = (p: { step: string }[]) => p.map((s) => s.step);

describe('reminder schedule', () => {
  it('a meeting 9 days out gets every reminder, at 10 AM / 8 AM local', () => {
    const p = planMeetingReminders({ scheduledAt: new Date('2026-10-30T21:00:00Z'), bookedAt: T, timeZone: LA });
    expect(steps(p)).toEqual(['booked', 'four_days', 'day_before', 'morning_of', 'two_hours']);
    expect(p[1].dueAt.toISOString()).toBe('2026-10-26T17:00:00.000Z'); // Mon 10:00 PDT
    expect(p[2].dueAt.toISOString()).toBe('2026-10-29T17:00:00.000Z'); // Thu 10:00 PDT
    expect(p[3].dueAt.toISOString()).toBe('2026-10-30T15:00:00.000Z'); // Fri 8:00 PDT
    expect(p[4].dueAt.toISOString()).toBe('2026-10-30T19:00:00.000Z');
  });
  it('booked tomorrow: no 4-day reminder (and no day-before one once 10 AM has passed); an early meeting gets no 8 AM text', () => {
    expect(steps(planMeetingReminders({ scheduledAt: new Date('2026-10-22T21:00:00Z'), bookedAt: T, timeZone: LA }))).toEqual(['booked', 'morning_of', 'two_hours']);
    // 9:00 AM meeting: the 8 AM text would be too close; the 2-hour one is 7:00 AM.
    expect(steps(planMeetingReminders({ scheduledAt: new Date('2026-10-23T16:00:00Z'), bookedAt: T, timeZone: LA }))).toEqual(['booked', 'day_before', 'two_hours']);
  });
  it('drops a 2-hour text within 90 minutes of the morning one, and works across the DST change', () => {
    // 9:30 AM: morning_of 8:00, two_hours 7:30 (earlier than the morning text) is too close.
    expect(steps(planMeetingReminders({ scheduledAt: new Date('2026-10-23T16:30:00Z'), bookedAt: T, timeZone: LA }))).toEqual(['booked', 'day_before', 'two_hours']);
    // Nov 2 (after DST ends): 8:00 PST is 16:00Z.
    const p = planMeetingReminders({ scheduledAt: new Date('2026-11-02T22:00:00Z'), bookedAt: T, timeZone: LA });
    expect(p.find((s) => s.step === 'morning_of')!.dueAt.toISOString()).toBe('2026-11-02T16:00:00.000Z');
  });
  it('booked an hour ahead: nothing but the 2-hour reminder would be useful, so nothing at all', () => {
    expect(planMeetingReminders({ scheduledAt: new Date(T.getTime() + H), bookedAt: T, timeZone: LA })).toEqual([]);
  });
  it('no-show text 30 minutes after it is marked; follow-ups on day 1/3/7 or a nudge after a reply', () => {
    expect(planNoShow({ scheduledAt: T, markedAt: new Date(T.getTime() + H) }).dueAt.getTime()).toBe(T.getTime() + 1.5 * H);
    const f = planFollowUps({ openedAt: T, lastInboundAt: null, lastOutboundAt: T, days: [1, 3, 7] });
    expect(f.steps.map((s) => [s.step, (s.dueAt.getTime() - T.getTime()) / D])).toEqual([['first', 1], ['second', 3], ['final', 7]]);
    expect(steps(planFollowUps({ openedAt: T, lastInboundAt: null, lastOutboundAt: T, days: [2, 5] }).steps)).toEqual(['first', 'final']);
    const replied = new Date(T.getTime() + H);
    expect(planFollowUps({ openedAt: T, lastInboundAt: replied, lastOutboundAt: new Date(replied.getTime() + 60_000), days: [1, 3, 7] }).steps.map((s) => s.step)).toEqual(['nudge', 'nudge_last']);
    expect(planFollowUps({ openedAt: T, lastInboundAt: replied, lastOutboundAt: T, days: [1, 3, 7] }).steps).toEqual([]); // ball in our court
  });
  it('describes the time relative to when the text goes out', () => {
    const m = new Date('2026-10-22T21:00:00Z');
    expect(describeWhen(m, T, LA).when).toBe('tomorrow at 2:00 PM');
    expect(describeWhen(m, m, LA).when).toBe('today at 2:00 PM');
    expect(describeWhen(m, new Date('2026-10-18T19:00:00Z'), LA).when).toBe('Thursday, Oct 22 at 2:00 PM');
  });
});

describe('reminder wording and replies', () => {
  it('merges saved settings over the defaults and ignores bad values', () => {
    const c = reminderConfig({ contractor: { host: 'Sam', templates: { booked: 'Hi {nope}', day_before: 'See you {when}, {first_name}' } }, followups: { days: [7, 1, 1, 99] }, unconfirmedAlert: false });
    expect(c.contractor.host).toBe('Sam');
    expect(c.contractor.templates.booked).toBe(DEFAULT_REMINDER_CONFIG.contractor.templates.booked);
    expect(c.contractor.templates.day_before).toBe('See you {when}, {first_name}');
    expect(c.followups.days).toEqual([1, 7]);
    expect(c.unconfirmedAlert).toBe(false);
    expect(reminderTemplateProblem('Hi {name}')).toMatch(/Unknown fill-in/);
    expect(renderReminder('Hi {first_name}, see https://x.test {when}', { when: 'today at 2:00 PM' })).toBe('Hi there, see today at 2:00 PM');
  });
  it.each(['yes', 'Y', 'Yes!', 'ok', 'confirmed', '👍', 'See you then'])('%j confirms', (t) => expect(isConfirmReply(t)).toBe(true));
  it.each(['yes but can we move it', 'who is this', 'no'])('%j does not confirm', (t) => expect(isConfirmReply(t)).toBe(false));
  it.each(['R', 'reschedule', "I can't make it tomorrow", 'need a new time'])('%j asks to reschedule', (t) => expect(isRescheduleReply(t)).toBe(true));
  it('shows the right chip on a meeting', () => {
    const at = (m: number) => new Date(T.getTime() + m * 60_000).toISOString();
    expect(reminderChip([{ step: 'booked', status: 'queued', created_at: at(0) }, { step: 'day_before', status: 'queued', created_at: at(5) }], null)).toEqual({ label: 'Day-before reminder sent', tone: 'muted' });
    expect(reminderChip([{ step: 'confirmed', status: 'confirmed', created_at: at(6) }], null)?.label).toBe('Confirmed by text');
    expect(reminderChip([{ step: 'unconfirmed_alert', status: 'alerted', created_at: at(6) }], null)?.tone).toBe('warn');
    expect(reminderChip([], null)).toBeNull();
  });
});

// ---- database-backed -----------------------------------------------------------------------------------------------
let db: PGlite; let sb: any;
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
let n = 0;
const at = (iso: string) => new Date(iso);
const run = (now: Date) => runTextReminders(sb, { now });
const texts = (phone: string) => q(`select m.body, m.reminder_step, m.status from public.sms_messages m join public.sms_conversations c on c.id=m.conversation_id where c.phone_e164=$1 and m.direction='out' order by m.created_at`, [phone]);

async function meeting(opts: { at?: string; disposition?: string; contact?: string | null; partner?: string | null } = {}) {
  n++;
  const prospectId = randomUUID(); const id = randomUUID();
  const companyPhone = `(818) 555-08${String(10 + n).padStart(2, '0')}`;
  const cell = `818-555-09${String(10 + n).padStart(2, '0')}`;
  await q(`insert into public.contractor_prospects(id, company_name, phone, decision_maker_name, disposition) values ($1,$2,$3,'Mike Jones',$4)`, [prospectId, `Acme Remodel ${n}`, companyPhone, opts.disposition ?? 'new']);
  await q(`insert into public.prospect_sales_appointments(id, prospect_id, partner_id, scheduled_at, time_zone, appointment_type, contact_info, decision_maker_name, created_at)
    values ($1,$2,$3,$4,'America/Los_Angeles','phone',$5,'Mike Jones',$6)`, [id, prospectId, opts.partner ?? null, opts.at ?? '2026-10-30T21:00:00Z', opts.contact === undefined ? `Mike's cell ${cell}` : opts.contact, T.toISOString()]);
  return { id, prospectId, phone: `+1${cell.replace(/\D/g, '')}`, companyPhone: `+1${companyPhone.replace(/\D/g, '')}` };
}

beforeAll(async () => { db = await fullSchema({ supabaseGrants: true }); sb = fakeSupabase(db); }, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await q(`update public.sms_settings set enabled=true, stopped_at=null, window_start_hour=8, window_end_hour=21, daily_cap=200, reminder_config='{}' where id`);
  await q(`delete from public.sms_reminders`); await q(`delete from public.sms_messages`); await q(`delete from public.sms_conversations`); await q(`delete from public.sms_opt_outs`);
  push.mockClear();
});

describe('contractor sales meeting reminders', () => {
  it('texts the decision maker at each step, once, from the host and brand', async () => {
    const m = await meeting();
    expect((await run(T)).queued).toBe(1);
    await run(T); // nothing twice
    let out = await texts(m.phone);
    expect(out).toHaveLength(1);
    expect(out[0].reminder_step).toBe('booked');
    expect(out[0].body).toBe("Hi Mike, it's Liam with HomeQuote. You're all set for our call Friday, Oct 30 at 2:00 PM. Looking forward to it! If anything changes, just reply R and we'll find a new time.");
    const [convo] = await q(`select lead_id, prospect_id, sender_name from public.sms_conversations where phone_e164=$1`, [m.phone]);
    expect(convo).toMatchObject({ lead_id: null, prospect_id: m.prospectId, sender_name: 'HomeQuote' });

    await run(at('2026-10-26T17:05:00Z'));
    await run(at('2026-10-29T17:05:00Z'));
    out = await texts(m.phone);
    expect(out.map((o) => o.reminder_step)).toEqual(['booked', 'four_days', 'day_before']);
    expect(out[2].body).toContain('call tomorrow at 2:00 PM. Reply YES to confirm');
  });

  it('YES confirms the meeting and skips the not-confirmed alert; the 8 AM text still goes out', async () => {
    const m = await meeting();
    await run(at('2026-10-29T17:05:00Z'));
    const r = await handleInbound(sb, { phone: m.phone, body: 'Yes!', guid: `g-${randomUUID()}` }, { now: () => at('2026-10-29T18:00:00Z') });
    expect(r.reason).toBe('reminder_confirmed');
    const [a] = await q(`select status, confirmed_at from public.prospect_sales_appointments where id=$1`, [m.id]);
    expect(a.status).toBe('confirmed'); expect(a.confirmed_at).not.toBeNull();
    expect((await texts(m.phone)).at(-1)!.body).toContain("You're all set, talk to you tomorrow at 2:00 PM");
    await run(at('2026-10-30T15:01:00Z'));
    expect((await texts(m.phone)).at(-1)!.reminder_step).toBe('morning_of');
    expect(push).not.toHaveBeenCalled();
  });

  it('not confirmed by the morning: one push to call them; R alerts the team', async () => {
    const partner = randomUUID();
    await q(`insert into auth.users(id, email) values ($1, $2)`, [partner, `p${n}@x.test`]).catch(() => undefined);
    await q(`insert into public.profiles(id, role, full_name) values ($1,'caller','Pat')`, [partner]).catch(() => undefined);
    const m = await meeting({ partner });
    await run(at('2026-10-29T17:05:00Z'));
    await run(at('2026-10-30T15:01:00Z'));
    await run(at('2026-10-30T15:06:00Z'));
    const alerts = push.mock.calls.filter((c) => c[0].title === 'Meeting not confirmed');
    expect(alerts).toHaveLength(1);
    expect(alerts[0][0].userIds).toContain(partner);
    expect(alerts[0][0].body).toContain("hasn't confirmed today at 2:00 PM");

    const r = await handleInbound(sb, { phone: m.phone, body: "can't make it, sorry", guid: `g-${randomUUID()}` }, { now: () => at('2026-10-30T16:00:00Z') });
    expect(r.reason).toBe('reminder_reschedule');
    expect(push.mock.calls.some((c) => c[0].title === 'Wants to reschedule')).toBe(true);
  });

  it('never texts a do-not-call contractor; uses the company phone when the meeting has no number; STOP ends it', async () => {
    const dnc = await meeting({ disposition: 'do_not_call' });
    await run(T);
    expect(await texts(dnc.phone)).toHaveLength(0);
    expect((await q(`select status, detail from public.sms_reminders where ref_id=$1`, [dnc.id]))[0]).toMatchObject({ status: 'skipped' });

    const m = await meeting({ contact: 'mike@acme.test' });
    await run(T);
    expect(await texts(m.companyPhone)).toHaveLength(1);
    await handleInbound(sb, { phone: m.companyPhone, body: 'STOP', guid: `g-${randomUUID()}` }, { now: () => T });
    await run(at('2026-10-26T17:05:00Z'));
    expect((await texts(m.companyPhone)).filter((t) => t.reminder_step)).toHaveLength(1);
  });

  it('a rescheduled meeting gets its reminders again; a cancelled one gets none', async () => {
    const m = await meeting();
    await run(T);
    await q(`update public.prospect_sales_appointments set scheduled_at='2026-11-06T21:00:00Z', status='rescheduled' where id=$1`, [m.id]);
    await run(new Date(T.getTime() + 10 * 60_000));
    expect((await texts(m.phone)).map((t) => t.reminder_step)).toEqual(['booked', 'booked']);
    await q(`update public.prospect_sales_appointments set status='cancelled' where id=$1`, [m.id]);
    await run(at('2026-11-05T18:05:00Z'));
    expect(await texts(m.phone)).toHaveLength(2);
  });

  it('respects the master switch and the contractor switch', async () => {
    const m = await meeting();
    await q(`update public.sms_settings set reminder_config='{"contractor":{"enabled":false}}' where id`);
    await run(T);
    await q(`update public.sms_settings set reminder_config='{}', enabled=false where id`);
    await run(T);
    expect(await texts(m.phone)).toHaveLength(0);
  });
});

describe('homeowner appointment reminders', () => {
  it('texts the homeowner from the contractor, and YES / R are handled', async () => {
    const leadId = randomUUID(); const coId = randomUUID(); const asg = randomUUID(); const appt = randomUUID();
    await q(`insert into public.leads(id, first_name, last_name, phone, state, status) values ($1,'Sam','Lee','(818) 555-0777','CA','assigned')`, [leadId]);
    await q(`insert into public.contractors(id, name) values ($1,'Pool Masters')`, [coId]);
    await q(`insert into public.lead_assignments(id, lead_id, contractor_id) values ($1,$2,$3)`, [asg, leadId, coId]);
    await q(`insert into public.appointments(id, assignment_id, scheduled_at, created_at) values ($1,$2,'2026-10-23T22:00:00Z',$3)`, [appt, asg, T.toISOString()]);
    await run(T);
    const phone = '+18185550777';
    expect((await texts(phone))[0].body).toBe("Hi Sam, it's Pool Masters. Your free estimate visit is set for Friday, Oct 23 at 3:00 PM. Reply R anytime if you need a different time.");
    await run(at('2026-10-22T17:05:00Z'));
    expect((await texts(phone)).at(-1)!.reminder_step).toBe('day_before');
    const r = await handleInbound(sb, { phone, body: 'yes', guid: `g-${randomUUID()}` }, { now: () => at('2026-10-22T17:30:00Z') });
    expect(r.reason).toBe('reminder_confirmed');
    const notes = await q(`select body from public.lead_activities where lead_id=$1 order by created_at`, [leadId]);
    expect(notes.map((x) => x.body).join('\n')).toContain('Confirmed the visit');
  });
});

describe('calls booked on a HomeQuote calendar (0070)', () => {
  it('a team-calendar call with no assignment yet is reminded from its lead; no "booked" text (the booking confirmation covers it)', async () => {
    const leadId = randomUUID(); const appt = randomUUID();
    await q(`insert into public.leads(id, first_name, last_name, phone, state, status, consent_granted) values ($1,'Kim','Ray','(818) 555-0788','CA','new',true)`, [leadId]);
    const [{ id: team }] = await q(`select id from public.booking_calendars where kind='team'`);
    await q(`insert into public.appointments(id, lead_id, calendar_id, scheduled_at, ends_at, time_zone, invitee_time_zone, meeting_type, created_at)
      values ($1,$2,$3,'2026-10-23T22:00:00Z','2026-10-23T22:10:00Z','America/Los_Angeles','America/New_York','phone',$4)`, [appt, leadId, team, T.toISOString()]);
    await run(T);
    expect(await texts('+18185550788')).toHaveLength(0);
    await run(at('2026-10-22T14:05:00Z')); // 10:05 AM in the homeowner's own zone (New York)
    const out = await texts('+18185550788');
    expect(out.map((o) => o.reminder_step)).toEqual(['day_before']);
    expect(out[0].body).toBe('Hi Kim, Liam from HomeQuote here. Confirming your quick 10-minute call tomorrow at 6:00 PM. Reply YES to confirm or R to reschedule. Liam will call you from (747) 217-5713.');
  });
});

describe('homeowner follow-ups when they never reply', () => {
  it('follows up on day 1, 3 and 7, then closes; a reply afterwards reopens the conversation', async () => {
    const leadId = randomUUID();
    await q(`insert into public.leads(id, first_name, last_name, phone, state, status) values ($1,'Ana','Diaz','(818) 555-0666','CA','new')`, [leadId]);
    const [c] = await q(`insert into public.sms_conversations(lead_id, sender_name, phone_e164, status) values ($1,'HomeQuote','+18185550666','active') returning id`, [leadId]);
    await q(`insert into public.sms_messages(conversation_id, lead_id, direction, body, status, sent_at, created_at) values ($1,$2,'out','Hey Ana','sent',$3,$3)`, [c.id, leadId, T.toISOString()]);
    for (const d of [1, 3, 7]) {
      await run(new Date(T.getTime() + d * D + 5 * 60_000));
      await q(`update public.sms_messages set status='sent', sent_at=created_at where status='queued'`);
    }
    const out = await texts('+18185550666');
    expect(out.map((o) => o.reminder_step)).toEqual([null, 'first', 'second', 'final']);
    expect(out[3].body).toContain("I'll close out your project request");
    expect((await q(`select status from public.sms_conversations where id=$1`, [c.id]))[0].status).toBe('closed');
    await run(new Date(T.getTime() + 10 * D));
    expect(await texts('+18185550666')).toHaveLength(4);

    const agent = vi.fn(async () => ({ message: 'Great! Want a call or keep texting?', mode: null, qualification: 'unknown' as const, call_time: null, handoff: false, close: false, summary: 'Came back.' }));
    await handleInbound(sb, { phone: '+18185550666', body: 'sorry, been busy. still interested', guid: `g-${randomUUID()}` }, { agent, now: () => new Date(T.getTime() + 11 * D), aiConfigured: true });
    expect(agent).toHaveBeenCalled();
  });

  it('stops as soon as they reply', async () => {
    const leadId = randomUUID();
    await q(`insert into public.leads(id, first_name, last_name, phone, state, status) values ($1,'Bo','Kim','(818) 555-0655','CA','new')`, [leadId]);
    const [c] = await q(`insert into public.sms_conversations(lead_id, sender_name, phone_e164, status) values ($1,'HomeQuote','+18185550655','active') returning id`, [leadId]);
    await q(`insert into public.sms_messages(conversation_id, lead_id, direction, body, status, sent_at, created_at) values ($1,$2,'out','Hey Bo','sent',$3,$3)`, [c.id, leadId, T.toISOString()]);
    await q(`update public.sms_conversations set last_inbound_at=$2 where id=$1`, [c.id, new Date(T.getTime() + H).toISOString()]);
    await run(new Date(T.getTime() + D + 5 * 60_000));
    expect((await texts('+18185550655')).filter((t) => t.reminder_step)).toHaveLength(0);
  });
});
