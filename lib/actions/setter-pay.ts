'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import { formatMoney } from '@/lib/setter/money';

/**
 * Administrator controls for setter pay: each partner's pay per sold meeting
 * and weekly booking goal, recording whether a booked sales meeting sold, and
 * moving a meeting's credit. Writes go through the admin's own client, so
 * RLS and the 0062 guards are the boundary; every change is audited.
 */

async function audit(action: string, targetUserId: string | null, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({ actor_id: user?.id ?? null, action, target_user_id: targetUserId, metadata });
}

const MIGRATION_HINT = 'Setter pay needs database migration 0062 — apply it, then try again.';
const needsMigration = (msg: string) => /pay_per_sale|weekly_booking_goal|sale_outcome|setter_pay_amount|sale_decided/.test(msg);

function revalidateMoney(userId?: string | null) {
  revalidatePath('/app');
  revalidatePath('/app/calls', 'layout');
  if (userId) revalidatePath(`/app/team/${userId}`);
}

/* ---- Pay rate + weekly goal ------------------------------------------------ */

const blankToNull = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === '' ? null : String(v).trim());

const paySchema = z.object({
  user_id: z.string().uuid(),
  pay_per_sale: z.coerce.number().min(0).max(100000).nullable(),
  weekly_booking_goal: z.coerce.number().int().min(1).max(200).nullable(),
});

export type PayActionState = { ok: boolean; error?: string } | undefined;

export async function setPartnerPay(_prev: PayActionState, fd: FormData): Promise<PayActionState> {
  await requireRole(['admin']);
  const pay = blankToNull(fd.get('pay_per_sale'));
  const goal = blankToNull(fd.get('weekly_booking_goal'));
  const parsed = paySchema.safeParse({
    user_id: fd.get('user_id'),
    pay_per_sale: pay === null ? null : pay.replace(/[$,]/g, ''),
    weekly_booking_goal: goal,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Pay must be $0–$100,000 and the weekly goal a whole number from 1 to 200 (or blank)' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ pay_per_sale: parsed.data.pay_per_sale, weekly_booking_goal: parsed.data.weekly_booking_goal })
    .eq('id', parsed.data.user_id);
  if (error) return { ok: false, error: needsMigration(error.message) ? MIGRATION_HINT : error.message };
  await audit('user.setter_pay', parsed.data.user_id, {
    pay_per_sale: parsed.data.pay_per_sale,
    weekly_booking_goal: parsed.data.weekly_booking_goal,
  });
  revalidateMoney(parsed.data.user_id);
  return { ok: true };
}

/* ---- Sale outcome ---------------------------------------------------------- */

const OPEN_STATUSES = ['scheduled', 'confirmed', 'rescheduled'];

/**
 * Sold / Not sold / Undecided for one booked sales meeting. Sold fixes the
 * booking partner's pay on the meeting (their current rate, or an amount the
 * admin types), marks a still-open meeting completed, and drops a note in the
 * partner's notification inbox.
 */
export async function recordSale(_prev: PayActionState, fd: FormData): Promise<PayActionState> {
  const me = await requireRole(['admin']);
  const id = String(fd.get('id') ?? '');
  const outcome = String(fd.get('outcome') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['sold', 'not_sold', 'undecided'].includes(outcome)) {
    return { ok: false, error: 'Invalid sale update' };
  }
  const supabase = await createClient();
  const { data: m, error: readErr } = await supabase
    .from('prospect_sales_appointments')
    .select('id, prospect_id, partner_id, status, sale_outcome, prospect:contractor_prospects(company_name)')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return { ok: false, error: needsMigration(readErr.message) ? MIGRATION_HINT : readErr.message };
  if (!m) return { ok: false, error: 'Meeting not found' };
  const meeting = m as unknown as {
    id: string;
    prospect_id: string;
    partner_id: string | null;
    status: string;
    sale_outcome: string | null;
    prospect: { company_name: string } | null;
  };

  let pay: number | null = null;
  if (outcome === 'sold') {
    const typed = blankToNull(fd.get('amount'));
    if (typed !== null) {
      const n = Number(typed.replace(/[$,]/g, ''));
      if (!Number.isFinite(n) || n < 0 || n > 100000) return { ok: false, error: 'Enter a pay amount from $0 to $100,000' };
      pay = Math.round(n * 100) / 100;
    } else if (meeting.partner_id) {
      const { data: partner } = await supabase.from('profiles').select('pay_per_sale, full_name').eq('id', meeting.partner_id).maybeSingle();
      const rate = (partner as { pay_per_sale?: number | string | null } | null)?.pay_per_sale;
      if (rate === null || rate === undefined) {
        return { ok: false, error: 'No pay rate is set for this setter. Set their pay per sale on the team board, or type an amount.' };
      }
      pay = Number(rate);
    } else {
      pay = 0; // nobody to pay: a meeting booked by a since-removed account
    }
  }

  const decided = outcome !== 'undecided';
  const { error } = await supabase
    .from('prospect_sales_appointments')
    .update({
      sale_outcome: decided ? outcome : null,
      sale_decided_at: decided ? new Date().toISOString() : null,
      sale_decided_by: decided ? me.id : null,
      setter_pay_amount: outcome === 'sold' ? pay : null,
      ...(decided && OPEN_STATUSES.includes(meeting.status) ? { status: 'completed' } : {}),
      updated_by: me.id,
    })
    .eq('id', id);
  if (error) return { ok: false, error: needsMigration(error.message) ? MIGRATION_HINT : error.message };

  await audit('sales_appointment.sale', meeting.partner_id, { appointment_id: id, outcome, pay });

  // The partner hears about it in their bell; their dashboard celebrates on next open.
  if (outcome === 'sold' && meeting.partner_id && meeting.sale_outcome !== 'sold') {
    const company = meeting.prospect?.company_name ?? 'Your meeting';
    await createAdminClient()
      .from('notifications')
      .insert({
        user_id: meeting.partner_id,
        type: 'meeting_sold',
        title: `💰 ${company} signed — ${formatMoney(pay ?? 0)} earned`,
        body: 'A sales meeting you booked was sold. Book the next one.',
        url: '/app',
        entity_id: id,
      })
      .then(({ error: nErr }) => {
        if (nErr) console.error('[setter-pay] notification failed', nErr.message);
      });
  }

  revalidatePath('/app/calls/appointments');
  revalidatePath('/app/calls/payouts');
  revalidateMoney(meeting.partner_id);
  return { ok: true };
}

/* ---- Credit ---------------------------------------------------------------- */

export async function creditMeeting(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(fd.get('id') ?? '');
  const partner = String(fd.get('partner_id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(partner)) throw new Error('Invalid credit change');
  const supabase = await createClient();
  const { data: who } = await supabase
    .from('profiles')
    .select('id, role, account_status')
    .eq('id', partner)
    .maybeSingle();
  const p = who as { role: string; account_status: string } | null;
  if (!p || !['admin', 'caller', 'setter'].includes(p.role) || p.account_status !== 'active') {
    throw new Error('Credit can only go to an active caller, setter or admin');
  }
  const { data: before } = await supabase.from('prospect_sales_appointments').select('partner_id').eq('id', id).maybeSingle();
  const { error } = await supabase.from('prospect_sales_appointments').update({ partner_id: partner }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('sales_appointment.credit', partner, { appointment_id: id, from: (before as { partner_id: string | null } | null)?.partner_id ?? null, to: partner });
  revalidatePath('/app/calls/appointments');
  revalidatePath('/app/calls/payouts');
  revalidateMoney(partner);
}
