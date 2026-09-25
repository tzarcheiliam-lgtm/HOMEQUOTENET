import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('use the fake db'); } }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: vi.fn() }));

import { buildServiceRequestAlert, contractorAccountUrl, serviceRequestsUrl } from '@/lib/growth/request-email';
import { sendServiceRequestAlert, upsellRequestRecipients } from '@/lib/growth/notify';
import { DEFAULT_LEAD_ALERT_EMAILS } from '@/lib/leads/notify';

const CONTRACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const data = {
  contractorName: 'Pool Masters LA',
  contractorId: CONTRACTOR_ID,
  serviceName: 'AI Receptionist',
  requesterName: 'Ethan',
  requesterEmail: 'ethan@example.test',
  notes: 'We miss calls on weekends.\nUse our Google Calendar.',
  submittedAt: '2026-09-24T20:00:00Z',
  sourceLabel: 'Growth Tools page',
};
const links = {
  contractorUrl: `https://homequote.test/app/contractors/${CONTRACTOR_ID}`,
  reviewUrl: 'https://homequote.test/app/service-requests?status=new',
};

describe('upsell request email', () => {
  it('uses the requested subject', () => {
    expect(buildServiceRequestAlert(data, links).subject).toBe('New HomeQuote Upsell Request — AI Receptionist');
  });

  it('lays out the body in the requested order, with a link to the contractor account', () => {
    const { text, html } = buildServiceRequestAlert(data, links);
    const order = ['New Upsell Request', 'Contractor:', 'Requested Service:', 'Requested By:', 'Email:', 'Contractor ID:', 'Notes:', 'Submitted:'];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).toContain('Contractor:\nPool Masters LA');
    expect(text).toContain('Requested Service:\nAI Receptionist');
    expect(text).toContain('Requested By:\nEthan');
    expect(text).toContain('Email:\nethan@example.test');
    expect(text).toContain(`Contractor ID:\n${CONTRACTOR_ID}`);
    expect(text).toContain('Notes:\nWe miss calls on weekends.\nUse our Google Calendar.');
    expect(text).toMatch(/Submitted:\n\w{3}, \w{3} \d+/);
    expect(text).toContain(`Open contractor account: ${links.contractorUrl}`);
    expect(html).toContain(`href="${links.contractorUrl}"`);
    expect(html).toContain('New Upsell Request');
  });

  it('escapes contractor-entered text and keeps the subject to one line', () => {
    const e = buildServiceRequestAlert(
      { ...data, serviceName: 'AI\r\nBcc: x@y.z', contractorName: 'Evil <b>Co</b>', notes: '<script>alert(1)</script>' },
      links
    );
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.html).not.toContain('<b>Co</b>');
  });

  it('handles missing notes and requester details', () => {
    const e = buildServiceRequestAlert({ ...data, notes: '  ', requesterName: null, requesterEmail: null, sourceLabel: null }, links);
    expect(e.text).toContain('Notes:\n(none)');
    expect(e.text).toContain('Requested By:\nUnknown');
    expect(e.text).toContain('Email:\n—');
    expect(e.text).not.toContain('Source:');
  });

  it('builds absolute links into HomeQuote', () => {
    expect(contractorAccountUrl(CONTRACTOR_ID, 'https://app.homequote.test')).toBe(`https://app.homequote.test/app/contractors/${CONTRACTOR_ID}`);
    expect(serviceRequestsUrl('https://app.homequote.test/')).toBe('https://app.homequote.test/app/service-requests?status=new');
  });
});

describe('notification recipients (server-side config)', () => {
  it('uses UPSELL_REQUEST_NOTIFICATION_EMAIL when set', () => {
    expect(upsellRequestRecipients({ UPSELL_REQUEST_NOTIFICATION_EMAIL: 'Owner@Example.test, ops@example.test' } as never)).toEqual([
      'owner@example.test',
      'ops@example.test',
    ]);
  });

  it('falls back to the existing team alert list, then to its defaults', () => {
    expect(upsellRequestRecipients({ LEAD_ALERT_EMAILS: 'team@example.test' } as never)).toEqual(['team@example.test']);
    expect(upsellRequestRecipients({} as never)).toEqual(DEFAULT_LEAD_ALERT_EMAILS.split(','));
  });

  it('rejects an invalid configured address rather than guessing', () => {
    expect(() => upsellRequestRecipients({ UPSELL_REQUEST_NOTIFICATION_EMAIL: 'not-an-email' } as never)).toThrow();
  });
});

// ---- sender, against an in-memory request row ---------------------------------

type Row = Record<string, unknown>;
function fakeDb(initial: Row | null) {
  const row: Row | null = initial ? { ...initial } : null;
  const updates: Row[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row ? { ...row } : null, error: null }) }),
      }),
      update: (values: Row) => {
        const filters: [string, unknown][] = [];
        const apply = () => {
          const match = row && filters.every(([k, v]) => row[k] === v);
          if (match) {
            Object.assign(row!, values);
            updates.push(values);
          }
          return match;
        };
        const chain = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return chain;
          },
          select: async () => ({ data: apply() ? [{ id: row!.id }] : [], error: null }),
          then(resolve: (v: { error: null }) => void) {
            apply();
            resolve({ error: null });
          },
        };
        return chain;
      },
    }),
  };
  return { db: db as never, row: () => row, updates };
}
const baseRow = {
  id: 'r1',
  contractor_id: CONTRACTOR_ID,
  service: 'ai_receptionist',
  notes: 'Weekends',
  source: 'growth_page',
  created_at: '2026-09-24T20:00:00Z',
  notification_status: 'pending',
  notification_attempts: 0,
  notification_claimed_at: null,
  contractor: { name: 'Pool Masters LA' },
  requester: { full_name: 'Ethan', email: 'ethan@example.test' },
};

describe('sendServiceRequestAlert', () => {
  let quiet: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => quiet.mockRestore());

  it('emails the HQN team (never the contractor) and marks the request sent', async () => {
    const f = fakeDb(baseRow);
    const send = vi.fn(async () => ({ id: 'gmail-1', fromEmail: 'hq@example.test' }));
    expect(await sendServiceRequestAlert('r1', { db: f.db, send, siteUrl: 'https://homequote.test' })).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);
    const input = (send.mock.calls[0] as unknown as [{ toEmail: string; subject: string; message: string }])[0];
    expect(input.toEmail).not.toContain('ethan@example.test');
    expect(input.subject).toBe('New HomeQuote Upsell Request — AI Receptionist');
    expect(input.message).toContain(`https://homequote.test/app/contractors/${CONTRACTOR_ID}`);
    expect(input.message).toContain('Source:\nGrowth Tools page');
    expect(f.row()).toMatchObject({ notification_status: 'sent', notification_attempts: 1, notification_error: null });
    expect(f.row()!.notified_at).toBeTruthy();
  });

  it('keeps the request and records the failure when Gmail fails', async () => {
    const f = fakeDb(baseRow);
    const failing = vi.fn(async () => { throw new Error('HomeQuote Gmail is not connected'); });
    expect(await sendServiceRequestAlert('r1', { db: f.db, send: failing })).toEqual({
      sent: false,
      error: 'HomeQuote Gmail is not connected',
    });
    expect(f.row()).toMatchObject({
      id: 'r1',
      service: 'ai_receptionist',
      notification_status: 'failed',
      notification_attempts: 1,
      notification_error: 'HomeQuote Gmail is not connected',
    });
    // Nothing but notification fields was ever written.
    for (const u of f.updates) expect(Object.keys(u).every((k) => k.startsWith('notif'))).toBe(true);
  });

  it('a retry after a failure sends and clears the error', async () => {
    const f = fakeDb({ ...baseRow, notification_status: 'failed', notification_attempts: 1, notification_error: 'boom' });
    const send = vi.fn(async () => ({}));
    expect(await sendServiceRequestAlert('r1', { db: f.db, send })).toEqual({ sent: true });
    expect(f.row()).toMatchObject({ notification_status: 'sent', notification_attempts: 2, notification_error: null });
  });

  it('never sends twice: already-sent and in-flight requests are skipped', async () => {
    const send = vi.fn(async () => ({}));
    const sent = fakeDb({ ...baseRow, notification_status: 'sent', notified_at: '2026-09-24T20:01:00Z' });
    expect(await sendServiceRequestAlert('r1', { db: sent.db, send })).toEqual({ sent: true, already: true });
    const now = new Date('2026-09-24T20:02:00Z');
    const inFlight = fakeDb({ ...baseRow, notification_status: 'sending', notification_attempts: 1, notification_claimed_at: '2026-09-24T20:01:00Z' });
    expect(await sendServiceRequestAlert('r1', { db: inFlight.db, send, now: () => now })).toMatchObject({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });

  it('recovers a send that crashed mid-flight once its lease expires', async () => {
    const f = fakeDb({ ...baseRow, notification_status: 'sending', notification_attempts: 1, notification_claimed_at: '2026-09-24T20:00:00Z' });
    const send = vi.fn(async () => ({}));
    const later = new Date('2026-09-24T20:10:00Z');
    expect(await sendServiceRequestAlert('r1', { db: f.db, send, now: () => later })).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never throws when the request is missing', async () => {
    const f = fakeDb(null);
    const send = vi.fn();
    expect(await sendServiceRequestAlert('r1', { db: f.db, send })).toMatchObject({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });
});
