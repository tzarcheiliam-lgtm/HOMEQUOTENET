import 'server-only';
import type Stripe from 'stripe';
import type { createAdminClient } from '@/lib/supabase/admin';
import { paymentStatusForSubscription, type PaymentStatus } from '@/lib/billing/pricing';

type Db = ReturnType<typeof createAdminClient>;

/** Stripe events this app acts on. Subscribe the webhook endpoint to exactly these. */
export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

type Update = {
  payment_status?: PaymentStatus;
  stripe_subscription_id?: string;
  stripe_checkout_session_id?: string | null;
  paid_at?: string;
  status?: 'in_progress';
};

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : (v?.id ?? null));

/** Paid money moves an untouched request into In Progress so the team starts work. */
async function applyUpdate(db: Db, requestId: string, update: Update, now: Date) {
  const { data: row, error } = await db.from('service_requests').select('id, status, payment_status, paid_at').eq('id', requestId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) {
    console.warn('[stripe-webhook] No service request for', requestId);
    return;
  }
  const paid = update.payment_status === 'paid' || update.payment_status === 'active';
  const patch: Update = { ...update };
  // Events can arrive out of order: a late "still clearing" never undoes a confirmed payment.
  if (update.payment_status === 'processing' && (row.payment_status === 'paid' || row.payment_status === 'active')) {
    delete patch.payment_status;
  }
  if (paid && !row.paid_at) patch.paid_at = now.toISOString();
  if (paid && (row.status === 'new' || row.status === 'contacted')) patch.status = 'in_progress';
  const { error: updateError } = await db.from('service_requests').update(patch).eq('id', requestId);
  if (updateError) throw new Error(updateError.message);
}

/** Record one verified Stripe event on its service request. Throws to make Stripe retry. */
export async function handleStripeEvent(event: Stripe.Event, db: Db, now = new Date()): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object;
      const requestId = session.metadata?.service_request_id ?? session.client_reference_id;
      if (!requestId) return; // Not one of ours (e.g. a Payment Link made in the Dashboard).
      const subscriptionId = idOf(session.subscription);
      let payment_status: PaymentStatus;
      if (event.type === 'checkout.session.async_payment_failed') payment_status = 'failed';
      else if (session.payment_status === 'unpaid') payment_status = 'processing'; // bank debit still clearing
      else payment_status = session.mode === 'subscription' ? 'active' : 'paid';
      await applyUpdate(
        db,
        requestId,
        { payment_status, stripe_checkout_session_id: session.id, ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}) },
        now
      );
      return;
    }
    case 'checkout.session.expired': {
      const session = event.data.object;
      const requestId = session.metadata?.service_request_id;
      if (!requestId) return;
      // Forget the expired session so the next "Pay" starts a fresh one.
      const { error } = await db
        .from('service_requests')
        .update({ stripe_checkout_session_id: null })
        .eq('id', requestId)
        .eq('stripe_checkout_session_id', session.id);
      if (error) throw new Error(error.message);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      let requestId = sub.metadata?.service_request_id ?? null;
      if (!requestId) {
        const { data } = await db.from('service_requests').select('id').eq('stripe_subscription_id', sub.id).maybeSingle();
        requestId = data?.id ?? null;
      }
      if (!requestId) return;
      const payment_status = event.type === 'customer.subscription.deleted' ? 'canceled' : paymentStatusForSubscription(sub.status);
      await applyUpdate(db, requestId, { payment_status, stripe_subscription_id: sub.id }, now);
      return;
    }
    default:
      return;
  }
}

/**
 * Claim an event id so a redelivery is skipped. Returns false when it was
 * already processed. Call releaseStripeEvent if handling then fails.
 */
export async function claimStripeEvent(db: Db, event: Pick<Stripe.Event, 'id' | 'type'>): Promise<boolean> {
  const { error } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(error.message);
}

export async function releaseStripeEvent(db: Db, eventId: string): Promise<void> {
  await db.from('stripe_events').delete().eq('id', eventId);
}
