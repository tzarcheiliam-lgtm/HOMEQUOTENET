'use client';

import { Select } from '@/components/ui/select';
import { ASSIGNMENT_STATUSES, LEAD_STATUSES, QUALIFICATION_STATUSES } from '@/lib/leads/constants';
import { WORKFLOW_EVENT_TYPES, WORKFLOW_TRIGGERS, type WorkflowConditionGroup, type WorkflowEventType } from '@/lib/workflows';
import { ConditionGroupEditor } from '../condition-editor';
import { Callout, CheckList, Field, IssueMessages, Section, asRecord, asString, asStringArray, issuesFor, without, type FormProps } from './shared';

const EVENT_GROUPS: { label: string; events: WorkflowEventType[] }[] = [
  { label: 'Leads', events: ['lead.created', 'lead.assigned', 'lead.status_changed', 'lead.qualification_changed'] },
  { label: 'Appointments', events: ['appointment.booked', 'appointment.rescheduled', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show'] },
  { label: 'Estimates and deals', events: ['estimate.sent', 'estimate.accepted', 'deal.won', 'deal.lost', 'assignment.status_changed'] },
  { label: 'AI calls', events: ['ai_call.completed', 'ai_call.failed'] },
  { label: 'Contracts', events: ['contract.created', 'contract.sent', 'contract.viewed', 'contract.signed', 'contract.fully_signed', 'contract.declined', 'contract.expired'] },
];

/** Friendlier wording than the technical registry descriptions. */
const EVENT_HELP: Record<WorkflowEventType, string> = {
  'lead.created': 'A new lead comes in from any source: a funnel, an ad form, an import or a manual entry.',
  'lead.assigned': 'A lead is sent to a contractor.',
  'lead.status_changed': 'The lead moves to a different stage in the HomeQuote pipeline.',
  'lead.qualification_changed': 'Someone marks the lead as qualified, not qualified or outside the service area.',
  'assignment.status_changed': "A contractor moves the lead to a different stage in their own pipeline.",
  'appointment.booked': 'An appointment is booked with the homeowner.',
  'appointment.rescheduled': 'An appointment is moved to a new time.',
  'appointment.cancelled': 'An appointment is cancelled.',
  'appointment.completed': 'An appointment is marked as held.',
  'appointment.no_show': 'The homeowner does not show up for an appointment.',
  'estimate.sent': 'An estimate is sent to the homeowner.',
  'estimate.accepted': 'The homeowner accepts an estimate.',
  'deal.won': 'A sale is recorded as won.',
  'deal.lost': 'The contractor marks the lead as lost.',
  'task.completed': 'A staff task created by a workflow is marked done.',
  'message.received': 'The homeowner replies by text or email. Not available yet.',
  'ai_call.completed': 'An AI call ends. This only says the call finished, not that the homeowner qualified.',
  'ai_call.failed': 'An AI call ends without a conversation: it failed, expired, went unanswered or hit a busy line.',
  'workflow.manual_enrollment': 'Someone adds a lead to this workflow by hand.',
  'contract.created': 'A draft agreement is created from a template.',
  'contract.sent': 'An agreement is sent for signature.',
  'contract.viewed': 'A signer opens the agreement for the first time.',
  'contract.signed': 'One signer signs (runs once per signer). Signing does not mean payment was received.',
  'contract.fully_signed': 'Everyone has signed. This does not activate billing; payment is confirmed separately.',
  'contract.declined': 'A signer declines to sign.',
  'contract.expired': 'The agreement passes its expiry date unsigned.',
};

const FAILED_RESULTS = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'busy', label: 'Line was busy' },
  { value: 'failed', label: 'Call failed' },
  { value: 'expired', label: 'Call expired before it could be placed' },
];

type StatusOptions = { value: string; label: string }[];
function statusOptions(event: string): StatusOptions | null {
  if (event === 'lead.status_changed') return LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  if (event === 'lead.qualification_changed') return QUALIFICATION_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  if (event === 'assignment.status_changed') return ASSIGNMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  return null;
}

export function TriggerForm({ config, onChange, readOnly, issues }: FormProps) {
  const event = asString(config.event, 'lead.assigned') as WorkflowEventType;
  const filters = asRecord(config.filters);
  const entry = (config.entry ?? null) as WorkflowConditionGroup | null;
  const known = WORKFLOW_EVENT_TYPES.includes(event);
  const def = known ? WORKFLOW_TRIGGERS[event] : null;
  const grouped = new Set(EVENT_GROUPS.flatMap((g) => g.events));
  const others = WORKFLOW_EVENT_TYPES.filter((e) => !grouped.has(e));
  const statuses = statusOptions(event);

  const setFilter = (key: string, values: string[]) => {
    const next = values.length ? { ...filters, [key]: values } : without(filters, key);
    onChange({ ...config, filters: next });
  };

  const option = (e: WorkflowEventType) => {
    const d = WORKFLOW_TRIGGERS[e];
    const ready = d.availability === 'ready';
    return (
      <option key={e} value={e} disabled={!ready && e !== event}>
        {d.label}{ready ? '' : ' (coming soon)'}
      </option>
    );
  };

  return (
    <div className="space-y-6">
      <Section title="When should this start?">
        <Field label="Start when" issues={issuesFor(issues, 'event')} hint={def ? EVENT_HELP[event] : undefined}>
          {(a) => (
            <Select
              {...a}
              value={event}
              disabled={readOnly}
              onChange={(e) => onChange({ ...config, event: e.target.value, filters: {} })}
            >
              {!known ? <option value={event}>{event}</option> : null}
              {EVENT_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>{g.events.map(option)}</optgroup>
              ))}
              {others.length ? <optgroup label="Other">{others.map(option)}</optgroup> : null}
            </Select>
          )}
        </Field>

        {statuses ? (
          <>
            <CheckList
              legend="Only when it moves from"
              hint="Leave all unchecked to start from any stage."
              options={statuses}
              selected={asStringArray(filters.fromStatuses)}
              disabled={readOnly}
              onChange={(v) => setFilter('fromStatuses', v)}
              issues={issuesFor(issues, 'filters.fromStatuses')}
            />
            <CheckList
              legend="Only when it moves to"
              hint="Leave all unchecked to start for any new stage."
              options={statuses}
              selected={asStringArray(filters.toStatuses)}
              disabled={readOnly}
              onChange={(v) => setFilter('toStatuses', v)}
              issues={issuesFor(issues, 'filters.toStatuses')}
            />
          </>
        ) : null}

        {event === 'ai_call.failed' ? (
          <CheckList
            legend="Only for these results"
            hint="Leave all unchecked to start for every kind of unsuccessful call."
            options={FAILED_RESULTS}
            selected={asStringArray(filters.results)}
            disabled={readOnly}
            onChange={(v) => setFilter('results', v)}
            issues={issuesFor(issues, 'filters.results')}
          />
        ) : null}

        {event === 'message.received' ? (
          <CheckList
            legend="Only for these channels"
            options={[{ value: 'sms', label: 'Text message' }, { value: 'email', label: 'Email' }]}
            selected={asStringArray(filters.channels)}
            disabled={readOnly}
            onChange={(v) => setFilter('channels', v)}
            issues={issuesFor(issues, 'filters.channels')}
          />
        ) : null}
        <IssueMessages issues={issues.filter((i) => i.field === 'filters')} />
      </Section>

      <Section title="Only enroll leads that match" description="Optional rules checked at the moment the event happens. Leave empty to enroll every lead.">
        <Callout>
          Publishing never enrolls existing leads. Only events that happen after you publish can start this workflow.
        </Callout>
        <ConditionGroupEditor
          value={entry}
          nullable
          readOnly={readOnly}
          allowGraphOnly={false}
          issues={issuesFor(issues, 'entry')}
          emptyText="No rules. Every lead that triggers this event is enrolled."
          onChange={(next) => onChange({ ...config, entry: next })}
        />
      </Section>
    </div>
  );
}
