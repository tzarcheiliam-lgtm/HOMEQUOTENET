/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
// Booking notices and the notification / calendar outboxes run after the response in the app; nothing to send here.
vi.mock('@/lib/booking/notify.server', () => ({ notifyBookingSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/calendar/sync.server', () => ({ flushCalendarSyncSoon: vi.fn() }));

import { callBookedText, joinTimes, pickOpenTimes, slotLabel, takenText, threeSpread, visitBookedText } from '@/lib/sms/scheduling';
import { openTimesBlock, systemPromptFor, SMS_SYSTEM_PROMPT } from '@/lib/sms/agent';
import { handleInbound } from '@/lib/sms/service';
import { loadBookingOptions } from '@/lib/sms/scheduling.server';

const LA = 'America/Los_Angeles';
const at = (iso: string) => Date.parse(iso);

describe('picking times to offer', () => {
  // Wed Oct 28 2026, 8:00 AM Pacific.
  const now = at('2026-10-28T15:00:00Z');
  const hourly = (dayIso: string, fromH: number, toH: number) =>
    Array.from({ length: toH - fromH }, (_, i) => {
      const s = at(`${dayIso}T${String(fromH + i + 7).padStart(2, '0')}:00:00Z`); // PDT = UTC-7
      return { startMs: s, endMs: s + 3_600_000 };
    });

  it('gives a morning, midday and afternoon time on each of the first few open days', () => {
    const slots = [...hourly('2026-10-28', 9, 18), ...hourly('2026-10-29', 9, 18), ...hourly('2026-10-30', 9, 15)];
    const t = pickOpenTimes(slots, 'visit', LA, now, { days: 2 });
    expect(t.map((x) => x.label)).toEqual([
      'Wed, Oct 28 at 11:00 AM', // 9 and 10 are too soon (3h notice)
      'Wed, Oct 28 at 12:00 PM',
      'Wed, Oct 28 at 3:00 PM',
      'Thu, Oct 29 at 9:00 AM',
      'Thu, Oct 29 at 12:00 PM',
      'Thu, Oct 29 at 3:00 PM',
    ]);
    expect(t.map((x) => x.id)).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
  });

  it('spreads a server-written offer over different days', () => {
    const t = pickOpenTimes([...hourly('2026-10-29', 9, 18), ...hourly('2026-10-30', 9, 18), ...hourly('2026-10-31', 9, 18)], 'call', LA, now);
    const three = threeSpread(t, LA);
    expect(three.map((x) => x.label)).toEqual(['Thu, Oct 29 at 9:00 AM', 'Fri, Oct 30 at 9:00 AM', 'Sat, Oct 31 at 9:00 AM']);
    expect(joinTimes(three)).toBe('Thu, Oct 29 at 9:00 AM, Fri, Oct 30 at 9:00 AM or Sat, Oct 31 at 9:00 AM');
    expect(takenText(three)).toMatch(/^Ah, that time just got taken\. I can do Thu, Oct 29 at 9:00 AM, .* Which works\?$/);
    expect(takenText([])).toMatch(/Someone from the team will text you shortly/);
  });

  it('labels in the given zone', () => {
    expect(slotLabel(at('2026-11-03T17:00:00Z'), LA)).toBe('Tue, Nov 3 at 9:00 AM'); // PST after Nov 1
  });

  it('writes short confirmations with the exact time', () => {
    const v = visitBookedText({ firstName: 'Amber Lee', label: 'Tue, Nov 3 at 9:00 AM', who: 'Pool Masters' });
    expect(v).toBe("You're all set Amber! Free estimate visit with Pool Masters on Tue, Nov 3 at 9:00 AM. We'll text the day before to confirm. Need a different time? Just reply R.");
    const c = callBookedText({ firstName: null, label: 'Tue, Nov 3 at 9:15 AM', who: 'Liam from Pool Masters', minutes: 10, fromPhone: '(747) 217-5713', callerFirstName: 'Liam' });
    expect(c).toBe("You're booked: a quick 10-minute call with Liam from Pool Masters, Tue, Nov 3 at 9:15 AM. Liam will call you at this number from (747) 217-5713. Need a different time? Just reply R.");
    for (const s of [v, c]) expect(s.length).toBeLessThanOrEqual(300);
  });

  it('shows the assistant the times as a trusted block, and says when there are none', () => {
    const block = openTimesBlock({ visit: { with: 'Pool Masters', times: [{ id: 'v1', label: 'Tue, Nov 3 at 9:00 AM' }] }, call: null });
    expect(block).toContain('visit (free in-home estimate with Pool Masters, about an hour):\nv1: Tue, Nov 3 at 9:00 AM');
    expect(block).not.toContain('call (');
    expect(openTimesBlock({})).toContain('(none: no open times could be loaded)');
    expect(openTimesBlock({ alreadyBooked: true, visit: { with: 'X', times: [{ id: 'v1', label: 'x' }] } })).toContain('already_booked');
    expect(systemPromptFor(null, {})).toContain('<open_times>');
    expect(systemPromptFor(null)).toBe(SMS_SYSTEM_PROMPT);
  });
});

describe('booking over text (real migrations, PGlite)', () => {
  let db: PGlite;
  let sb: any;
  const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
  let n = 0;
  // Real time: the booking RPC checks notice against the database clock.
  const NOW = new Date();

  beforeAll(async () => {
    db = await fullSchema({ supabaseGrants: true });
    sb = fakeSupabase(db);
  }, 180_000);
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => {
    await q(`update public.sms_settings set enabled=true, stopped_at=null, daily_cap=500 where id`);
  });

  /** A lead in an active AI text conversation, optionally assigned to a contractor. */
  async function convo(opts: { contractor?: boolean } = {}) {
    n++;
    const leadId = randomUUID();
    const phone = `(818) 555-02${String(10 + n).padStart(2, '0')}`;
    await q(`insert into public.leads(id, first_name, last_name, phone, state, zip, status) values ($1,'Amber','Lee',$2,'CA','92335','new')`, [leadId, phone]);
    let contractorId: string | null = null;
    let assignmentId: string | null = null;
    if (opts.contractor) {
      contractorId = randomUUID();
      assignmentId = randomUUID();
      await q(`insert into public.contractors(id, name) values ($1,'Pool Masters LA')`, [contractorId]);
      await q(`insert into public.lead_assignments(id, lead_id, contractor_id) values ($1,$2,$3)`, [assignmentId, leadId, contractorId]);
    }
    const from = `+1${phone.replace(/\D/g, '')}`;
    await q(`insert into public.sms_conversations(lead_id, contractor_id, sender_name, phone_e164, status) values ($1,$2,$3,$4,'active')`, [leadId, contractorId, opts.contractor ? 'Pool Masters' : 'HomeQuote', from]);
    await q(`insert into public.sms_messages(conversation_id, lead_id, direction, body, status, ai) select id, lead_id, 'out', 'Hey Amber, it''s Pool Masters. Call or text?', 'sent', false from public.sms_conversations where lead_id=$1`, [leadId]);
    return { leadId, contractorId, assignmentId, from };
  }
  const reply = (over: Record<string, unknown> = {}) =>
    vi.fn(async () => ({ message: 'perfect, booking that now', mode: 'text' as const, qualification: 'qualified' as const, call_time: null, handoff: false, close: false, summary: 'Wants an estimate.', ...over }));
  const outs = (leadId: string) => q(`select body, reminder_kind, reminder_step, reminder_ref from public.sms_messages where lead_id=$1 and direction='out' order by created_at`, [leadId]);
  const text = (from: string, body: string, agent: any, extra: Record<string, unknown> = {}) =>
    handleInbound(sb, { phone: from, body, guid: `g-${randomUUID()}` }, { agent, now: () => NOW, aiConfigured: true, notify: vi.fn(async () => undefined), ...extra });

  it('offers a contractor lead real visit times and the call calendar\'s times', async () => {
    const c = await convo({ contractor: true });
    const agent = reply({ message: 'I have a few times', book_slot: null });
    await text(c.from, 'Text please', agent);
    const seen = (agent.mock.calls[0] as any)[0].openTimes;
    expect(seen.visit.with).toBe('Pool Masters LA');
    expect(seen.visit.times.length).toBeGreaterThanOrEqual(3);
    expect(seen.visit.times[0].id).toBe('v1');
    expect(seen.visit.times[0].label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2} at \d{1,2}:\d{2} (AM|PM)$/);
    expect(seen.call.minutes).toBe(10); // the contractor calendar is made on first use: 10-minute homeowner calls
    expect(seen.call.times[0].id).toBe('c1');
    // Nothing booked yet: the assistant's own message goes out and the conversation stays with it.
    expect((await outs(c.leadId)).at(-1).body).toBe('I have a few times');
    expect((await q(`select status from public.sms_conversations where lead_id=$1`, [c.leadId]))[0].status).toBe('active');
  });

  it('books the visit they pick, confirms the exact time once, and hands the conversation to a person', async () => {
    const c = await convo({ contractor: true });
    const options = await loadBookingOptions(sb, { id: 'x', lead_id: c.leadId, sender_name: 'Pool Masters', contractor_id: c.contractorId }, NOW);
    const pick = options.visit!.times[1];
    const notify = vi.fn(async () => undefined);
    const r = await text(c.from, `${pick.label} works`, reply({ book_slot: pick.id }), { notify });
    expect(r).toMatchObject({ handled: true, replied: true, reason: 'booked_visit' });

    const [appt] = await q(`select id, assignment_id, scheduled_at, status, booked_via from public.appointments where assignment_id=$1`, [c.assignmentId]);
    expect(new Date(appt.scheduled_at).getTime()).toBe(pick.startMs);
    expect(appt).toMatchObject({ status: 'scheduled', booked_via: 'chat' });
    expect((await q(`select status from public.lead_assignments where id=$1`, [c.assignmentId]))[0].status).toBe('appointment_set');
    expect((await q(`select status from public.leads where id=$1`, [c.leadId]))[0].status).toBe('appointment_set');

    const last = (await outs(c.leadId)).at(-1);
    expect(last.body).toBe(`You're all set Amber! Free estimate visit with Pool Masters LA on ${pick.label}. We'll text the day before to confirm. Need a different time? Just reply R.`);
    // Filed as the "booked" reminder text: the reminder runner won't send another, and YES / R work right away.
    expect(last).toMatchObject({ reminder_kind: 'home_appointment', reminder_step: 'booked', reminder_ref: appt.id });
    expect((await q(`select status from public.sms_reminders where ref_id=$1 and step='booked'`, [appt.id]))[0].status).toBe('queued');
    expect((await q(`select status, mode from public.sms_conversations where lead_id=$1`, [c.leadId]))[0]).toEqual({ status: 'handoff', mode: 'text' });
    expect((await q(`select body from public.lead_activities where lead_id=$1 and metadata->>'booked_by_text'='true' and type='system'`, [c.leadId]))[0].body)
      .toBe(`Booked a free estimate visit by text: ${pick.label} with Pool Masters LA.`);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'A lead booked a visit', url: `/app/leads/${c.leadId}` }));

    // Already booked: a later look offers nothing new.
    expect((await loadBookingOptions(sb, { id: 'x', lead_id: c.leadId, sender_name: 'Pool Masters', contractor_id: c.contractorId }, NOW)).alreadyBooked).toBe(true);
  });

  it('offers three fresh times when the picked one was taken in the meantime', async () => {
    const c = await convo({ contractor: true });
    const options = await loadBookingOptions(sb, { id: 'x', lead_id: c.leadId, sender_name: 'Pool Masters', contractor_id: c.contractorId }, NOW);
    const pick = options.visit!.times[0];
    // Someone else books that slot with the same contractor first.
    const other = randomUUID();
    const otherLead = randomUUID();
    await q(`insert into public.leads(id, first_name, phone, status) values ($1,'Pat','(818) 555-0999','new')`, [otherLead]);
    await q(`insert into public.lead_assignments(id, lead_id, contractor_id) values ($1,$2,$3)`, [other, otherLead, c.contractorId]);
    await q(`insert into public.appointments(assignment_id, scheduled_at, status) values ($1,$2,'scheduled')`, [other, new Date(pick.startMs).toISOString()]);

    const r = await text(c.from, 'the first one', reply({ book_slot: pick.id }));
    expect(r.reason).toBe('slot_taken');
    const last = (await outs(c.leadId)).at(-1).body as string;
    expect(last).toMatch(/^Ah, that time just got taken\. I can do .+ Which works\?$/);
    expect(last).not.toContain(pick.label);
    expect(await q(`select 1 from public.appointments where assignment_id=$1`, [c.assignmentId])).toHaveLength(0);
    expect((await q(`select status from public.sms_conversations where lead_id=$1`, [c.leadId]))[0].status).toBe('active');
  });

  it('books a call on the lead\'s calendar when they would rather talk, with who calls and the number', async () => {
    const c = await convo(); // a network lead: no contractor, so the HomeQuote team calendar
    const options = await loadBookingOptions(sb, { id: 'x', lead_id: c.leadId, sender_name: 'HomeQuote', contractor_id: null }, NOW);
    expect(options.visit).toBeNull(); // no contractor yet: only the call can be booked
    const pick = options.call!.times[0];
    const r = await text(c.from, 'call me, the first one', reply({ mode: 'call', book_slot: pick.id }));
    expect(r.reason).toBe('booked_call');
    const [appt] = await q(`select id, lead_id, calendar_id, scheduled_at, source from public.appointments where lead_id=$1`, [c.leadId]);
    expect(new Date(appt.scheduled_at).getTime()).toBe(pick.startMs);
    expect(appt.source).toBe('ai');
    expect(appt.calendar_id).toBe(options.call!.calendarId);
    const last = (await outs(c.leadId)).at(-1);
    expect(last.body).toMatch(new RegExp(`^You're booked Amber: a quick 10-minute call with .+, ${pick.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. .+ will call you at this number`));
    expect(last.reminder_step).toBe('booked');
    expect((await q(`select status, mode from public.sms_conversations where lead_id=$1`, [c.leadId]))[0]).toEqual({ status: 'handoff', mode: 'call' });
  });

  it('ignores a made-up slot id and keeps the assistant\'s own reply', async () => {
    const c = await convo({ contractor: true });
    const r = await text(c.from, 'friday?', reply({ message: 'friday works, 9 or 11?', book_slot: 'v99' }));
    expect(r.reason).toBeUndefined();
    expect((await outs(c.leadId)).at(-1).body).toBe('friday works, 9 or 11?');
    expect(await q(`select 1 from public.appointments where assignment_id=$1`, [c.assignmentId])).toHaveLength(0);
  });

  it('still works the old way when no times can be loaded', async () => {
    const c = await convo({ contractor: true });
    const agent = reply({ message: 'what day and time usually work best?' });
    await text(c.from, 'text', agent, { booking: async () => ({ visit: null, call: null, alreadyBooked: false }) });
    expect((agent.mock.calls[0] as any)[0].openTimes).toEqual({ alreadyBooked: false, visit: null, call: null });
    expect((await outs(c.leadId)).at(-1).body).toBe('what day and time usually work best?');
  });
});
