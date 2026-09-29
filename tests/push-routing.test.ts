import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }));

import { buildNotifications, type NotificationEvent } from '@/lib/notifications/routing';
import { fakeDb, type Tables } from './fixtures/fake-db';

// People. Two contractor companies, so isolation is actually tested.
const ADMIN1 = 'admin-1';
const ADMIN2 = 'admin-2';
const SETTER = 'setter-1';
const SETTER_OTHER = 'setter-2';
const CALLER = 'caller-1';
const ACME_OWNER = 'acme-owner';
const ACME_STAFF = 'acme-staff';
const RIVAL = 'rival-owner';
const ACME = 'contractor-acme';
const RIVAL_CO = 'contractor-rival';

let tables: Tables;
const db = () => fakeDb(tables);

const event = (over: Partial<NotificationEvent>): NotificationEvent => ({
  id: 'ev-1',
  type: 'new_lead',
  entity_type: 'lead',
  entity_id: 'lead-1',
  lead_id: 'lead-1',
  contractor_id: null,
  payload: {},
  ...over,
});

const recipients = (out: Awaited<ReturnType<typeof buildNotifications>>) => out.flatMap((m) => m.userIds).sort();

beforeEach(() => {
  tables = {
    profiles: [
      { id: ADMIN1, role: 'admin', is_active: true, contractor_id: null },
      { id: ADMIN2, role: 'admin', is_active: true, contractor_id: null },
      { id: SETTER, role: 'setter', is_active: true, contractor_id: null },
      { id: SETTER_OTHER, role: 'setter', is_active: true, contractor_id: null },
      { id: CALLER, role: 'caller', is_active: true, contractor_id: null },
      { id: ACME_OWNER, role: 'contractor', is_active: true, contractor_id: ACME },
      { id: ACME_STAFF, role: 'contractor', is_active: true, contractor_id: ACME },
      { id: RIVAL, role: 'contractor', is_active: true, contractor_id: RIVAL_CO },
      { id: 'admin-off', role: 'admin', is_active: false, contractor_id: null },
    ],
    leads: [
      {
        id: 'lead-1',
        city: 'Encino',
        // Sensitive fields that must never reach a notification:
        first_name: 'Sergio',
        last_name: 'Gamino',
        phone: '818-555-0199',
        address: '123 Secret St',
        notes: 'gate code 4412',
        vertical: { name: 'Pool' },
        sub_service: { name: 'Pool Remodel' },
      },
    ],
    lead_assignments: [
      { id: 'asg-1', lead_id: 'lead-1', contractor_id: ACME, assigned_user_id: null, assigned_by: ADMIN1 },
      { id: 'asg-auto', lead_id: 'lead-1', contractor_id: ACME, assigned_user_id: null, assigned_by: null },
      { id: 'asg-user', lead_id: 'lead-1', contractor_id: ACME, assigned_user_id: ACME_STAFF, assigned_by: ACME_OWNER },
    ],
    appointments: [{ id: 'appt-1', created_by: SETTER, scheduled_at: '2026-09-30T17:00:00Z' }],
    contractor_prospects: [
      { id: 'pros-1', company_name: 'Blue Water Pools', assigned_to: CALLER, do_not_call_at: null },
      { id: 'pros-free', company_name: 'Unassigned Pools', assigned_to: null, do_not_call_at: null },
      { id: 'pros-dnc', company_name: 'No Calls Pools', assigned_to: CALLER, do_not_call_at: '2026-09-01T00:00:00Z' },
    ],
  };
});

describe('new leads and form submissions', () => {
  it('notify active admins only — no setters, callers or contractors', async () => {
    const out = await buildNotifications(event({ type: 'new_lead' }), db());
    expect(recipients(out)).toEqual([ADMIN1, ADMIN2]);
    expect(out[0]).toMatchObject({ title: '🚨 New Lead', body: 'Pool Remodel — Encino', url: '/app/leads/lead-1' });

    const form = await buildNotifications(event({ type: 'form_submission', payload: { funnelSlug: 'pool-masters-la' } }), db());
    expect(recipients(form)).toEqual([ADMIN1, ADMIN2]);
    expect(form[0].title).toBe('🔥 New Form Submission');
  });

  it('never puts homeowner details in the text', async () => {
    const out = await buildNotifications(event({ type: 'new_lead' }), db());
    const text = JSON.stringify(out);
    for (const secret of ['Sergio', 'Gamino', '555-0199', 'Secret St', '4412']) expect(text).not.toContain(secret);
  });
});

describe('lead assigned', () => {
  it('goes to the whole assigned company plus admins other than the one who did it — never a rival contractor', async () => {
    const out = await buildNotifications(event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'asg-1' }), db());
    expect(recipients(out)).toEqual([ACME_OWNER, ACME_STAFF, ADMIN2].sort());
    expect(recipients(out)).not.toContain(RIVAL);
    expect(recipients(out)).not.toContain(ADMIN1); // they assigned it themselves
    expect(out.every((m) => m.title === 'New Lead Assigned' && m.body === 'Pool Remodel — Encino')).toBe(true);
  });

  it('an automatic (funnel) assignment tells the contractor but not the admins again', async () => {
    const out = await buildNotifications(event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'asg-auto' }), db());
    expect(recipients(out)).toEqual([ACME_OWNER, ACME_STAFF].sort());
  });

  it('an assignment to one company user tells just that user (plus admins)', async () => {
    const out = await buildNotifications(event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'asg-user' }), db());
    expect(recipients(out)).toEqual([ACME_STAFF, ADMIN1, ADMIN2].sort());
    expect(recipients(out)).not.toContain(ACME_OWNER);
  });

  it('a reassignment payload overrides the stored assignee and excludes the acting admin', async () => {
    const out = await buildNotifications(
      event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'asg-1', payload: { assignedUserId: ACME_OWNER, actorId: ADMIN2 } }),
      db()
    );
    expect(recipients(out)).toEqual([ACME_OWNER, ADMIN1].sort());
  });

  it('an unknown assignment produces nothing', async () => {
    expect(await buildNotifications(event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'nope' }), db())).toEqual([]);
  });
});

describe('homeowner appointments', () => {
  const booked = (over: Partial<NotificationEvent> = {}) =>
    event({
      type: 'appointment_booked',
      entity_type: 'appointment',
      entity_id: 'appt-1',
      payload: { assignmentId: 'asg-auto', appointmentId: 'appt-1', scheduledAt: '2026-09-30T17:00:00Z' },
      ...over,
    });

  it('tells the assigned contractor company, admins, and the setter who booked it — not another setter or contractor', async () => {
    const out = await buildNotifications(booked(), db());
    expect(recipients(out)).toEqual([ACME_OWNER, ACME_STAFF, ADMIN1, ADMIN2, SETTER].sort());
    for (const excluded of [RIVAL, SETTER_OTHER, CALLER]) expect(recipients(out)).not.toContain(excluded);
    expect(out[0]).toMatchObject({ title: '📅 Appointment Booked', body: 'Pool Remodel — Encino — Wed, Sep 30, 10:00 AM' });
    expect(out.every((m) => m.url === '/app/appointments')).toBe(true);
  });

  it('does not re-notify an admin who booked it themselves', async () => {
    tables.appointments[0].created_by = ADMIN1;
    const out = await buildNotifications(booked(), db());
    expect(recipients(out)).not.toContain(ADMIN1);
    expect(recipients(out)).toContain(ADMIN2);
  });

  it('changed and cancelled use their own titles', async () => {
    expect((await buildNotifications(booked({ type: 'appointment_changed' }), db()))[0].title).toBe('🔄 Appointment Changed');
    expect((await buildNotifications(booked({ type: 'appointment_cancelled' }), db()))[0].title).toBe('❌ Appointment Cancelled');
  });

  it('an unassigned funnel booking (no assignment yet) still reaches the funnel owner contractor and admins', async () => {
    const out = await buildNotifications(
      event({
        type: 'appointment_booked',
        entity_type: 'lead',
        entity_id: 'lead-1',
        contractor_id: ACME,
        payload: { leadId: 'lead-1', assignmentId: null, appointmentId: null, contractorId: ACME, scheduledAt: '2026-09-30T17:00:00Z' },
      }),
      db()
    );
    expect(recipients(out)).toEqual([ACME_OWNER, ACME_STAFF, ADMIN1, ADMIN2].sort());
  });
});

describe('prospect sales appointments and callbacks', () => {
  it('sales appointment: partner + prospect owner + admins, sent to the calling workspace', async () => {
    const out = await buildNotifications(
      event({
        type: 'appointment_booked',
        entity_type: 'prospect_sales_appointment',
        entity_id: 'psa-1',
        lead_id: null,
        payload: { prospectId: 'pros-1', partnerId: SETTER, scheduledAt: '2026-09-30T17:00:00Z' },
      }),
      db()
    );
    expect(recipients(out)).toEqual([ADMIN1, ADMIN2, CALLER, SETTER].sort());
    expect(out[0]).toMatchObject({ title: '📅 Sales Call Booked', body: 'Blue Water Pools — Wed, Sep 30, 10:00 AM', url: '/app/calls/appointments' });
  });

  it('callback due goes to the assigned caller only, deep-linking the prospect', async () => {
    const out = await buildNotifications(
      event({ type: 'callback_due', entity_type: 'prospect', entity_id: 'pros-1', lead_id: null, payload: { prospectId: 'pros-1' } }),
      db()
    );
    expect(recipients(out)).toEqual([CALLER]);
    expect(out[0]).toMatchObject({ title: '📞 Callback Due', body: 'Blue Water Pools', url: '/app/calls/pros-1' });
  });

  it('an unassigned prospect callback reaches nobody (fail closed); do-not-call produces nothing', async () => {
    const free = await buildNotifications(event({ type: 'callback_due', entity_type: 'prospect', entity_id: 'pros-free', lead_id: null, payload: { prospectId: 'pros-free' } }), db());
    expect(free).toEqual([]);
    const dnc = await buildNotifications(event({ type: 'callback_due', entity_type: 'prospect', entity_id: 'pros-dnc', lead_id: null, payload: { prospectId: 'pros-dnc' } }), db());
    expect(dnc).toEqual([]);
  });
});

describe('payments and workflow alerts', () => {
  it('payment_received is admin-only and carries no amounts', async () => {
    const out = await buildNotifications(event({ type: 'payment_received', entity_type: 'service_request', entity_id: 'sr-1', lead_id: null }), db());
    expect(recipients(out)).toEqual([ADMIN1, ADMIN2]);
    expect(out[0].url).toBe('/app/service-requests');
    expect(out[0].body).not.toMatch(/\$|\d/);
  });

  it('workflow alerts go to the named users, otherwise admins, and always get a safe URL', async () => {
    const named = await buildNotifications(
      event({ type: 'workflow_alert', entity_type: 'workflow', entity_id: 'wf-1', lead_id: null, payload: { title: 'Stuck run', body: 'Check it', url: 'https://evil.example', userIds: [SETTER] } }),
      db()
    );
    expect(recipients(named)).toEqual([SETTER]);
    expect(named[0]).toMatchObject({ title: 'Stuck run', url: '/app' });

    const fallback = await buildNotifications(event({ type: 'workflow_alert', entity_type: 'workflow', entity_id: 'wf-2', lead_id: null, payload: { title: 'X' } }), db());
    expect(recipients(fallback)).toEqual([ADMIN1, ADMIN2]);
  });
});

describe('role-aware links', () => {
  it('a caller assigned a lead is sent to their workspace, never a lead page they cannot open', async () => {
    tables.lead_assignments.push({ id: 'asg-caller', lead_id: 'lead-1', contractor_id: ACME, assigned_user_id: CALLER, assigned_by: null });
    const out = await buildNotifications(event({ type: 'lead_assigned', entity_type: 'lead_assignment', entity_id: 'asg-caller' }), db());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ userIds: [CALLER], url: '/app/calls' });
  });

  it('a caller who booked an appointment lands on the calls appointments page', async () => {
    tables.profiles.find((p) => p.id === SETTER)!.role = 'caller';
    const out = await buildNotifications(
      event({ type: 'appointment_booked', entity_type: 'appointment', entity_id: 'appt-1', payload: { assignmentId: 'asg-auto', appointmentId: 'appt-1' } }),
      db()
    );
    expect(out.find((m) => m.userIds.includes(SETTER))?.url).toBe('/app/calls/appointments');
    expect(out.find((m) => m.userIds.includes(ACME_OWNER))?.url).toBe('/app/appointments');
  });
});
