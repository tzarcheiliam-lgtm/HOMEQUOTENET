import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/billing/stripe';
import { claimStripeEvent, handleStripeEvent, releaseStripeEvent } from '@/lib/billing/webhook';

// Stripe → HomeQuote. Every request must carry a valid Stripe-Signature for
// STRIPE_WEBHOOK_SECRET; anything else is rejected before touching data.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  // The signature covers the exact raw body, so read it as text.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createAdminClient();
  if (!(await claimStripeEvent(db, event))) return NextResponse.json({ received: true, duplicate: true });
  try {
    await handleStripeEvent(event, db);
  } catch (error) {
    // Let Stripe retry: un-claim the event and return a 500.
    await releaseStripeEvent(db, event.id);
    console.error('[stripe-webhook] Failed to handle', event.type, event.id, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
