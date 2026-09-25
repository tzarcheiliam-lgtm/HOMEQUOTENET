import { WORKFLOW_ACTIONS, type WorkflowActionType } from './actions';
import { evaluateWorkflowConditions, resolveWorkflowPath, type ConditionEvaluation } from './evaluator';
import { WORKFLOW_TRIGGER_CONFIG_SCHEMAS, workflowCanSeeEvent, type WorkflowEvent } from './events';
import { orderedRootSteps, type Workflow, type WorkflowActionStep } from './definition';

export interface WorkflowEvaluationContext {
  contractor: Record<string, unknown> | null;
  lead: Record<string, unknown> | null;
  assignment: Record<string, unknown> | null;
  appointment: Record<string, unknown> | null;
  estimate: Record<string, unknown> | null;
  event: { payload: Record<string, unknown> };
}

export interface PlannedWorkflowStep {
  key: string;
  action: WorkflowActionType | 'branch';
  wouldExecute: boolean;
  unavailable: boolean;
  conditions: ConditionEvaluation | null;
}

export interface WorkflowPlan {
  workflowId: string;
  workflowVersion: number;
  matched: boolean;
  reason: 'matched' | 'disabled' | 'template' | 'archived' | 'tenant' | 'trigger' | 'trigger_config' | 'conditions';
  conditions: ConditionEvaluation | null;
  steps: PlannedWorkflowStep[];
  unavailableActions: WorkflowActionType[];
}

export function triggerConfigMatches(workflow: Workflow, event: WorkflowEvent): boolean {
  if (workflow.trigger.type !== event.type) return false;
  const parsed = WORKFLOW_TRIGGER_CONFIG_SCHEMAS[event.type].safeParse(workflow.trigger.config);
  if (!parsed.success) return false;
  const config = parsed.data as { fromStatuses?: string[]; toStatuses?: string[]; channels?: string[] };
  const payload = event.payload as Record<string, unknown>;
  if (config.fromStatuses && !config.fromStatuses.includes(String(payload.fromStatus ?? ''))) return false;
  if (config.toStatuses && !config.toStatuses.includes(String(payload.toStatus ?? ''))) return false;
  if (config.channels && !config.channels.includes(String(payload.channel ?? ''))) return false;
  return true;
}

export function workflowResolver(context: WorkflowEvaluationContext) {
  return (field: string) => resolveWorkflowPath(context, field);
}

export function planWorkflow(
  workflow: Workflow,
  event: WorkflowEvent,
  context: WorkflowEvaluationContext
): WorkflowPlan {
  const base = {
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    conditions: null as ConditionEvaluation | null,
    steps: [] as PlannedWorkflowStep[],
    unavailableActions: [] as WorkflowActionType[],
  };
  if (!workflow.enabled) return { ...base, matched: false, reason: 'disabled' };
  if (workflow.isTemplate) return { ...base, matched: false, reason: 'template' };
  if (workflow.archivedAt) return { ...base, matched: false, reason: 'archived' };
  if (workflow.trigger.type !== event.type) return { ...base, matched: false, reason: 'trigger' };
  if (!workflowCanSeeEvent(workflow.contractorId, event.contractorId)) {
    return { ...base, matched: false, reason: 'tenant' };
  }
  if (!triggerConfigMatches(workflow, event)) return { ...base, matched: false, reason: 'trigger_config' };

  const resolve = workflowResolver(context);
  const conditions = workflow.conditions ? evaluateWorkflowConditions(workflow.conditions, resolve) : null;
  if (conditions && !conditions.matched) return { ...base, matched: false, reason: 'conditions', conditions };

  const steps = orderedRootSteps(workflow).map((step): PlannedWorkflowStep => {
    if (step.stepType === 'branch') {
      return { key: step.key, action: 'branch', wouldExecute: false, unavailable: true, conditions: evaluateWorkflowConditions(step.conditions, resolve) };
    }
    const guard = step.conditions ? evaluateWorkflowConditions(step.conditions, resolve) : null;
    const unavailable = WORKFLOW_ACTIONS[step.action.type].availability !== 'ready';
    return {
      key: step.key,
      action: step.action.type,
      wouldExecute: !unavailable && (guard?.matched ?? true),
      unavailable,
      conditions: guard,
    };
  });
  return {
    ...base,
    matched: true,
    reason: 'matched',
    conditions,
    steps,
    unavailableActions: Array.from(
      new Set(
        steps
          .filter((step) => step.unavailable && step.action !== 'branch')
          .map((step) => step.action as WorkflowActionType)
      )
    ),
  };
}

export function executableActionSteps(workflow: Workflow): WorkflowActionStep[] {
  return orderedRootSteps(workflow).filter((step): step is WorkflowActionStep => step.stepType === 'action');
}
