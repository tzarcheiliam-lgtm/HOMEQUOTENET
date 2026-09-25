import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('use the fake db'); } }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: vi.fn() }));

import {
  buildNewLeadAlert,
  buildQualifiedLeadEmail,
  displayPhone,
  telHref,
  type LeadEmailData,
} from '@/lib/leads/lead-emails';
import { leadAlertRecipients, leadUrl, processLeadEmails, type LeadEmailSender } from '@/lib/leads/notify';

const base: LeadEmailData = {
  leadId: '6ed89045-03ff-4565-abd5-6c1fdf0ec405',
  name: 'Dana Rivera',
  phone: '+18185550142',
  email: 'dana@example.test',
  service: 'Full Pool Remodel',
  city: 'Encino',
  zip: '91436',
  homeowner: 'Yes, I own the home',
  timeline: 'Within 1–3 months',
  budget: null,
  industry: 'Pool remodeling',
  source: 'Website form: Pool Masters LA (/estimate/pool-masters) · pool-remodel-sept',
  submittedAt: '2026-09-24T22:20:30.685Z',
  isRepeat: false,
  autoCheck: true,
  answers: [],
  qualificationNotes: null,
  qualifiedBy: null,
  appointment: null,
};

describe('new lead alert (Liam + Nadav)', () => {
  const url = 'https://homequotenet.com/app/leads/6ed89045-03ff-4565-abd5-6c1fdf0ec405';
  it('uses the requested subject and fields', () => {
    const e = buildNewLeadAlert(base, url);
    expect(e.subject).toBe('New HomeQuote Lead — Full Pool Remodel — Encino');
    expect(e.text).toContain('NEW LEAD — NEEDS QUALIFICATION');
    for (const line of ['Name: Dana Rivera', 'Phone: (818) 555-0142', 'Email: dana@example.test', 'Project: Full Pool Remodel',
      'City / ZIP: Encino / 91436', 'Homeowner: Yes, I own the home', 'Timeline: Within 1–3 months',
      'Lead Source/Campaign: Website form: Pool Masters LA', 'Submitted: Thu, Sep 24, 2026, 3:20 PM PDT']) {
      expect(e.text).toContain(line);
    }
  });
  it('has a tap-to-call phone link and a VIEW & QUALIFY LEAD button to that lead', () => {
    const e = buildNewLeadAlert(base, url);
    expect(e.html).toContain('href="tel:+18185550142"');
    expect(e.html).toContain(`href="${url}"`);
    expect(e.html).toContain('VIEW &amp; QUALIFY LEAD');
    expect(e.text).toContain(`VIEW & QUALIFY LEAD: ${url}`);
  });
  it('falls back to ZIP when there is no city, and flags repeats / out-of-area', () => {
    const e = buildNewLeadAlert({ ...base, city: null, isRepeat: true, autoCheck: false }, url);
    expect(e.subject).toBe('New HomeQuote Lead — Full Pool Remodel — ZIP 91436');
    expect(e.text).toContain('Repeat request');
    expect(e.text).toContain('automatic check flagged');
  });
  it('escapes homeowner-supplied text and keeps the subject to one line', () => {
    const e = buildNewLeadAlert({ ...base, name: '<script>x</script>', service: 'Remodel\r\nBcc: evil@example.test' }, url);
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.subject).not.toMatch(/[\r\n]/);
  });
});

describe('qualified lead email (selected recipients)', () => {
  const qualified: LeadEmailData = {
    ...base,
    qualificationNotes: 'Confirmed full remodel, budget 25–50k.',
    appointment: { scheduledAt: '2026-10-02T18:30:00Z', verified: true },
  };
  it('matches the example subject and shows contact, project and appointment', () => {
    const e = buildQualifiedLeadEmail(qualified, 'Ethan Smith');
    expect(e.subject).toBe('Qualified Pool Lead — Full Pool Remodel — Encino');
    expect(e.text).toContain('Hi Ethan,');
    for (const line of ['Name: Dana Rivera', 'Phone: (818) 555-0142', 'Email: dana@example.test', 'Project Type: Full Pool Remodel',
      'City / ZIP: Encino / 91436', 'Timeline: Within 1–3 months', 'Confirmed full remodel, budget 25–50k.',
      'Appointment: Booked by the homeowner: Fri, Oct 2, 2026, 11:30 AM PDT']) {
      expect(e.text).toContain(line);
    }
    expect(e.html).toContain('href="tel:+18185550142"');
    expect(e.html).toContain('href="mailto:dana@example.test"');
  });
  it('does not leak internal-only details (lead link, campaign, source) to contractors', () => {
    const e = buildQualifiedLeadEmail(qualified, 'Ethan');
    expect(e.html).not.toContain('/app/leads/');
    expect(e.text).not.toContain('pool-remodel-sept');
    expect(e.text).not.toContain('Website form');
  });
  it('says when no appointment is booked yet', () => {
    expect(buildQualifiedLeadEmail(base, null).text).toContain('Appointment: Not booked yet');
  });
});

describe('helpers', () => {
  it('formats phone numbers', () => {
    expect(telHref('(818) 555-0142')).toBe('tel:+18185550142');
    expect(telHref('+1 818 555 0142')).toBe('tel:+18185550142');
    expect(displayPhone('+18185550142')).toBe('(818) 555-0142');
  });
  it('reads the alert list from the server env only, and validates it', () => {
    expect(leadAlertRecipients('Liam@Example.test, nadav@example.test')).toEqual(['liam@example.test', 'nadav@example.test']);
    expect(() => leadAlertRecipients('')).toThrow(/not configured/);
    expect(() => leadAlertRecipients('liam@example.test, not-an-email')).toThrow(/invalid/);
    expect(leadUrl('abc', 'https://homequotenet.com')).toBe('https://homequotenet.com/app/leads/abc');
  });
  it('never ships the alert list or email code to the browser', () => {
    const notify = readFileSync('lib/leads/notify.ts', 'utf8');
    expect(notify.startsWith("import 'server-only';")).toBe(true);
    for (const file of ['components/leads/send-lead-form.tsx', 'components/leads/lead-distribution-panel.tsx', 'components/leads/recipient-form.tsx']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/LEAD_ALERT_EMAILS|lib\/leads\/notify|lib\/emails\/gmail/);
    }
  });
});

// ---- processLeadEmails against an in-memory fake of the Supabase client ----------
/* eslint-disable @typescript-eslint/no-explicit-any -- minimal chainable test double */

type Row = Record<string, any>;
function fakeDb(tables: Record<string, Row[]>) {
  const updates: { table: string; values: Row; id: string }[] = [];
  const from = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let limit = Infinity;
    let patch: Row | null = null;
    const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, limit);
    const b: any = {
      select: () => b,
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return b; },
      in: (k: string, v: unknown[]) => { filters.push((r) => v.includes(r[k])); return b; },
      not: (k: string) => { filters.push((r) => r[k] != null); return b; },
      order: () => b,
      limit: (n: number) => { limit = n; return b; },
      update: (values: Row) => { patch = values; return b; },
      single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => {
        if (patch) {
          for (const r of rows()) { Object.assign(r, patch); updates.push({ table, values: patch, id: r.id }); }
          return resolve({ error: null });
        }
        return resolve({ data: rows(), error: null });
      },
    };
    return b;
  };
  const rpc = async (_name: string, args: { p_ids: string[] | null }) => {
    const due = tables.lead_email_deliveries.filter((d) => ['pending', 'failed'].includes(d.status) && (!args.p_ids || args.p_ids.includes(d.id)));
    for (const d of due) { d.status = 'sending'; d.attempts += 1; }
    return { data: due.map((d) => ({ ...d })), error: null };
  };
  return { db: { from, rpc } as any, updates };
}

describe('processLeadEmails (Ethan form scenario)', () => {
  const config = JSON.parse(readFileSync('content/funnels/clients/pool-masters-la.json', 'utf8'));
  let tables: Record<string, Row[]>;
  beforeEach(() => {
    process.env.LEAD_ALERT_EMAILS = 'liam@homequote.test,nadav@homequote.test';
    tables = {
      leads: [{ id: 'lead-1', first_name: 'Dana', last_name: 'Rivera', phone: '+18185550142', email: 'dana@example.test', city: null, zip: '91436',
        timeline: '1_3_months', budget_range: null, source: 'website', utm_campaign: 'pool-remodel-sept', created_at: '2026-09-24T22:20:30Z',
        qualified_by: null, qualification_notes: 'Wants to start in November', vertical: null, sub_service: null }],
      funnel_sessions: [{ id: 'session-1', lead_id: 'lead-1', answers: { service: 'full_remodel', zip: '91436', homeowner: 'yes', timeline: '1_3_months' },
        qualified: true, config_snapshot: config, contact_submitted_at: '2026-09-24T22:20:30Z', funnel: { slug: 'pool-masters' } }],
      funnel_bookings: [{ session_id: 'session-1', scheduled_at: '2026-10-02T18:30:00Z', verified: true }],
      appointments: [],
      profiles: [],
      lead_intake_events: [{ id: 'ev-1', provider: 'website', external_lead_id: 'session-1' }],
      lead_email_deliveries: [
        { id: 'alert-1', lead_id: 'lead-1', kind: 'new_lead_alert', intake_event_id: 'ev-1', is_repeat: false, recipient_name: null, recipient_email: null, status: 'pending', attempts: 0 },
      ],
    };
  });

  it('emails the raw lead to Liam + Nadav only, then Ethan + Gio only after Send lead', async () => {
    const sent: { toEmail: string; subject: string; html: string }[] = [];
    const send: LeadEmailSender = async (m) => { sent.push(m); return { id: `gmail-${sent.length}` }; };
    const { db } = fakeDb(tables);

    const first = await processLeadEmails({ db, send, siteUrl: 'https://homequotenet.com' });
    expect(first).toMatchObject({ sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].toEmail).toBe('liam@homequote.test, nadav@homequote.test');
    expect(sent[0].toEmail).not.toMatch(/ethan|gio|pool/i);
    expect(sent[0].subject).toBe('New HomeQuote Lead — Full Pool Remodel — ZIP 91436');
    expect(sent[0].html).toContain('https://homequotenet.com/app/leads/lead-1');
    expect(sent[0].html).toContain('Within 1–3 months');
    expect(sent[0].html).toContain('Website form: Pool Masters LA');
    const alert = tables.lead_email_deliveries[0];
    expect(alert).toMatchObject({ status: 'sent', provider_message_id: 'gmail-1', recipient_email: 'liam@homequote.test, nadav@homequote.test' });

    // Nothing else is queued, so running again sends nothing (no duplicate alert).
    expect(await processLeadEmails({ db, send })).toMatchObject({ sent: 0, failed: 0 });
    expect(sent).toHaveLength(1);

    // After qualification, distribute_lead queues Ethan + Gio.
    tables.lead_email_deliveries.push(
      { id: 'send-e', lead_id: 'lead-1', kind: 'qualified_lead', intake_event_id: null, is_repeat: false, recipient_name: 'Ethan', recipient_email: 'ethan@poolmasters.test', status: 'pending', attempts: 0 },
      { id: 'send-g', lead_id: 'lead-1', kind: 'qualified_lead', intake_event_id: null, is_repeat: false, recipient_name: 'Gio', recipient_email: 'gio@poolmasters.test', status: 'pending', attempts: 0 },
    );
    const second = await processLeadEmails({ db, send, ids: ['send-e', 'send-g'] });
    expect(second).toMatchObject({ sent: 2, failed: 0 });
    expect(sent.slice(1).map((m) => m.toEmail)).toEqual(['ethan@poolmasters.test', 'gio@poolmasters.test']);
    for (const m of sent.slice(1)) {
      expect(m.subject).toBe('Qualified Pool Lead — Full Pool Remodel — ZIP 91436');
      expect(m.html).toContain('Wants to start in November');
      expect(m.html).toContain('Fri, Oct 2, 2026');
      expect(m.html).not.toContain('liam@homequote.test');
    }
    expect(tables.lead_email_deliveries.filter((d) => d.status === 'sent')).toHaveLength(3);
  });

  it('records a failure with the reason and sends on retry', async () => {
    const { db } = fakeDb(tables);
    const failing: LeadEmailSender = async () => { throw new Error('HomeQuote Gmail is not connected'); };
    const r = await processLeadEmails({ db, send: failing });
    expect(r).toMatchObject({ sent: 0, failed: 1 });
    expect(tables.lead_email_deliveries[0]).toMatchObject({ status: 'failed', last_error: 'HomeQuote Gmail is not connected' });
    const ok: LeadEmailSender = async () => ({ id: 'gmail-retry' });
    expect(await processLeadEmails({ db, send: ok, ids: ['alert-1'] })).toMatchObject({ sent: 1 });
    expect(tables.lead_email_deliveries[0]).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('delivers a workflow email through the existing Gmail outbox exactly once', async () => {
    const sent: { toEmail: string; subject: string }[] = [];
    const send: LeadEmailSender = async (message) => { sent.push(message); return { id: 'gmail-workflow-1' }; };
    tables.lead_email_deliveries = [{
      id: 'workflow-email-1', lead_id: 'lead-1', kind: 'workflow_email', intake_event_id: null,
      is_repeat: false, recipient_name: null, recipient_email: 'dana@example.test', status: 'pending', attempts: 0,
      subject: 'Your project', message: 'Thanks for reaching out.', html_message: '<p>Thanks for reaching out.</p>',
    }];
    const { db } = fakeDb(tables);
    expect(await processLeadEmails({ db, send, ids: ['workflow-email-1'] })).toMatchObject({ sent: 1, failed: 0 });
    expect(sent).toEqual([{ toEmail: 'dana@example.test', subject: 'Your project', message: 'Thanks for reaching out.', html: '<p>Thanks for reaching out.</p>', text: 'Thanks for reaching out.' }]);
    expect(await processLeadEmails({ db, send, ids: ['workflow-email-1'] })).toMatchObject({ sent: 0, failed: 0 });
    expect(sent).toHaveLength(1);
  });

  it('without LEAD_ALERT_EMAILS, alerts go only to the confirmed Liam + Nadav addresses', async () => {
    delete process.env.LEAD_ALERT_EMAILS;
    expect(leadAlertRecipients()).toEqual(['tzarcheiliam@gmail.com', 'nsolachnek@gmail.com']);
    const sent: string[] = [];
    const { db } = fakeDb(tables);
    await processLeadEmails({ db, send: async (m) => { sent.push(m.toEmail); return { id: 'g' }; } });
    expect(sent).toEqual(['tzarcheiliam@gmail.com, nsolachnek@gmail.com']);
  });
});
