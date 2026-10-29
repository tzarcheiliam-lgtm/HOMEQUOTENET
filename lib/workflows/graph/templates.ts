import { autoLayout, DEFAULT_SETTINGS } from './edit';
import { GRAPH_SCHEMA_VERSION, nodeDisplayName, type GraphEdge, type GraphNode, type GraphNodeType, type GraphSettings, type WorkflowGraph } from './model';

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

/**
 * Which kind of workflow a template fits:
 *  - `any`: a HomeQuote network workflow or one contractor's workflow;
 *  - `network`: HomeQuote leads only (it alerts the HomeQuote admins or changes the network pipeline);
 *  - `contractor`: one contractor only (it names the contractor, which a network workflow on this trigger cannot).
 */
export type TemplateScope = 'any' | 'network' | 'contractor';

export interface GraphTemplate {
  key: string;
  version: number;
  name: string;
  summary: string;
  description: string;
  /** Plain-language requirements shown before use. */
  requires: string[];
  /** The graph for a HomeQuote network workflow (or the only graph, for a contractor-only template). */
  graph: WorkflowGraph;
  /** Who the template is for. Missing = `any` (older templates). */
  scope?: TemplateScope;
  /** lucide-react icon name for the gallery card. */
  icon?: string;
  /** Same journey worded for a contractor's own workflow (e.g. texts signed with the contractor's name). */
  contractorGraph?: WorkflowGraph;
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

// Texting templates ------------------------------------------------------------------------
// Texts go through the Mac texting bridge (lib/sms queueWorkflowText): opt-outs, texting hours, the daily cap and
// one-conversation-per-number are enforced there, never here. A network workflow on "New lead" / "Appointment booked"
// cannot use {{contractor.name}} (the trigger has no contractor), so the network wording names the HomeQuote team and
// the contractor wording uses {{contractor.name}}.
type Sender = 'network' | 'contractor';
const who = (s: Sender) => (s === 'network' ? 'the HomeQuote team' : '{{contractor.name}}');
const sms = (id: string, name: string, body: string, assistant: boolean, onlyIfNotTexted = false): N => ({ id, type: 'send_sms', name, config: { body, assistant, onlyIfNotTexted, onError: 'continue' } });
const notify = (s: Sender, id: string, name: string, title: string, body: string): N => ({
  id, type: 'send_notification', name, config: { audience: s === 'network' ? 'admins' : 'assigned_contractor', title, body, onError: 'continue' },
});
const consented = { field: 'lead.consent_granted', operator: 'equals', value: true };
const fromSource = (source: string) => ({ match: 'all', conditions: [{ field: 'lead.source', operator: 'equals', value: source }, consented] });
const STOP_ON_PROGRESS = ['appointment.booked', 'deal.won', 'deal.lost'] as GraphSettings['exitEvents'];

// 5 ---------------------------------------------------------------------------------------
// Website funnel leads are stored with leads.source = 'website' (funnel_submit in the migrations).
const speedToLeadWebsite = (s: Sender) => build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: fromSource('website') } },
    { id: 'wait_2_min', type: 'wait_duration', name: 'Wait 2 minutes', config: { mode: 'duration', amount: 2, unit: 'minutes' } },
    sms('first_text', 'Text the lead', `Hi {{lead.first_name}}, this is ${who(s)}. Thanks for your request on our website! Do you have a minute for a couple of quick questions about your project, or would a call be easier?`, true, true),
    end('end_texted', 'First text sent'),
  ],
  [['trigger', 'next', 'wait_2_min'], ['wait_2_min', 'next', 'first_text'], ['first_text', 'next', 'end_texted']],
  { reentry: 'once_per_entity', exitEvents: STOP_ON_PROGRESS }
);

// 6 ---------------------------------------------------------------------------------------
// Meta Instant Form leads are stored with leads.source = 'meta' (lib/integrations/meta.ts).
const speedToLeadMeta = (s: Sender) => build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: fromSource('meta') } },
    sms('first_text', 'Text the lead', `Hi {{lead.first_name}}, this is ${who(s)}. Thanks for filling out our form! Do you have a minute for a couple of quick questions about your project, or would a call be easier?`, true, true),
    end('end_texted', 'First text sent'),
  ],
  [['trigger', 'next', 'first_text'], ['first_text', 'next', 'end_texted']],
  { reentry: 'once_per_entity', exitEvents: STOP_ON_PROGRESS }
);

// 7 ---------------------------------------------------------------------------------------
const noReplyFollowUp = (s: Sender) => build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: { match: 'all', conditions: [consented] } } },
    sms('text_1', 'First text', `Hi {{lead.first_name}}, this is ${who(s)} following up on your home project request. Is now a good time for a quick chat? Just reply here.`, false, true),
    { id: 'wait_reply_1', type: 'wait_event', name: 'Wait up to 1 day for a reply', config: { event: 'message.received', timeoutMinutes: 1440 } },
    sms('text_2', 'Second text', `Hi {{lead.first_name}}, just checking in one more time from ${who(s)}. If you're still planning your project, reply here and we'll help. No worries if the timing isn't right.`, false),
    { id: 'wait_reply_2', type: 'wait_event', name: 'Wait 1 more day for a reply', config: { event: 'message.received', timeoutMinutes: 1440 } },
    notify(s, 'alert_replied', 'Tell the team they replied', 'A lead replied', 'They answered a follow-up text. Open the lead to keep the conversation going.'),
    note('note_cold', 'No reply, marked cold', 'Note: no reply'),
    notify(s, 'alert_cold', 'Tell the team it went cold', 'No reply after two texts', 'A lead did not answer two follow-up texts and was marked cold.'),
    end('end_replied', 'The lead replied'), end('end_cold', 'No reply after two texts'),
  ],
  [
    ['trigger', 'next', 'text_1'], ['text_1', 'next', 'wait_reply_1'],
    ['wait_reply_1', 'received', 'alert_replied'], ['wait_reply_1', 'timed_out', 'text_2'],
    ['text_2', 'next', 'wait_reply_2'],
    ['wait_reply_2', 'received', 'alert_replied'], ['wait_reply_2', 'timed_out', 'note_cold'],
    ['alert_replied', 'next', 'end_replied'],
    ['note_cold', 'next', 'alert_cold'], ['alert_cold', 'next', 'end_cold'],
  ],
  { reentry: 'once_per_entity', exitEvents: STOP_ON_PROGRESS, allowManualEnrollment: true }
);

// 8 ---------------------------------------------------------------------------------------
const stillScheduled = (id: string) => ({
  id, type: 'condition' as const, name: 'Is the appointment still on?',
  config: { branches: [{ id: 'still_scheduled', label: 'Still scheduled', conditions: { match: 'any', conditions: [{ field: 'appointment.status', operator: 'equals', value: 'scheduled' }, { field: 'appointment.status', operator: 'equals', value: 'rescheduled' }] } }] },
});
const appointmentTexts = (s: Sender) => build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'appointment.booked', filters: {}, entry: null } },
    { id: 'wait_day_before', type: 'wait_duration', name: 'Wait until 24 hours before', config: { mode: 'before_appointment', hoursBefore: 24, ifPast: 'continue' } },
    stillScheduled('still_on_day'),
    sms('text_day', 'Day-before reminder', `Hi {{lead.first_name}}, a friendly reminder about your appointment with ${s === 'network' ? 'us' : '{{contractor.name}}'} on {{appointment.scheduled_at}}. Reply here if you need to change the time.`, false),
    { id: 'wait_2_hours', type: 'wait_duration', name: 'Wait until 2 hours before', config: { mode: 'before_appointment', hoursBefore: 2, ifPast: 'end' } },
    stillScheduled('still_on_soon'),
    sms('text_soon', 'Two-hour reminder', `Hi {{lead.first_name}}, just a heads-up that ${s === 'network' ? 'your appointment' : '{{contractor.name}}'} is coming up in about 2 hours ({{appointment.scheduled_at}}). See you soon!`, false),
    end('end_sent', 'Reminders sent'), end('end_changed', 'Appointment changed'), end('end_changed_soon', 'Appointment changed'),
  ],
  [
    ['trigger', 'next', 'wait_day_before'], ['wait_day_before', 'next', 'still_on_day'],
    ['still_on_day', 'still_scheduled', 'text_day'], ['still_on_day', 'else', 'end_changed'],
    ['text_day', 'next', 'wait_2_hours'], ['wait_2_hours', 'next', 'still_on_soon'],
    ['still_on_soon', 'still_scheduled', 'text_soon'], ['still_on_soon', 'else', 'end_changed_soon'],
    ['text_soon', 'next', 'end_sent'],
  ],
  { reentry: 'once_per_event', exitEvents: ['appointment.cancelled', 'appointment.rescheduled', 'appointment.completed', 'appointment.no_show'] }
);

// 9 ---------------------------------------------------------------------------------------
const replyAlert = (s: Sender) => build(
  [
    { id: 'trigger', type: 'trigger', config: { event: 'message.received', filters: { channels: ['sms'] }, entry: null } },
    notify(s, 'alert', 'Tell the team', 'A lead texted back', 'Open the lead to read the message and reply.'),
    end('end_alerted'),
  ],
  [['trigger', 'next', 'alert'], ['alert', 'next', 'end_alerted']],
  { reentry: 'once_per_event', exitEvents: [] }
);

const TEXTING_NEEDS = 'Texting switched on and the Mac texting bridge connected (Texting page)';

export const GRAPH_TEMPLATES: readonly GraphTemplate[] = [
  {
    key: 'ai_qualification_call',
    version: 1,
    scope: 'any',
    icon: 'PhoneCall',
    name: 'New lead → AI qualification call',
    summary: 'Call a newly assigned, consenting lead and follow up by outcome.',
    description: 'When a lead is assigned to a contractor, the AI agent calls to qualify the homeowner. The workflow waits for the result and then books follow-up work for your team depending on what happened. A homeowner who opts out stops all further automated contact.',
    requires: ['AI calling set up for the contractor (agent, phone number, "Workflow only" or "Automatic" mode)', 'The Fish agent returns the post-call analysis fields listed in the call step'],
    graph: aiQualification,
  },
  {
    key: 'appointment_confirmation_reminder',
    version: 1,
    // Names the contractor, which "Appointment booked" only provides to a contractor's own workflow.
    scope: 'contractor',
    icon: 'Mail',
    name: 'Appointment booked → confirmation → reminder',
    summary: 'Confirm by email, then remind the homeowner 24 hours before.',
    description: 'Sends a confirmation straight away, waits until 24 hours before the appointment, re-checks that it is still on, and then sends the reminder. Cancelling, rescheduling, completing or a no-show stops the run.',
    requires: ['Gmail connected (Calls → Emails)', 'Homeowner email address and recorded consent'],
    graph: appointmentReminders,
  },
  {
    key: 'no_answer_retry',
    version: 1,
    scope: 'any',
    icon: 'CalendarClock',
    name: 'No answer → retry once → staff task',
    summary: 'After an unanswered AI call, wait for the next business day, retry once, then hand off to staff.',
    description: 'Starts when an AI call ends unanswered. Waits for the next business-hours window in the homeowner\'s time zone, tries one more call, and creates a task for your team if it still cannot reach them. If you use the first template, this one handles the retry instead of its "no answer" branch.',
    requires: ['AI calling set up for the contractor', 'Homeowner state or ZIP on the lead (needed to respect local calling hours)'],
    graph: noAnswerRetry,
  },
  {
    key: 'estimate_follow_up',
    version: 1,
    scope: 'any',
    icon: 'FileText',
    name: 'Estimate sent → wait → follow up if not accepted',
    summary: 'Check three days later; email, wait for acceptance, then create a call task.',
    description: 'Waits three days after an estimate is sent and re-reads the estimate. If it has not been accepted the homeowner gets a follow-up email, the workflow waits up to four more days for acceptance, and finally creates a task for your team. Acceptance, a won or lost deal ends the run.',
    requires: ['Gmail connected (Calls → Emails)', 'Estimates recorded as "sent" and "accepted" in the contractor portal'],
    graph: estimateFollowUp,
  },
  {
    key: 'text_website_leads',
    version: 1,
    scope: 'any',
    icon: 'MessageSquare',
    name: 'Text new website leads in 2 minutes',
    summary: 'Two minutes after a website form comes in, send a friendly first text. The texting assistant answers replies.',
    description: 'Starts for every new lead whose source is your website form and who gave consent. It waits two minutes, sends one text through your Mac, and lets the texting assistant take the conversation from there. If the lead already got the automatic first text, this text is skipped so nobody is texted twice. Opt-outs, texting hours, the daily limit and one-conversation-per-number still apply; a lead that is not texted gets a "Workflow text not sent" note. Booking an appointment or winning/losing the deal stops it.',
    requires: [
      TEXTING_NEEDS,
      'Website leads already get the automatic first text the moment they submit when texting is on. Use this only if you want this wording or timing instead, or the lead gets two texts.',
    ],
    graph: speedToLeadWebsite('network'),
    contractorGraph: speedToLeadWebsite('contractor'),
  },
  {
    key: 'text_meta_leads',
    version: 1,
    scope: 'any',
    icon: 'MessageSquare',
    name: 'Text new Meta form leads right away',
    summary: 'Send a first text as soon as a Facebook or Instagram form lead arrives. The texting assistant answers replies.',
    description: 'Starts for every new lead whose source is Meta (Facebook/Instagram Instant Forms) and who gave consent on the form, texts them straight away (or as soon as texting hours open) and hands replies to the texting assistant. Skipped if the lead already got the automatic first text. All texting rules still apply.',
    requires: [
      TEXTING_NEEDS,
      'The Meta form records texting consent. Leads without it are not enrolled; edit the trigger’s conditions if your form’s wording already covers texting.',
      'Leave the built-in Meta auto-text (SMS_META_LEADS) off, or the lead gets two texts.',
    ],
    graph: speedToLeadMeta('network'),
    contractorGraph: speedToLeadMeta('contractor'),
  },
  {
    key: 'text_no_reply_follow_up',
    version: 1,
    scope: 'any',
    icon: 'Hourglass',
    name: 'No reply follow-up',
    summary: 'Text, wait a day for a reply, text again, then mark it cold and tell the team. A reply at any point alerts you instead.',
    description: 'Texts a new lead (replies come to the workflow, not the texting assistant; the first text is skipped if the lead is already in a text conversation), waits up to a day for them to text back, sends one more text if they don’t, and waits another day. If they reply at any point, your team gets "A lead replied" and the workflow ends. If not, it adds the note "No reply, marked cold" and alerts the team. Booking an appointment or winning/losing the deal stops it. You can also enroll a lead by hand.',
    requires: [
      TEXTING_NEEDS,
      'Want the lead’s stage changed too? Add an "Update lead status" step (Lost) after the note.',
    ],
    graph: noReplyFollowUp('network'),
    contractorGraph: noReplyFollowUp('contractor'),
  },
  {
    key: 'text_appointment_reminders',
    version: 1,
    scope: 'any',
    icon: 'CalendarClock',
    name: 'Appointment reminders by text',
    summary: 'Text the homeowner the day before and again 2 hours before. Skips a reminder if the appointment changed.',
    description: 'When an appointment is booked it waits until 24 hours before (or texts right away if it is sooner), checks the appointment is still on, and sends a reminder. Then it waits until 2 hours before and sends a short heads-up. Cancelling, rescheduling, completing or a no-show stops it. Replies are saved on the lead and passed to workflows; add "Alert me when a lead texts back" so someone sees them. Note: Texting → Reminders & follow-ups already sends appointment reminders to homeowners; turn that off there before publishing this, or they get both.',
    requires: [TEXTING_NEEDS, 'Appointments recorded with a date and time'],
    graph: appointmentTexts('network'),
    contractorGraph: appointmentTexts('contractor'),
  },
  {
    key: 'alert_on_text_reply',
    version: 1,
    scope: 'any',
    icon: 'Bell',
    name: 'Alert me when a lead texts back',
    summary: 'Every time a lead replies by text, send your team a push and in-app alert.',
    description: 'Starts whenever a lead texts the Mac back (STOP, START and HELP are handled separately and do not count). It sends an internal alert with no homeowner details in it; open the lead to read the message. This includes replies the texting assistant is already answering.',
    requires: [TEXTING_NEEDS],
    graph: replyAlert('network'),
    contractorGraph: replyAlert('contractor'),
  },
];

export const getGraphTemplate = (key: string) => GRAPH_TEMPLATES.find((t) => t.key === key) ?? null;

export const templateScope = (t: Pick<GraphTemplate, 'scope'>): TemplateScope => t.scope ?? 'any';

/** Can this template start a workflow owned by `contractorId` (null = HomeQuote network)? */
export function templateFitsOwner(t: Pick<GraphTemplate, 'scope'>, contractorId: string | null): boolean {
  const scope = templateScope(t);
  return scope === 'any' || (scope === 'network' ? contractorId === null : contractorId !== null);
}

/** The template's graph for a workflow owned by `contractorId` (contractor wording when it has one). */
export function templateGraphFor(t: GraphTemplate, contractorId: string | null): WorkflowGraph {
  return contractorId !== null && t.contractorGraph ? t.contractorGraph : t.graph;
}

/**
 * The template's steps in the order a lead meets them (breadth-first from the trigger, each step once,
 * finish steps left out), for the gallery's step chips.
 */
export function templateSteps(graph: WorkflowGraph): { id: string; type: GraphNodeType; label: string }[] {
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  if (!trigger) return [];
  const seen = new Set<string>([trigger.id]);
  const order: GraphNode[] = [];
  const queue = [trigger.id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of graph.edges.filter((x) => x.source === id)) {
      if (seen.has(e.target)) continue;
      seen.add(e.target);
      const node = graph.nodes.find((n) => n.id === e.target);
      if (!node) continue;
      if (node.type !== 'end') order.push(node);
      queue.push(node.id);
    }
  }
  return order.map((n) => ({ id: n.id, type: n.type, label: nodeDisplayName(n) }));
}
