import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_ACTIONS, WORKFLOW_ACTION_CONFIG_SCHEMAS, WORKFLOW_TEMPLATES,
  actionAvailabilityLabel, defaultCondition, newWorkflowStep, validateWorkflowForEnable,
} from '@/lib/workflows';

describe('workflow management UI contracts', () => {
  it('offers the five canonical useful templates', () => {
    expect(WORKFLOW_TEMPLATES.map(template => template.definition.name)).toEqual([
      'New Lead Intake', 'No Answer Follow-Up', 'Appointment Confirmation', 'No-Show Recovery', 'Estimate Follow-Up',
    ]);
  });

  it('creates valid defaults for every ready action', () => {
    for (const [type, definition] of Object.entries(WORKFLOW_ACTIONS)) {
      if (definition.availability !== 'ready') continue;
      const step = newWorkflowStep(type as keyof typeof WORKFLOW_ACTIONS, 2);
      expect(WORKFLOW_ACTION_CONFIG_SCHEMAS[type as keyof typeof WORKFLOW_ACTIONS].safeParse(step.action.config).success, type).toBe(true);
      expect(step.position).toBe(2);
    }
  });

  it('derives unavailable labels and activation failures from the canonical registry', () => {
    expect(actionAvailabilityLabel('send_sms')).toBe('Provider not configured');
    const definition = WORKFLOW_TEMPLATES.find(template => template.key === 'no_answer_follow_up')!.definition;
    expect(validateWorkflowForEnable(definition, { contractorId: null }).map(issue => issue.code)).toContain('action_unavailable');
  });

  it('creates a canonical editable condition', () => {
    expect(defaultCondition('lead.status')).toEqual({ field: 'lead.status', operator: 'equals', value: 'new' });
  });

  it('ships responsive management, builder, dry-run, and history routes', () => {
    const dashboard = readFileSync('app/app/workflows/page.tsx', 'utf8');
    const builder = readFileSync('components/workflows/workflow-builder.tsx', 'utf8');
    const detail = readFileSync('app/app/workflows/[id]/page.tsx', 'utf8');
    const run = readFileSync('app/app/workflows/runs/[runId]/page.tsx', 'utf8');
    expect(dashboard).toContain('Workflow Automations');
    expect(builder).toContain('md:hidden');
    expect(builder).toContain('Move step up');
    expect(detail).toContain('DryRunPanel');
    expect(run).toContain('Step history');
  });
});
