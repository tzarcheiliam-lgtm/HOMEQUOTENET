/* eslint-disable @typescript-eslint/no-explicit-any -- loose Stripe/db fakes */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const COMPANY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const h = vi.hoisted(() => ({
  profile: { id: 'admin-1', role: 'admin' } as null | Record<string, unknown>,
  rows: [] as Record<string, any>[],
  audits: [] as Record<string, any>[],
  prices: [] as Record<string, any>[],
  links: [] as Record<string, any>[],
  deactivated: [] as string[],
  emails: [] as Record<string, any>[],
  failLink: false,
  failMail: false,
  company: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Pool Masters', email: 'office@pm.test' } as null | Record<string, any>,
  configured: true,
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!h.profile || !roles.includes(h.profile.role as string)) throw new Error('NEXT_REDIRECT /app');
    return h.profile;
  }),
}));
vi.mock('@/lib/emails/gmail', () => ({
  sendGmailMessage: vi.fn(async (m: Record<string, any>) => {
    if (h.failMail) throw new Error('not connected');
    h.emails.push(m);
    return { id: 'm', fromEmail: 'x' };
  }),
}));
vi.mock('@/lib/billing/stripe', () => ({
  isStripeConfigured: () => h.configured,
  stripe: () => ({
    prices: { create: vi.fn(async (p: Record<string, any>) => (h.prices.push(p), { id: `price_${h.prices.length}` })) },
    paymentLinks: {
      create: vi.fn(async (p: Record<string, any>) => {
        if (h.failLink) throw new Error('stripe down');
        h.links.push(p);
        return { id: 'plink_1', url: 'https://buy.stripe.test/abc' };
      }),
      update: vi.fn(async (id: string) => void h.deactivated.push(id)),
    },
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (t: string) => {
      const filters: [string, unknown][] = [];
      const nots: [string, unknown][] = [];
      let mode: 'select' | 'update' | 'delete' | 'insert' = 'select';
      let patch: Record<string, any> = {};
      const api: any = {
        select: () => api,
        eq: (k: string, v: unknown) => (filters.push([k, v]), api),
        neq: (k: string, v: unknown) => (nots.push([k, v]), api),
        update: (p: Record<string, any>) => ((mode = 'update'), (patch = p), api),
        delete: () => ((mode = 'delete'), api),
        insert: (row: Record<string, any>) => {
          if (t === 'audit_logs') return (h.audits.push(row), Promise.resolve({ error: null }));
          mode = 'insert';
          const saved = { id: 'pr-1', status: 'sent', ...row };
          h.rows.push(saved);
          patch = saved;
          return api;
        },
        single: async () => ({ data: mode === 'insert' ? patch : null, error: null }),
        maybeSingle: async () => {
          if (t === 'contractors') return { data: h.company && filters.every(([k, v]) => h.company![k] === v) ? h.company : null, error: null };
          return { data: h.rows.find((r) => filters.every(([k, v]) => r[k] === v)) ?? null, error: null };
        },
        then: (resolve: (v: unknown) => void) => {
          const hit = h.rows.filter((r) => filters.every(([k, v]) => r[k] === v) && nots.every(([k, v]) => r[k] !== v));
          if (mode === 'update') hit.forEach((r) => Object.assign(r, patch));
          if (mode === 'delete') h.rows = h.rows.filter((r) => !hit.includes(r));
          resolve({ data: null, error: null });
        },
      };
      return api;
    },
  }),
}));

import { parseSendPayment, buildPaymentRequestEmail, describeAmount } from '@/lib/billing/payment-request';
import { sendPaymentRequest, cancelPaymentRequest } from '@/lib/actions/payment-requests';
import { handleStripeEvent } from '@/lib/billing/webhook';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const base = { amount: '2,500', interval: 'one_time', description: 'Marketing management: October' };

beforeEach(() => {
  h.profile = { id: 'admin-1', role: 'admin' };
  h.rows = [];
  h.audits = [];
  h.prices = [];
  h.links = [];
  h.deactivated = [];
  h.emails = [];
  h.failLink = false;
  h.failMail = false;
  h.configured = true;
  h.company = { id: COMPANY, name: 'Pool Masters', email: 'office@pm.test' };
});

describe('send payment validation', () => {
  it('parses dollars to cents and requires a description', () => {
    const ok = parseSendPayment(fd(base));
    expect(ok.success && ok.data.amount).toBe(250000);
    expect(parseSendPayment(fd({ ...base, description: '  ' })).success).toBe(false);
    expect(parseSendPayment(fd({ ...base, amount: '0.10' })).success).toBe(false);
    expect(parseSendPayment(fd({ ...base, amount: '100001' })).success).toBe(false);
    expect(parseSendPayment(fd({ ...base, amount: 'abc' })).success).toBe(false);
  });
  it('only allows a setup fee on monthly, and checks email and company', () => {
    expect(parseSendPayment(fd({ ...base, setup_fee: '750' })).success).toBe(false);
    expect(parseSendPayment(fd({ ...base, interval: 'month', setup_fee: '750' })).success).toBe(true);
    expect(parseSendPayment(fd({ ...base, customer_email: 'nope' })).success).toBe(false);
    expect(parseSendPayment(fd({ ...base, contractor_id: 'x' })).success).toBe(false);
  });
  it('describes amounts', () => {
    expect(describeAmount({ amount: 250000, interval: 'month', setup_fee: 75000 })).toBe('$2,500/mo + $750 setup');
    expect(describeAmount({ amount: 75000, interval: 'one_time' })).toBe('$750 one-time');
  });
  it('builds a branded email with the link', () => {
    const m = buildPaymentRequestEmail({ firstName: 'Avi', description: 'Setup', amountText: '$750 one-time' }, 'https://buy.stripe.test/x', 'https://hq.test');
    expect(m.subject).toContain('Setup');
    expect(m.html).toContain('href="https://buy.stripe.test/x"');
    expect(m.text).toContain('https://buy.stripe.test/x');
  });
});

describe('sendPaymentRequest', () => {
  it('is admin only', async () => {
    h.profile = { id: 'c1', role: 'contractor' };
    await expect(sendPaymentRequest(undefined, fd(base))).rejects.toThrow('NEXT_REDIRECT');
    h.profile = { id: 's1', role: 'setter' };
    await expect(sendPaymentRequest(undefined, fd(base))).rejects.toThrow('NEXT_REDIRECT');
    expect(h.links).toHaveLength(0);
  });

  it('creates a single-use one-time link with amounts from the validated form', async () => {
    const r = await sendPaymentRequest(undefined, fd(base));
    expect(r).toMatchObject({ ok: true, url: 'https://buy.stripe.test/abc' });
    expect(h.prices[0]).toMatchObject({ unit_amount: 250000, currency: 'usd', product_data: { name: base.description } });
    expect(h.prices[0].recurring).toBeUndefined();
    expect(h.links[0].restrictions).toEqual({ completed_sessions: { limit: 1 } });
    expect(h.links[0].managed_payments).toEqual({ enabled: false });
    expect(h.links[0].metadata.payment_request_id).toBe('pr-1');
    expect(h.rows[0]).toMatchObject({ amount_cents: 250000, interval: 'one_time', stripe_payment_link_id: 'plink_1', created_by: 'admin-1' });
    expect(h.audits[0].action).toBe('payment_request.created');
    expect(h.emails).toHaveLength(0);
  });

  it('creates a monthly link with a one-time setup line', async () => {
    await sendPaymentRequest(undefined, fd({ ...base, interval: 'month', setup_fee: '750' }));
    expect(h.prices).toHaveLength(2);
    expect(h.prices[0].recurring).toEqual({ interval: 'month' });
    expect(h.prices[1]).toMatchObject({ unit_amount: 75000 });
    expect(h.prices[1].recurring).toBeUndefined();
    expect(h.links[0].line_items).toHaveLength(2);
    expect(h.links[0].subscription_data).toBeDefined();
  });

  it('emails the link, using the company email when none is typed, and prefills it', async () => {
    const r = await sendPaymentRequest(undefined, fd({ ...base, contractor_id: COMPANY, notify: 'on' }));
    expect(r).toMatchObject({ ok: true });
    expect(h.emails[0].toEmail).toBe('office@pm.test');
    expect(h.emails[0].html).toContain('prefilled_email=office%40pm.test');
    expect(h.rows[0].emailed_at).toBeTruthy();
    expect(h.links[0].metadata.contractor_id).toBe(COMPANY);
  });

  it('refuses to email with no address, and keeps the link when the email fails', async () => {
    const none = await sendPaymentRequest(undefined, fd({ ...base, notify: 'on' }));
    expect(none).toMatchObject({ ok: false });
    expect(h.links).toHaveLength(0);
    h.failMail = true;
    const r = await sendPaymentRequest(undefined, fd({ ...base, customer_email: 'a@b.test', notify: 'on' }));
    expect(r).toMatchObject({ ok: true });
    expect((r as any).message).toContain('didn’t send');
  });

  it('removes the saved row when Stripe fails, and reports missing Stripe config', async () => {
    h.failLink = true;
    expect(await sendPaymentRequest(undefined, fd(base))).toMatchObject({ ok: false });
    expect(h.rows).toHaveLength(0);
    h.configured = false;
    expect(await sendPaymentRequest(undefined, fd(base))).toMatchObject({ ok: false });
  });
});

describe('cancelPaymentRequest', () => {
  it('deactivates an unpaid link only', async () => {
    h.rows = [{ id: '11111111-1111-4111-8111-111111111111', status: 'sent', stripe_payment_link_id: 'plink_1' }, { id: '22222222-2222-4222-8222-222222222222', status: 'paid', stripe_payment_link_id: 'plink_2' }];
    await cancelPaymentRequest(fd({ id: '11111111-1111-4111-8111-111111111111' }));
    await cancelPaymentRequest(fd({ id: '22222222-2222-4222-8222-222222222222' }));
    expect(h.deactivated).toEqual(['plink_1']);
    expect(h.rows.map((r) => r.status)).toEqual(['canceled', 'paid']);
  });
});

describe('webhook for payment links', () => {
  const session = (over: Record<string, any>) => ({ id: 'cs_1', object: 'checkout.session', mode: 'payment', payment_status: 'paid', metadata: {}, client_reference_id: null, payment_link: null, ...over });
  const event = (type: string, s: Record<string, any>) => ({ id: 'evt_1', type, data: { object: s } }) as any;
  const db: any = null;

  it('marks a payment request paid from our metadata', async () => {
    h.rows = [{ id: 'pr-1', status: 'sent' }];
    const dbMock = (await import('@/lib/supabase/admin')).createAdminClient() as any;
    await handleStripeEvent(event('checkout.session.completed', session({ metadata: { payment_request_id: 'pr-1' } })), dbMock, new Date('2026-10-15T12:00:00Z'));
    expect(h.rows[0]).toMatchObject({ status: 'paid', stripe_session_id: 'cs_1', paid_at: '2026-10-15T12:00:00.000Z' });
    void db;
  });

  it('waits for async bank payments to clear', async () => {
    h.rows = [{ id: 'pr-1', status: 'sent' }];
    const dbMock = (await import('@/lib/supabase/admin')).createAdminClient() as any;
    await handleStripeEvent(event('checkout.session.completed', session({ payment_status: 'unpaid', metadata: { payment_request_id: 'pr-1' } })), dbMock);
    expect(h.rows[0].status).toBe('sent');
    await handleStripeEvent(event('checkout.session.async_payment_succeeded', session({ metadata: { payment_request_id: 'pr-1' } })), dbMock);
    expect(h.rows[0].status).toBe('paid');
  });

  it('falls back to the payment link id', async () => {
    h.rows = [{ id: 'pr-1', status: 'sent', stripe_payment_link_id: 'plink_1' }];
    const dbMock = (await import('@/lib/supabase/admin')).createAdminClient() as any;
    await handleStripeEvent(event('checkout.session.completed', session({ payment_link: 'plink_1' })), dbMock);
    expect(h.rows[0].status).toBe('paid');
  });
});
