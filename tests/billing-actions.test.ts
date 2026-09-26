import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Billing server actions with Stripe and the database faked. Checks that
 * amounts come only from the saved request, only admins set prices, only the
 * company's own contractors can pay, and a paid price can't be changed.
 */
const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const state = vi.hoisted(() => ({
  profile: null as null | Record<string, unknown>,
  row: null as null | Record<string, unknown>,
  company: { id: '', name: 'Pool Masters Inc', email: 'office@pm.test', stripe_customer_id: null as string | null },
  updates: [] as Record<string, unknown>[],
  adminUpdates: [] as Record<string, unknown>[],
  sessions: [] as Record<string, unknown>[],
  existingSession: null as null | { status: string; url: string | null },
  expired: [] as string[],
  emails: [] as { toEmail: string; subject: string }[],
  filters: [] as [string, unknown][],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    const p = state.profile;
    if (!p || !roles.includes(p.role as string)) throw new Error('NEXT_REDIRECT /app');
    return p;
  }),
}));
vi.mock('@/lib/emails/gmail', () => ({
  sendGmailMessage: vi.fn(async (m: { toEmail: string; subject: string }) => {
    state.emails.push(m);
    return { id: 'm1', fromEmail: 'team@homequote.test' };
  }),
}));
vi.mock('@/lib/billing/stripe', () => ({
  siteUrl: (p: string) => `https://homequote.test${p}`,
  stripe: () => ({
    customers: { create: vi.fn(async () => ({ id: 'cus_new' })) },
    checkout: {
      sessions: {
        create: vi.fn(async (params: Record<string, unknown>) => {
          state.sessions.push(params);
          return { id: 'cs_new', url: 'https://checkout.stripe.test/cs_new' };
        }),
        retrieve: vi.fn(async () => state.existingSession ?? { status: 'expired', url: null }),
        expire: vi.fn(async (id: string) => state.expired.push(id)),
      },
    },
    billingPortal: { sessions: { create: vi.fn(async () => ({ url: 'https://billing.stripe.test/p' })) } },
  }),
}));
// The user-session client: RLS is real in the DB tests; here it returns the one row.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq(col: string, val: unknown) {
            state.filters.push([col, val]);
            return chain;
          },
          maybeSingle: async () => {
            if (table === 'contractors') return { data: state.company, error: null };
            const row = state.row;
            const visible = row && state.filters.every(([k, v]) => k !== 'contractor_id' || row.contractor_id === v);
            return { data: visible ? row : null, error: null };
          },
        };
        return chain;
      },
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          state.updates.push(values);
          return { error: null };
        },
      }),
    }),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: state.company, error: null }) }) }),
      update: (values: Record<string, unknown>) => {
        const chain = {
          eq: () => chain,
          is: () => chain,
          then(resolve: (v: { error: null }) => void) {
            state.adminUpdates.push(values);
            if ('stripe_customer_id' in values) state.company.stripe_customer_id = values.stripe_customer_id as string;
            resolve({ error: null });
          },
        };
        return chain;
      },
    }),
  }),
}));

import { openBillingPortal, setServiceRequestPrice, startServiceCheckout } from '@/lib/actions/billing';

const admin = { id: 'admin-1', role: 'admin', contractor_id: null, email: 'liam@hq.test', is_active: true };
const contractor = { id: 'user-1', role: 'contractor', contractor_id: COMPANY, email: 'ethan@pm.test' };
const fd = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const pricedRow = (extra: Record<string, unknown> = {}) => ({
  id: REQUEST_ID,
  contractor_id: COMPANY,
  service: 'ai_receptionist',
  price_cents: 49900,
  price_interval: 'month',
  setup_fee_cents: 50000,
  price_description: null,
  payment_status: 'awaiting_payment',
  stripe_checkout_session_id: null,
  contractor: { name: 'Pool Masters Inc' },
  requester: { full_name: 'Ethan Rivers', email: 'ethan@pm.test' },
  ...extra,
});

beforeEach(() => {
  Object.assign(state, {
    profile: null,
    row: null,
    updates: [],
    adminUpdates: [],
    sessions: [],
    existingSession: null,
    expired: [],
    emails: [],
    filters: [],
  });
  state.company = { id: COMPANY, name: 'Pool Masters Inc', email: 'office@pm.test', stripe_customer_id: null };
});

describe('setServiceRequestPrice (admin)', () => {
  it('is admin-only', async () => {
    state.profile = contractor;
    await expect(setServiceRequestPrice(undefined, fd({ id: REQUEST_ID, price: '1', interval: 'one_time' }))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(state.updates).toEqual([]);
  });

  it('saves the price, marks it awaiting payment and emails the requester', async () => {
    state.profile = admin;
    state.row = pricedRow({ price_cents: null, price_interval: null, setup_fee_cents: null, payment_status: 'none', stripe_checkout_session_id: 'cs_old' });
    state.existingSession = { status: 'open', url: 'x' };
    const res = await setServiceRequestPrice(undefined, fd({ id: REQUEST_ID, price: '499', interval: 'month', setup_fee: '500', notify: 'on' }));
    expect(res).toEqual({ ok: true, message: 'Price set: $499/mo + $500 setup. Emailed ethan@pm.test.' });
    expect(state.updates[0]).toMatchObject({
      price_cents: 49900,
      price_interval: 'month',
      setup_fee_cents: 50000,
      payment_status: 'awaiting_payment',
      priced_by: 'admin-1',
      stripe_checkout_session_id: null,
    });
    expect(state.expired).toEqual(['cs_old']); // the old price can't be paid any more
    expect(state.emails).toEqual([expect.objectContaining({ toEmail: 'ethan@pm.test', subject: 'Your HomeQuote price for AI Receptionist' })]);
  });

  it('does not email unless asked', async () => {
    state.profile = admin;
    state.row = pricedRow({ payment_status: 'none' });
    const res = await setServiceRequestPrice(undefined, fd({ id: REQUEST_ID, price: '750', interval: 'one_time' }));
    expect(res?.ok).toBe(true);
    expect(state.emails).toEqual([]);
  });

  it('locks the price once money is moving', async () => {
    state.profile = admin;
    for (const payment_status of ['processing', 'paid', 'active', 'past_due']) {
      state.row = pricedRow({ payment_status });
      const res = await setServiceRequestPrice(undefined, fd({ id: REQUEST_ID, price: '1', interval: 'one_time' }));
      expect(res).toEqual({ ok: false, error: expect.stringMatching(/locked/) });
    }
    expect(state.updates).toEqual([]);
  });
});

describe('startServiceCheckout (contractor)', () => {
  it('charges the saved amount, ignoring anything sent from the browser', async () => {
    state.profile = contractor;
    state.row = pricedRow();
    await expect(
      startServiceCheckout(undefined, fd({ id: REQUEST_ID, price_cents: '1', unit_amount: '1', contractor_id: 'someone-else' }))
    ).rejects.toThrow('NEXT_REDIRECT https://checkout.stripe.test/cs_new');
    const s = state.sessions[0] as {
      mode: string;
      customer: string;
      line_items: { price_data: { unit_amount: number; recurring?: unknown } }[];
      metadata: Record<string, string>;
      subscription_data: { billing_mode: { type: string } };
    };
    expect(s.mode).toBe('subscription');
    expect(s.customer).toBe('cus_new');
    expect(s.line_items.map((i) => i.price_data.unit_amount)).toEqual([49900, 50000]);
    expect(s.metadata).toEqual({ service_request_id: REQUEST_ID, contractor_id: COMPANY, service: 'ai_receptionist' });
    expect(s.subscription_data.billing_mode).toEqual({ type: 'flexible' });
    expect((s as unknown as { managed_payments: unknown }).managed_payments).toEqual({ enabled: false });
    expect(state.company.stripe_customer_id).toBe('cus_new');
    expect(state.adminUpdates).toContainEqual({ stripe_checkout_session_id: 'cs_new' });
  });

  it('uses payment mode with a receipt invoice for one-time prices', async () => {
    state.profile = contractor;
    state.company.stripe_customer_id = 'cus_existing';
    state.row = pricedRow({ price_interval: 'one_time', setup_fee_cents: null, price_cents: 75000 });
    await expect(startServiceCheckout(undefined, fd({ id: REQUEST_ID }))).rejects.toThrow(/NEXT_REDIRECT/);
    const s = state.sessions[0] as { mode: string; customer: string; invoice_creation: { enabled: boolean } };
    expect(s).toMatchObject({ mode: 'payment', customer: 'cus_existing', invoice_creation: { enabled: true } });
  });

  it('only lets a company pay its own requests', async () => {
    state.profile = { ...contractor, contractor_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };
    state.row = pricedRow();
    expect(await startServiceCheckout(undefined, fd({ id: REQUEST_ID }))).toEqual({ ok: false, error: expect.stringMatching(/price yet/) });
    expect(state.sessions).toEqual([]);
  });

  it('is contractor-only', async () => {
    state.profile = admin;
    state.row = pricedRow();
    await expect(startServiceCheckout(undefined, fd({ id: REQUEST_ID }))).rejects.toThrow('NEXT_REDIRECT /app');
  });

  it('refuses unpriced or already-paid requests', async () => {
    state.profile = contractor;
    state.row = pricedRow({ price_cents: null, price_interval: null });
    expect((await startServiceCheckout(undefined, fd({ id: REQUEST_ID })))?.ok).toBe(false);
    for (const payment_status of ['processing', 'paid', 'active', 'past_due', 'canceled']) {
      state.row = pricedRow({ payment_status });
      expect((await startServiceCheckout(undefined, fd({ id: REQUEST_ID })))?.ok).toBe(false);
    }
    expect(state.sessions).toEqual([]);
  });

  it('never opens a second checkout after one completed, and reuses an open one', async () => {
    state.profile = contractor;
    state.row = pricedRow({ stripe_checkout_session_id: 'cs_done' });
    state.existingSession = { status: 'complete', url: null };
    expect(await startServiceCheckout(undefined, fd({ id: REQUEST_ID }))).toEqual({ ok: false, error: expect.stringMatching(/went through/) });
    state.existingSession = { status: 'open', url: 'https://checkout.stripe.test/cs_open' };
    await expect(startServiceCheckout(undefined, fd({ id: REQUEST_ID }))).rejects.toThrow('NEXT_REDIRECT https://checkout.stripe.test/cs_open');
    expect(state.sessions).toEqual([]);
  });
});

describe('openBillingPortal (contractor)', () => {
  it('needs a Stripe customer first', async () => {
    state.profile = contractor;
    expect(await openBillingPortal()).toEqual({ ok: false, error: expect.stringMatching(/no billing/) });
    state.company.stripe_customer_id = 'cus_1';
    await expect(openBillingPortal()).rejects.toThrow('NEXT_REDIRECT https://billing.stripe.test/p');
  });
});
