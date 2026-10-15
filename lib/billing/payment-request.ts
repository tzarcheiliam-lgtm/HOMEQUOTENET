// An admin's "send a payment" request: validation and the email. Pure (no Stripe or database calls).
import { z } from 'zod';
import { dollarsToCents, formatCents, PRICE_INTERVALS } from '@/lib/billing/pricing';
import { buildBrandedEmailHtml, buildBrandedEmailText, emailLogoUrl } from '@/lib/emails/template';

const MIN_CENTS = 50;
const MAX_CENTS = 10_000_000;

const amount = (label: string) =>
  z
    .string()
    .transform((v, ctx) => {
      const cents = dollarsToCents(v);
      if (cents === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: enter a dollar amount like 499 or 1,250.00` });
        return z.NEVER;
      }
      return cents;
    })
    .refine((c) => c >= MIN_CENTS && c <= MAX_CENTS, `${label} must be between $0.50 and $100,000`);

const blank = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

export const sendPaymentSchema = z
  .object({
    amount: amount('Amount'),
    interval: z.enum(PRICE_INTERVALS, { errorMap: () => ({ message: 'Choose one-time or monthly' }) }),
    setup_fee: z
      .string()
      .optional()
      .transform(blank)
      .pipe(amount('Setup fee').optional()),
    description: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length >= 1, 'Add a short description of what this payment is for')
      .refine((v) => v.length <= 200, 'Keep the description under 200 characters'),
    customer_name: z
      .string()
      .optional()
      .transform(blank)
      .refine((v) => !v || v.length <= 120, 'Keep the name under 120 characters'),
    customer_email: z
      .string()
      .optional()
      .transform(blank)
      .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email address'),
    contractor_id: z
      .string()
      .optional()
      .transform(blank)
      .refine((v) => !v || z.string().uuid().safeParse(v).success, 'Pick a company from the list'),
    notify: z.boolean(),
  })
  .refine((v) => !v.setup_fee || v.interval === 'month', {
    message: 'A setup fee can only be added to a monthly payment',
    path: ['setup_fee'],
  });

export type SendPaymentInput = z.infer<typeof sendPaymentSchema>;

export function parseSendPayment(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  return sendPaymentSchema.safeParse({
    amount: get('amount') ?? '',
    interval: get('interval'),
    setup_fee: get('setup_fee'),
    description: get('description') ?? '',
    customer_name: get('customer_name'),
    customer_email: get('customer_email'),
    contractor_id: get('contractor_id'),
    notify: formData.get('notify') === 'on',
  });
}

/** "$2,500/mo + $750 setup", "$750 one-time". */
export function describeAmount(p: { amount: number; interval: 'one_time' | 'month'; setup_fee?: number | null }): string {
  const main = p.interval === 'month' ? `${formatCents(p.amount)}/mo` : `${formatCents(p.amount)} one-time`;
  return p.setup_fee ? `${main} + ${formatCents(p.setup_fee)} setup` : main;
}

/** The email that carries the payment link. */
export function buildPaymentRequestEmail(
  input: { firstName: string | null; description: string; amountText: string },
  url: string,
  siteUrl: string
) {
  const paragraphs = [
    input.firstName ? `Hi ${input.firstName},` : 'Hi,',
    `HomeQuote Network is requesting a payment for: ${input.description}`,
    `Amount: ${input.amountText}`,
    'Use the button below to pay securely by card or bank transfer through Stripe. If you have any questions, just reply to this email.',
  ];
  return {
    subject: `Payment request from HomeQuote Network: ${input.description}`.slice(0, 150),
    html: buildBrandedEmailHtml(paragraphs, {
      logoUrl: emailLogoUrl(siteUrl),
      ctaText: 'Pay now',
      ctaUrl: url,
      footerNote: 'Secure payment powered by Stripe',
    }),
    text: `${buildBrandedEmailText(paragraphs, { footerNote: 'homequotenet.com' })}\n\nPay now: ${url}`,
  };
}
