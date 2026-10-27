import { LEAD_STATUS_LABELS, ASSIGNMENT_STATUSES } from '@/lib/leads/constants';
import { WORKFLOW_TRIGGERS } from '../events';
import { DEFAULT_WORKFLOW_TIMEZONE } from '../wait';
import { CALL_OUTCOME_LABELS, type CallOutcome } from './call-outcomes';
import { handlesFor, mergeTokensIn, nodeById, nodeDisplayName, type GraphNode, type GraphNodeType, type WorkflowGraph } from './model';

/**
 * A workflow run told as a short plain-English timeline ("Texted Ada at 9:02 AM", "Waited for a reply — no reply
 * after 1 day", "Text not sent: this number opted out", "Marked the lead Lost"). Pure: built only from the run's
 * graph, its step runs (status, skip reason, the codes in the stored output) and the run row, so it is easy to test and
 * never shows message bodies or contact details (step outputs never hold them).
 */

export interface StoryStep {
  id: string;
  nodeId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  resumeAt: string | null;
  nextRetryAt: string | null;
  skipReason: string | null;
  handle: string | null;
  outcome: string | null;
  executionStatus?: string | null;
  error: { code: string; message: string } | null;
  /** Why the texting bridge did not take a text, in words (from the lead's "Workflow text not sent" note), when known. */
  textSkip?: string | null;
}

export interface StoryRun {
  status: string;
  mode: 'live' | 'test';
  leadName: string | null;
  triggerEvent: string;
  enrolledAt: string;
  completedAt: string | null;
  cancelReason: string | null;
  endReason: string | null;
  lastError: { code: string; message: string } | null;
  paused: boolean;
}

export type StoryTone = 'start' | 'done' | 'skipped' | 'waiting' | 'problem' | 'end';
export interface StoryItem {
  key: string;
  /** When it happened (or is due), for the timeline marker. */
  at: string | null;
  tone: StoryTone;
  /** The node type, for the icon. Null for run-level lines. */
  nodeType: GraphNodeType | null;
  nodeId: string | null;
  text: string;
}

/**
 * Times in the sentences use the network's canonical zone (contractors have no stored zone yet). A fixed zone also
 * means the server render and the browser agree on every sentence.
 */
export const HISTORY_TIME_ZONE = DEFAULT_WORKFLOW_TIMEZONE;

export interface StoryOptions {
  /** IANA zone used for times in the sentences (default HISTORY_TIME_ZONE). */
  timeZone?: string;
}

const humanize = (code: string | null | undefined) => {
  const text = (code ?? '').replace(/[_.:]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const upperFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const noPeriod = (s: string) => s.trim().replace(/[.\s]+$/, '');

/** "2 minutes", "1 hour", "1 day", "36 hours". */
export function formatDuration(minutes: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (minutes >= 1440 && minutes % 1440 === 0) return plural(minutes / 1440, 'day');
  if (minutes >= 60 && minutes % 60 === 0) return plural(minutes / 60, 'hour');
  return plural(minutes, 'minute');
}

function timeFormatter(opts: StoryOptions) {
  const tz = { timeZone: opts.timeZone ?? HISTORY_TIME_ZONE };
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', ...tz });
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...tz });
  const dayKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', ...tz });
  const valid = (iso: string | null | undefined): iso is string => !!iso && !Number.isNaN(Date.parse(iso));
  return {
    /** "at 9:02 AM" on the run's first day, otherwise "on Wed, Oct 28 at 9:02 AM". */
    when(iso: string | null | undefined, firstDay: string | null): string {
      if (!valid(iso)) return '';
      const d = new Date(iso);
      return dayKey.format(d) === firstDay ? `at ${time.format(d)}` : `on ${day.format(d)} at ${time.format(d)}`;
    },
    /** "Wed, Oct 28 at 9:02 AM". */
    full(iso: string | null | undefined): string {
      if (!valid(iso)) return '';
      const d = new Date(iso);
      return `${day.format(d)} at ${time.format(d)}`;
    },
    dayOf(iso: string | null | undefined): string | null {
      return valid(iso) ? dayKey.format(new Date(iso)) : null;
    },
  };
}

const TRIGGER_STARTS: Partial<Record<string, string>> = {
  'lead.created': 'A new lead came in',
  'lead.assigned': 'The lead was assigned to a contractor',
  'lead.status_changed': 'The lead’s stage changed',
  'assignment.status_changed': 'The contractor’s stage for the lead changed',
  'appointment.booked': 'An appointment was booked',
  'appointment.cancelled': 'An appointment was cancelled',
  'appointment.completed': 'An appointment was completed',
  'appointment.no_show': 'The homeowner missed an appointment',
  'appointment.rescheduled': 'An appointment was rescheduled',
  'estimate.sent': 'An estimate was sent',
  'estimate.accepted': 'An estimate was accepted',
  'deal.won': 'The deal was won',
  'deal.lost': 'The deal was lost',
  'task.completed': 'A task was completed',
  'message.received': 'The lead texted back',
  'ai_call.completed': 'An AI call ended',
  'ai_call.failed': 'An AI call went unanswered or failed',
  'workflow.manual_enrollment': 'Someone enrolled the lead by hand',
};

const eventLabel = (type: unknown) =>
  typeof type === 'string' ? (WORKFLOW_TRIGGERS as Record<string, { label: string } | undefined>)[type]?.label ?? humanize(type) : 'the event';

const AUDIENCE: Record<string, string> = {
  admins: 'the HomeQuote admins',
  assigned_setter: 'the assigned setter',
  assigned_caller: 'the assigned caller',
  assigned_contractor: 'the contractor’s team',
  specific_user: 'a team member',
};

const CANCEL_TEXT: Record<string, string> = {
  cancelled_by_user: 'Stopped by a person',
  rollback: 'Stopped when the workflow builder was rolled back',
};

/** cancel_reason is `exit_event:<type>` (a stop event), `cancelled_by_user`, `rollback`, or free text. */
function cancelSentence(reason: string | null): string {
  if (!reason) return 'Stopped';
  if (reason.startsWith('exit_event:')) {
    const type = reason.slice('exit_event:'.length);
    const what = TRIGGER_STARTS[type];
    return what ? `Stopped because ${lowerFirst(what)}` : `Stopped by a stop event (${lowerFirst(eventLabel(type))})`;
  }
  return CANCEL_TEXT[reason] ?? `Stopped: ${lowerFirst(humanize(reason))}`;
}

/** What a contact step is called in "<thing> not sent". */
const CONTACT_NOUN: Partial<Record<GraphNodeType, string>> = { send_sms: 'Text', send_email: 'Email', ai_call: 'Call' };

function skipSentence(node: GraphNode | undefined, step: StoryStep, name: string): string {
  const reason = step.skipReason ?? '';
  const noun = node ? CONTACT_NOUN[node.type] : undefined;
  const notDone = noun ? `${noun} not ${noun === 'Call' ? 'placed' : 'sent'}` : `Skipped “${name}”`;
  if (reason.startsWith('error_continued')) {
    return `“${name}” ran into a problem, so the workflow carried on${step.error?.message ? ` (${noPeriod(step.error.message)})` : ''}`;
  }
  switch (reason) {
    case 'contact_suppressed':
      return node?.type === 'send_sms' ? 'Text not sent: this number opted out' : `${notDone}: the homeowner opted out`;
    case 'text_not_sent':
      return step.textSkip ? `Text not sent: ${lowerFirst(noPeriod(step.textSkip))}` : 'Text not sent (the reason is on the lead’s timeline)';
    case 'no_consent':
    case 'consent_missing':
    case 'consent_not_granted':
      return `${notDone}: the lead has no recorded consent`;
    case 'test_mode':
      return node?.type === 'send_sms' ? 'Text skipped: a test run never texts a homeowner' : `Skipped “${name}” in this test run`;
    case 'missing_lead':
      return `${notDone}: there is no lead on this run`;
    case 'missing_assignment':
      return `${notDone}: the lead is not assigned to a contractor yet`;
    case 'missing_contact':
      return `${notDone}: no test recipient was chosen`;
    case 'no_email':
      return `${notDone}: the homeowner has no email on file`;
    case 'no_phone':
      return `${notDone}: the homeowner has no phone number on file`;
    case 'anchor_missing':
      return 'Skipped the wait: there is no appointment time to count back from';
    case 'anchor_past':
      return 'The appointment is too soon for this reminder, so the workflow ended';
    case 'condition_not_met':
      return `${notDone}: its condition was not met`;
    case 'unavailable_action':
      return `${notDone}: this step is not available`;
    default:
      return `${notDone}: ${lowerFirst(humanize(reason)) || 'no reason was recorded'}`;
  }
}

function statusLabel(config: Record<string, unknown>): string {
  const status = String(config.status ?? '');
  if (config.pipeline === 'assignment') return ASSIGNMENT_STATUSES.find((s) => s.value === status)?.label ?? humanize(status);
  return (LEAD_STATUS_LABELS as Record<string, string>)[status] ?? humanize(status);
}

function noteText(config: Record<string, unknown>, name: string): string {
  const body = typeof config.body === 'string' ? config.body.trim() : '';
  if (body && !mergeTokensIn(body).length && !body.includes('\n')) {
    return `Added a note to the lead: “${body.length > 120 ? `${body.slice(0, 117)}…` : body}”`;
  }
  return `Added a note to the lead (${name})`;
}

export function buildRunStory(input: { run: StoryRun; graph: WorkflowGraph; steps: StoryStep[] }, opts: StoryOptions = {}): StoryItem[] {
  const { run, graph, steps } = input;
  const fmt = timeFormatter(opts);
  const firstDay = fmt.dayOf(run.enrolledAt);
  const first = run.leadName?.trim().split(/\s+/)[0] || null;
  const who = first ?? 'the lead';
  const Who = first ?? 'The lead';
  const at = (iso: string | null | undefined) => {
    const w = fmt.when(iso, firstDay);
    return w ? ` ${w}` : '';
  };

  const items: StoryItem[] = steps.map((s) => {
    const node = nodeById(graph, s.nodeId);
    const name = node ? nodeDisplayName(node) : humanize(s.nodeId);
    const config = (node?.config ?? {}) as Record<string, unknown>;
    const doneAt = s.completedAt ?? s.startedAt;
    const item = (tone: StoryTone, text: string, when: string | null = doneAt): StoryItem => ({ key: s.id, at: when, tone, nodeType: node?.type ?? null, nodeId: s.nodeId, text });

    // Problems first: they read the same for every kind of step.
    if (s.status === 'failed') return item('problem', `“${name}” failed${s.error?.message ? `: ${noPeriod(s.error.message)}` : ''}`);
    if (s.status === 'retry_scheduled') return item('waiting', `“${name}” hit a temporary problem — trying again${at(s.nextRetryAt)}`, s.nextRetryAt);
    if (s.status === 'cancelled') return item('skipped', `Stopped before “${name}” finished`);
    if (s.skipReason && node?.type !== 'ai_call') return item('skipped', skipSentence(node, s, name));
    if (s.skipReason === 'contact_suppressed') return item('skipped', 'Call not placed: the homeowner opted out');

    switch (node?.type) {
      case 'trigger': {
        const start = run.mode === 'test' ? 'A test run was started' : TRIGGER_STARTS[run.triggerEvent || String(config.event ?? '')] ?? `Started: ${eventLabel(run.triggerEvent || config.event)}`;
        return item('start', `${start}${at(s.startedAt ?? run.enrolledAt)}`, s.startedAt ?? run.enrolledAt);
      }
      case 'send_sms':
        if (s.status === 'succeeded') return item('done', `Texted ${who}${at(doneAt)}${config.assistant === true ? ' — the texting assistant answers replies' : ''}`);
        return item('waiting', `Texting ${who}…`);
      case 'send_email':
        if (s.status === 'succeeded') return item('done', `Emailed ${who}${at(doneAt)}`);
        return item('waiting', `Emailing ${who}…`);
      case 'ai_call': {
        if (s.status === 'waiting') return item('waiting', `Calling ${who} — waiting for the result`, s.startedAt);
        if (s.outcome === 'failed' && s.executionStatus === 'not_placed') return item('problem', `The call to ${who} could not be placed${s.error?.message ? `: ${noPeriod(s.error.message)}` : ''}`);
        const label = s.outcome ? CALL_OUTCOME_LABELS[s.outcome as CallOutcome] ?? humanize(s.outcome) : null;
        return item(s.outcome === 'failed' || s.outcome === 'timed_out' ? 'problem' : 'done', `Called ${who}${at(s.startedAt)}${label ? ` — ${lowerFirst(label)}` : ''}`);
      }
      case 'create_task':
        return item('done', `Created a task for the team: ${name}`);
      case 'add_note':
        return item('done', noteText(config, name));
      case 'update_lead_status':
        return item('done', config.pipeline === 'assignment' ? `Moved the lead to “${statusLabel(config)}” in the contractor’s pipeline` : `Marked the lead ${statusLabel(config)}`);
      case 'assign_lead':
        return item('done', 'Assigned the lead to a team member');
      case 'send_notification': {
        const audience = AUDIENCE[String(config.audience ?? '')] ?? 'the team';
        const title = typeof config.title === 'string' && config.title.trim() ? `: “${config.title.trim()}”` : '';
        return item('done', `Alerted ${audience}${title}`);
      }
      case 'wait_duration': {
        if (s.status === 'waiting') return item('waiting', s.resumeAt ? `Waiting until ${fmt.full(s.resumeAt)}` : 'Waiting', s.resumeAt);
        if (config.mode === 'before_appointment') return item('done', `Waited until ${formatDuration(Number(config.hoursBefore) * 60)} before the appointment`);
        const unit = { minutes: 1, hours: 60, days: 1440 }[String(config.unit) as 'minutes' | 'hours' | 'days'] ?? 1;
        return item('done', `Waited ${formatDuration(Number(config.amount) * unit)}`);
      }
      case 'wait_business_hours':
        if (s.status === 'waiting') return item('waiting', `Waiting for business hours${s.resumeAt ? ` (until ${fmt.full(s.resumeAt)})` : ''}`, s.resumeAt);
        return item('done', 'Waited for business hours');
      case 'wait_event': {
        const reply = config.event === 'message.received';
        const dur = formatDuration(Number(config.timeoutMinutes) || 0);
        if (s.status === 'waiting') {
          return item('waiting', reply ? `Waiting up to ${dur} for ${who} to reply` : `Waiting up to ${dur} for “${lowerFirst(eventLabel(config.event))}”`, s.resumeAt);
        }
        if (s.handle === 'timed_out') return item('done', reply ? `Waited for a reply — no reply after ${dur}` : `Waited for “${lowerFirst(eventLabel(config.event))}” — it didn’t happen within ${dur}`);
        return item('done', reply ? `${Who} texted back${at(doneAt)}` : `${eventLabel(config.event)}${at(doneAt)}`);
      }
      case 'condition': {
        const branch = s.handle ? handlesFor('condition', config).find((h) => h.id === s.handle)?.label ?? humanize(s.handle) : null;
        return item('done', `Checked “${name}”${branch ? `: ${s.handle === 'else' ? 'none of the branches matched' : branch}` : ''}`);
      }
      case 'end': {
        const reason = typeof config.reason === 'string' && config.reason.trim() ? config.reason.trim() : null;
        return item('end', reason ? `Finished: ${lowerFirst(reason)}` : 'Finished');
      }
      default:
        return item(s.status === 'succeeded' ? 'done' : 'waiting', s.status === 'succeeded' ? `Done: ${name}` : `${upperFirst(name)} is running`);
    }
  });

  // Run-level endings that no step tells.
  const tail = (tone: StoryTone, text: string, when: string | null): StoryItem => ({ key: `run:${run.status}`, at: when, tone, nodeType: null, nodeId: null, text });
  if (run.paused) items.push(tail('waiting', 'On hold while the workflow is paused', null));
  else if (run.status === 'cancelled') items.push(tail('end', cancelSentence(run.cancelReason), run.completedAt));
  else if (run.status === 'failed' && !steps.some((s) => s.status === 'failed')) {
    items.push(tail('problem', `Stopped with a problem${run.lastError?.message ? `: ${noPeriod(run.lastError.message)}` : ''}`, run.completedAt));
  } else if (run.status === 'completed' && !steps.some((s) => nodeById(graph, s.nodeId)?.type === 'end')) {
    items.push(tail('end', run.endReason ? `Finished: ${lowerFirst(noPeriod(run.endReason))}` : 'Finished', run.completedAt));
  } else if (run.status === 'pending' && !steps.length) {
    items.push(tail('waiting', 'Queued — the first step starts within a few minutes', run.enrolledAt));
  }
  return items;
}

/** The single most useful line for a run list: what happened last (skipping a bare "Finished"). */
export function runHeadline(input: { run: StoryRun; graph: WorkflowGraph; steps: StoryStep[] }, opts: StoryOptions = {}): string | null {
  const items = buildRunStory(input, opts).filter((i) => i.text !== 'Finished');
  return items[items.length - 1]?.text ?? null;
}
