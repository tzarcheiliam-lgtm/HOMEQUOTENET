'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWorkflow } from '@/lib/data/workflows';
import {
  WORKFLOW_ACTIONS,
  eventFromRow,
  getWorkflowTemplate,
  parseWorkflowDefinition,
  validateWorkflowForEnable,
  type WorkflowDefinition,
} from '@/lib/workflows';
import { dryRunWorkflowEvent } from '@/lib/workflows/runtime.server';

export interface WorkflowActionState { ok?: boolean; message?: string; issues?: string[]; data?: unknown }

const blankDefinition = (): WorkflowDefinition => parseWorkflowDefinition({
  name: 'Untitled workflow', description: '', trigger: { type: 'lead.created', config: {} },
  conditions: null, exitEvents: [], reentryPolicy: 'once_per_event',
  steps: [{ key: 'stop_workflow', position: 0, parentKey: null, branch: null, stepType: 'action', conditions: null, action: { type: 'stop_workflow', config: {} } }],
});

function parseJsonDefinition(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') throw new Error('Workflow definition is missing');
  return parseWorkflowDefinition(JSON.parse(value));
}

export async function createWorkflowAction(_state: WorkflowActionState | undefined, formData: FormData): Promise<WorkflowActionState> {
  const profile = await requireRole(['admin']);
  const templateKey = String(formData.get('template_key') ?? 'blank');
  const template = templateKey === 'blank' ? null : getWorkflowTemplate(templateKey);
  if (templateKey !== 'blank' && !template) return { message: 'That template is no longer available.' };
  const definition = template ? structuredClone(template.definition) : blankDefinition();
  const contractorId = String(formData.get('contractor_id') ?? '').trim() || null;
  const db = await createClient();
  const { data, error } = await db.rpc('create_workflow_definition', {
    p_definition: definition, p_contractor_id: contractorId, p_template_key: template?.key ?? null,
    p_source_template_id: null, p_actor: profile.id,
  });
  if (error || !data) return { message: error?.message.includes('function') ? 'Apply migration 0025 before creating workflows.' : 'Could not create the workflow.' };
  revalidatePath('/app/workflows');
  redirect(`/app/workflows/${data}`);
}

export async function saveWorkflowAction(_state: WorkflowActionState | undefined, formData: FormData): Promise<WorkflowActionState> {
  const profile = await requireRole(['admin']);
  try {
    const definition = parseJsonDefinition(formData.get('definition'));
    const id = String(formData.get('workflow_id'));
    const expected = Number(formData.get('version'));
    const existing = await getWorkflow(id);
    if (!existing) return { message: 'Workflow not found.' };
    if (existing.enabled) {
      const issues = validateWorkflowForEnable(definition, { contractorId: existing.contractorId }).map(issue => issue.message);
      const sender = await senderIssue(definition, existing.contractorId); if (sender) issues.push(sender);
      if (issues.length) return { message: 'Disable this workflow before saving unsupported changes.', issues };
    }
    const db = await createClient();
    const { data, error } = await db.rpc('save_workflow_definition', { p_workflow_id: id, p_expected_version: expected, p_definition: definition, p_actor: profile.id });
    if (error) return { message: error.code === '40001' ? 'This workflow changed in another tab. Refresh before saving again.' : 'Could not save the workflow.' };
    revalidatePath('/app/workflows'); revalidatePath(`/app/workflows/${id}`);
    return { ok: true, message: 'Workflow saved.', data: { version: data } };
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'The workflow definition is invalid.' };
  }
}

async function senderIssue(definition: WorkflowDefinition, contractorId: string | null): Promise<string | null> {
  if (!definition.steps.some((step) => step.stepType === 'action' && step.action.type === 'send_sms')) return null;
  if (WORKFLOW_ACTIONS.send_sms.availability !== 'ready') return null;
  const db = createAdminClient();
  let query = db.from('messaging_senders').select('id', { count: 'exact', head: true }).eq('channel', 'sms').eq('is_active', true);
  query = contractorId ? query.eq('contractor_id', contractorId) : query.is('contractor_id', null);
  const { count, error } = await query;
  return error || !count ? 'Send SMS is not configured for this account.' : null;
}

export async function toggleWorkflowAction(formData: FormData) {
  await requireRole(['admin']);
  const id = String(formData.get('workflow_id'));
  const enable = String(formData.get('enabled')) === 'true';
  const workflow = await getWorkflow(id);
  if (!workflow) redirect('/app/workflows?error=not-found');
  if (enable) {
    const issues = validateWorkflowForEnable(workflow, { contractorId: workflow.contractorId }).map((issue) => issue.message);
    const sender = await senderIssue(workflow, workflow.contractorId); if (sender) issues.push(sender);
    if (issues.length) redirect(`/app/workflows/${id}?enable_error=${encodeURIComponent(issues.join('|'))}`);
  }
  const db = await createClient();
  const { error } = await db.rpc('set_workflow_enabled', { p_workflow_id: id, p_enabled: enable, p_expected_version: workflow.version });
  if (error) redirect(`/app/workflows/${id}?enable_error=${encodeURIComponent('The workflow changed. Refresh and try again.')}`);
  revalidatePath('/app/workflows'); revalidatePath(`/app/workflows/${id}`);
  redirect(`/app/workflows/${id}`);
}

export async function duplicateWorkflowAction(formData: FormData) {
  const profile = await requireRole(['admin']);
  const source = await getWorkflow(String(formData.get('workflow_id')));
  if (!source) redirect('/app/workflows?error=not-found');
  const definition = parseWorkflowDefinition({
    name: `${source.name} Copy`, description: source.description, trigger: source.trigger,
    conditions: source.conditions, exitEvents: source.exitEvents, reentryPolicy: source.reentryPolicy, steps: source.steps,
  });
  const db = await createClient();
  const { data, error } = await db.rpc('create_workflow_definition', {
    p_definition: definition, p_contractor_id: source.contractorId, p_template_key: source.templateKey,
    p_source_template_id: source.id, p_actor: profile.id,
  });
  if (error || !data) redirect(`/app/workflows/${source.id}?error=duplicate`);
  revalidatePath('/app/workflows'); redirect(`/app/workflows/${data}`);
}

export async function archiveWorkflowAction(formData: FormData) {
  await requireRole(['admin']);
  const db = await createClient();
  await db.rpc('archive_workflow', { p_workflow_id: String(formData.get('workflow_id')) });
  revalidatePath('/app/workflows'); redirect('/app/workflows');
}

export async function dryRunWorkflowAction(_state: WorkflowActionState | undefined, formData: FormData): Promise<WorkflowActionState> {
  await requireRole(['admin']);
  const workflowId = String(formData.get('workflow_id'));
  const eventId = String(formData.get('event_id'));
  const db = createAdminClient();
  const { data: row } = await db.from('workflow_events').select('*').eq('id', eventId).maybeSingle();
  if (!row) return { message: 'Choose a saved event to test against.' };
  try {
    const result = await dryRunWorkflowEvent(eventFromRow(row as never), { db, workflowId });
    return { ok: true, message: 'Dry run complete. No actions were sent.', data: result.workflows[0] ?? null };
  } catch { return { message: 'The dry run could not be completed.' }; }
}
