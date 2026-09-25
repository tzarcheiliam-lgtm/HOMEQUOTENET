import { parseWorkflowDefinition, type WorkflowDefinition } from './definition';

/**
 * Prebuilt workflow templates — pure data validated by the same schema as any
 * workflow. No template behavior lives in application code: the engine runs a
 * cloned template exactly like a hand-built workflow.
 *
 * Storage: a template is materialized as a public.workflows row with
 * is_template = true, template_key = key (global, never enabled, never run).
 * Cloning copies the definition into a new row owned by HomeQuote (NULL) or a
 * contractor, with template_key + source_template_id recording lineage, and
 * enabled = false until an admin turns it on.
 *
 * Several templates use send_sms, which is contract_only today, so they can
 * be cloned and edited but validateWorkflowForEnable() blocks enabling them
 * until an SMS provider is connected. That is intentional.
 */

export interface WorkflowTemplate {
  key: string;
  /** Bump when the template's definition changes. */
  version: number;
  definition: WorkflowDefinition;
}

const tpl = (key: string, version: number, definition: unknown): WorkflowTemplate => ({
  key,
  version,
  definition: parseWorkflowDefinition(definition),
});

const minutes = (amount: number) => ({ mode: 'duration', amount, unit: 'minutes' });
const days = (amount: number) => ({ mode: 'duration', amount, unit: 'days' });

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  tpl('new_lead_intake', 1, {
    name: 'New Lead Intake',
    // No team alert step: HomeQuote already queues one for every intake
    // (trg_lead_intake_alert, migration 0016). Adding one would double-alert.
    description: 'Text the homeowner the moment a lead arrives, then follow up by email.',
    trigger: { type: 'lead.created', config: {} },
    conditions: null,
    exitEvents: ['lead.assigned'],
    reentryPolicy: 'once_per_entity',
    steps: [
      { key: 'welcome_sms', position: 0, stepType: 'action',
        conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
        action: { type: 'send_sms', config: {
          body: 'Hi {{lead.first_name}}, thanks for requesting a quote with HomeQuote! A specialist will reach out shortly. Reply STOP to opt out.' } } },
      { key: 'wait_before_email', position: 1, stepType: 'action', action: { type: 'wait', config: minutes(5) } },
      { key: 'welcome_email', position: 2, stepType: 'action',
        conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
        action: { type: 'send_email', config: {
          to: { kind: 'lead' },
          subject: 'We received your project request',
          body: 'Hi {{lead.first_name}},\n\nThanks for reaching out. We are matching your project with a vetted local pro and will be in touch soon.\n\nHomeQuote' } } },
    ],
  }),

  tpl('no_answer_follow_up', 1, {
    name: 'No Answer Follow-Up',
    description: 'When a call attempt goes unanswered, text and email over the next few days until the lead responds.',
    trigger: { type: 'lead.status_changed', config: { toStatuses: ['contact_attempted'] } },
    conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
    exitEvents: ['lead.qualification_changed', 'appointment.booked'],
    reentryPolicy: 'one_active_per_entity',
    steps: [
      { key: 'missed_you_sms', position: 0, stepType: 'action', action: { type: 'send_sms', config: {
        body: 'Hi {{lead.first_name}}, we just tried calling about your project. When is a good time to talk? Reply STOP to opt out.' } } },
      { key: 'wait_next_morning', position: 1, stepType: 'action', action: { type: 'wait', config: {
        mode: 'until_time_of_day', time: '10:00', dayOffset: 1, timezone: 'America/Los_Angeles' } } },
      { key: 'follow_up_email', position: 2, stepType: 'action', action: { type: 'send_email', config: {
        to: { kind: 'lead' },
        subject: 'Following up on your project',
        body: 'Hi {{lead.first_name}},\n\nWe tried to reach you about your project. Just reply to this email and we will get you matched.\nYou can also call us at {{homequote.phone}}.\n\nHomeQuote' } } },
      { key: 'wait_two_days', position: 3, stepType: 'action', action: { type: 'wait', config: days(2) } },
      { key: 'last_try_sms', position: 4, stepType: 'action',
        conditions: { match: 'all', conditions: [{ field: 'lead.status', operator: 'equals', value: 'contact_attempted' }] },
        action: { type: 'send_sms', config: {
          body: 'Hi {{lead.first_name}}, still interested in your project? Reply YES and we will call you back. Reply STOP to opt out.' } } },
    ],
  }),

  tpl('appointment_confirmation', 1, {
    name: 'Appointment Confirmation',
    description: 'Confirm a booked appointment immediately and remind the homeowner the day before.',
    trigger: { type: 'appointment.booked', config: {} },
    conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
    exitEvents: ['appointment.cancelled'],
    reentryPolicy: 'once_per_event',
    steps: [
      { key: 'confirm_sms', position: 0, stepType: 'action', action: { type: 'send_sms', config: {
        body: 'Hi {{lead.first_name}}, your appointment is confirmed for {{appointment.scheduled_at}}. Reply STOP to opt out.' } } },
      { key: 'confirm_email', position: 1, stepType: 'action', action: { type: 'send_email', config: {
        to: { kind: 'lead' },
        subject: 'Your appointment is confirmed',
        body: 'Hi {{lead.first_name}},\n\nYour appointment is confirmed for {{appointment.scheduled_at}}.\n\nHomeQuote' } } },
      { key: 'wait_day_before', position: 2, stepType: 'action', action: { type: 'wait', config: {
        mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -1440, ifPast: 'skip' } } },
      { key: 'reminder_sms', position: 3, stepType: 'action',
        conditions: { match: 'all', conditions: [{ field: 'appointment.status', operator: 'equals', value: 'scheduled' }] },
        action: { type: 'send_sms', config: {
          body: 'Reminder: your appointment is tomorrow at {{appointment.scheduled_at}}. Reply STOP to opt out.' } } },
    ],
  }),

  tpl('no_show_recovery', 1, {
    name: 'No-Show Recovery',
    description: 'When a homeowner misses an appointment, offer to reschedule and flag it to the team if they go quiet.',
    trigger: { type: 'appointment.no_show', config: {} },
    conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
    exitEvents: ['appointment.booked', 'deal.lost'],
    reentryPolicy: 'one_active_per_entity',
    steps: [
      { key: 'wait_short', position: 0, stepType: 'action', action: { type: 'wait', config: minutes(30) } },
      { key: 'reschedule_sms', position: 1, stepType: 'action', action: { type: 'send_sms', config: {
        body: 'Hi {{lead.first_name}}, sorry we missed you today. Want to pick a new time? Reply here and we will set it up. Reply STOP to opt out.' } } },
      { key: 'wait_one_day', position: 2, stepType: 'action', action: { type: 'wait', config: days(1) } },
      { key: 'reschedule_email', position: 3, stepType: 'action', action: { type: 'send_email', config: {
        to: { kind: 'lead' },
        subject: 'Let’s find a new time',
        body: 'Hi {{lead.first_name}},\n\nWe missed you at your appointment. Reply to this email and we will find a time that works.\n\n{{contractor.name}}' } } },
    ],
  }),

  tpl('estimate_follow_up', 1, {
    name: 'Estimate Follow-Up',
    description: 'Check in after an estimate is sent until the deal is won or lost.',
    trigger: { type: 'estimate.sent', config: {} },
    conditions: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] },
    exitEvents: ['deal.won', 'deal.lost'],
    reentryPolicy: 'one_active_per_entity',
    steps: [
      { key: 'wait_two_days', position: 0, stepType: 'action', action: { type: 'wait', config: days(2) } },
      { key: 'check_in_email', position: 1, stepType: 'action', action: { type: 'send_email', config: {
        to: { kind: 'lead' },
        subject: 'Any questions about your estimate?',
        body: 'Hi {{lead.first_name}},\n\nJust checking in on the estimate from {{contractor.name}}. Happy to answer any questions.\n\n{{contractor.name}}' } } },
      { key: 'wait_three_days', position: 2, stepType: 'action', action: { type: 'wait', config: days(3) } },
      { key: 'check_in_sms', position: 3, stepType: 'action', action: { type: 'send_sms', config: {
        body: 'Hi {{lead.first_name}}, any questions on your estimate from {{contractor.name}}? Reply here. Reply STOP to opt out.' } } },
      { key: 'wait_five_days', position: 4, stepType: 'action', action: { type: 'wait', config: days(5) } },
      { key: 'mark_follow_up_done', position: 5, stepType: 'action', action: { type: 'stop_workflow', config: {
        reason: 'Follow-up sequence finished without a decision' } } },
    ],
  }),
];

export function getWorkflowTemplate(key: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.key === key);
}

/**
 * Pure clone: the row values for a new, disabled workflow built from a
 * template. The caller inserts it (plus stepRowsFor(...)) in one transaction.
 */
export function cloneTemplate(
  template: WorkflowTemplate,
  owner: { contractorId: string | null; createdBy: string | null; sourceTemplateId?: string | null; name?: string }
) {
  const definition: WorkflowDefinition = structuredClone(template.definition);
  if (owner.name) definition.name = owner.name;
  return {
    definition,
    row: {
      contractor_id: owner.contractorId,
      name: definition.name,
      description: definition.description ?? null,
      is_template: false,
      template_key: template.key,
      source_template_id: owner.sourceTemplateId ?? null,
      trigger_type: definition.trigger.type,
      trigger_config: definition.trigger.config as Record<string, unknown>,
      conditions: definition.conditions,
      exit_events: definition.exitEvents,
      reentry_policy: definition.reentryPolicy,
      enabled: false,
      version: 1,
      created_by: owner.createdBy,
      updated_by: owner.createdBy,
    },
  };
}
