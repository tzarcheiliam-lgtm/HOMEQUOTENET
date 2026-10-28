/* eslint-disable @typescript-eslint/no-explicit-any -- raw PGlite rows */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import {
  calendarAddState,
  googleCalendarUrl,
  googleDayUrl,
  salesMeetingEvent,
  salesMeetingUid,
  SALES_MEETING_MINUTES,
} from '@/lib/calls/calendar-links';
import { buildCalendar } from '@/lib/calendar/ics';

vi.mock('server-only', () => ({}));

const meeting = {
  id: '11111111-2222-4333-8444-555555555555',
  prospectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  companyName: 'ZDS Construction',
  decisionMakerName: 'Mate',
  phone: '(818) 468-7089',
  scheduledAt: '2026-10-28T16:30:00.000Z',
  timeZone: 'America/Los_Angeles',
  appointmentType: 'phone',
  contactInfo: null,
  notes: 'Kitchen & bath GC, Glendale',
};

describe('sales meeting calendar links', () => {
  const e = salesMeetingEvent(meeting, 'https://homequotenet.com/');

  it('describes the meeting for the person who booked it', () => {
    expect(e.title).toBe('Phone call: ZDS Construction (Mate)');
    expect(e.endMs - e.startMs).toBe(SALES_MEETING_MINUTES * 60_000);
    expect(e.location).toBe('(818) 468-7089');
    expect(e.details).toContain('Notes: Kitchen & bath GC, Glendale');
    expect(e.url).toBe(`https://homequotenet.com/app/calls/${meeting.prospectId}`);
  });

  it('uses the same UID as the emailed invite, so calendars treat both as one event', () => {
    expect(e.uid).toBe(salesMeetingUid(meeting.id));
    expect(e.uid).toBe(`sales-meeting-${meeting.id}@homequotenet.com`);
  });

  it('prefills Google Calendar with the right UTC times', () => {
    const u = new URL(googleCalendarUrl(e, meeting.timeZone));
    expect(u.origin + u.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('dates')).toBe('20261028T163000Z/20261028T170000Z');
    expect(u.searchParams.get('text')).toBe('Phone call: ZDS Construction (Mate)');
    expect(u.searchParams.get('ctz')).toBe('America/Los_Angeles');
  });

  it('opens Google Calendar on the meeting day in its own time zone', () => {
    // 07:30 UTC on the 29th is still the 28th in Los Angeles.
    expect(googleDayUrl('2026-10-29T03:30:00Z', 'America/Los_Angeles')).toBe('https://calendar.google.com/calendar/r/day/2026/10/28');
  });

  it('knows whether a meeting is new, already added, or moved since', () => {
    expect(calendarAddState(null, meeting.scheduledAt)).toBe('none');
    expect(calendarAddState('2026-10-28T16:30:00+00:00', meeting.scheduledAt)).toBe('added');
    expect(calendarAddState('2026-10-27T16:30:00Z', meeting.scheduledAt)).toBe('moved');
  });

  it('builds an .ics whose UID never changes and whose SEQUENCE rises with each update', () => {
    const ics = (updatedMs: number) =>
      buildCalendar([{ uid: e.uid, startMs: e.startMs, endMs: e.endMs, summary: e.title, sequence: Math.floor(updatedMs / 1000) }], { name: 'x' });
    const first = ics(Date.parse('2026-10-27T10:00:00Z'));
    const later = ics(Date.parse('2026-10-27T12:00:00Z'));
    expect(first).toContain(`UID:${e.uid}`);
    expect(later).toContain(`UID:${e.uid}`);
    const seq = (s: string) => Number(/SEQUENCE:(\d+)/.exec(s)![1]);
    expect(seq(later)).toBeGreaterThan(seq(first));
  });
});

describe('0066 sales_appointment_calendar_adds', () => {
  let db: PGlite;
  const id = Object.fromEntries(['admin', 'setter', 'other', 'p1', 'p2', 'a1', 'a2'].map((k) => [k, randomUUID()])) as Record<string, string>;
  const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
  async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await db.exec(`set role authenticated; select set_config('app.uid','${userId}', false)`);
    try {
      return await fn();
    } finally {
      await db.exec(`reset role; select set_config('app.uid','', false)`);
    }
  }
  const add = (user: string, appt: string, provider = 'google') =>
    as(user, () => q(`insert into public.sales_appointment_calendar_adds(appointment_id,user_id,provider,scheduled_at) values ($1,$2,$3,now())`, [appt, user, provider]));

  beforeAll(async () => {
    db = await fullSchema({ supabaseGrants: true });
    for (const [uid, role] of [
      [id.admin, 'admin'],
      [id.setter, 'setter'],
      [id.other, 'setter'],
    ] as const) {
      await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
      await q(`update public.profiles set role=$2, is_active=true, account_status='active' where id=$1`, [uid, role]);
    }
    await q(
      `insert into public.contractor_prospects(id, company_name, assigned_to, phone) values ($1,'Mine',$3,'(555) 000-0001'),($2,'Theirs',$4,'(555) 000-0002')`,
      [id.p1, id.p2, id.setter, id.other]
    );
    await q(
      `insert into public.prospect_sales_appointments(id, prospect_id, partner_id, scheduled_at, time_zone, status) values
         ($1,$3,$5,now() + interval '1 day','America/Los_Angeles','scheduled'),
         ($2,$4,$6,now() + interval '2 day','America/Los_Angeles','scheduled')`,
      [id.a1, id.a2, id.p1, id.p2, id.setter, id.other]
    );
  }, 120_000);
  afterAll(async () => {
    await db?.close();
  });

  it('lets a person record an add for an appointment they can see', async () => {
    await add(id.setter, id.a1);
    await add(id.setter, id.a1, 'apple');
    expect((await as(id.setter, () => q(`select provider from public.sales_appointment_calendar_adds order by provider`))).map((r) => r.provider)).toEqual(['apple', 'google']);
  });

  it('refuses an appointment they cannot see, or a row for someone else', async () => {
    await expect(add(id.setter, id.a2)).rejects.toThrow();
    await expect(
      as(id.setter, () => q(`insert into public.sales_appointment_calendar_adds(appointment_id,user_id,provider,scheduled_at) values ($1,$2,'google',now())`, [id.a1, id.other]))
    ).rejects.toThrow();
  });

  it('keeps each person’s record private, even from an admin', async () => {
    await add(id.admin, id.a2);
    expect(await as(id.other, () => q(`select * from public.sales_appointment_calendar_adds`))).toHaveLength(0);
    expect(await as(id.admin, () => q(`select * from public.sales_appointment_calendar_adds`))).toHaveLength(1);
  });

  it('keeps one row per person, appointment and calendar (re-adding updates it)', async () => {
    await as(id.setter, () =>
      q(
        `insert into public.sales_appointment_calendar_adds(appointment_id,user_id,provider,scheduled_at) values ($1,$2,'google',now() + interval '3 day')
         on conflict (appointment_id,user_id,provider) do update set scheduled_at = excluded.scheduled_at`,
        [id.a1, id.setter]
      )
    );
    expect(await q(`select * from public.sales_appointment_calendar_adds where user_id = $1 and provider = 'google'`, [id.setter])).toHaveLength(1);
    await expect(add(id.setter, id.a1, 'outlook')).rejects.toThrow();
  });

  it('goes away with the appointment', async () => {
    await q(`delete from public.prospect_sales_appointments where id = $1`, [id.a1]);
    expect(await q(`select * from public.sales_appointment_calendar_adds where appointment_id = $1`, [id.a1])).toHaveLength(0);
  });
});
