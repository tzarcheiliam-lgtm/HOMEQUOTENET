'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { buildPaymentRequestEmail, describeAmount, parseSendPayment } from '@/lib/billing/payment-request';
import { isStripeConfigured, stripe } from '@/lib/billing/stripe';
import { publicSiteUrl } from '@/lib/auth/site-url';

export type SendPaymentState =
  | { ok: true; message: string; url: string }
  | { ok: false; error: string }
  | undefined;

/**
 * Admin: create a single-use Stripe Payment Link for any amount and (optionally) email it.
 * Nothing is charged here; the customer pays on Stripe's hosted page, and the webhook marks it paid.
 */
export async function sendPaymentRequest(_prev: SendPaymentState, formData: FormData): Promise<SendPaymentState> {
  const profile = await requireRole(['admin']);
  if (!isStripeConfigured()) return { ok: false, error: 'Stripe isn’t set up yet (STRIPE_SECRET_KEY is missing).' };
  const parsed = parseSendPayment(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const p = parsed.data;

  const db = createAdminClient();
  // Link the payment to a company when chosen, and use its email if none was typed.
  let companyName: string | null = null;
  let email = p.customer_email ?? null;
  if (p.contractor_id) {
    const { data: company } = await db.from('contractors').select('id, name, email').eq('id', p.contractor_id).maybeSingle();
    if (!company) return { ok: false, error: 'That company could not be found.' };
    companyName = company.name;
    if (!email) email = company.email ?? null;
  }
  if (p.notify && !email) return { ok: false, error: 'Add an email address to email the link, or turn off “Email the link”.' };

  const { data: row, error: insertError } = await db
    .from('payment_requests')
    .insert({
      created_by: profile.id,
      contractor_id: p.contractor_id ?? null,
      amount_cents: p.amount,
      interval: p.interval,
      setup_fee_cents: p.setup_fee ?? null,
      description: p.description,
      customer_name: p.customer_name ?? null,
      customer_email: email,
    })
    .select('id')
    .single();
  if (insertError || !row) return { ok: false, error: 'The payment couldn’t be saved. Try again.' };

  const metadata = { payment_request_id: row.id, ...(p.contractor_id ? { contractor_id: p.contractor_id } : {}) };
  let linkId: string;
  let url: string;
  try {
    const recurring = p.interval === 'month';
    const price = await stripe().prices.create({
      currency: 'usd',
      unit_amount: p.amount,
      product_data: { name: p.description },
      ...(recurring ? { recurring: { interval: 'month' as const } } : {}),
    });
    const items = [{ price: price.id, quantity: 1 }];
    if (recurring && p.setup_fee) {
      const setup = await stripe().prices.create({
        currency: 'usd',
        unit_amount: p.setup_fee,
        product_data: { name: `${p.description}: setup (one-time)` },
      });
      items.push({ price: setup.id, quantity: 1 });
    }
    const link = await stripe().paymentLinks.create({
      line_items: items,
      metadata,
      // Stops working after one completed payment, so a forwarded link can't be paid twice.
      restrictions: { completed_sessions: { limit: 1 } },
      // HomeQuote is the seller of its own services, so Stripe's Managed Payments doesn't apply (same as Growth Tools checkout).
      managed_payments: { enabled: false },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: { custom_message: 'Thank you! Your payment to HomeQuote Network was received.' },
      },
      ...(recurring
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata }, invoice_creation: { enabled: true, invoice_data: { metadata } } }),
    });
    linkId = link.id;
    url = email ? `${link.url}?prefilled_email=${encodeURIComponent(email)}` : link.url;
  } catch (error) {
    console.error('[payment-request] Stripe link failed', error instanceof Error ? error.message : error);
    await db.from('payment_requests').delete().eq('id', row.id);
    return { ok: false, error: 'Stripe couldn’t create the payment link. Check the Stripe key and try again.' };
  }
  await db.from('payment_requests').update({ stripe_payment_link_id: linkId, url }).eq('id', row.id);
  await db.from('audit_logs').insert({
    actor_id: profile.id,
    action: 'payment_request.created',
    target_user_id: null,
    metadata: { payment_request_id: row.id, amount_cents: p.amount, interval: p.interval, contractor_id: p.contractor_id ?? null },
  });
  revalidatePath('/app/billing');

  const amountText = describeAmount({ amount: p.amount, interval: p.interval, setup_fee: p.setup_fee });
  const who = companyName ?? p.customer_name ?? null;
  if (!p.notify || !email) {
    return { ok: true, url, message: `Payment link created: ${amountText}${who ? ` for ${who}` : ''}. Copy it and send it however you like.` };
  }
  try {
    const mail = buildPaymentRequestEmail(
      { firstName: p.customer_name?.split(' ')[0] ?? null, description: p.description, amountText },
      url,
      publicSiteUrl()
    );
    await sendGmailMessage({ toEmail: email, subject: mail.subject, message: mail.text, html: mail.html, text: mail.text });
    await db.from('payment_requests').update({ emailed_at: new Date().toISOString() }).eq('id', row.id);
    return { ok: true, url, message: `Payment link created and emailed to ${email}: ${amountText}.` };
  } catch (error) {
    console.error('[payment-request] Email failed', error instanceof Error ? error.message : error);
    return { ok: true, url, message: `Payment link created: ${amountText}. The email didn’t send, so copy the link and send it yourself.` };
  }
}

/** Admin: turn off an unpaid payment link. */
export async function cancelPaymentRequest(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = formData.get('id');
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = createAdminClient();
  const { data: row } = await db.from('payment_requests').select('id, status, stripe_payment_link_id').eq('id', id).maybeSingle();
  if (!row || row.status !== 'sent') return;
  try {
    if (row.stripe_payment_link_id) await stripe().paymentLinks.update(row.stripe_payment_link_id, { active: false });
  } catch (error) {
    console.error('[payment-request] Could not deactivate link', error instanceof Error ? error.message : error);
    return; // leave it "sent" so the admin can retry; never show a live link as canceled
  }
  await db.from('payment_requests').update({ status: 'canceled' }).eq('id', id).eq('status', 'sent');
  revalidatePath('/app/billing');
}
