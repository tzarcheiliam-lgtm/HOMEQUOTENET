import { describe, expect, it } from 'vitest';
import { GRAPH_NODE_TYPES, GRAPH_TEMPLATES, type GraphNode, type GraphNodeType, type WorkflowGraph } from '@/lib/workflows/graph';
import { buildRunStory, formatDuration, runHeadline, type StoryRun, type StoryStep } from '@/lib/workflows/graph/run-story';

const TZ = { timeZone: 'America/Los_Angeles' };
const T = (hhmm: string, day = '27') => `2026-10-${day}T${hhmm}:00Z`; // 16:02Z = 9:02 AM PDT

const node = (id: string, type: GraphNodeType, config: Record<string, unknown> = {}, name?: string): GraphNode => ({ id, type, position: { x: 0, y: 0 }, config, ...(name ? { name } : {}) });

const NODES: GraphNode[] = [
  node('trigger', 'trigger', { event: 'lead.created', filters: {}, entry: null }),
  node('text', 'send_sms', { body: 'Hi', assistant: true }),
  node('text_off', 'send_sms', { body: 'Hi', assistant: false }),
  node('email', 'send_email', { to: { kind: 'lead' }, subject: 's', body: 'b' }),
  node('call', 'ai_call', { purpose: 'qualification' }),
  node('task', 'create_task', { title: 'Call back' }, 'Call them back'),
  node('note', 'add_note', { body: 'No reply, marked cold' }),
  node('note_merge', 'add_note', { body: 'Hi {{lead.first_name}}' }, 'Note: hello'),
  node('status', 'update_lead_status', { pipeline: 'lead', status: 'lost' }),
  node('status_asg', 'update_lead_status', { pipeline: 'assignment', status: 'no_answer' }),
  node('assign', 'assign_lead', { strategy: 'specific', userIds: ['x'] }),
  node('alert', 'send_notification', { audience: 'admins', title: 'A lead replied', body: '' }),
  node('wait', 'wait_duration', { mode: 'duration', amount: 2, unit: 'minutes' }),
  node('wait_appt', 'wait_duration', { mode: 'before_appointment', hoursBefore: 24, ifPast: 'end' }),
  node('wait_bh', 'wait_business_hours', { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 }),
  node('reply', 'wait_event', { event: 'message.received', timeoutMinutes: 1440 }),
  node('accept', 'wait_event', { event: 'estimate.accepted', timeoutMinutes: 2880 }),
  node('cond', 'condition', { branches: [{ id: 'still_scheduled', label: 'Still scheduled', conditions: { match: 'all', conditions: [] } }] }, 'Is the appointment still on?'),
  node('end_cold', 'end', { reason: 'No reply after two texts' }),
  node('end', 'end', {}),
];
const graph: WorkflowGraph = { schemaVersion: 2, nodes: NODES, edges: [], settings: { reentry: 'once_per_entity', exitEvents: [], allowManualEnrollment: false, runLifetimeDays: 30 } };

const run = (over: Partial<StoryRun> = {}): StoryRun => ({
  status: 'running', mode: 'live', leadName: 'Ada Lovelace', triggerEvent: 'lead.created', enrolledAt: T('16:00'), completedAt: null,
  cancelReason: null, endReason: null, lastError: null, paused: false, ...over,
});
let n = 0;
const step = (nodeId: string, over: Partial<StoryStep> = {}): StoryStep => ({
  id: `s${++n}`, nodeId, status: 'succeeded', startedAt: T('16:02'), completedAt: T('16:02'), resumeAt: null, nextRetryAt: null,
  skipReason: null, handle: 'next', outcome: null, executionStatus: null, error: null, ...over,
});
const say = (s: StoryStep, r: StoryRun = run()) => buildRunStory({ run: r, graph, steps: [s] }, TZ)[0].text;

describe('buildRunStory: one plain sentence per node type', () => {
  it('covers every node type the builder has', () => {
    const covered = new Set(NODES.map((x) => x.type));
    expect(GRAPH_NODE_TYPES.filter((t) => !covered.has(t))).toEqual([]);
  });

  it('trigger', () => {
    expect(say(step('trigger', { startedAt: T('16:00') }))).toBe('A new lead came in at 9:00 AM');
    expect(say(step('trigger'), run({ mode: 'test' }))).toMatch(/^A test run was started/);
    expect(say(step('trigger'), run({ triggerEvent: 'contract.signed' }))).toBe('Started: Contract signed by a recipient at 9:02 AM');
  });
  it('send_sms', () => {
    expect(say(step('text'))).toBe('Texted Ada at 9:02 AM — the texting assistant answers replies');
    expect(say(step('text_off'))).toBe('Texted Ada at 9:02 AM');
    expect(say(step('text_off', { completedAt: T('16:02', '28') }))).toBe('Texted Ada on Wed, Oct 28 at 9:02 AM');
    expect(say(step('text_off'), run({ leadName: null }))).toBe('Texted the lead at 9:02 AM');
  });
  it('send_email', () => expect(say(step('email'))).toBe('Emailed Ada at 9:02 AM'));
  it('ai_call', () => {
    expect(say(step('call', { outcome: 'booked', executionStatus: 'completed' }))).toMatch(/^Called Ada at 9:02 AM — booked/);
    expect(say(step('call', { status: 'waiting', handle: null }))).toBe('Calling Ada — waiting for the result');
    expect(say(step('call', { outcome: 'failed', executionStatus: 'not_placed', error: { code: 'x', message: 'No agent configured.' } }))).toBe('The call to Ada could not be placed: No agent configured');
    expect(say(step('call', { skipReason: 'contact_suppressed', outcome: 'opted_out' }))).toBe('Call not placed: the homeowner opted out');
  });
  it('create_task', () => expect(say(step('task'))).toBe('Created a task for the team: Call them back'));
  it('add_note', () => {
    expect(say(step('note'))).toBe('Added a note to the lead: “No reply, marked cold”');
    expect(say(step('note_merge'))).toBe('Added a note to the lead (Note: hello)');
  });
  it('update_lead_status', () => {
    expect(say(step('status'))).toBe('Marked the lead Lost');
    expect(say(step('status_asg'))).toBe('Moved the lead to “No Answer” in the contractor’s pipeline');
  });
  it('assign_lead', () => expect(say(step('assign'))).toBe('Assigned the lead to a team member'));
  it('send_notification', () => expect(say(step('alert'))).toBe('Alerted the HomeQuote admins: “A lead replied”'));
  it('wait_duration', () => {
    expect(say(step('wait'))).toBe('Waited 2 minutes');
    expect(say(step('wait_appt'))).toBe('Waited until 1 day before the appointment');
    expect(say(step('wait', { status: 'waiting', resumeAt: T('16:04') }))).toBe('Waiting until Tue, Oct 27 at 9:04 AM');
  });
  it('wait_business_hours', () => {
    expect(say(step('wait_bh'))).toBe('Waited for business hours');
    expect(say(step('wait_bh', { status: 'waiting', resumeAt: T('16:00', '28') }))).toBe('Waiting for business hours (until Wed, Oct 28 at 9:00 AM)');
  });
  it('wait_event: a reply, no reply, still waiting, and other events', () => {
    expect(say(step('reply', { handle: 'received', completedAt: T('17:15') }))).toBe('Ada texted back at 10:15 AM');
    expect(say(step('reply', { handle: 'timed_out' }))).toBe('Waited for a reply — no reply after 1 day');
    expect(say(step('reply', { status: 'waiting', handle: null }))).toBe('Waiting up to 1 day for Ada to reply');
    expect(say(step('accept', { handle: 'timed_out' }))).toBe('Waited for “estimate accepted” — it didn’t happen within 2 days');
    expect(say(step('accept', { handle: 'received' }))).toBe('Estimate accepted at 9:02 AM');
  });
  it('condition', () => {
    expect(say(step('cond', { handle: 'still_scheduled' }))).toBe('Checked “Is the appointment still on?”: Still scheduled');
    expect(say(step('cond', { handle: 'else' }))).toBe('Checked “Is the appointment still on?”: none of the branches matched');
  });
  it('end', () => {
    expect(say(step('end_cold', { handle: null }))).toBe('Finished: no reply after two texts');
    expect(say(step('end', { handle: null }))).toBe('Finished');
  });
});

describe('buildRunStory: skip reasons, problems and run endings', () => {
  const skipped = (nodeId: string, skipReason: string, over: Partial<StoryStep> = {}) => say(step(nodeId, { status: 'skipped', skipReason, ...over }));
  it.each([
    ['text', 'contact_suppressed', 'Text not sent: this number opted out'],
    ['email', 'contact_suppressed', 'Email not sent: the homeowner opted out'],
    ['text', 'text_not_sent', 'Text not sent (the reason is on the lead’s timeline)'],
    ['email', 'no_consent', 'Email not sent: the lead has no recorded consent'],
    ['email', 'consent_missing', 'Email not sent: the lead has no recorded consent'],
    ['text', 'test_mode', 'Text skipped: a test run never texts a homeowner'],
    ['status', 'test_mode', 'Skipped “Update lead status” in this test run'],
    ['text', 'missing_lead', 'Text not sent: there is no lead on this run'],
    ['status_asg', 'missing_assignment', 'Skipped “Update lead status”: the lead is not assigned to a contractor yet'],
    ['email', 'missing_contact', 'Email not sent: no test recipient was chosen'],
    ['email', 'no_email', 'Email not sent: the homeowner has no email on file'],
    ['text', 'no_phone', 'Text not sent: the homeowner has no phone number on file'],
    ['wait_appt', 'anchor_missing', 'Skipped the wait: there is no appointment time to count back from'],
    ['wait_appt', 'anchor_past', 'The appointment is too soon for this reminder, so the workflow ended'],
    ['task', 'condition_not_met', 'Skipped “Call them back”: its condition was not met'],
    ['task', 'unavailable_action', 'Skipped “Call them back”: this step is not available'],
    ['task', 'something_new', 'Skipped “Call them back”: something new'],
  ])('%s skipped for %s', (nodeId, reason, text) => expect(skipped(nodeId, reason)).toBe(text));

  it('names the texting bridge’s exact reason when it is known', () => {
    expect(skipped('text', 'text_not_sent', { textSkip: 'This number is already in a text conversation with another lead.' }))
      .toBe('Text not sent: this number is already in a text conversation with another lead');
    expect(skipped('text', 'text_not_sent', { textSkip: 'The daily text limit was reached.' })).toBe('Text not sent: the daily text limit was reached');
  });
  it('a step that failed but was set to carry on', () => {
    expect(skipped('email', 'error_continued:gmail_down', { error: { code: 'gmail_down', message: 'Gmail is not connected.' } }))
      .toBe('“Send email” ran into a problem, so the workflow carried on (Gmail is not connected)');
  });
  it('failed, retrying and cancelled steps', () => {
    expect(say(step('email', { status: 'failed', error: { code: 'x', message: 'Gmail is not connected' } }))).toBe('“Send email” failed: Gmail is not connected');
    expect(say(step('text', { status: 'retry_scheduled', nextRetryAt: T('16:12') }))).toBe('“Send text message” hit a temporary problem — trying again at 9:12 AM');
    expect(say(step('task', { status: 'cancelled' }))).toBe('Stopped before “Call them back” finished');
  });
  it('run-level endings', () => {
    const tail = (r: Partial<StoryRun>, steps: StoryStep[] = []) => buildRunStory({ run: run(r), graph, steps }, TZ).at(-1)!.text;
    expect(tail({ status: 'cancelled', cancelReason: 'exit_event:appointment.booked' })).toBe('Stopped because an appointment was booked');
    expect(tail({ status: 'cancelled', cancelReason: 'cancelled_by_user' })).toBe('Stopped by a person');
    expect(tail({ status: 'cancelled', cancelReason: 'exit_event:contract.signed' })).toBe('Stopped by a stop event (contract signed by a recipient)');
    expect(tail({ status: 'failed', lastError: { code: 'x', message: 'Lead was deleted.' } })).toBe('Stopped with a problem: Lead was deleted');
    expect(tail({ paused: true, status: 'waiting' })).toBe('On hold while the workflow is paused');
    expect(tail({ status: 'completed', endReason: 'The appointment is too close for this step' })).toBe('Finished: the appointment is too close for this step');
    expect(tail({ status: 'pending' })).toBe('Queued — the first step starts within a few minutes');
    // An end step already says "Finished", so the run does not repeat it.
    expect(buildRunStory({ run: run({ status: 'completed' }), graph, steps: [step('end', { handle: null })] }, TZ).map((i) => i.text)).toEqual(['Finished']);
  });
});

describe('a whole run, start to finish', () => {
  it('reads like a story and the headline is the last real thing that happened', () => {
    const g = GRAPH_TEMPLATES.find((t) => t.key === 'text_no_reply_follow_up')!.graph;
    const steps: StoryStep[] = [
      step('trigger', { startedAt: T('16:00') }),
      step('text_1', { completedAt: T('16:02') }),
      step('wait_reply_1', { handle: 'timed_out', completedAt: T('16:02', '28') }),
      step('text_2', { status: 'skipped', skipReason: 'contact_suppressed' }),
      step('wait_reply_2', { handle: 'timed_out' }),
      step('note_cold'),
      step('alert_cold'),
      step('end_cold', { handle: null }),
    ];
    const r = run({ status: 'completed' });
    expect(buildRunStory({ run: r, graph: g, steps }, TZ).map((i) => i.text)).toEqual([
      'A new lead came in at 9:00 AM',
      'Texted Ada at 9:02 AM',
      'Waited for a reply — no reply after 1 day',
      'Text not sent: this number opted out',
      'Waited for a reply — no reply after 1 day',
      'Added a note to the lead: “No reply, marked cold”',
      'Alerted the HomeQuote admins: “No reply after two texts”',
      'Finished: no reply after two texts',
    ]);
    expect(runHeadline({ run: r, graph: g, steps }, TZ)).toBe('Finished: no reply after two texts');
    expect(runHeadline({ run: run({ status: 'waiting' }), graph: g, steps: steps.slice(0, 2) }, TZ)).toBe('Texted Ada at 9:02 AM');
  });
  it('never shows raw codes or "undefined" for an unknown node', () => {
    const text = buildRunStory({ run: run(), graph, steps: [step('ghost_step')] }, TZ)[0].text;
    expect(text).not.toMatch(/undefined|\[object/);
  });
});

describe('formatDuration', () => {
  it.each([[2, '2 minutes'], [1, '1 minute'], [60, '1 hour'], [90, '90 minutes'], [1440, '1 day'], [2160, '36 hours'], [2880, '2 days']])('%i -> %s', (m, s) => expect(formatDuration(m)).toBe(s));
});
