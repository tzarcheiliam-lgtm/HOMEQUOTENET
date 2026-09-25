import { CONDITION_FIELDS, type WorkflowCondition, type WorkflowConditionField } from './conditions';
import { WORKFLOW_ACTIONS, type WorkflowAction, type WorkflowActionType } from './actions';
import type { WorkflowActionStep } from './definition';

export const workflowActionDefaultConfig = (type: WorkflowActionType): Record<string, unknown> => {
  switch (type) {
    case 'send_sms': return { body: 'Hi {{lead.first_name}}, thanks for reaching out. Reply STOP to opt out.', respectQuietHours: true };
    case 'send_email': return { to: { kind: 'lead' }, subject: 'Following up on your project', body: 'Hi {{lead.first_name}},\n\nWe are following up on your project.\n\nHomeQuote' };
    case 'change_pipeline_stage': return { pipeline: 'lead', status: 'contact_attempted' };
    case 'wait': return { mode: 'duration', amount: 2, unit: 'hours' };
    case 'send_webhook': return { url: 'https://example.com/webhooks/homequote', includeLeadContact: false };
    case 'notify_team': return { audience: { kind: 'lead_alert_team' }, subject: 'Workflow update', message: 'A workflow needs attention for {{lead.first_name}}.' };
    case 'create_calendar_event': return { startsInMinutes: 1440, location: '' };
    case 'stop_workflow': return { reason: '' };
    case 'assign_user': return { strategy: 'specific', userIds: ['00000000-0000-0000-0000-000000000000'] };
    case 'create_task': return { title: 'Follow up' };
    case 'add_tag': return { tag: 'follow-up' };
    case 'remove_tag': return { tag: 'follow-up' };
  }
};

export function newWorkflowStep(type: WorkflowActionType, position: number): WorkflowActionStep {
  return {
    key: `${type}_${Date.now().toString(36)}_${position}`.slice(0, 64), position, parentKey: null, branch: null,
    stepType: 'action' as const, conditions: null, action: { type, config: workflowActionDefaultConfig(type) } as WorkflowAction,
  };
}

export function defaultCondition(field: WorkflowConditionField = 'lead.status'): WorkflowCondition {
  const definition = CONDITION_FIELDS.find((item) => item.field === field)!;
  const value = definition.enumValues?.[0] ?? (definition.valueType === 'boolean' ? true : definition.valueType === 'number' ? 0 : '');
  return { field, operator: 'equals', value };
}

export function actionAvailabilityLabel(type: WorkflowActionType): string | null {
  const status = WORKFLOW_ACTIONS[type].availability;
  return status === 'ready' ? null : status === 'contract_only' ? 'Provider not configured' : 'Coming soon';
}
