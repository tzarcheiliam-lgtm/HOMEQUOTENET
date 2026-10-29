import 'server-only';
import { loadAvailabilityContext } from '@/lib/availability/data.server';
import { REASON_LABELS, unavailableReason } from '@/lib/availability/slots';
import { createAdminClient } from '@/lib/supabase/admin';

type Db = ReturnType<typeof createAdminClient>;
export type BookResult = { ok: true; appointmentId: string; overridden: string | null } | { ok: false; error: string };

/** Whether the contractor marked this time unavailable (null = free, or availability couldn't be read). */
export async function slotProblem(db: Db, contractorId: string, startMs: number): Promise<string | null> {
  try {
    const ctx = await loadAvailabilityContext(contractorId, startMs, startMs + 86_400_000, { db });
    const reason = unavailableReason(ctx, startMs);
    return reason ? `That time is ${REASON_LABELS[reason]}.` : null;
  } catch {
    return null; // never block a booking on a lookup failure (same as the lead page)
  }
}

/**
 * Book an estimate visit on an assignment with the service role, the same steps as the lead page's
 * scheduleAppointment: appointment row, assignment and lead → appointment_set, timeline note, and an audit row when
 * the contractor's availability was overridden. Used by Claude-connector approvals (an admin approved it).
 */
export async function bookAppointmentAs(db: Db, input: { assignmentId: string; startMs: number; actorId: string; notes?: string | null; activity: string; overrideAvailability?: boolean }): Promise<BookResult> {
  const { data: asg } = await db.from('lead_assignments').select('id,lead_id,contractor_id').eq('id', input.assignmentId).maybeSingle();
  if (!asg) return { ok: false, error: 'The assignment no longer exists.' };
  const problem = await slotProblem(db, asg.contractor_id as string, input.startMs);
  if (problem && !input.overrideAvailability) return { ok: false, error: problem };
  const at = new Date(input.startMs).toISOString();
  const { data: dup } = await db.from('appointments').select('id').eq('assignment_id', input.assignmentId).eq('scheduled_at', at).in('status', ['scheduled', 'rescheduled']).limit(1).maybeSingle();
  if (dup) return { ok: false, error: 'That appointment is already booked.' };
  const { data: created, error } = await db.from('appointments').insert({ assignment_id: input.assignmentId, scheduled_at: at, notes: input.notes ?? null, created_by: input.actorId }).select('id').single();
  if (error || !created) return { ok: false, error: error?.message ?? 'Could not book the appointment.' };
  if (problem) {
    await db.from('audit_logs').insert({ actor_id: input.actorId, action: 'appointment.availability_override', target_user_id: null, metadata: { appointment_id: created.id, contractor_id: asg.contractor_id, reason: problem, scheduled_at: at } });
  }
  await db.from('lead_assignments').update({ status: 'appointment_set' }).eq('id', input.assignmentId);
  await db.from('leads').update({ status: 'appointment_set' }).eq('id', asg.lead_id).in('status', ['new', 'contact_attempted', 'qualified', 'assigned']);
  await db.from('lead_activities').insert({ lead_id: asg.lead_id, actor_id: input.actorId, type: 'appointment', body: input.activity, metadata: { appointment_id: created.id }, visibility: 'internal' });
  return { ok: true, appointmentId: created.id as string, overridden: problem };
}
