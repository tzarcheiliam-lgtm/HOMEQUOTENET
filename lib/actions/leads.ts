'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import {
  leadIdForChildRecord,
  requireAssignmentAccess,
  requireCompanyAssignmentManager,
  requireLeadAccess,
} from '@/lib/contractor-access';
import { resolvePricingAgreementId } from '@/lib/data/contractors';
import { leadFormToObject, leadInputSchema } from '@/lib/validation/leads';
import type { ActivityType, LeadStatus } from '@/lib/types';

export type LeadFormState =
  | { error?: string; success?: boolean }
  | undefined;

// --- internal helpers -------------------------------------------------------

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function recordActivity(
  leadId: string,
  type: ActivityType,
  body: string | null,
  metadata: Record<string, unknown> = {},
  visibility: 'internal' | 'contractor' = 'internal'
) {
  const supabase = await createClient();
  const actorId = await currentUserId();
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    actor_id: actorId,
    type,
    body,
    metadata,
    visibility,
  });
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? null : s;
}

function revalidateLead(id: string) {
  revalidatePath('/app/leads');
  revalidatePath(`/app/leads/${id}`);
}

// --- create / update --------------------------------------------------------

export async function createLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  await requireRole(['admin', 'setter']);

  const parsed = leadInputSchema.safeParse(leadFormToObject(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const actorId = await currentUserId();

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...d,
      qualification_status: d.qualified ? 'qualified' : 'needs_qualification',
      qualified_at: d.qualified ? new Date().toISOString() : null,
      qualified_by: d.qualified ? actorId : null,
      created_by: actorId,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await recordActivity(data!.id, 'system', 'Lead created');

  revalidatePath('/app/leads');
  redirect(`/app/leads/${data!.id}`);
}

export async function updateLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  await requireRole(['admin', 'setter']);
  const id = str(formData, 'id');
  if (!id) return { error: 'Missing lead id' };

  const parsed = leadInputSchema.safeParse(leadFormToObject(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  // Keep the review status in step with the form's "Mark as qualified" box.
  const { data: before } = await supabase
    .from('leads')
    .select('qualification_status')
    .eq('id', id)
    .single();
  const review: Record<string, unknown> = {};
  if (d.qualified && before?.qualification_status !== 'qualified') {
    Object.assign(review, {
      qualification_status: 'qualified',
      qualified_at: new Date().toISOString(),
      qualified_by: await currentUserId(),
    });
  } else if (!d.qualified && before?.qualification_status === 'qualified') {
    Object.assign(review, { qualification_status: 'needs_qualification', qualified_at: null, qualified_by: null });
  }
  const { error } = await supabase.from('leads').update({ ...d, ...review }).eq('id', id);
  if (error) return { error: error.message };

  await recordActivity(id, 'field_change', 'Lead details updated');
  revalidateLead(id);
  return { success: true };
}

// --- archive / delete -------------------------------------------------------

export async function archiveLead(formData: FormData): Promise<void> {
  await requireRole(['admin', 'setter']);
  const id = str(formData, 'id');
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from('leads')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  await recordActivity(id, 'system', 'Lead archived');
  revalidatePath('/app/leads');
  redirect('/app/leads');
}

export async function unarchiveLead(formData: FormData): Promise<void> {
  await requireRole(['admin', 'setter']);
  const id = str(formData, 'id');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('leads').update({ archived_at: null }).eq('id', id);
  await recordActivity(id, 'system', 'Lead restored');
  revalidateLead(id);
}

export async function deleteLead(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = str(formData, 'id');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('leads').delete().eq('id', id);
  revalidatePath('/app/leads');
  redirect('/app/leads');
}

// --- bulk actions -----------------------------------------------------------

export async function bulkLeadAction(formData: FormData): Promise<void> {
  const profile = await requireRole(['admin', 'setter']);
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  const action = String(formData.get('bulk_action') ?? '');
  if (ids.length === 0 || !action) return;

  const supabase = await createClient();

  if (action === 'archive') {
    await supabase
      .from('leads')
      .update({ archived_at: new Date().toISOString() })
      .in('id', ids);
  } else if (action === 'delete') {
    if (profile.role === 'admin') {
      await supabase.from('leads').delete().in('id', ids);
    }
  } else if (action.startsWith('status:')) {
    const status = action.slice('status:'.length) as LeadStatus;
    await supabase.from('leads').update({ status }).in('id', ids);
  } else if (action.startsWith('assign:')) {
    if (profile.role !== 'admin') return;
    const contractorId = action.slice('assign:'.length);
    const actorId = await currentUserId();
    // Resolve the contractor's active agreement per lead vertical (H1).
    const { data: leadRows } = await supabase
      .from('leads')
      .select('id, vertical_id')
      .in('id', ids);
    const rows = await Promise.all(
      (leadRows ?? []).map(async (l: any) => ({
        lead_id: l.id,
        contractor_id: contractorId,
        assigned_by: actorId,
        pricing_agreement_id: await resolvePricingAgreementId(
          contractorId,
          l.vertical_id ?? null
        ),
      }))
    );
    await supabase.from('lead_assignments').upsert(rows, {
      onConflict: 'lead_id,contractor_id',
      ignoreDuplicates: true,
    });
    await supabase
      .from('leads')
      .update({ status: 'assigned' })
      .in('id', ids)
      .in('status', ['new', 'contact_attempted', 'qualified']);
  }

  revalidatePath('/app/leads');
}

// --- notes / contact / qualification / status -------------------------------

export async function addNote(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const id = str(formData, 'lead_id');
  const body = str(formData, 'body');
  if (!id || !body) return { error: 'Write a note first' };

  let profile;
  try {
    profile = await requireLeadAccess(id);
  } catch {
    return { error: 'Lead not found or access denied' };
  }
  const visibility = profile.role === 'contractor'
    ? 'contractor'
    : formData.get('visibility') === 'contractor' ? 'contractor' : 'internal';

  const supabase = await createClient();
  const { error } = await supabase.from('lead_activities').insert({
    lead_id: id,
    actor_id: await currentUserId(),
    type: 'note',
    body,
    visibility,
    metadata: profile.role === 'contractor'
      ? { contractor_id: profile.contractor_id }
      : {},
  });
  if (error) return { error: error.message };

  revalidateLead(id);
  return { success: true };
}

export async function logContactAttempt(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const id = str(formData, 'lead_id');
  if (!id) return { error: 'Missing lead id' };
  const outcome = str(formData, 'outcome') ?? 'Attempted contact';

  let profile;
  try {
    profile = await requireLeadAccess(id);
  } catch {
    return { error: 'Lead not found or access denied' };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase.from('lead_activities').insert({
    lead_id: id,
    actor_id: await currentUserId(),
    type: 'contact_attempt',
    body: outcome,
    visibility: profile.role === 'contractor' ? 'contractor' : 'internal',
    metadata: profile.role === 'contractor'
      ? { contractor_id: profile.contractor_id }
      : {},
  });

  if (profile.role === 'contractor' && profile.contractor_id) {
    const { data: assignment } = await supabase
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', id)
      .eq('contractor_id', profile.contractor_id)
      .maybeSingle();
    if (assignment) {
      await supabase.from('lead_assignments').update({
        status: /no answer|voicemail/i.test(outcome) ? 'no_answer' : 'contacted',
      }).eq('id', assignment.id);
    }
  }

  // Advance a brand-new lead to "contact attempted" and stamp last contact.
  await supabase
    .from('leads')
    .update({ last_contact_date: now })
    .eq('id', id);
  await supabase
    .from('leads')
    .update({ status: 'contact_attempted' })
    .eq('id', id)
    .eq('status', 'new');

  revalidateLead(id);
  return { success: true };
}

export async function updateQualification(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  await requireRole(['admin', 'setter']);
  const id = str(formData, 'lead_id');
  if (!id) return { error: 'Missing lead id' };

  // Review decision: needs_qualification | qualified | not_qualified. The
  // legacy `qualified` checkbox is still accepted for older forms.
  const rawStatus = str(formData, 'qualification_status');
  const reviewStatus =
    rawStatus === 'qualified' || rawStatus === 'not_qualified' || rawStatus === 'needs_qualification'
      ? rawStatus
      : formData.get('qualified') === 'on'
        ? 'qualified'
        : 'needs_qualification';
  const qualified = reviewStatus === 'qualified';
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('leads')
    .select('qualification_status, qualified_at, qualified_by')
    .eq('id', id)
    .single();
  // Keep who/when from the first time it was qualified; re-saving doesn't change it.
  const alreadyQualified = before?.qualification_status === 'qualified';

  const update: Record<string, unknown> = {
    qualified,
    qualification_status: reviewStatus,
    qualification_notes: str(formData, 'qualification_notes'),
    budget_range: str(formData, 'budget_range'),
    timeline: str(formData, 'timeline'),
    urgency: str(formData, 'urgency'),
    qualified_at: qualified ? (alreadyQualified ? before?.qualified_at : new Date().toISOString()) : null,
    qualified_by: qualified ? (alreadyQualified ? before?.qualified_by : await currentUserId()) : null,
  };

  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) return { error: error.message };

  // Move into the qualified stage if still early in the pipeline.
  if (qualified) {
    await supabase
      .from('leads')
      .update({ status: 'qualified' })
      .eq('id', id)
      .in('status', ['new', 'contact_attempted']);
  }

  const changed = before?.qualification_status !== reviewStatus;
  await recordActivity(
    id,
    'qualification',
    changed && reviewStatus === 'qualified'
      ? 'Lead marked qualified'
      : changed && reviewStatus === 'not_qualified'
        ? 'Lead marked not qualified'
        : changed
          ? 'Lead moved back to needs qualification'
          : 'Qualification updated'
  );
  revalidateLead(id);
  return { success: true };
}

export async function changeLeadStatus(formData: FormData): Promise<void> {
  await requireRole(['admin', 'setter']);
  const id = str(formData, 'lead_id');
  const status = str(formData, 'status') as LeadStatus | null;
  if (!id || !status) return;

  const supabase = await createClient();
  await supabase.from('leads').update({ status }).eq('id', id);
  await recordActivity(id, 'status_change', `Status changed to ${status}`);
  revalidateLead(id);
}

// --- assignment / distribution ---------------------------------------------

export async function assignLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  await requireRole(['admin']);
  const id = str(formData, 'lead_id');
  if (!id) return { error: 'Missing lead id' };

  const contractorIds = formData.getAll('contractor_ids').map(String).filter(Boolean);
  if (contractorIds.length === 0)
    return { error: 'Select at least one contractor' };

  const isExclusive = formData.get('is_exclusive') === 'on';
  const supabase = await createClient();
  const actorId = await currentUserId();

  // Look up the lead's vertical so we can link the right pricing agreement (H1).
  const { data: leadRow } = await supabase
    .from('leads')
    .select('vertical_id')
    .eq('id', id)
    .single();
  const verticalId = (leadRow as { vertical_id: string | null } | null)
    ?.vertical_id ?? null;

  // Resolve each contractor's active agreement so commission isn't $0 later.
  const rows = await Promise.all(
    contractorIds.map(async (contractor_id) => ({
      lead_id: id,
      contractor_id,
      is_exclusive: isExclusive,
      assigned_by: actorId,
      pricing_agreement_id: await resolvePricingAgreementId(
        contractor_id,
        verticalId
      ),
    }))
  );

  const { error } = await supabase
    .from('lead_assignments')
    .upsert(rows, { onConflict: 'lead_id,contractor_id', ignoreDuplicates: true });
  if (error) return { error: error.message };

  await supabase
    .from('leads')
    .update({ status: 'assigned' })
    .eq('id', id)
    .in('status', ['new', 'contact_attempted', 'qualified']);

  await recordActivity(
    id,
    'assignment',
    `Assigned to ${contractorIds.length} contractor(s)`,
    { contractor_ids: contractorIds, exclusive: isExclusive }
  );
  revalidateLead(id);
  return { success: true };
}

export async function unassignLead(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const assignmentId = str(formData, 'assignment_id');
  const leadId = str(formData, 'lead_id');
  if (!assignmentId) return;
  const supabase = await createClient();
  await supabase.from('lead_assignments').delete().eq('id', assignmentId);
  if (leadId) {
    await recordActivity(leadId, 'assignment', 'Assignment removed');
    revalidateLead(leadId);
  }
}

// Update an assignment's status. Allowed for staff or the owning contractor
// (RLS enforces the contractor scope). Optionally advances the lead pipeline.
export async function updateAssignmentStatus(formData: FormData): Promise<void> {
  const assignmentId = str(formData, 'assignment_id');
  const status = str(formData, 'status');
  if (!assignmentId || !status) return;

  const allowed = new Set([
    'assigned', 'accepted', 'contacted', 'no_answer', 'qualified',
    'not_qualified', 'appointment_set', 'appointment_held',
    'estimate_given', 'sold', 'lost', 'returned',
  ]);
  if (!allowed.has(status)) return;
  let access;
  try {
    access = await requireAssignmentAccess(assignmentId);
  } catch {
    return;
  }
  const { profile, assignment } = access;
  const leadId = assignment.lead_id;

  const supabase = await createClient();
  await supabase
    .from('lead_assignments')
    .update({ status })
    .eq('id', assignmentId);

  // Mirror key milestones onto the lead's overall pipeline status.
  const mirror: Record<string, LeadStatus> = {
    appointment_set: 'appointment_set',
    appointment_held: 'appointment_completed',
    estimate_given: 'estimate_sent',
    sold: 'sold',
    lost: 'lost',
  };
  if (mirror[status]) {
    await supabase
      .from('leads')
      .update({ status: mirror[status] })
      .eq('id', leadId);
  }

  await recordActivity(
    leadId,
    'status_change',
    `Assignment status set to ${status}`,
    profile.role === 'contractor' ? { contractor_id: profile.contractor_id } : {},
    profile.role === 'contractor' ? 'contractor' : 'internal'
  );
  revalidateLead(leadId);
}

export async function assignLeadToCompanyUser(formData: FormData): Promise<void> {
  const assignmentId = str(formData, 'assignment_id');
  const requestedUserId = str(formData, 'assigned_user_id');
  if (!assignmentId) return;
  let access;
  try {
    access = await requireCompanyAssignmentManager(assignmentId);
  } catch {
    return;
  }
  const { profile, assignment } = access;
  const supabase = await createClient();
  let assignedUserId: string | null = null;
  if (requestedUserId) {
    const { data: target } = await supabase
      .from('profiles')
      .select('id, contractor_id, role, is_active')
      .eq('id', requestedUserId)
      .maybeSingle();
    if (!target || target.role !== 'contractor' || !target.is_active ||
        target.contractor_id !== assignment.contractor_id) return;
    assignedUserId = target.id;
  }
  await supabase.from('lead_assignments')
    .update({ assigned_user_id: assignedUserId })
    .eq('id', assignment.id);
  await recordActivity(
    assignment.lead_id,
    'assignment',
    assignedUserId ? 'Lead assigned to a company team member' : 'Company user assignment cleared',
    profile.role === 'contractor' ? { contractor_id: profile.contractor_id } : {},
    profile.role === 'contractor' ? 'contractor' : 'internal'
  );
  revalidateLead(assignment.lead_id);
}

// --- attachments ------------------------------------------------------------

export async function addAttachment(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const id = str(formData, 'lead_id');
  const name = str(formData, 'name');
  const url = str(formData, 'url');
  if (!id || !name || !url) return { error: 'Name and URL are required' };
  try {
    await requireLeadAccess(id);
  } catch {
    return { error: 'Lead not found or access denied' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('lead_attachments').insert({
    lead_id: id,
    uploaded_by: await currentUserId(),
    name,
    url,
  });
  if (error) return { error: error.message };

  revalidateLead(id);
  return { success: true };
}

export async function deleteAttachment(formData: FormData): Promise<void> {
  const attachmentId = str(formData, 'attachment_id');
  if (!attachmentId) return;
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from('lead_attachments').select('lead_id').eq('id', attachmentId).maybeSingle();
  const leadId = attachment?.lead_id;
  if (!leadId) return;
  try { await requireLeadAccess(leadId); } catch { return; }
  await supabase.from('lead_attachments').delete().eq('id', attachmentId);
  revalidateLead(leadId);
}

// --- appointments (basic) ---------------------------------------------------

export async function scheduleAppointment(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const assignmentId = str(formData, 'assignment_id');
  const scheduledAt = str(formData, 'scheduled_at');
  if (!assignmentId || !scheduledAt)
    return { error: 'Pick a date and time' };

  let access;
  try { access = await requireAssignmentAccess(assignmentId); }
  catch { return { error: 'Assignment not found or access denied' }; }
  const leadId = access.assignment.lead_id;

  const supabase = await createClient();
  const { error } = await supabase.from('appointments').insert({
    assignment_id: assignmentId,
    scheduled_at: new Date(scheduledAt).toISOString(),
    location: str(formData, 'location'),
    notes: str(formData, 'notes'),
    created_by: await currentUserId(),
  });
  if (error) return { error: error.message };

  await supabase
    .from('lead_assignments')
    .update({ status: 'appointment_set' })
    .eq('id', assignmentId);

  if (leadId) {
    await supabase
      .from('leads')
      .update({ status: 'appointment_set' })
      .eq('id', leadId)
      .in('status', [
        'new',
        'contact_attempted',
        'qualified',
        'assigned',
      ]);
    await recordActivity(leadId, 'appointment', 'Appointment scheduled');
    revalidateLead(leadId);
  }
  return { success: true };
}

export async function updateAppointmentStatus(
  formData: FormData
): Promise<void> {
  const appointmentId = str(formData, 'appointment_id');
  const status = str(formData, 'status');
  if (!appointmentId || !status) return;

  let access;
  try { access = await leadIdForChildRecord('appointments', appointmentId); }
  catch { return; }
  const leadId = access.assignment.lead_id;

  const supabase = await createClient();
  await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (leadId && status === 'held') {
    await supabase
      .from('leads')
      .update({ status: 'appointment_completed' })
      .eq('id', leadId);
    await recordActivity(leadId, 'appointment', 'Appointment completed');
  }
  if (leadId) revalidateLead(leadId);
}
