import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { eventFromRow, workflowFromRows, type Workflow, type WorkflowEventRow, type WorkflowRunRow, type WorkflowStepRunRow } from '@/lib/workflows';

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  contractorId: string | null;
  contractorName: string | null;
  templateKey: string | null;
  version: number;
  updatedAt: string;
  runCount: number;
  completedCount: number;
  failedCount: number;
  waitingCount: number;
  lastRun: { id: string; status: string; createdAt: string } | null;
}

export async function listWorkflows(): Promise<WorkflowListItem[]> {
  const db = await createClient();
  const { data: rows, error } = await db.from('workflows')
    .select('id,name,description,enabled,trigger_type,contractor_id,template_key,version,updated_at,contractor:contractors(name)')
    .eq('is_template', false).is('archived_at', null).order('updated_at', { ascending: false });
  if (error) throw new Error('Workflow list is unavailable');
  const ids = (rows ?? []).map((row) => row.id);
  const { data: runs } = ids.length ? await db.from('workflow_runs').select('id,workflow_id,status,created_at').in('workflow_id', ids).order('created_at', { ascending: false }) : { data: [] };
  return (rows ?? []).map((row) => {
    const own = (runs ?? []).filter((run) => run.workflow_id === row.id);
    const contractor = Array.isArray(row.contractor) ? row.contractor[0] : row.contractor;
    return {
      id: row.id, name: row.name, description: row.description, enabled: row.enabled,
      triggerType: row.trigger_type, contractorId: row.contractor_id,
      contractorName: contractor?.name ?? null, templateKey: row.template_key, version: row.version,
      updatedAt: row.updated_at, runCount: own.length,
      completedCount: own.filter((run) => run.status === 'completed').length,
      failedCount: own.filter((run) => run.status === 'failed').length,
      waitingCount: own.filter((run) => run.status === 'waiting').length,
      lastRun: own[0] ? { id: own[0].id, status: own[0].status, createdAt: own[0].created_at } : null,
    };
  });
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  const db = await createClient();
  const { data: row } = await db.from('workflows').select('*').eq('id', id).maybeSingle();
  if (!row) return null;
  const { data: steps, error } = await db.from('workflow_steps').select('*').eq('workflow_id', id).order('position');
  if (error) throw new Error('Workflow steps are unavailable');
  return workflowFromRows(row as never, (steps ?? []) as never);
}

export async function listWorkflowEvents(type: string, limit = 20) {
  const db = await createClient();
  const { data } = await db.from('workflow_events').select('*').eq('type', type).order('occurred_at', { ascending: false }).limit(limit);
  return (data ?? []).map((row) => eventFromRow(row as WorkflowEventRow));
}

export async function listWorkflowRuns(workflowId?: string) {
  const db = await createClient();
  let query = db.from('workflow_runs').select('*,workflow:workflows(name),lead:leads(first_name,last_name),contractor:contractors(name)').order('created_at', { ascending: false }).limit(200);
  if (workflowId) query = query.eq('workflow_id', workflowId);
  const { data, error } = await query;
  if (error) throw new Error('Workflow runs are unavailable');
  return data ?? [];
}

export async function getWorkflowRun(id: string) {
  const db = await createClient();
  const [{ data: run }, { data: steps }, { data: logs }] = await Promise.all([
    db.from('workflow_runs').select('*,workflow:workflows(name),lead:leads(first_name,last_name),contractor:contractors(name)').eq('id', id).maybeSingle(),
    db.from('workflow_step_runs').select('*').eq('run_id', id).order('created_at'),
    db.from('workflow_logs').select('*').eq('run_id', id).order('created_at'),
  ]);
  return run ? { run: run as unknown as WorkflowRunRow & Record<string, unknown>, steps: (steps ?? []) as WorkflowStepRunRow[], logs: logs ?? [] } : null;
}
