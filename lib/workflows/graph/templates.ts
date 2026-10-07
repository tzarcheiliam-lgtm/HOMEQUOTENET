import { autoLayout, DEFAULT_SETTINGS } from './edit';
import { GRAPH_SCHEMA_VERSION, type GraphEdge, type GraphNode, type GraphNodeType, type GraphSettings, type WorkflowGraph } from './model';

/**
 * Starter templates for the visual builder. They are plain data (validated by the
 * same validator as any workflow) and are only ever instantiated as an UNPUBLISHED
 * DRAFT: creating one never enrolls, contacts or changes anything. Publishing
 * enrolls only events recorded after the publish moment, so no existing lead is
 * touched either.
 *
 * Stop conditions are built in: every contact step is suppressed once a homeowner
 * opts out (engine rule), exit events cancel runs when the deal is won/lost or the
 * appointment changes, and bounded retries are set on the call steps.
 */

export interface GraphTemplate {
  key: string;
  version: number;
  name: string;
  summary: string;
  description: string;
  /** Plain-language requirements shown before use. */
  requires: string[];
  graph: WorkflowGraph;
}

type N = { id: string; type: GraphNodeType; name?: string; config?: Record<string, unknown> };
const build = (nodes: N[], edges: [string, string, string][], settings: Partial<GraphSettings> = {}): WorkflowGraph =>
  autoLayout({
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: nodes.map((n): GraphNode => ({ id: n.id, type: n.type, ...(n.name ? { name: n.name } : {}), position: { x: 0, y: 0 }, config: n.config ?? {} })),
    edges: edges.map(([source, sourceHandle, target]): GraphEdge => ({ id: `${source}:${sourceHandle}->${target}`, source, sourceHandle, target })),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  });

const task = (id: string, title: string, dueInMinutes: number, name?: string): N => ({
  id, type: 'create_task', name, config: { title, dueInMinutes, assignee: { kind: 'unassigned' }, onError: 'fail_run' },
});
const note = (id: string, body: string, name?: string): N => ({ id, type: 'add_note', name, config: { body, onError: 'fail_run' } });
const end = (id: string, reason?: string): N => ({ id, type: 'end', config: reason ? { reason } : {} });

// 1 ---------------------------------------------------------------------------------------
const aiQualification = build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'lead.assigned', filters: {}, entry: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] } } },
    { id: 'call_homeowner', type: 'ai_call', name: 'Call homeowner', config: { purpose: 'qualification', contextFields: ['project_type', 'city'], maxAttempts: 2, retryDelayMinutes: 120, resultTimeoutMinutes: 480, analysisGraceMinutes: 30 } },
    note('note_booked', 'The AI call ended with a confirmed appointment for the homeowner.', 'Note: booked'),
    { id: 'notify_booked', type: 'send_notification', name: 'Tell the team', config: { audience: 'assigned_contractor', title: 'Appointment confirmed after AI call', body: 'Open the lead for details.', onError: 'fail_run' } },
    task('task_schedule', 'Schedule an estimate with {{lead.first_name}} — qualified by AI call', 60, 'Schedule the estimate'),
    task('task_callback', 'Call {{lead.first_name}} back — they asked for a callback', 120, 'Call back'),
    task('task_review', 'Review the AI call with {{lead.first_name}} and decide next steps', 120, 'Review the call'),
    task('task_no_answer', 'Reach {{lead.first_name}} — AI call went unanswered', 240, 'Follow up (no answer)'),
    note('note_wrong', 'The AI call reached a wrong number. Verify the homeowner contact details.', 'Note: wrong number'),
    task('task_verify', 'Verify the phone number for {{lead.first_name}}', 240, 'Verify contact details'),
    note('note_opt_out', 'The homeowner asked not to be contacted. Automated calls and emails to this homeowner have stopped.', 'Note: opted out'),
    task('task_failed', 'Call {{lead.first_name}} manually — the AI call could not be completed', 120, 'Call manually'),
    end('end_booked'), end('end_qualified'), end('end_callback'), end('end_review'), end('end_no_answer'), end('end_wrong'), end('end_opt_out', 'Opted out'), end('end_failed'),
  ],
  [
    ['trigger', 'next', 'call_homeowner'],
    ['call_homeowner', 'booked', 'note_booked'], ['note_booked', 'next', 'notify_booked'], ['notify_booked', 'next', 'end_booked'],
    ['call_homeowner', 'qualified_awaiting_scheduling', 'task_schedule'], ['task_schedule', 'next', 'end_qualified'],
    ['call_homeowner', 'callback_requested', 'task_callback'], ['task_callback', 'next', 'end_callback'],
    ['call_homeowner', 'needs_human_review', 'task_review'], ['task_review', 'next', 'end_review'],
    ['call_homeowner', 'no_answer', 'task_no_answer'], ['task_no_answer', 'next', 'end_no_answer'],
    ['call_homeowner', 'wrong_number', 'note_wrong'], ['note_wrong', 'next', 'task_verify'], ['task_verify', 'next', 'end_wrong'],
    ['call_homeowner', 'opted_out', 'note_opt_out'], ['note_opt_out', 'next', 'end_opt_out'],
    ['call_homeowner', 'failed', 'task_failed'], ['call_homeowner', 'timed_out', 'task_failed'], ['task_failed', 'next', 'end_failed'],
  ],
  { reentry: 'once_per_entity', exitEvents: ['deal.won', 'deal.lost'] }
);

// 2 ---------------------------------------------------------------------------------------
const appointmentReminders = build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'appointment.booked', filters: {}, entry: null } },
    { id: 'confirm_email', type: 'send_email', name: 'Send confirmation email', config: { to: { kind: 'lead' }, subject: 'Your appointment with {{contractor.name}} is confirmed', body: 'Hi {{lead.first_name}},\n\nYour appointment with {{contractor.name}} is set for {{appointment.scheduled_at}}.\n{{appointment.location}}\n\nIf you need to change it, just reply to this email.', onError: 'continue' } },
    { id: 'wait_reminder', type: 'wait_duration', name: 'Wait until 24 hours before', config: { mode: 'before_appointment', hoursBefore: 24, ifPast: 'end' } },
    { id: 'still_on', type: 'condition', name: 'Is the appointment still on?', config: { branches: [{ id: 'still_scheduled', label: 'Still scheduled', conditions: { match: 'any', conditions: [{ field: 'appointment.status', operator: 'equals', value: 'scheduled' }, { field: 'appointment.status', operator: 'equals', value: 'rescheduled' }] } }] } },
    { id: 'reminder_email', type: 'send_email', name: 'Send reminder email', config: { to: { kind: 'lead' }, subject: 'Reminder: your appointment tomorrow with {{contractor.name}}', body: 'Hi {{lead.first_name}},\n\nA quick reminder that {{contractor.name}} is scheduled to see you {{appointment.scheduled_at}}.\n{{appointment.location}}\n\nSee you then!', onError: 'continue' } },
    end('end_sent', 'Reminder sent'), end('end_changed', 'Appointment changed'),
  ],
  [
    ['trigger', 'next', 'confirm_email'], ['confirm_email', 'next', 'wait_reminder'], ['wait_reminder', 'next', 'still_on'],
    ['still_on', 'still_scheduled', 'reminder_email'], ['still_on', 'else', 'end_changed'], ['reminder_email', 'next', 'end_sent'],
  ],
  { reentry: 'once_per_event', exitEvents: ['appointment.cancelled', 'appointment.rescheduled', 'appointment.completed', 'appointment.no_show'] }
);

// 3 ---------------------------------------------------------------------------------------
const noAnswerRetry = build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'ai_call.failed', filters: { results: ['no_answer', 'busy'] }, entry: { match: 'all', conditions: [{ field: 'lead.consent_granted', operator: 'equals', value: true }] } } },
    { id: 'wait_window', type: 'wait_business_hours', name: 'Wait until next business day', config: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, zone: 'lead', timezone: 'America/Los_Angeles', minimumDelayMinutes: 120 } },
    { id: 'retry_call', type: 'ai_call', name: 'Call homeowner again', config: { purpose: 'missed_call_follow_up', contextFields: ['project_type'], maxAttempts: 1, retryDelayMinutes: 60, resultTimeoutMinutes: 480, analysisGraceMinutes: 30 } },
    note('note_reached', 'The follow-up AI call reached the homeowner.', 'Note: reached'),
    note('note_opt_out', 'The homeowner asked not to be contacted. Automated calls and emails to this homeowner have stopped.', 'Note: opted out'),
    task('task_manual', 'Call {{lead.first_name}} — two AI call attempts went unanswered', 120, 'Create staff follow-up'),
    end('end_reached'), end('end_opt_out', 'Opted out'), end('end_task'),
  ],
  [
    ['trigger', 'next', 'wait_window'], ['wait_window', 'next', 'retry_call'],
    ['retry_call', 'booked', 'note_reached'], ['retry_call', 'qualified_awaiting_scheduling', 'note_reached'], ['retry_call', 'callback_requested', 'note_reached'], ['note_reached', 'next', 'end_reached'],
    ['retry_call', 'opted_out', 'note_opt_out'], ['note_opt_out', 'next', 'end_opt_out'],
    ['retry_call', 'no_answer', 'task_manual'], ['retry_call', 'needs_human_review', 'task_manual'], ['retry_call', 'wrong_number', 'task_manual'], ['retry_call', 'failed', 'task_manual'], ['retry_call', 'timed_out', 'task_manual'],
    ['task_manual', 'next', 'end_task'],
  ],
  { reentry: 'once_per_entity', exitEvents: ['deal.won', 'deal.lost', 'appointment.booked'] }
);

// 4 ---------------------------------------------------------------------------------------
const estimateFollowUp = build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'estimate.sent', filters: {}, entry: null } },
    { id: 'wait_3_days', type: 'wait_duration', name: 'Wait 3 days', config: { mode: 'duration', amount: 3, unit: 'days' } },
    { id: 'accepted_yet', type: 'condition', name: 'Has the estimate been accepted?', config: { branches: [{ id: 'accepted', label: 'Accepted', conditions: { match: 'all', conditions: [{ field: 'estimate.status', operator: 'equals', value: 'accepted' }] } }] } },
    { id: 'follow_up_email', type: 'send_email', name: 'Send follow-up email', config: { to: { kind: 'lead' }, subject: 'Any questions about your estimate?', body: 'Hi {{lead.first_name}},\n\nI wanted to check in on the estimate for your {{lead.project_type}} project ({{estimate.amount}}). Happy to answer any questions or adjust the scope.\n\n{{contractor.name}}', onError: 'continue' } },
    { id: 'wait_answer', type: 'wait_event', name: 'Wait for acceptance', config: { event: 'estimate.accepted', timeoutMinutes: 5760 } },
    task('task_call', 'Call {{lead.first_name}} about the {{estimate.amount}} estimate', 60, 'Create call task'),
    end('end_accepted', 'Estimate accepted'), end('end_after_accept', 'Estimate accepted'), end('end_task'),
  ],
  [
    ['trigger', 'next', 'wait_3_days'], ['wait_3_days', 'next', 'accepted_yet'],
    ['accepted_yet', 'accepted', 'end_accepted'], ['accepted_yet', 'else', 'follow_up_email'],
    ['follow_up_email', 'next', 'wait_answer'], ['wait_answer', 'received', 'end_after_accept'], ['wait_answer', 'timed_out', 'task_call'], ['task_call', 'next', 'end_task'],
  ],
  { reentry: 'once_per_event', exitEvents: ['estimate.accepted', 'deal.won', 'deal.lost'] }
);

export const GRAPH_TEMPLATES: readonly GraphTemplate[] = [
  {
    key: 'ai_qualification_call',
    version: 1,
    name: 'New lead → AI qualification call',
    summary: 'Call a newly assigned, consenting lead and follow up by outcome.',
    description: 'When a lead is assigned to a contractor, the AI agent calls to qualify the homeowner. The workflow waits for the result and then books follow-up work for your team depending on what happened. A homeowner who opts out stops all further automated contact.',
    requires: ['AI calling set up for the contractor (agent, phone number, "Workflow only" or "Automatic" mode)', 'The Fish agent returns the post-call analysis fields listed in the call step'],
    graph: aiQualification,
  },
  {
    key: 'appointment_confirmation_reminder',
    version: 1,
    name: 'Appointment booked → confirmation → reminder',
    summary: 'Confirm by email, then remind the homeowner 24 hours before.',
    description: 'Sends a confirmation straight away, waits until 24 hours before the appointment, re-checks that it is still on, and then sends the reminder. Cancelling, rescheduling, completing or a no-show stops the run.',
    requires: ['Gmail connected (Calls → Emails)', 'Homeowner email address and recorded consent'],
    graph: appointmentReminders,
  },
  {
    key: 'no_answer_retry',
    version: 1,
    name: 'No answer → retry once → staff task',
    summary: 'After an unanswered AI call, wait for the next business day, retry once, then hand off to staff.',
    description: 'Starts when an AI call ends unanswered. Waits for the next business-hours window in the homeowner\'s time zone, tries one more call, and creates a task for your team if it still cannot reach them. If you use the first template, this one handles the retry instead of its "no answer" branch.',
    requires: ['AI calling set up for the contractor', 'Homeowner state or ZIP on the lead (needed to respect local calling hours)'],
    graph: noAnswerRetry,
  },
  {
    key: 'estimate_follow_up',
    version: 1,
    name: 'Estimate sent → wait → follow up if not accepted',
    summary: 'Check three days later; email, wait for acceptance, then create a call task.',
    description: 'Waits three days after an estimate is sent and re-reads the estimate. If it has not been accepted the homeowner gets a follow-up email, the workflow waits up to four more days for acceptance, and finally creates a task for your team. Acceptance, a won or lost deal ends the run.',
    requires: ['Gmail connected (Calls → Emails)', 'Estimates recorded as "sent" and "accepted" in the contractor portal'],
    graph: estimateFollowUp,
  },
];

export const getGraphTemplate = (key: string) => GRAPH_TEMPLATES.find((t) => t.key === key) ?? null;
