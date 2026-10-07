'use client';

import { Select } from '@/components/ui/select';
import { LEAD_STATUSES } from '@/lib/leads/constants';
import { WAIT_EVENT_TYPES } from '@/lib/workflows/graph';
import { Callout, CheckList, DurationField, Field, asNumber, asStringArray, issuesFor, without, type FormProps } from './shared';

const EVENT_LABELS: Record<(typeof WAIT_EVENT_TYPES)[number], string> = {
  'appointment.booked': 'An appointment is booked',
  'appointment.cancelled': 'An appointment is cancelled',
  'appointment.rescheduled': 'An appointment is rescheduled',
  'appointment.completed': 'An appointment is completed',
  'estimate.accepted': 'The estimate is accepted',
  'deal.won': 'The deal is won',
  'deal.lost': 'The deal is lost',
  'lead.status_changed': "The lead's stage changes",
  'ai_call.completed': 'An AI call ends',
};

export function WaitEventForm({ config, onChange, readOnly, issues }: FormProps) {
  const event = typeof config.event === 'string' ? config.event : 'appointment.booked';
  const known = (WAIT_EVENT_TYPES as readonly string[]).includes(event);

  return (
    <div className="space-y-6">
      <Field label="Wait until" issues={issuesFor(issues, 'event')} hint="Only events for this same lead count.">
        {(a) => (
          <Select
            {...a}
            value={event}
            disabled={readOnly}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next === 'lead.status_changed' ? { ...config, event: next } : { ...without(config, 'toStatuses'), event: next });
            }}
          >
            {!known ? <option value={event}>{event}</option> : null}
            {WAIT_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_LABELS[t]}</option>
            ))}
          </Select>
        )}
      </Field>

      {event === 'lead.status_changed' ? (
        <CheckList
          legend="Only when the new stage is"
          hint="Leave all unchecked to continue on any stage change."
          options={LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          selected={asStringArray(config.toStatuses)}
          disabled={readOnly}
          onChange={(next) => onChange(next.length ? { ...config, toStatuses: next } : without(config, 'toStatuses'))}
          issues={issuesFor(issues, 'toStatuses')}
        />
      ) : null}

      <DurationField
        label="Give up waiting after"
        hint="Between 5 minutes and 30 days."
        minutes={asNumber(config.timeoutMinutes)}
        units={['minutes', 'hours', 'days']}
        defaultUnit="days"
        min={5}
        max={43200}
        disabled={readOnly}
        issues={issuesFor(issues, 'timeoutMinutes')}
        onChange={(m) => m !== undefined && onChange({ ...config, timeoutMinutes: m })}
      />

      <Callout>
        <p>This step has two paths. <strong>It happened</strong> runs as soon as the event occurs. <strong>Timed out</strong> runs if it has not happened by the deadline.</p>
        <p>A wait never lasts forever, so there is always a deadline.</p>
      </Callout>
    </div>
  );
}
