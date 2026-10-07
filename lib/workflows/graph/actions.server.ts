import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { executeWorkflowAction, deliverWorkflowEmail, resolveTemplateEmail } from '../actions.server';
import { renderWorkflowTemplate } from '../merge';
import type { WorkflowActionResult, WorkflowError, WorkflowEvent } from '@/lib/workflows';
import { NODE_CONFIG_SCHEMAS, type GraphNode } from './model';
import type { GraphEvaluationContext } from './render';

type Db = ReturnType<typeof createAdminClient>;

export interface GraphActionInput {
  db: Db;
  node: GraphNode;
  config: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ctx: GraphEvaluationContext;
  event: WorkflowEvent;
  run: { id: string; workflowId: string; contractorId: string | null; leadId: string | null; mode: 'live' | 'test'; testRecipients: string[] };
  stepRun: { id: string; stepKey: string; attempt: number; idempotencyKey: string };
  now: Date;
}

const wfError = (code: string, message: string, kind: 'temporary' | 'permanent'): WorkflowError => ({ code, message, kind, retryable: kind === 'temporary' });
const temporary = (code: string, message: string): WorkflowActionResult => ({ outcome: 'temporary_failure', error: wfError(code, message, 'temporary') });
const permanent = (code: string, message: string): WorkflowActionResult => ({ outcome: 'permanent_failure', error: wfError(code, message, 'permanent') });
const render = (text: string, ctx: GraphEvaluationContext) =>
  renderWorkflowTemplate(text, ctx, { phone: process.env.HOMEQUOTE_PHONE, siteUrl: process.env.NEXT_PUBLIC_SITE_URL });

/**
 * Side effects of the non-call graph nodes. Every one of them is idempotent per
 * step run (outbox unique key, unique task per step run, unique note per step run,
 * or a naturally repeatable update), so a retry after a crash never duplicates it.
 *
 * Live-test runs (run.mode === 'test') are deliberately narrower: email reaches only
 * the explicitly chosen test recipients, tasks/notes are labelled "[Test]", and
 * anything that changes a real record or notifies real people is skipped.
 */
export async function executeGraphAction(input: GraphActionInput): Promise<WorkflowActionResult> {
  const { db, node, config, ctx, run, event } = input;
  const test = run.mode === 'test';
  const legacyContext = {
    run: { id: run.id, workflowId: run.workflowId, contractorId: run.contractorId, leadId: run.leadId },
    stepRun: input.stepRun,
    event,
    now: input.now,
  };

  switch (node.type) {
    case 'send_email': {
      const c = NODE_CONFIG_SCHEMAS.send_email.parse(config);
      // Consent: a live email needs the lead's recorded consent. A test email goes only to someone who chose to receive it.
      if (!test && ctx.lead?.consent_granted !== true) return { outcome: 'skipped', reason: 'no_consent' };
      if (test && !run.testRecipients.length) return { outcome: 'skipped', reason: 'missing_contact' };
      const legacy = { ...legacyContext, action: { type: 'send_email' as const, config: c } };
      const exec = { db, context: legacy as never, values: ctx };
      const override = test ? run.testRecipients : undefined;
      if (c.templateId) {
        if (run.contractorId) {
          const { data: tpl } = await db.from('email_templates').select('contractor_visible,is_active').eq('id', c.templateId).maybeSingle();
          if (!tpl || !(tpl as { contractor_visible: boolean }).contractor_visible) return permanent('email_template_not_allowed', 'This email template is not available to contractors');
        }
        const resolved = await resolveTemplateEmail(db, c.templateId, ctx);
        if (!resolved) return temporary('email_template_unavailable', 'The saved email template is missing or inactive');
        return deliverWorkflowEmail(exec, c.to, resolved.subject, resolved.text, resolved.html, override);
      }
      return deliverWorkflowEmail(exec, c.to, c.subject!, c.body!, undefined, override);
    }

    case 'create_task': {
      const c = NODE_CONFIG_SCHEMAS.create_task.parse(config);
      let assignee: string | null = null;
      if (c.assignee.kind === 'assigned_user') {
        assignee = typeof ctx.assignment?.assigned_user_id === 'string' ? ctx.assignment.assigned_user_id : null;
      } else if (c.assignee.kind === 'user') {
        const { data } = await db.from('profiles').select('id,role,contractor_id,is_active').eq('id', c.assignee.userId).maybeSingle();
        const p = data as { id: string; role: string; contractor_id: string | null; is_active: boolean } | null;
        const eligible = !!p?.is_active && (run.contractorId ? p.role === 'contractor' && p.contractor_id === run.contractorId : ['admin', 'setter', 'caller'].includes(p.role));
        if (!eligible) return permanent('assignee_not_eligible', 'The chosen team member cannot be assigned tasks for this workflow');
        assignee = p!.id;
      }
      const title = `${test ? '[Test] ' : ''}${render(c.title, ctx)}`.slice(0, 200);
      const { error } = await db.from('workflow_tasks').insert({
        contractor_id: run.contractorId,
        lead_id: run.leadId,
        run_id: run.id,
        step_run_id: input.stepRun.id,
        title,
        description: c.description ? render(c.description, ctx).slice(0, 2000) : null,
        due_at: c.dueInMinutes !== undefined ? new Date(input.now.getTime() + c.dueInMinutes * 60_000).toISOString() : null,
        assignee_user_id: assignee,
      });
      if (error && error.code !== '23505') return temporary('task_create_failed', 'Could not create the task');
      return { outcome: 'success', output: { created: !error } };
    }

    case 'add_note': {
      const c = NODE_CONFIG_SCHEMAS.add_note.parse(config);
      if (!run.leadId) return { outcome: 'skipped', reason: 'missing_lead' };
      const body = `${test ? '[Test] ' : ''}${render(c.body, ctx)}`.slice(0, 2000);
      const { error } = await db.from('lead_activities').insert({
        lead_id: run.leadId,
        actor_id: null,
        type: 'note',
        body,
        // contractor_id scopes the note to that contractor (and staff) via RLS; network notes are staff-only.
        metadata: { source: 'workflow', run_id: run.id, step_run_id: input.stepRun.id, ...(run.contractorId ? { contractor_id: run.contractorId } : {}) },
      });
      if (error && error.code !== '23505') return temporary('note_create_failed', 'Could not add the note');
      return { outcome: 'success', output: { created: !error } };
    }

    case 'update_lead_status': {
      const c = NODE_CONFIG_SCHEMAS.update_lead_status.parse(config);
      if (test) return { outcome: 'skipped', reason: 'test_mode' };
      if (run.contractorId && c.pipeline === 'lead') return permanent('network_only', 'Contractor workflows can change only their own pipeline stage');
      const assignmentId = typeof ctx.assignment?.id === 'string' ? ctx.assignment.id : null;
      if (c.pipeline === 'assignment' && !assignmentId) return { outcome: 'skipped', reason: 'missing_assignment' };
      if (!run.leadId) return { outcome: 'skipped', reason: 'missing_lead' };
      if (assignmentId && run.contractorId && ctx.assignment?.contractor_id !== run.contractorId) return permanent('tenant_mismatch', 'The lead belongs to a different contractor');
      const { error } = await db.rpc('workflow_change_pipeline_stage', {
        p_pipeline: c.pipeline, p_lead: run.leadId, p_assignment: assignmentId, p_status: c.status,
        p_causation: event.id, p_correlation: event.correlationId ?? event.id,
      });
      return error ? permanent('pipeline_update_failed', 'Could not change the stage') : { outcome: 'success', output: { pipeline: c.pipeline, status: c.status } };
    }

    case 'assign_lead': {
      const c = NODE_CONFIG_SCHEMAS.assign_lead.parse(config);
      if (test) return { outcome: 'skipped', reason: 'test_mode' };
      const assignmentId = typeof ctx.assignment?.id === 'string' ? ctx.assignment.id : null;
      const contractorId = typeof ctx.assignment?.contractor_id === 'string' ? ctx.assignment.contractor_id : null;
      if (!assignmentId || !contractorId) return { outcome: 'skipped', reason: 'missing_assignment' };
      if (run.contractorId && contractorId !== run.contractorId) return permanent('tenant_mismatch', 'The lead belongs to a different contractor');
      // Eligible = active login of THIS contractor company, chosen by the workflow author.
      const { data: people } = await db.from('profiles').select('id').in('id', c.userIds).eq('role', 'contractor').eq('contractor_id', contractorId).eq('is_active', true);
      const eligible = ((people ?? []) as { id: string }[]).map((p) => p.id).sort();
      if (!eligible.length) return permanent('no_eligible_user', 'None of the chosen team members can take this lead');
      let chosen = eligible[0];
      if (c.strategy === 'round_robin' && eligible.length > 1) {
        // Fewest open leads first (ties broken by id) so the load stays even and the choice is repeatable.
        const counts = await Promise.all(eligible.map(async (id) => {
          const { count } = await db.from('lead_assignments').select('id', { head: true, count: 'exact' }).eq('assigned_user_id', id).not('status', 'in', '(lost,sold,returned,not_qualified)');
          return { id, n: count ?? 0 };
        }));
        chosen = counts.sort((a, b) => a.n - b.n || a.id.localeCompare(b.id))[0].id;
      }
      if (ctx.assignment?.assigned_user_id === chosen) return { outcome: 'success', output: { alreadyAssigned: true } };
      const { error } = await db.rpc('workflow_assign_lead_user', { p_assignment: assignmentId, p_user: chosen, p_causation: event.id, p_correlation: event.correlationId ?? event.id });
      return error ? permanent('assign_failed', 'Could not assign the lead') : { outcome: 'success', output: { assigned: true } };
    }

    case 'send_notification': {
      const c = NODE_CONFIG_SCHEMAS.send_notification.parse(config);
      if (test) return { outcome: 'skipped', reason: 'test_mode' };
      const legacy = { ...legacyContext, action: { type: 'send_push' as const, config: { audience: c.audience, userId: c.userId, title: c.title, body: c.body } } };
      return executeWorkflowAction({ db, context: legacy as never, values: ctx });
    }

    default:
      return { outcome: 'skipped', reason: 'unavailable_action' };
  }
}
