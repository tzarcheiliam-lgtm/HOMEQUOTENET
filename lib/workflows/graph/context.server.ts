import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import type { WorkflowEvent, WorkflowRunRow } from '@/lib/workflows';
import { loadWorkflowEvaluationContext } from '../context.server';
import { withDerivedLeadFields, type GraphEvaluationContext } from './render';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Fresh facts for one graph node, re-read from the database EVERY time (an estimate
 * may have been accepted, an appointment moved, a lead edited while the run waited).
 * Adds the derived lead fields the variable picker offers and the latest AI-call
 * result of this run (`call.*`).
 */
export async function loadGraphContext(db: Db, run: Pick<WorkflowRunRow, 'id' | 'contractor_id'>, event: WorkflowEvent): Promise<GraphEvaluationContext> {
  const base = await loadWorkflowEvaluationContext(db, event, run.contractor_id);
  let { appointment } = base;
  const assignmentId = typeof base.assignment?.id === 'string' ? base.assignment.id : null;
  if (!appointment && assignmentId) {
    const { data } = await db
      .from('appointments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .in('status', ['scheduled', 'rescheduled'])
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    appointment = (data as Record<string, unknown> | null) ?? null;
  }

  // Project type comes from the vertical tables, never from homeowner free text.
  let projectType: string | null = null;
  const lead = base.lead;
  if (lead) {
    const subId = typeof lead.sub_service_id === 'string' ? lead.sub_service_id : null;
    const verticalId = typeof lead.vertical_id === 'string' ? lead.vertical_id : null;
    if (subId) {
      const { data } = await db.from('sub_services').select('name').eq('id', subId).maybeSingle();
      projectType = (data as { name?: string } | null)?.name ?? null;
    }
    if (!projectType && verticalId) {
      const { data } = await db.from('verticals').select('name').eq('id', verticalId).maybeSingle();
      projectType = (data as { name?: string } | null)?.name ?? null;
    }
  }

  const { data: lastCall } = await db
    .from('workflow_step_runs')
    .select('output')
    .eq('run_id', run.id)
    .eq('action_type', 'ai_call')
    .eq('status', 'succeeded')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const out = (lastCall as { output?: Record<string, unknown> | null } | null)?.output ?? null;

  return {
    ...base,
    appointment,
    lead: withDerivedLeadFields(lead, projectType),
    call: out && typeof out.outcome === 'string'
      ? { outcome: out.outcome, execution_status: out.executionStatus ?? null, attempts: Number(out.attempts ?? 0) }
      : null,
  };
}

/**
 * READ-ONLY facts about one lead for dry runs and previews (nothing is written).
 * `contractorId` scopes the contractor-side records to that company.
 */
export async function loadLeadPreviewContext(db: Db, leadId: string, contractorId: string | null): Promise<GraphEvaluationContext | null> {
  const { data: lead } = await db.from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return null;
  const l = lead as Record<string, unknown>;
  let assignment: Record<string, unknown> | null = null;
  if (contractorId) {
    const { data } = await db.from('lead_assignments').select('*').eq('lead_id', leadId).eq('contractor_id', contractorId).maybeSingle();
    assignment = (data as Record<string, unknown> | null) ?? null;
  } else {
    const { data } = await db.from('lead_assignments').select('*').eq('lead_id', leadId).order('assigned_at', { ascending: false }).limit(1).maybeSingle();
    assignment = (data as Record<string, unknown> | null) ?? null;
  }
  const assignmentId = typeof assignment?.id === 'string' ? assignment.id : null;
  const resolvedContractor = contractorId ?? (typeof assignment?.contractor_id === 'string' ? assignment.contractor_id : null);
  const [appt, est, contractor] = await Promise.all([
    assignmentId ? db.from('appointments').select('*').eq('assignment_id', assignmentId).order('scheduled_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    assignmentId ? db.from('estimates').select('*').eq('assignment_id', assignmentId).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    resolvedContractor ? db.from('contractors').select('id,name').eq('id', resolvedContractor).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  let projectType: string | null = null;
  if (typeof l.sub_service_id === 'string') projectType = ((await db.from('sub_services').select('name').eq('id', l.sub_service_id).maybeSingle()).data as { name?: string } | null)?.name ?? null;
  if (!projectType && typeof l.vertical_id === 'string') projectType = ((await db.from('verticals').select('name').eq('id', l.vertical_id).maybeSingle()).data as { name?: string } | null)?.name ?? null;
  return {
    contractor: (contractor.data as Record<string, unknown> | null) ?? null,
    lead: withDerivedLeadFields(l, projectType),
    assignment,
    appointment: (appt.data as Record<string, unknown> | null) ?? null,
    estimate: (est.data as Record<string, unknown> | null) ?? null,
    call: null,
    event: { payload: {} },
  };
}
