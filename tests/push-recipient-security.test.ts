/**
 * Tenant / recipient isolation for notifications. A failure here is a critical
 * security bug: every test states a person who must NOT be notified.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }));
const sendWebPush = vi.fn();
vi.mock('@/lib/notifications/webpush', () => ({
  isPushConfigured: () => true,
  sendWebPush: (...a: unknown[]) => sendWebPush(...a),
}));

import { buildNotifications, type NotificationEvent } from '@/lib/notifications/routing';
import { sendPushNotification } from '@/lib/notifications/service';
import { fakeDb, type Tables } from './fixtures/fake-db';

const A_CO = 'co-a';
const B_CO = 'co-b';
const C_CO = 'co-c';
const A1 = 'a-user-1';
const A2 = 'a-user-2';
const B1 = 'b-user-1';
const C1 = 'c-user-1';
const ADMIN = 'admin';
const SETTER = 'setter-assigned';
const SETTER2 = 'setter-other';
const CALLER = 'caller-assigned';
const CALLER2 = 'caller-other';

let tables: Tables;
const db = () => fakeDb(tables);
const ids = (out: Awaited<ReturnType<typeof buildNotifications>>) => out.flatMap((m) => m.userIds).sort();

const ev = (over: Partial<NotificationEvent>): NotificationEvent => ({
  id: 'e',
  type: 'lead_assigned',
  entity_type: 'lead_assignment',
  entity_id: 'asg-A',
  lead_id: 'lead-A',
  contractor_id: null,
  payload: {},
  ...over,
});

beforeEach(() => {
  sendWebPush.mockReset();
  sendWebPush.mockResolvedValue({ ok: true });
  tables = {
    profiles: [
      { id: ADMIN, role: 'admin', is_active: true, contractor_id: null },
      { id: A1, role: 'contractor', is_active: true, contractor_id: A_CO },
      { id: A2, role: 'contractor', is_active: true, contractor_id: A_CO },
      { id: B1, role: 'contractor', is_active: true, contractor_id: B_CO },
      { id: C1, role: 'contractor', is_active: true, contractor_id: C_CO },
      { id: SETTER, role: 'setter', is_active: true, contractor_id: null },
      { id: SETTER2, role: 'setter', is_active: true, contractor_id: null },
      { id: CALLER, role: 'caller', is_active: true, contractor_id: null },
      { id: CALLER2, role: 'caller', is_active: true, contractor_id: null },
    ],
    leads: [
      { id: 'lead-A', city: 'Encino', created_by: SETTER, vertical: { name: 'Pool' }, sub_service: null },
      { id: 'lead-B', city: 'Tarzana', created_by: null, vertical: { name: 'Roofing' }, sub_service: null },
    ],
    lead_assignments: [
      { id: 'asg-A', lead_id: 'lead-A', contractor_id: A_CO, assigned_user_id: null, assigned_by: ADMIN },
      { id: 'asg-B', lead_id: 'lead-B', contractor_id: B_CO, assigned_user_id: null, assigned_by: ADMIN },
      { id: 'asg-caller', lead_id: 'lead-B', contractor_id: B_CO, assigned_user_id: CALLER, assigned_by: null },
    ],
    appointments: [
      { id: 'appt-A', created_by: SETTER, scheduled_at: '2026-10-01T17:00:00Z' },
      { id: 'appt-B', created_by: null, scheduled_at: '2026-10-01T17:00:00Z' },
      { id: 'appt-caller', created_by: CALLER, scheduled_at: '2026-10-01T17:00:00Z' },
    ],
    contractor_prospects: [{ id: 'pros-1', company_name: 'Blue Water', assigned_to: CALLER, do_not_call_at: null }],
    notification_routing_rules: [],
    push_subscriptions: [],
  };
});

const apptEvent = (assignmentId: string, appointmentId: string, over: Partial<NotificationEvent> = {}) =>
  ev({ type: 'appointment_booked', entity_type: 'appointment', entity_id: appointmentId, payload: { assignmentId, appointmentId }, ...over });

describe('1-2. contractor isolation', () => {
  it("Contractor A never receives Contractor B's lead", async () => {
    const out = await buildNotifications(ev({ entity_id: 'asg-B', lead_id: 'lead-B' }), db());
    expect(ids(out)).toContain(B1);
    for (const other of [A1, A2, C1]) expect(ids(out)).not.toContain(other);
  });

  it("Contractor A never receives Contractor B's appointment", async () => {
    const out = await buildNotifications(apptEvent('asg-B', 'appt-B', { lead_id: 'lead-B' }), db());
    expect(ids(out)).toEqual([ADMIN, B1]);
  });

  it("a wrong contractor_id on the event cannot redirect B's lead to A: the assignment record wins", async () => {
    const out = await buildNotifications(ev({ entity_id: 'asg-B', lead_id: 'lead-B', contractor_id: A_CO, payload: { contractorId: A_CO } }), db());
    expect(ids(out)).not.toContain(A1);
    expect(ids(out)).not.toContain(A2);
  });

  it('an event claiming contractor A on a lead A does not hold reaches no contractor at all (fail closed)', async () => {
    const out = await buildNotifications(
      ev({ type: 'appointment_booked', entity_type: 'lead', entity_id: 'lead-B', lead_id: 'lead-B', contractor_id: A_CO, payload: { leadId: 'lead-B', assignmentId: null, appointmentId: null, contractorId: A_CO } }),
      db()
    );
    for (const c of [A1, A2, B1, C1]) expect(ids(out)).not.toContain(c);
  });

  it('a company with no assignment on the lead gets nothing even from a funnel-owner event', async () => {
    tables.lead_assignments = tables.lead_assignments.filter((r) => r.contractor_id !== A_CO);
    const out = await buildNotifications(
      ev({ type: 'appointment_booked', entity_type: 'lead', entity_id: 'lead-A', lead_id: 'lead-A', contractor_id: A_CO, payload: { leadId: 'lead-A', contractorId: A_CO } }),
      db()
    );
    for (const c of [A1, A2]) expect(ids(out)).not.toContain(c);
  });

  it('an assignment to one company user notifies only that user, not their colleagues or other companies', async () => {
    tables.lead_assignments[0].assigned_user_id = A2;
    const out = await buildNotifications(ev({}), db());
    expect(ids(out)).toContain(A2);
    for (const other of [A1, B1, C1]) expect(ids(out)).not.toContain(other);
  });
});

describe('3-4. setters and callers only get what is assigned to them', () => {
  it('setter: the one tied to the appointment/lead, never another setter', async () => {
    const out = await buildNotifications(apptEvent('asg-A', 'appt-A'), db());
    expect(ids(out)).toContain(SETTER);
    expect(ids(out)).not.toContain(SETTER2);
    expect(ids(out)).not.toContain(CALLER);
  });

  it('caller: the one tied to it, never another caller', async () => {
    const out = await buildNotifications(apptEvent('asg-caller', 'appt-caller', { lead_id: 'lead-B' }), db());
    expect(ids(out)).toContain(CALLER);
    expect(ids(out)).not.toContain(CALLER2);
    expect(ids(out)).not.toContain(SETTER);
  });

  it('callback due reaches only the prospect owner', async () => {
    const out = await buildNotifications(ev({ type: 'callback_due', entity_type: 'prospect', entity_id: 'pros-1', lead_id: null, payload: { prospectId: 'pros-1' } }), db());
    expect(ids(out)).toEqual([CALLER]);
  });

  it('a brand-new lead is not broadcast to setters or callers by default', async () => {
    const out = await buildNotifications(ev({ type: 'new_lead', entity_type: 'lead', entity_id: 'lead-A' }), db());
    expect(ids(out)).toEqual([ADMIN]);
  });
});

describe('5-6. admin routing rules and hand-picked recipients', () => {
  it('follows a saved rule: admins off, assigned setter on', async () => {
    tables.notification_routing_rules = [
      { type: 'appointment_booked', admins: false, assigned_setter: true, assigned_caller: false, assigned_contractor: false, specific_user_ids: [] },
    ];
    const out = await buildNotifications(apptEvent('asg-A', 'appt-A'), db());
    expect(ids(out)).toEqual([SETTER]);
  });

  it('ignores audiences that do not apply to the type (a forged rule cannot add contractors to payments)', async () => {
    tables.notification_routing_rules = [
      { type: 'payment_received', admins: true, assigned_setter: true, assigned_caller: true, assigned_contractor: true, specific_user_ids: [] },
    ];
    const out = await buildNotifications(ev({ type: 'payment_received', entity_type: 'service_request', entity_id: 'sr', lead_id: null }), db());
    expect(ids(out)).toEqual([ADMIN]);
  });

  it('delivers to specifically selected staff', async () => {
    tables.notification_routing_rules = [
      { type: 'form_submission', admins: false, assigned_setter: false, assigned_caller: false, assigned_contractor: false, specific_user_ids: [SETTER2, CALLER2] },
    ];
    const out = await buildNotifications(ev({ type: 'form_submission', entity_type: 'lead', entity_id: 'lead-A' }), db());
    expect(ids(out)).toEqual([CALLER2, SETTER2].sort());
  });

  it('a contractor user can NEVER be hand-picked, and unknown or inactive ids are dropped', async () => {
    tables.profiles.push({ id: 'off', role: 'setter', is_active: false, contractor_id: null });
    tables.notification_routing_rules = [
      { type: 'form_submission', admins: false, assigned_setter: false, assigned_caller: false, assigned_contractor: false, specific_user_ids: [A1, B1, 'off', 'ghost', SETTER] },
    ];
    const out = await buildNotifications(ev({ type: 'form_submission', entity_type: 'lead', entity_id: 'lead-A' }), db());
    expect(ids(out)).toEqual([SETTER]);
  });

  it('a workflow alert naming a contractor user still cannot reach them', async () => {
    const out = await buildNotifications(
      ev({ type: 'workflow_alert', entity_type: 'workflow', entity_id: 'w', lead_id: null, payload: { title: 'x', userIds: [A1, SETTER] } }),
      db()
    );
    expect(ids(out)).toEqual([SETTER]);
  });
});

describe('7. role changes never broaden access', () => {
  it('a contractor user who becomes a setter stops receiving contractor-side events', async () => {
    tables.profiles.find((p) => p.id === A1)!.role = 'setter'; // stale contractor_id left behind
    const out = await buildNotifications(ev({}), db());
    expect(ids(out)).not.toContain(A1);
  });

  it('a setter who becomes a contractor (no company) receives nothing, and is not treated as staff', async () => {
    const p = tables.profiles.find((x) => x.id === SETTER)!;
    p.role = 'contractor';
    const out = await buildNotifications(apptEvent('asg-A', 'appt-A'), db());
    expect(ids(out)).not.toContain(SETTER);
  });

  it('an admin demoted to contractor stops getting admin alerts', async () => {
    tables.profiles.find((p) => p.id === ADMIN)!.role = 'contractor';
    const out = await buildNotifications(ev({ type: 'form_submission', entity_type: 'lead', entity_id: 'lead-A' }), db());
    expect(out).toEqual([]);
  });

  it('a setter demoted to caller is resolved by their CURRENT role', async () => {
    tables.profiles.find((p) => p.id === SETTER)!.role = 'caller';
    tables.notification_routing_rules = [
      { type: 'appointment_booked', admins: false, assigned_setter: true, assigned_caller: false, assigned_contractor: false, specific_user_ids: [] },
    ];
    expect(await buildNotifications(apptEvent('asg-A', 'appt-A'), db())).toEqual([]);
  });
});

describe('8-9. inactive users and disabled devices', () => {
  const send = (userIds: string[]) =>
    sendPushNotification({ userIds, type: 'lead_assigned', title: 't', url: '/app', db: fakeDb(tables) });

  beforeEach(() => {
    tables.notification_preferences = [];
    tables.notifications = [];
    tables.push_notification_logs = [];
    tables.push_subscriptions = [
      { id: 'sub-a1', user_id: A1, endpoint: 'https://fcm.googleapis.com/a1', p256dh: 'k', auth: 'a', enabled: true },
      { id: 'sub-a1-off', user_id: A1, endpoint: 'https://fcm.googleapis.com/a1-off', p256dh: 'k', auth: 'a', enabled: false },
      { id: 'sub-b1', user_id: B1, endpoint: 'https://fcm.googleapis.com/b1', p256dh: 'k', auth: 'a', enabled: true },
    ];
  });

  it('a deactivated user gets neither a push nor an in-app notification; routing drops them too', async () => {
    tables.profiles.find((p) => p.id === B1)!.is_active = false;
    const r = await send([A1, B1]);
    expect(r.sent).toBe(1);
    expect(tables.notifications.map((n) => n.user_id)).toEqual([A1]);
    const routed = await buildNotifications(ev({ entity_id: 'asg-B', lead_id: 'lead-B' }), db());
    expect(ids(routed)).not.toContain(B1);
  });

  it('a deleted user (no profile row) gets nothing', async () => {
    tables.profiles = tables.profiles.filter((p) => p.id !== B1);
    const r = await send([B1]);
    expect(r).toMatchObject({ notified: 0, sent: 0 });
    expect(sendWebPush).not.toHaveBeenCalled();
  });

  it('disabled subscriptions are never pushed to', async () => {
    await send([A1]);
    const endpoints = sendWebPush.mock.calls.map(([t]) => (t as { endpoint: string }).endpoint);
    expect(endpoints).toEqual(['https://fcm.googleapis.com/a1']);
  });
});
