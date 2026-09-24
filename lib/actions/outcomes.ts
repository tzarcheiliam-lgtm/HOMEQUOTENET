'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireProfile, requireRole } from '@/lib/auth';
import { computeCommission } from '@/lib/outcomes/commission';
import { resolvePricingAgreementId } from '@/lib/data/contractors';
import type { PricingAgreement } from '@/lib/types';

export type OutcomeState = { error?: string; success?: boolean } | undefined;

// --- helpers ----------------------------------------------------------------

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? null : s;
}
function num(fd: FormData, k: string): number | null {
  const s = str(fd, k);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function logActivity(
  leadId: string,
  type: string,
  body: string
) {
  const supabase = await createClient();
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    actor_id: await currentUserId(),
    type,
    body,
  });
}

function revalidateLead(leadId: string) {
  revalidatePath('/app/leads');
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath('/app/sales');
  revalidatePath('/app/billing');
}

interface AssignmentRow {
  id: string;
  lead_id: string;
  contractor_id: string;
  pricing_agreement_id: string | null;
}

async function getAssignment(assignmentId: string): Promise<AssignmentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lead_assignments')
    .select('id, lead_id, contractor_id, pricing_agreement_id')
    .eq('id', assignmentId)
    .single();
  return (data as AssignmentRow) ?? null;
}

// ============================================================================
// ESTIMATES
// ============================================================================

export async function addEstimate(
  _prev: OutcomeState,
  formData: FormData
): Promise<OutcomeState> {
  await requireProfile(); // staff or owning contractor (RLS enforces scope)
  const assignmentId = str(formData, 'assignment_id');
  if (!assignmentId) return { error: 'Missing assignment' };
  const amount = num(formData, 'amount');
  if (amount === null) return { error: 'Enter an estimate amount' };

  const assignment = await getAssignment(assignmentId);
  const supabase = await createClient();

  const { error } = await supabase.from('estimates').insert({
    assignment_id: assignmentId,
    amount,
    estimate_date: str(formData, 'estimate_date') ?? undefined,
    status: str(formData, 'status') ?? 'sent',
    notes: str(formData, 'notes'),
    created_by: await currentUserId(),
  });
  if (error) return { error: error.message };

  // Advance the funnel.
  await supabase
    .from('lead_assignments')
    .update({ status: 'estimate_given' })
    .eq('id', assignmentId);
  if (assignment) {
    await supabase
      .from('leads')
      .update({ status: 'estimate_sent' })
      .eq('id', assignment.lead_id)
      .in('status', [
        'new',
        'contact_attempted',
        'qualified',
        'assigned',
        'appointment_set',
        'appointment_completed',
      ]);
    await logActivity(
      assignment.lead_id,
      'status_change',
      `Estimate added: $${amount}`
    );
    revalidateLead(assignment.lead_id);
  }
  return { success: true };
}

export async function deleteEstimate(formData: FormData): Promise<void> {
  await requireProfile();
  const id = str(formData, 'id');
  const leadId = str(formData, 'lead_id');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('estimates').delete().eq('id', id);
  if (leadId) revalidateLead(leadId);
}

// ============================================================================
// SALES (with auto-commission + auto-billing)
// ============================================================================

export async function addSale(
  _prev: OutcomeState,
  formData: FormData
): Promise<OutcomeState> {
  const profile = await requireProfile();
  const assignmentId = str(formData, 'assignment_id');
  if (!assignmentId) return { error: 'Missing assignment' };
  const amount = num(formData, 'amount');
  if (amount === null) return { error: 'Enter a sale amount' };

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return { error: 'Assignment not found' };

  const supabase = await createClient();

  // Resolve the pricing agreement to auto-calculate commission.
  let agreement: PricingAgreement | null = null;
  let agreementId = assignment.pricing_agreement_id;

  // Fallback (H1 safety net): older assignments may have no agreement linked —
  // resolve the contractor's active one now and persist it onto the assignment.
  if (!agreementId) {
    const { data: leadRow } = await supabase
      .from('leads')
      .select('vertical_id')
      .eq('id', assignment.lead_id)
      .single();
    agreementId = await resolvePricingAgreementId(
      assignment.contractor_id,
      (leadRow as { vertical_id: string | null } | null)?.vertical_id ?? null
    );
    if (agreementId) {
      await supabase
        .from('lead_assignments')
        .update({ pricing_agreement_id: agreementId })
        .eq('id', assignmentId);
    }
  }

  if (agreementId) {
    const { data } = await supabase
      .from('pricing_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();
    agreement = (data as PricingAgreement) ?? null;
  }

  const computed = computeCommission(agreement, amount);

  // Admin may override the commission amount.
  const overrideAmount = num(formData, 'commission_amount');
  const isAdmin = profile.role === 'admin';
  const useOverride = isAdmin && overrideAmount !== null;

  const commissionAmount = useOverride ? overrideAmount! : computed.amount;
  const commissionType = useOverride ? 'manual' : computed.type;

  const { error } = await supabase.from('sales').insert({
    assignment_id: assignmentId,
    amount,
    sale_date: str(formData, 'sale_date') ?? undefined,
    closed_at: str(formData, 'closed_at') ?? undefined,
    sale_status: str(formData, 'sale_status') ?? 'won',
    commission_amount: commissionAmount,
    commission_type: commissionType,
    commission_is_override: useOverride,
    notes: str(formData, 'notes'),
    created_by: await currentUserId(),
  });
  if (error) return { error: error.message };

  // Advance funnel.
  await supabase
    .from('lead_assignments')
    .update({ status: 'sold' })
    .eq('id', assignmentId);
  await supabase
    .from('leads')
    .update({ status: 'sold' })
    .eq('id', assignment.lead_id);

  // Create/refresh the billing event (what the contractor owes HomeQuote).
  // Uses the service-role client because billing_events is admin-only under RLS,
  // and a sale may be recorded by the contractor.
  await upsertBilling(
    assignment,
    commissionAmount,
    computed.billingEventType
  );

  await logActivity(
    assignment.lead_id,
    'status_change',
    `Sale recorded: $${amount} (commission $${commissionAmount.toFixed(2)})`
  );
  revalidateLead(assignment.lead_id);
  return { success: true };
}

// Insert or update the auto-billing row for an assignment without clobbering
// any payment the admin has recorded (amount_paid / status / due_date kept).
async function upsertBilling(
  assignment: AssignmentRow,
  amount: number,
  eventType: string
) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('billing_events')
    .select('id')
    .eq('assignment_id', assignment.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin
      .from('billing_events')
      .update({
        amount,
        event_type: eventType,
        pricing_agreement_id: assignment.pricing_agreement_id,
      })
      .eq('id', (existing as any).id);
  } else {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    await admin.from('billing_events').insert({
      assignment_id: assignment.id,
      contractor_id: assignment.contractor_id,
      pricing_agreement_id: assignment.pricing_agreement_id,
      event_type: eventType,
      amount,
      status: 'pending',
      due_date: due.toISOString().slice(0, 10),
    });
  }
}

export async function deleteSale(formData: FormData): Promise<void> {
  await requireProfile();
  const id = str(formData, 'id');
  const leadId = str(formData, 'lead_id');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('sales').delete().eq('id', id);
  if (leadId) revalidateLead(leadId);
}

// ============================================================================
// BILLING (admin only)
// ============================================================================

export async function updateBillingEvent(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = str(formData, 'id');
  if (!id) return;

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  const amount = num(formData, 'amount');
  const amountPaid = num(formData, 'amount_paid');
  const dueDate = str(formData, 'due_date');
  const status = str(formData, 'status');
  if (amount !== null) update.amount = amount;
  if (amountPaid !== null) update.amount_paid = amountPaid;
  if (dueDate !== null) update.due_date = dueDate;
  if (status !== null) update.status = status;

  await supabase.from('billing_events').update(update).eq('id', id);
  revalidatePath('/app/billing');
  revalidatePath('/app/sales');
}

export async function deleteBillingEvent(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = str(formData, 'id');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('billing_events').delete().eq('id', id);
  revalidatePath('/app/billing');
  revalidatePath('/app/sales');
}
