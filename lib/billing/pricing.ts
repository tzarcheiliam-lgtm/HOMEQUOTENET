// The price an admin writes on a Growth Tools request, and how it becomes a
// Stripe Checkout Session. Pure (no Stripe or database calls) so it's testable.
import { z } from 'zod';

export const PRICE_INTERVALS = ['one_time', 'month'] as const;
export type PriceInterval = (typeof PRICE_INTERVALS)[number];

export const PAYMENT_STATUSES = [
  'none',
  'awaiting_payment',
  'processing',
  'paid',
  'active',
  'past_due',
  'canceled',
  'failed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: 'No price yet',
  awaiting_payment: 'Awaiting payment',
  processing: 'Payment processing',
  paid: 'Paid',
  active: 'Active subscription',
  past_due: 'Past due',
  canceled: 'Canceled',
  failed: 'Payment failed',
};

/** Statuses where the contractor can (still) pay from the portal. */
export const PAYABLE_STATUSES: PaymentStatus[] = ['awaiting_payment', 'failed'];
/** Once money is moving, the price is locked. */
export const PRICE_LOCKED_STATUSES: PaymentStatus[] = ['processing', 'paid', 'active', 'past_due'];

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === 'string' && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

const MIN_CENTS = 50; // Stripe's minimum charge in USD
const MAX_CENTS = 10_000_000; // $100,000; matches the database check

/** "$1,250.50", "1250.5", "1250" → 125050. Null when it isn't a plain dollar amount. */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface Quote {
  price_cents: number;
  price_interval: PriceInterval;
  setup_fee_cents: number | null;
  price_description: string | null;
}

/** "$499/mo + $500 setup", "$750 one-time". */
export function formatQuote(q: Pick<Quote, 'price_cents' | 'price_interval' | 'setup_fee_cents'>): string {
  const main = q.price_interval === 'month' ? `${formatCents(q.price_cents)}/mo` : `${formatCents(q.price_cents)} one-time`;
  return q.setup_fee_cents ? `${main} + ${formatCents(q.setup_fee_cents)} setup` : main;
}

const amount = (label: string) =>
  z
    .string()
    .transform((v, ctx) => {
      const cents = dollarsToCents(v);
      if (cents === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: enter a dollar amount like 499 or 1,250.00`,
        });
        return z.NEVER;
      }
      return cents;
    })
    .refine((c) => c >= MIN_CENTS && c <= MAX_CENTS, `${label} must be between $0.50 and $100,000`);

/** The admin's "Set price" form. */
export const setPriceSchema = z
  .object({
    id: z.string().uuid(),
    price: amount('Price'),
    interval: z.enum(PRICE_INTERVALS, {
      errorMap: () => ({ message: 'Choose one-time or monthly' }),
    }),
    setup_fee: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v : undefined))
      .pipe(amount('Setup fee').optional()),
    description: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null)
      .refine((v) => !v || v.length <= 500, 'Keep the description under 500 characters'),
  })
  .refine((v) => !v.setup_fee || v.interval === 'month', {
    message: 'A setup fee can only be added to a monthly price',
    path: ['setup_fee'],
  });

export function parseSetPrice(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  return setPriceSchema.safeParse({
    id: get('id'),
    price: get('price') ?? '',
    interval: get('interval'),
    setup_fee: get('setup_fee'),
    description: get('description'),
  });
}

/**
 * Checkout line items for a priced request. Amounts always come from the
 * database row, never from the browser.
 */
export function checkoutLineItems(q: Quote, serviceName: string, companyName: string) {
  const description = q.price_description ?? `${serviceName} for ${companyName}`;
  const items: {
    quantity: number;
    price_data: {
      currency: 'usd';
      unit_amount: number;
      product_data: { name: string; description?: string };
      recurring?: { interval: 'month' };
    };
  }[] = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: q.price_cents,
        product_data: { name: serviceName, description },
        ...(q.price_interval === 'month' ? { recurring: { interval: 'month' as const } } : {}),
      },
    },
  ];
  if (q.price_interval === 'month' && q.setup_fee_cents) {
    items.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: q.setup_fee_cents,
        product_data: { name: `${serviceName} setup (one-time)` },
      },
    });
  }
  return items;
}

/** A Stripe subscription status, as this request's payment status. */
export function paymentStatusForSubscription(status: string): PaymentStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
      return 'processing';
    default:
      // canceled, incomplete_expired, paused
      return 'canceled';
  }
}
