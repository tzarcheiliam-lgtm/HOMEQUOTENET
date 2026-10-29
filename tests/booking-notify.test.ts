/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('tests pass their own db'); } }));

import { bookingIcs, buildGuestBookingEmail, buildHostBookingEmail, prettyPhone, safeLink, type GuestMessageContext } from '@/lib/emails/booking';
import { bookingSms } from '@/lib/booking/sms-copy';
import { bookingTextKey, ensureManageToken, icsForManageToken, manageTokenFor, sendBookingCancellation, sendBookingConfirmation, sendBookingReminder, type OutgoingEmail } from '@/lib/booking/notify.server';
import { runBookingNotifications } from '@/lib/booking/reminders.server';
import { findByManageToken } from '@/lib/booking/book.server';
import { hashManageToken } from '@/lib/booking/tokens';

const TZ = 'America/Los_Angeles';
const SECRET = 'test-booking-link-secret';
const SITE = 'https://hq.test';

// --- pure copy ------------------------------------------------------------------------------------

const START = Date.UTC(2026, 10, 3, 17, 30); // Tue Nov 3 2026, 9:30 AM PST
const guest = (o: Partial<GuestMessageContext> = {}): GuestMessageContext => ({
  firstName: 'Pat', hostName: 'HomeQuote', startMs: START, endMs: START + 30 * 60_000, timeZone: TZ, meetingType: 'phone',
  phone: '+13105550100', videoLink: null, manageUrl: `${SITE}/book/manage/tok`, icsUrl: `${SITE}/book/manage/tok/calendar.ics`, ...o,
});

describe('booking copy (pure)', () => {
  it('confirmation email: time with zone, how we call, manage + calendar buttons, escaped', () => {
    const m = buildGuestBookingEmail('confirmed', guest({ firstName: '<b>Pat</b>' }));
    expect(m.subject).toBe('Your call with HomeQuote is booked: Tue, Nov 3 · 9:30 AM PST');
    expect(m.text).toContain("We'll call you at (310) 555-0100.");
    expect(m.text).toContain(`Reschedule or cancel: ${SITE}/book/manage/tok`);
    expect(m.text).toContain('Add to calendar: https://hq.test/book/manage/tok/calendar.ics');
    expect(m.html).toContain('&lt;b&gt;Pat&lt;/b&gt;');
    expect(m.html).not.toContain('<b>Pat</b>');
  });

  it('shows the guest’s own zone, the previous time on a reschedule, and no buttons once cancelled', () => {
    expect(buildGuestBookingEmail('reminder_24h', guest({ timeZone: 'America/New_York' })).subject).toContain('12:30 PM EST');
    expect(buildGuestBookingEmail('rescheduled', guest({ previousStartMs: START - 86_400_000 })).text).toContain('(it was Mon, Nov 2 · 9:30 AM PST)');
    const c = buildGuestBookingEmail('cancelled', guest());
    expect(c.text).not.toContain('Reschedule or cancel');
    expect(c.subject).toBe('Your call with HomeQuote is cancelled');
    // No manage link: tell them to reply instead.
    expect(buildGuestBookingEmail('confirmed', guest({ manageUrl: null, icsUrl: null })).text).toContain('Just reply to this email');
  });

  it('never writes a non-http link and formats phones', () => {
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(buildGuestBookingEmail('confirmed', guest({ manageUrl: 'javascript:alert(1)' })).html).not.toContain('javascript:');
    expect(prettyPhone('+1 (310) 555-0100')).toBe('(310) 555-0100');
    expect(buildGuestBookingEmail('confirmed', guest({ meetingType: 'video', videoLink: 'https://meet.test/x' })).text).toContain('Join here: https://meet.test/x');
  });

  it('host email lists the guest and links into the app', () => {
    const m = buildHostBookingEmail('cancelled', {
      hostFirstName: 'Liam', calendarName: 'HomeQuote team', guestName: 'Pat Doe', guestPhone: '+13105550100', guestEmail: 'pat@x.test',
      project: 'Bathroom remodel', notes: null, sourceLabel: 'Website funnel', startMs: START, endMs: START + 1_800_000, timeZone: TZ,
      cancelReason: 'Sick', cancelledByGuest: true, appUrl: `${SITE}/app/leads/1`,
    });
    expect(m.subject).toBe('Call cancelled: Pat Doe, Tue, Nov 3 · 9:30 AM PST');
    expect(m.text).toContain('Pat Doe cancelled their call. Reason: Sick');
    expect(m.text).toContain('Phone: (310) 555-0100');
    expect(m.text).toContain(`Open in HomeQuote: ${SITE}/app/leads/1`);
  });

  it('texts: short, zone shown, point to the email for the link (the queue strips links)', () => {
    expect(bookingSms('confirmed', guest(), { hasEmail: true })).toBe(
      'Hi Pat, your call with HomeQuote is booked for Tue, Nov 3 · 9:30 AM PST. We’ll call you at (310) 555-0100. Need to reschedule or cancel? Use the link in your confirmation email.');
    expect(bookingSms('reminder_1h', guest(), { hasEmail: true })).toBe('Reminder: your call with HomeQuote starts in about an hour, at 9:30 AM PST. We’ll call you at (310) 555-0100.');
    expect(bookingSms('cancelled', guest(), { hasEmail: false })).toBe('Hi Pat, your call with HomeQuote on Tue, Nov 3 · 9:30 AM PST is cancelled.');
    for (const n of ['confirmed', 'rescheduled', 'reminder_24h', 'reminder_1h', 'cancelled'] as const) {
      expect(bookingSms(n, guest(), { hasEmail: true }).length).toBeLessThanOrEqual(320);
    }
  });

  it('ics: one event with a stable UID; a cancel is METHOD:CANCEL with a higher sequence', () => {
    const base = { kind: 'appointment' as const, id: 'abc', startMs: START, endMs: START + 1_800_000, title: 'Phone call with HomeQuote', sequence: 0 };
    const ics = bookingIcs(base);
    expect(ics).toContain('UID:booking-abc@homequotenet.com');
    expect(ics).toContain('DTSTART:20261103T173000Z');
    expect(bookingIcs({ ...base, sequence: 1, cancelled: true })).toMatch(/METHOD:CANCEL[\s\S]*SEQUENCE:1[\s\S]*STATUS:CANCELLED/);
    expect(bookingIcs({ ...base, kind: 'sales_appointment' })).toContain('UID:sales-meeting-abc@homequotenet.com');
  });

  it('derived manage tokens and text keys are stable and well-formed', () => {
    const t = manageTokenFor('appointment', 'a1', SECRET)!;
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(manageTokenFor('appointment', 'a1', SECRET)).toBe(t);
    expect(manageTokenFor('sales_appointment', 'a1', SECRET)).not.toBe(t);
    expect(manageTokenFor('appointment', 'a1', null)).toBeNull();
    const k = bookingTextKey('appointment', 'a1', 'confirm', 0);
    expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(bookingTextKey('appointment', 'a1', 'confirm', 1)).not.toBe(k);
  });
});

// --- against the real migrations -----------------------------------------------------------------

let db: PGlite;
let sb: any;
const id = Object.fromEntries(['admin', 'ownerA', 'companyA', 'funnelA'].map((k) => [k, randomUUID()])) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const one = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await q<T>(sql, p))[0];
let team: string;
let sales: string;
let calA: string;
let sent: OutgoingEmail[] = [];
const deps = () => ({ db: sb, sendEmail: async (m: OutgoingEmail) => { sent.push(m); }, siteUrl: SITE, linkSecret: SECRET });
const daysOut = (d: number, hourUtc = 18) => { const t = new Date(Date.now() + d * 86_400_000); t.setUTCHours(hourUtc, 0, 0, 0); return t.toISOString(); };

async function lead(o: { consent?: boolean; email?: string | null } = {}): Promise<string> {
  return (await one(`insert into public.leads(first_name, last_name, phone, email, state, consent_granted) values ('Pat','Doe','+13105550100',$1,'CA',$2) returning id`,
    [o.email === undefined ? `pat-${randomUUID().slice(0, 6)}@example.test` : o.email, o.consent ?? true])).id;
}
async function appt(leadId: string, calendarId: string, startsAt: string, extra: Record<string, unknown> = {}): Promise<string> {
  const cols = { lead_id: leadId, calendar_id: calendarId, scheduled_at: startsAt, ends_at: new Date(Date.parse(startsAt) + 1_800_000).toISOString(),
    time_zone: TZ, source: 'funnel', meeting_type: 'phone', ...extra };
  const names = Object.keys(cols);
  return (await one(`insert into public.appointments(${names.join(',')}) values (${names.map((_, i) => `$${i + 1}`).join(',')}) returning id`, Object.values(cols))).id;
}
const texts = (leadId: string) => q(`select body, status, send_after, workflow_step_run_id from public.sms_messages where lead_id=$1 order by created_at`, [leadId]);

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  sb = fakeSupabase(db);
  await q(`insert into public.contractors(id,name) values ($1,'Pool Masters LA')`, [id.companyA]);
  for (const [uid, role, company, crole] of [[id.admin, 'admin', null, null], [id.ownerA, 'contractor', id.companyA, 'owner']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${role}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active', full_name=$5 where id=$1`,
      [uid, role, company, crole, role === 'admin' ? 'Liam Admin' : 'Olive Owner']);
  }
  await q(`insert into public.funnels(id,slug,contractor_id,published,config) values ($1,'pool-masters-la',$2,true,'{}')`, [id.funnelA, id.companyA]);
  await db.exec(readFileSync('supabase/migrations/0068_native_booking_calendars.sql', 'utf8'));
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
  sales = (await one(`select id from public.booking_calendars where kind='sales'`)).id;
  calA = (await one(`select id from public.booking_calendars where kind='contractor'`)).id;
  // Texting on, any hour (so results do not depend on the clock).
  await q(`update public.sms_settings set enabled=true, stopped_at=null, window_start_hour=0, window_end_hour=24`);
}, 120_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { sent = []; });

describe('confirmation', () => {
  it('emails + texts the homeowner, emails the hosts, sets a working manage link, and runs once', async () => {
    const l = await lead();
    const a = await appt(l, team, daysOut(3), { invitee_time_zone: 'America/New_York', manage_token_hash: 'f'.repeat(64) });
    const r = await sendBookingConfirmation('appointment', a, deps());
    expect(r).toEqual({ kind: 'appointment', id: a, notice: 'confirmed', email: 'sent', sms: 'queued', hostEmails: 1 });

    const token = manageTokenFor('appointment', a, SECRET)!;
    expect((await one(`select manage_token_hash, confirmed_at from public.appointments where id=$1`, [a]))).toMatchObject({ manage_token_hash: hashManageToken(token) });
    expect(await findByManageToken(token, sb)).toMatchObject({ id: a, kind: 'appointment' });

    const homeowner = sent.find((m) => m.toEmail.startsWith('pat-'))!;
    expect(homeowner.subject).toMatch(/^Your call with HomeQuote is booked: .* E[SD]T$/); // the homeowner's zone
    expect(homeowner.text).toContain(`${SITE}/book/manage/${token}`);
    expect(homeowner.attachments?.[0].content).toContain(`UID:booking-${a}@homequotenet.com`);
    const host = sent.find((m) => m.toEmail === 'admin@t.test')!;
    expect(host.subject).toMatch(/^New call booked: Pat Doe, .* P[SD]T$/); // the calendar's zone
    expect(host.text).toContain(`${SITE}/app/leads/${l}`);

    const t = await texts(l);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ status: 'queued', workflow_step_run_id: bookingTextKey('appointment', a, 'confirm', 0) });
    expect(t[0].body).toMatch(/^Hi Pat, your call with HomeQuote is booked for .* E[SD]T\. We’ll call you at \(310\) 555-0100\./);

    sent = [];
    expect(await sendBookingConfirmation('appointment', a, deps())).toBeNull();
    expect(sent).toHaveLength(0);
    expect(await texts(l)).toHaveLength(1);
  });

  it('respects texting controls: switched off, no consent, opted out; email still goes', async () => {
    await q(`update public.sms_settings set enabled=false`);
    const l1 = await lead();
    expect(await sendBookingConfirmation('appointment', await appt(l1, team, daysOut(3, 19)), deps())).toMatchObject({ email: 'sent', sms: 'texting_off' });
    await q(`update public.sms_settings set enabled=true`);

    const l2 = await lead({ consent: false });
    expect(await sendBookingConfirmation('appointment', await appt(l2, team, daysOut(3, 20)), deps())).toMatchObject({ email: 'sent', sms: 'no_consent' });

    const l3 = await lead({ email: null });
    await q(`update public.leads set phone='+13105550177' where id=$1`, [l3]);
    await q(`insert into public.sms_opt_outs(phone_e164, source) values ('+13105550177','stop')`);
    expect(await sendBookingConfirmation('appointment', await appt(l3, team, daysOut(3, 21)), deps())).toMatchObject({ email: 'no_email', sms: 'opted_out' });
  });

  it('a contractor calendar texts only when the contractor’s texting is on and emails its owner', async () => {
    const l = await lead();
    const a = await appt(l, calA, daysOut(4));
    const r = await sendBookingConfirmation('appointment', a, deps());
    expect(r).toMatchObject({ email: 'sent', sms: 'contractor_texting_off', hostEmails: 1 });
    expect(sent.find((m) => m.toEmail.startsWith('pat-'))!.fromName).toBe('Pool Masters LA');
    expect(sent.find((m) => m.toEmail.startsWith('pat-'))!.subject).toContain('Your call with Pool Masters LA');
    expect(sent.some((m) => m.toEmail === 'contractor@t.test')).toBe(true);
  });

  it('does not queue a text that texting hours would hold until after the call', async () => {
    await q(`update public.sms_settings set window_start_hour=$1, window_end_hour=$2`, [0, 1]);
    const l = await lead();
    // Starts 3 hours from now: unless "now" is midnight–1am in California, the window opens after it.
    const start = new Date(Date.now() + 3 * 3_600_000).toISOString();
    const hourLa = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
    const r = await sendBookingConfirmation('appointment', await appt(l, team, start), deps());
    if (hourLa !== 0) expect(r!.sms).toBe('outside_texting_hours');
    await q(`update public.sms_settings set window_start_hour=0, window_end_hour=24`);
  });
});

describe('reschedule and cancel', () => {
  it('a reschedule is confirmed again by the tick, voiding the old waiting texts; a cancel notifies once', async () => {
    const l = await lead();
    const a = await appt(l, team, daysOut(5));
    await sendBookingConfirmation('appointment', a, deps());
    const newStart = daysOut(6);
    // What reschedule_appointment does to the row.
    await q(`update public.appointments set scheduled_at=$2, ends_at=$3, reschedule_count=reschedule_count+1, confirmed_at=null, reminder_24h_sent_at=null, reminder_1h_sent_at=null where id=$1`,
      [a, newStart, new Date(Date.parse(newStart) + 1_800_000).toISOString()]);
    sent = [];
    const tick = await runBookingNotifications({ ...deps(), limit: 200 });
    const mine = tick.notices.find((n) => n.id === a)!;
    expect(mine).toMatchObject({ notice: 'rescheduled', email: 'sent', sms: 'queued' });
    expect(sent.find((m) => m.toEmail === 'admin@t.test')!.subject).toMatch(/^Call moved: Pat Doe/);
    const t = await texts(l);
    expect(t.map((x) => x.status)).toEqual(['failed', 'queued']);
    expect(t[1].body).toContain('is moved to');

    await q(`update public.appointments set status='cancelled', cancelled_at=now(), cancel_reason='Found someone' where id=$1`, [a]);
    sent = [];
    const c = await sendBookingCancellation('appointment', a, deps(), { actorKind: 'homeowner' });
    expect(c).toMatchObject({ notice: 'cancelled', email: 'sent', sms: 'queued', hostEmails: 1 });
    expect(sent.find((m) => m.toEmail === 'admin@t.test')!.text).toContain('Pat Doe cancelled their call. Reason: Found someone');
    expect(sent.find((m) => m.toEmail.startsWith('pat-'))!.attachments?.[0].content).toContain('METHOD:CANCEL');
    expect((await texts(l)).map((x) => x.status)).toEqual(['failed', 'failed', 'queued']);
    expect(await sendBookingCancellation('appointment', a, deps())).toBeNull();
  });

  it('the tick backstop sends a cancellation nobody sent, once', async () => {
    const l = await lead();
    const a = await appt(l, team, daysOut(5, 21));
    await q(`update public.appointments set status='cancelled', cancelled_at=now() - interval '10 minutes', confirmed_at=now() where id=$1`, [a]);
    const first = await runBookingNotifications({ ...deps(), limit: 200 });
    expect(first.notices.filter((n) => n.id === a).map((n) => n.notice)).toEqual(['cancelled']);
    const second = await runBookingNotifications({ ...deps(), limit: 200 });
    expect(second.notices.some((n) => n.id === a)).toBe(false);
  });
});

describe('reminders', () => {
  it('sends the 1 h and 24 h reminders once each, skipping cancelled calls and fresh confirmations', async () => {
    const l = await lead();
    const soon = await appt(l, team, new Date(Date.now() + 50 * 60_000).toISOString(), { created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), confirmed_at: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    const l2 = await lead();
    const tomorrow = await appt(l2, team, new Date(Date.now() + 23 * 3_600_000).toISOString(), { created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), confirmed_at: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    const l3 = await lead();
    const justMoved = await appt(l3, team, new Date(Date.now() + 22 * 3_600_000).toISOString(), { created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), confirmed_at: new Date(Date.now() - 30 * 60_000).toISOString() });

    const r = await runBookingNotifications({ ...deps(), limit: 200 });
    expect(r.notices.find((n) => n.id === soon)).toMatchObject({ notice: 'reminder_1h', email: 'sent', sms: 'queued' });
    expect(r.notices.find((n) => n.id === tomorrow)).toMatchObject({ notice: 'reminder_24h', email: 'sent', sms: 'queued' });
    expect(r.notices.find((n) => n.id === justMoved)).toMatchObject({ notice: 'reminder_24h', email: 'just_confirmed' });
    expect((await texts(l))[0].body).toContain('starts in about an hour');
    expect(sent.filter((m) => m.toEmail === 'admin@t.test')).toHaveLength(0); // hosts are not reminded

    const again = await runBookingNotifications({ ...deps(), limit: 200 });
    expect(again.notices.some((n) => [soon, tomorrow].includes(n.id))).toBe(false);
    // A reminder for a call that was cancelled after the claim sends nothing.
    await q(`update public.appointments set status='cancelled' where id=$1`, [soon]);
    expect(await sendBookingReminder('appointment', soon, '1h', deps())).toBeNull();
  });
});

describe('sales calls (contractor prospects)', () => {
  it('emails the prospect (no text path), emails the sales hosts, honours the email opt-out', async () => {
    const pr = (await one(`insert into public.contractor_prospects(company_name, phone, email, decision_maker_name) values ('Builder Co','(818) 555-0142','sam@builder.test','Sam Builder') returning id`)).id;
    const sa = (await one(`insert into public.prospect_sales_appointments(prospect_id, decision_maker_name, scheduled_at, ends_at, time_zone, appointment_type, calendar_id, source)
      values ($1,'Sam Builder',$2,$3,'America/Denver','phone',$4,'sales_funnel') returning id`, [pr, daysOut(3), new Date(Date.parse(daysOut(3)) + 1_800_000).toISOString(), sales])).id;
    const r = await sendBookingConfirmation('sales_appointment', sa, deps());
    expect(r).toMatchObject({ notice: 'confirmed', email: 'sent', sms: 'not_supported', hostEmails: 1 });
    const mail = sent.find((m) => m.toEmail === 'sam@builder.test')!;
    expect(mail.subject).toMatch(/^Your call with HomeQuote Network is booked: .* M[SD]T$/);
    expect(mail.attachments?.[0].content).toContain(`UID:sales-meeting-${sa}@homequotenet.com`);
    expect(sent.find((m) => m.toEmail === 'admin@t.test')!.text).toContain(`${SITE}/app/calls/${pr}`);
    expect((await one(`select booking_confirmed_at from public.prospect_sales_appointments where id=$1`, [sa])).booking_confirmed_at).toBeTruthy();
    const token = manageTokenFor('sales_appointment', sa, SECRET)!;
    expect(await icsForManageToken(token, deps())).toContain(`UID:sales-meeting-${sa}@homequotenet.com`);

    await q(`update public.contractor_prospects set email_opt_out_at=now() where id=$1`, [pr]);
    await q(`update public.prospect_sales_appointments set status='cancelled', cancelled_at=now() where id=$1`, [sa]);
    sent = [];
    expect(await sendBookingCancellation('sales_appointment', sa, deps())).toMatchObject({ email: 'opted_out', hostEmails: 1 });
    expect(sent.some((m) => m.toEmail === 'sam@builder.test')).toBe(false);
  });

  it('ensureManageToken leaves a matching hash alone and works without a secret', async () => {
    const l = await lead();
    const a = await appt(l, team, daysOut(7));
    const t = await ensureManageToken(sb, 'appointment', a, null, SECRET);
    expect(t).toBe(manageTokenFor('appointment', a, SECRET));
    expect(await ensureManageToken(sb, 'appointment', a, hashManageToken(t!), SECRET)).toBe(t);
    expect(await ensureManageToken(sb, 'appointment', a, null, null)).toBeNull();
    expect(await icsForManageToken('not a token', deps())).toBeNull();
  });
});
