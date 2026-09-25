import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('use the fake db'); } }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: vi.fn() }));

import { buildServiceRequestAlert, serviceRequestsUrl } from '@/lib/growth/request-email';
import { sendServiceRequestAlert } from '@/lib/growth/notify';
import { DEFAULT_LEAD_ALERT_EMAILS } from '@/lib/leads/notify';

const data = {
  companyName: 'Pool Masters LA',
  serviceName: 'Website creation or redesign',
  requesterName: 'Ethan',
  requesterEmail: 'ethan@example.test',
  requesterPhone: '(818) 555-0100',
  notes: 'Only a Facebook page today.\nWant a quote form.',
  submittedAt: '2026-09-24T20:00:00Z',
};

describe('service request alert email', () => {
  it('names the company, service and requester, and says nothing was purchased', () => {
    const e = buildServiceRequestAlert(data, 'https://homequote.test/app/service-requests?status=new');
    expect(e.subject).toBe('Service request: Website creation or redesign · Pool Masters LA');
    for (const part of [e.text, e.html]) {
      expect(part).toContain('Pool Masters LA');
      expect(part).toContain('ethan@example.test');
      expect(part).toContain('(818) 555-0100');
      expect(part).toMatch(/nothing was purchased or billed/);
    }
    expect(e.text).toContain('Only a Facebook page today.\nWant a quote form.');
    expect(e.html).toContain('href="https://homequote.test/app/service-requests?status=new"');
  });

  it('escapes contractor-entered text and keeps the subject to one line', () => {
    const e = buildServiceRequestAlert(
      { ...data, companyName: 'Evil <b>Co</b>\r\nBcc: x@y.z', notes: '<script>alert(1)</script>' },
      'https://homequote.test/x'
    );
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.html).not.toContain('<b>Co</b>');
  });

  it('handles missing notes and contact details', () => {
    const e = buildServiceRequestAlert({ ...data, notes: '  ', requesterPhone: null, requesterName: null }, 'https://x.test');
    expect(e.text).toContain('Notes: (none)');
    expect(e.text).toContain('Phone: —');
    expect(e.text).toContain('Requested by: Unknown');
  });

  it('links to the admin review page', () => {
    expect(serviceRequestsUrl('https://app.homequote.test')).toBe('https://app.homequote.test/app/service-requests?status=new');
  });
});

describe('sendServiceRequestAlert', () => {
  const fakeDb = (row: unknown, error: { message: string } | null = null) =>
    ({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error }) }) }) }),
    }) as never;
  const row = {
    service: 'crm_setup',
    notes: 'Spreadsheet today',
    created_at: '2026-09-24T20:00:00Z',
    contractor: { name: 'Pool Masters LA' },
    requester: { full_name: 'Gio', email: 'gio@example.test', phone: null },
  };

  it('emails only the internal HQN alert list, never the contractor', async () => {
    const send = vi.fn(async () => ({ id: 'gmail-1', fromEmail: 'hq@example.test' }));
    const result = await sendServiceRequestAlert('r1', { db: fakeDb(row), send });
    expect(result).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);
    const input = (send.mock.calls[0] as unknown as [{ toEmail: string; subject: string }])[0];
    expect(input.toEmail).toBe(DEFAULT_LEAD_ALERT_EMAILS.split(',').join(', '));
    expect(input.toEmail).not.toContain('gio@example.test');
    expect(input.subject).toBe('Service request: CRM setup & optimization · Pool Masters LA');
  });

  it('never throws: a missing row or Gmail failure is reported and logged', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendServiceRequestAlert('r1', { db: fakeDb(null), send: vi.fn() })).toMatchObject({ sent: false });
    const failing = vi.fn(async () => { throw new Error('HomeQuote Gmail is not connected'); });
    expect(await sendServiceRequestAlert('r1', { db: fakeDb(row), send: failing })).toEqual({
      sent: false,
      error: 'HomeQuote Gmail is not connected',
    });
    quiet.mockRestore();
  });
});
