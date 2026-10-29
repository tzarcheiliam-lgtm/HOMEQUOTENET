/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

const h = vi.hoisted(() => ({ client: null as any, me: null as any }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({ redirect: () => undefined }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/auth', () => ({ requireCallWorkspace: async () => h.me, requireRole: async () => h.me }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => undefined }));
vi.mock('@/lib/sms/reminders', () => ({ runTextRemindersSoon: () => undefined }));

const { logCallOutcome, updateSalesAppointment } = await import('@/lib/actions/prospects');

let db: PGlite;
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const admin = randomUUID(); const caller = randomUUID(); const other = randomUUID();
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const booked = (prospectId: string, date: string, time: string, extra: Record<string, string> = {}) => fd({
  prospect_id: prospectId, outcome: 'appointment_booked', appointment_date: date, appointment_time: time, appointment_type: 'phone',
  time_zone: 'America/Los_Angeles', decision_maker_name: 'Mike Jones', contact_info: '818-555-0101', ...extra,
});
let pid = '';

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.client = fakeSupabase(db);
  for (const [uid, role] of [[admin, 'admin'], [caller, 'caller'], [other, 'caller']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid.slice(0, 6)}@hq.test`]);
    await q(`update public.profiles set role=$2, is_active=true, account_status='active' where id=$1`, [uid, role]);
  }
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  pid = randomUUID();
  await q(`insert into public.contractor_prospects(id, company_name, phone, assigned_to) values ($1,'Acme Remodel',$2,$3)`, [pid, `(818) 555-${String(Math.floor(Math.random() * 9000) + 1000)}`, caller]);
  h.me = { id: caller, role: 'caller', full_name: 'Casey', email: 'casey@hq.test' };
});
const meetings = (prospectId: string) => q(`select id, status, scheduled_at, partner_id, contact_info, notes from public.prospect_sales_appointments where prospect_id=$1 order by created_at`, [prospectId]);

describe('one sales meeting per contractor', () => {
  it('saving "Appointment booked" again updates the same meeting (rescheduled) instead of adding a second one', async () => {
    expect(await logCallOutcome(undefined, booked(pid, '2026-12-01', '10:00'))).toMatchObject({ ok: true });
    expect(await logCallOutcome(undefined, booked(pid, '2026-12-03', '14:30', { contact_info: 'mike@acme.test', notes: 'Bring pricing' }))).toMatchObject({ ok: true });
    const rows = await meetings(pid);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'rescheduled', partner_id: caller, contact_info: 'mike@acme.test', notes: 'Bring pricing' });
    expect(new Date(rows[0].scheduled_at).toISOString()).toBe('2026-12-03T22:30:00.000Z');
    // Same time again: details only, status unchanged.
    await logCallOutcome(undefined, booked(pid, '2026-12-03', '14:30', { contact_info: '818-555-0199' }));
    expect(await meetings(pid)).toHaveLength(1);
  });

  it('a finished meeting does not block booking a new one', async () => {
    await logCallOutcome(undefined, booked(pid, '2026-12-01', '10:00'));
    await q(`update public.prospect_sales_appointments set status='completed' where prospect_id=$1`, [pid]);
    await logCallOutcome(undefined, booked(pid, '2027-01-05', '09:00'));
    expect((await meetings(pid)).map((m) => m.status)).toEqual(['completed', 'scheduled']);
  });
});

describe('Edit on a meeting', () => {
  it('changes the details in place and moves the time (rescheduled, prospect time synced)', async () => {
    await logCallOutcome(undefined, booked(pid, '2026-12-01', '10:00'));
    const [m] = await meetings(pid);
    await q(`update public.prospect_sales_appointments set status='confirmed', confirmed_at=now() where id=$1`, [m.id]);
    const r = await updateSalesAppointment(undefined, fd({ id: m.id, appointment_date: '2026-12-02', appointment_time: '11:00', time_zone: 'America/Los_Angeles', appointment_type: 'video', decision_maker_name: 'Mike J.', contact_info: 'zoom.us/j/1', notes: 'Moved by request' }));
    expect(r).toEqual({ ok: true, message: 'Meeting moved' });
    const [after] = await q(`select status, confirmed_at, appointment_type, decision_maker_name, contact_info, scheduled_at from public.prospect_sales_appointments where id=$1`, [m.id]);
    expect(after).toMatchObject({ status: 'rescheduled', confirmed_at: null, appointment_type: 'video', decision_maker_name: 'Mike J.', contact_info: 'zoom.us/j/1' });
    expect(new Date((await q(`select appointment_at from public.contractor_prospects where id=$1`, [pid]))[0].appointment_at).toISOString()).toBe(new Date(after.scheduled_at).toISOString());
    expect(await meetings(pid)).toHaveLength(1);

    const same = await updateSalesAppointment(undefined, fd({ id: m.id, appointment_date: '2026-12-02', appointment_time: '11:00', time_zone: 'America/Los_Angeles', appointment_type: 'video', decision_maker_name: 'Mike J.', contact_info: 'zoom.us/j/2' }));
    expect(same).toEqual({ ok: true, message: 'Meeting updated' });
  });

  it('only the person who booked it (or an admin) can edit it, and missing fields are flagged', async () => {
    await logCallOutcome(undefined, booked(pid, '2026-12-01', '10:00'));
    const [m] = await meetings(pid);
    h.me = { id: other, role: 'caller', full_name: 'Other', email: 'o@hq.test' };
    const base = { id: m.id, appointment_date: '2026-12-02', appointment_time: '11:00', appointment_type: 'phone', decision_maker_name: 'Mike', contact_info: 'x' };
    expect(await updateSalesAppointment(undefined, fd(base))).toMatchObject({ ok: false, error: 'Only the person who booked this meeting can change it' });
    h.me = { id: admin, role: 'admin', full_name: 'Liam', email: 'l@hq.test' };
    expect(await updateSalesAppointment(undefined, fd(base))).toMatchObject({ ok: true });
    expect(await updateSalesAppointment(undefined, fd({ ...base, contact_info: '' }))).toMatchObject({ ok: false, fieldErrors: { contact_info: expect.any(String) } });
    await q(`update public.prospect_sales_appointments set status='cancelled' where id=$1`, [m.id]);
    expect((await updateSalesAppointment(undefined, fd(base)) as any).error).toMatch(/already finished or cancelled/);
  });
});

describe('migration 0072 clean-up', () => {
  it('keeps the newest open meeting per contractor and quietly cancels the older duplicates', async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const [i, id] of ids.entries()) {
      await q(`insert into public.prospect_sales_appointments(id, prospect_id, partner_id, scheduled_at, status, updated_at) values ($1,$2,$3,$4,$5,$6)`,
        [id, pid, caller, `2026-12-0${i + 1}T18:00:00Z`, i === 0 ? 'completed' : 'scheduled', `2026-10-2${i}T00:00:00Z`]);
    }
    await q(`update public.prospect_sales_appointments set updated_at=$2 where id=$1`, [ids[1], '2026-10-01T00:00:00Z']);
    await q(`update public.prospect_sales_appointments set updated_at=$2 where id=$1`, [ids[2], '2026-10-28T00:00:00Z']);
    const before = (await q(`select count(*)::int n from public.notification_events`))[0].n;
    const { readFileSync } = await import('node:fs');
    await db.exec(readFileSync('supabase/migrations/0072_dedupe_sales_appointments.sql', 'utf8'));
    const rows = await q(`select id, status, cancel_reason, cancel_notified_at from public.prospect_sales_appointments where prospect_id=$1`, [pid]);
    const by = new Map(rows.map((r) => [r.id, r]));
    expect(by.get(ids[0]).status).toBe('completed');
    expect(by.get(ids[1])).toMatchObject({ status: 'cancelled', cancel_reason: 'Duplicate of an updated meeting (cleaned up 2026-10-29)' });
    expect(by.get(ids[1]).cancel_notified_at).not.toBeNull();
    expect(by.get(ids[2]).status).toBe('scheduled');
    expect((await q(`select count(*)::int n from public.notification_events`))[0].n).toBe(before);
    await db.exec(readFileSync('supabase/migrations/0072_dedupe_sales_appointments.sql', 'utf8')); // re-run: nothing changes
    expect((await q(`select status from public.prospect_sales_appointments where id=$1`, [ids[2]]))[0].status).toBe('scheduled');
  });
});
