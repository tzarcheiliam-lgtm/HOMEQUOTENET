import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import type { WorkflowEvaluationContext, WorkflowEvent } from '@/lib/workflows';

type WorkflowDb = ReturnType<typeof createAdminClient>;

function payloadId(event: WorkflowEvent, key: string): string | null {
  const value = (event.payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export async function loadWorkflowEvaluationContext(
  db: WorkflowDb,
  event: WorkflowEvent,
  workflowContractorId: string | null
): Promise<WorkflowEvaluationContext> {
  let lead: Record<string, unknown> | null = null;
  let assignment: Record<string, unknown> | null = null;
  let appointment: Record<string, unknown> | null = null;
  let estimate: Record<string, unknown> | null = null;
  let contractor: Record<string, unknown> | null = null;

  if (event.leadId) {
    const result = await db.from('leads').select('*').eq('id', event.leadId).maybeSingle();
    lead = (result.data as Record<string, unknown> | null) ?? null;
  }
  const assignmentId = payloadId(event, 'assignmentId') ?? (event.entityType === 'lead_assignment' ? event.entityId : null);
  if (assignmentId) {
    const result = await db.from('lead_assignments').select('*').eq('id', assignmentId).maybeSingle();
    assignment = (result.data as Record<string, unknown> | null) ?? null;
  } else if (workflowContractorId && event.leadId) {
    const result = await db
      .from('lead_assignments')
      .select('*')
      .eq('lead_id', event.leadId)
      .eq('contractor_id', workflowContractorId)
      .maybeSingle();
    assignment = (result.data as Record<string, unknown> | null) ?? null;
  }
  const appointmentId = payloadId(event, 'appointmentId') ?? (event.entityType === 'appointment' ? event.entityId : null);
  if (appointmentId) {
    const result = await db.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    appointment = (result.data as Record<string, unknown> | null) ?? null;
  }
  const estimateId = payloadId(event, 'estimateId') ?? (event.entityType === 'estimate' ? event.entityId : null);
  if (estimateId) {
    const result = await db.from('estimates').select('*').eq('id', estimateId).maybeSingle();
    estimate = (result.data as Record<string, unknown> | null) ?? null;
  }
  const contractorId = workflowContractorId ?? event.contractorId;
  if (contractorId) {
    const result = await db.from('contractors').select('id,name').eq('id', contractorId).maybeSingle();
    contractor = (result.data as Record<string, unknown> | null) ?? null;
  }
  return { contractor, lead, assignment, appointment, estimate, event: { payload: event.payload as Record<string, unknown> } };
}

