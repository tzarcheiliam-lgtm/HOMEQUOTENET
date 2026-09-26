import Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  checkoutLineItems,
  dollarsToCents,
  formatQuote,
  parseSetPrice,
  paymentStatusForSubscription,
  type Quote,
} from '@/lib/billing/pricing';
import { buildPriceReadyEmail } from '@/lib/billing/price-email';
import { claimStripeEvent, handleStripeEvent } from '@/lib/billing/webhook';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe('admin price entry', () => {
  it('reads plain dollar amounts', () => {
    expect(dollarsToCents('499')).toBe(49900);
    expect(dollarsToCents('$1,250.5')).toBe(125050);
    expect(dollarsToCents(' 99.99 ')).toBe(9999);
    for (const bad of ['', 'abc', '-5', '1.234', '1e3', '$', '12..5']) expect(dollarsToCents(bad)).toBeNull();
  });

  it('accepts a monthly price with a setup fee', () => {
    const r = parseSetPrice(form({ id: REQUEST_ID, price: '499', interval: 'month', setup_fee: '500', description: '  Weekday + weekend coverage ' }));
    expect(r.success && r.data).toEqual({
      id: REQUEST_ID,
      price: 49900,
      interval: 'month',
      setup_fee: 50000,
      description: 'Weekday + weekend coverage',
    });
  });

  it('treats a blank setup fee and description as none', () => {
    const r = parseSetPrice(form({ id: REQUEST_ID, price: '750', interval: 'one_time', setup_fee: ' ', description: '' }));
    expect(r.success && r.data).toMatchObject({ price: 75000, interval: 'one_time', setup_fee: undefined, description: null });
  });

  it('rejects bad prices, bad intervals and a setup fee on a one-time price', () => {
    expect(parseSetPrice(form({ id: REQUEST_ID, price: 'lots', interval: 'month' })).success).toBe(false);
    expect(parseSetPrice(form({ id: REQUEST_ID, price: '0.10', interval: 'month' })).success).toBe(false);
    expect(parseSetPrice(form({ id: REQUEST_ID, price: '200000', interval: 'month' })).success).toBe(false);
    expect(parseSetPrice(form({ id: REQUEST_ID, price: '100', interval: 'year' })).success).toBe(false);
    expect(parseSetPrice(form({ id: 'nope', price: '100', interval: 'month' })).success).toBe(false);
    const setup = parseSetPrice(form({ id: REQUEST_ID, price: '750', interval: 'one_time', setup_fee: '100' }));
    expect(setup.success).toBe(false);
    if (!setup.success) expect(setup.error.errors[0].message).toMatch(/setup fee/i);
  });

  it('formats quotes for people', () => {
    expect(formatQuote({ price_cents: 49900, price_interval: 'month', setup_fee_cents: 50000 })).toBe('$499/mo + $500 setup');
    expect(formatQuote({ price_cents: 125050, price_interval: 'one_time', setup_fee_cents: null })).toBe('$1,250.50 one-time');
  });
});

describe('checkout line items', () => {
  const monthly: Quote = { price_cents: 49900, price_interval: 'month', setup_fee_cents: 50000, price_description: null };

  it('bills a monthly price as a recurring item plus a one-time setup item', () => {
    expect(checkoutLineItems(monthly, 'AI Receptionist', 'Pool Masters Inc')).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 49900,
          product_data: { name: 'AI Receptionist', description: 'AI Receptionist for Pool Masters Inc' },
          recurring: { interval: 'month' },
        },
      },
      { quantity: 1, price_data: { currency: 'usd', unit_amount: 50000, product_data: { name: 'AI Receptionist setup (one-time)' } } },
    ]);
  });

  it('bills a one-time price as a single non-recurring item with the admin description', () => {
    const items = checkoutLineItems(
      { price_cents: 75000, price_interval: 'one_time', setup_fee_cents: null, price_description: '5-page site' },
      'Website & Landing Page',
      'Pool Masters Inc'
    );
    expect(items).toHaveLength(1);
    expect(items[0].price_data).toEqual({
      currency: 'usd',
      unit_amount: 75000,
      product_data: { name: 'Website & Landing Page', description: '5-page site' },
    });
  });
});

describe('subscription status mapping', () => {
  it('maps Stripe subscription states onto the request', () => {
    expect(paymentStatusForSubscription('active')).toBe('active');
    expect(paymentStatusForSubscription('trialing')).toBe('active');
    expect(paymentStatusForSubscription('past_due')).toBe('past_due');
    expect(paymentStatusForSubscription('unpaid')).toBe('past_due');
    expect(paymentStatusForSubscription('incomplete')).toBe('processing');
    expect(paymentStatusForSubscription('canceled')).toBe('canceled');
    expect(paymentStatusForSubscription('incomplete_expired')).toBe('canceled');
  });
});

describe('price-ready email', () => {
  it('names the price, links to the portal and escapes input', () => {
    const e = buildPriceReadyEmail(
      {
        firstName: 'Ethan',
        serviceName: 'AI Receptionist',
        quote: { price_cents: 49900, price_interval: 'month', setup_fee_cents: 50000, price_description: '<b>24/7</b> answering' },
      },
      'https://homequotenet.com/app/growth#your-requests'
    );
    expect(e.subject).toBe('Your HomeQuote price for AI Receptionist');
    expect(e.text).toContain('$499/mo + $500 setup');
    expect(e.text).toContain('https://homequotenet.com/app/growth#your-requests');
    expect(e.text).toMatch(/renew each month until you cancel/);
    expect(e.html).toContain('&lt;b&gt;24/7&lt;/b&gt;');
    expect(e.html).not.toContain('<b>24/7</b>');
  });
});

// ---- webhook ------------------------------------------------------------------

type Row = Record<string, unknown>;
function fakeDb(rows: Row[]) {
  const events = new Set<string>();
  const db = {
    from: (table: string) => {
      if (table === 'stripe_events') {
        return {
          insert: async (v: { id: string }) => {
            if (events.has(v.id)) return { error: { code: '23505', message: 'duplicate' } };
            events.add(v.id);
            return { error: null };
          },
        };
      }
      return {
        select: () => {
          const filters: [string, unknown][] = [];
          const chain = {
            eq(col: string, val: unknown) {
              filters.push([col, val]);
              return chain;
            },
            maybeSingle: async () => {
              const row = rows.find((r) => filters.every(([k, v]) => r[k] === v));
              return { data: row ? { ...row } : null, error: null };
            },
          };
          return chain;
        },
        update: (values: Row) => {
          const filters: [string, unknown][] = [];
          const chain = {
            eq(col: string, val: unknown) {
              filters.push([col, val]);
              return chain;
            },
            then(resolve: (v: { error: null }) => void) {
              for (const r of rows) if (filters.every(([k, v]) => r[k] === v)) Object.assign(r, values);
              resolve({ error: null });
            },
          };
          return chain;
        },
      };
    },
  };
  return db as never;
}

const request = (extra: Row = {}): Row => ({
  id: REQUEST_ID,
  status: 'contacted',
  payment_status: 'awaiting_payment',
  paid_at: null,
  stripe_checkout_session_id: 'cs_1',
  stripe_subscription_id: null,
  ...extra,
});
const event = (type: string, object: Row, id = `evt_${Math.random()}`) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
const NOW = new Date('2026-09-25T18:00:00Z');

describe('stripe webhook handling', () => {
  it('marks a one-time card payment paid and starts the work', async () => {
    const row = request();
    await handleStripeEvent(
      event('checkout.session.completed', { id: 'cs_1', mode: 'payment', payment_status: 'paid', metadata: { service_request_id: REQUEST_ID } }),
      fakeDb([row]),
      NOW
    );
    expect(row).toMatchObject({ payment_status: 'paid', paid_at: NOW.toISOString(), status: 'in_progress' });
  });

  it('activates a subscription and stores its id', async () => {
    const row = request({ status: 'new' });
    await handleStripeEvent(
      event('checkout.session.completed', {
        id: 'cs_1',
        mode: 'subscription',
        payment_status: 'paid',
        subscription: 'sub_9',
        metadata: { service_request_id: REQUEST_ID },
      }),
      fakeDb([row]),
      NOW
    );
    expect(row).toMatchObject({ payment_status: 'active', stripe_subscription_id: 'sub_9', status: 'in_progress' });
  });

  it('holds a bank payment as processing until it clears, then marks it paid or failed', async () => {
    const row = request();
    const db = fakeDb([row]);
    const session = { id: 'cs_1', mode: 'payment', payment_status: 'unpaid', metadata: { service_request_id: REQUEST_ID } };
    await handleStripeEvent(event('checkout.session.completed', session), db, NOW);
    expect(row).toMatchObject({ payment_status: 'processing', paid_at: null, status: 'contacted' });
    await handleStripeEvent(event('checkout.session.async_payment_succeeded', { ...session, payment_status: 'paid' }), db, NOW);
    expect(row).toMatchObject({ payment_status: 'paid', paid_at: NOW.toISOString() });

    const other = request();
    await handleStripeEvent(event('checkout.session.async_payment_failed', session), fakeDb([other]), NOW);
    expect(other).toMatchObject({ payment_status: 'failed', paid_at: null });
  });

  it('never lets a late "processing" event undo a confirmed payment', async () => {
    const row = request({ payment_status: 'active', paid_at: '2026-09-25T17:00:00Z', stripe_subscription_id: 'sub_9' });
    await handleStripeEvent(
      event('customer.subscription.created', { id: 'sub_9', status: 'incomplete', metadata: { service_request_id: REQUEST_ID } }),
      fakeDb([row]),
      NOW
    );
    expect(row.payment_status).toBe('active');
    expect(row.paid_at).toBe('2026-09-25T17:00:00Z');
  });

  it('follows the subscription through past due and cancellation, found by id when metadata is missing', async () => {
    const row = request({ payment_status: 'active', stripe_subscription_id: 'sub_9' });
    const db = fakeDb([row]);
    await handleStripeEvent(event('customer.subscription.updated', { id: 'sub_9', status: 'past_due', metadata: {} }), db, NOW);
    expect(row.payment_status).toBe('past_due');
    await handleStripeEvent(event('customer.subscription.deleted', { id: 'sub_9', status: 'canceled', metadata: {} }), db, NOW);
    expect(row.payment_status).toBe('canceled');
  });

  it('forgets an expired checkout only if it is still the current one', async () => {
    const row = request({ stripe_checkout_session_id: 'cs_new' });
    const db = fakeDb([row]);
    await handleStripeEvent(event('checkout.session.expired', { id: 'cs_old', metadata: { service_request_id: REQUEST_ID } }), db, NOW);
    expect(row.stripe_checkout_session_id).toBe('cs_new');
    await handleStripeEvent(event('checkout.session.expired', { id: 'cs_new', metadata: { service_request_id: REQUEST_ID } }), db, NOW);
    expect(row.stripe_checkout_session_id).toBeNull();
  });

  it('ignores checkouts that are not for a service request', async () => {
    const row = request();
    await handleStripeEvent(event('checkout.session.completed', { id: 'cs_x', mode: 'payment', payment_status: 'paid', metadata: {} }), fakeDb([row]), NOW);
    expect(row.payment_status).toBe('awaiting_payment');
  });

  it('processes each event id once', async () => {
    const db = fakeDb([]);
    expect(await claimStripeEvent(db, { id: 'evt_1', type: 'checkout.session.completed' })).toBe(true);
    expect(await claimStripeEvent(db, { id: 'evt_1', type: 'checkout.session.completed' })).toBe(false);
  });

  it('only trusts payloads signed with the webhook secret', () => {
    const client = new Stripe('sk_test_unused');
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'checkout.session.completed', data: { object: {} } });
    const header = client.webhooks.generateTestHeaderString({ payload, secret });
    expect(client.webhooks.constructEvent(payload, header, secret).id).toBe('evt_sig');
    expect(() => client.webhooks.constructEvent(payload, header, 'whsec_wrong')).toThrow();
    expect(() => client.webhooks.constructEvent(payload.replace('evt_sig', 'evt_forged'), header, secret)).toThrow();
  });
});
