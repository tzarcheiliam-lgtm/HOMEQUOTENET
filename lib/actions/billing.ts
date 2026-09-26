'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { getService } from '@/lib/growth/catalog';
import { statusUpdateSchema } from '@/lib/validation/service-request';
import { buildPriceReadyEmail } from '@/lib/billing/price-email';
import {
  PAYABLE_STATUSES,
  PRICE_LOCKED_STATUSES,
  checkoutLineItems,
  formatQuote,
  parseSetPrice,
  type PaymentStatus,
  type Quote,
} from '@/lib/billing/pricing';
import { siteUrl, stripe } from '@/lib/billing/stripe';

export type BillingActionState = { ok: true; message: string } | { ok: false; error: string } | undefined;

const PORTAL_PATH = '/app/growth#your-requests';

function revalidateBilling() {
  revalidatePath('/app/growth');
  revalidatePath('/app/service-requests');
  revalidatePath('/app');
}

/** Expire an unfinished Checkout Session so an old price can't be paid. Best effort. */
async function expireSession(sessionId: string | null) {
  if (!sessionId) return;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.status === 'open') await stripe().checkout.sessions.expire(sessionId);
  } catch (error) {
    console.error('[billing] Could not expire checkout session', sessionId, error instanceof Error ? error.message : error);
  }
}

/**
 * Admin: write the price on a request. The contractor then sees "Review & pay"
 * in their portal and, if chosen, gets an email. Nothing is charged here.
 */
export async function setServiceRequestPrice(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const profile = await requireRole(['admin']);
  const parsed = parseSetPrice(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const { id, price, interval, setup_fee, description } = parsed.data;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('service_requests')
    .select(
      'id, service, payment_status, stripe_checkout_session_id, requester:profiles!service_requests_requested_by_fkey(full_name, email)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return { ok: false, error: 'That request could not be found.' };
  if (PRICE_LOCKED_STATUSES.includes(row.payment_status as PaymentStatus)) {
    return {
      ok: false,
      error: 'This request is already paid or in progress, so its price is locked.',
    };
  }

  const quote: Quote = {
    price_cents: price,
    price_interval: interval,
    setup_fee_cents: setup_fee ?? null,
    price_description: description,
  };
  // A new price replaces any unfinished checkout for the old one.
  await expireSession(row.stripe_checkout_session_id);
  const { error: updateError } = await supabase
    .from('service_requests')
    .update({
      ...quote,
      payment_status: 'awaiting_payment',
      priced_at: new Date().toISOString(),
      priced_by: profile.id,
      stripe_checkout_session_id: null,
    })
    .eq('id', id);
  if (updateError) return { ok: false, error: 'The price couldn’t be saved. Try again.' };
  revalidateBilling();

  const priceText = formatQuote(quote);
  if (formData.get('notify') !== 'on')
    return {
      ok: true,
      message: `Price set: ${priceText}. The contractor can pay from their portal.`,
    };

  const requester = (Array.isArray(row.requester) ? row.requester[0] : row.requester) as {
    full_name: string | null;
    email: string | null;
  } | null;
  if (!requester?.email)
    return {
      ok: true,
      message: `Price set: ${priceText}. No email on file for the requester, so no email was sent.`,
    };
  try {
    const built = buildPriceReadyEmail(
      {
        firstName: requester.full_name?.split(' ')[0] ?? null,
        serviceName: getService(row.service)?.name ?? row.service,
        quote,
      },
      siteUrl(PORTAL_PATH),
    );
    await sendGmailMessage({
      toEmail: requester.email,
      subject: built.subject,
      message: built.text,
      html: built.html,
      text: built.text,
    });
    return {
      ok: true,
      message: `Price set: ${priceText}. Emailed ${requester.email}.`,
    };
  } catch (sendError) {
    console.error('[billing] Price email failed', sendError instanceof Error ? sendError.message : sendError);
    return {
      ok: true,
      message: `Price set: ${priceText}. The email didn’t send, but the contractor can still pay from their portal.`,
    };
  }
}

/** Admin: take a price back off a request that hasn't been paid. */
export async function clearServiceRequestPrice(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = statusUpdateSchema.shape.id.safeParse(formData.get('id'));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('service_requests')
    .select('payment_status, stripe_checkout_session_id')
    .eq('id', id.data)
    .maybeSingle();
  if (!row || PRICE_LOCKED_STATUSES.includes(row.payment_status as PaymentStatus)) return;
  await expireSession(row.stripe_checkout_session_id);
  const { error } = await supabase
    .from('service_requests')
    .update({
      price_cents: null,
      price_interval: null,
      setup_fee_cents: null,
      price_description: null,
      priced_at: null,
      priced_by: null,
      payment_status: 'none',
      stripe_checkout_session_id: null,
    })
    .eq('id', id.data);
  if (error) throw new Error('The price couldn’t be removed. Try again.');
  revalidateBilling();
}

/** The company's Stripe customer, created on first payment. Service role: contractors can't write contractors. */
async function ensureStripeCustomer(contractorId: string, fallbackEmail: string | null): Promise<string> {
  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from('contractors')
    .select('id, name, email, stripe_customer_id')
    .eq('id', contractorId)
    .single();
  if (error || !company) throw new Error('Company not found');
  if (company.stripe_customer_id) return company.stripe_customer_id;

  const customer = await stripe().customers.create(
    {
      name: company.name,
      email: company.email ?? fallbackEmail ?? undefined,
      metadata: { contractor_id: company.id },
    },
    { idempotencyKey: `hqn-contractor-customer-${company.id}` },
  );
  // Only the first writer wins, so two tabs can't leave two customers attached.
  await admin.from('contractors').update({ stripe_customer_id: customer.id }).eq('id', company.id).is('stripe_customer_id', null);
  const { data: saved } = await admin.from('contractors').select('stripe_customer_id').eq('id', company.id).single();
  return saved?.stripe_customer_id ?? customer.id;
}

/**
 * Contractor: pay a priced request on Stripe Checkout. The amount always comes
 * from the saved request, never from the browser.
 */
export async function startServiceCheckout(_prev: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const profile = await requireRole(['contractor']);
  if (!profile.contractor_id) return { ok: false, error: 'Your login isn’t linked to a company yet.' };
  const id = statusUpdateSchema.shape.id.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'That request could not be found.' };

  // RLS: a contractor can only read their own company's requests.
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('service_requests')
    .select(
      'id, contractor_id, service, price_cents, price_interval, setup_fee_cents, price_description, payment_status, stripe_checkout_session_id, contractor:contractors(name)',
    )
    .eq('id', id.data)
    .eq('contractor_id', profile.contractor_id)
    .maybeSingle();
  if (!row || row.price_cents === null || !row.price_interval)
    return { ok: false, error: 'This request doesn’t have a price yet.' };
  if (!PAYABLE_STATUSES.includes(row.payment_status as PaymentStatus))
    return {
      ok: false,
      error: 'This request is already paid or being processed.',
    };

  const serviceName = getService(row.service)?.name ?? 'HomeQuote service';
  const company = (Array.isArray(row.contractor) ? row.contractor[0] : row.contractor) as { name: string } | null;
  const quote = row as unknown as Quote;
  const metadata = {
    service_request_id: row.id,
    contractor_id: row.contractor_id,
    service: row.service,
  };

  let url: string | null = null;
  let redirectTo: string | null = null;
  try {
    // Reuse an open checkout, and never start a second one after a completed
    // payment the webhook hasn't recorded yet (that would charge twice).
    if (row.stripe_checkout_session_id) {
      const existing = await stripe().checkout.sessions.retrieve(row.stripe_checkout_session_id);
      if (existing.status === 'complete')
        return {
          ok: false,
          error: 'Your payment went through and is being confirmed. Refresh in a minute.',
        };
      if (existing.status === 'open' && existing.url) redirectTo = existing.url;
    }
    if (redirectTo) url = redirectTo;
    else {
      const customer = await ensureStripeCustomer(row.contractor_id, profile.email);
      const session = await stripe().checkout.sessions.create({
        mode: quote.price_interval === 'month' ? 'subscription' : 'payment',
        customer,
        client_reference_id: row.id,
        line_items: checkoutLineItems(quote, serviceName, company?.name ?? 'your company'),
        metadata,
        success_url: siteUrl('/app/growth?checkout=success#your-requests'),
        cancel_url: siteUrl('/app/growth?checkout=canceled#your-requests'),
        ...(quote.price_interval === 'month'
          ? {
              subscription_data: {
                metadata,
                billing_mode: { type: 'flexible' as const },
              },
            }
          : {
              payment_intent_data: { metadata },
              invoice_creation: { enabled: true, invoice_data: { metadata } },
            }),
      });
      url = session.url;
      await createAdminClient().from('service_requests').update({ stripe_checkout_session_id: session.id }).eq('id', row.id);
    }
  } catch (error) {
    console.error('[billing] Checkout could not start', error instanceof Error ? error.message : error);
    return {
      ok: false,
      error: 'Checkout couldn’t start. Please try again, or contact HomeQuote.',
    };
  }
  if (!url) return { ok: false, error: 'Checkout couldn’t start. Please try again.' };
  redirect(url);
}

/** Contractor: Stripe's billing portal (cards, invoices, cancel a monthly service). */
export async function openBillingPortal(): Promise<BillingActionState> {
  const profile = await requireRole(['contractor']);
  if (!profile.contractor_id) return { ok: false, error: 'Your login isn’t linked to a company yet.' };
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('contractors')
    .select('stripe_customer_id')
    .eq('id', profile.contractor_id)
    .maybeSingle();
  if (!company?.stripe_customer_id)
    return {
      ok: false,
      error: 'There’s no billing set up for your company yet.',
    };
  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: siteUrl(PORTAL_PATH),
    });
    url = session.url;
  } catch (error) {
    console.error('[billing] Billing portal could not open', error instanceof Error ? error.message : error);
    return {
      ok: false,
      error: 'Billing couldn’t open. Please try again, or contact HomeQuote.',
    };
  }
  redirect(url);
}
