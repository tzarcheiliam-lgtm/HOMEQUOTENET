'use client';

import { Select } from '@/components/ui/select';
import { Callout, Field, IntField, issuesFor, asNumber, type FormProps } from './shared';

type Unit = 'minutes' | 'hours' | 'days';
const UNITS: Unit[] = ['minutes', 'hours', 'days'];

export function WaitDurationForm({ config, onChange, readOnly, issues }: FormProps) {
  const mode = config.mode === 'before_appointment' ? 'before_appointment' : 'duration';
  const unit = (UNITS as string[]).includes(String(config.unit)) ? (config.unit as Unit) : 'hours';

  return (
    <div className="space-y-6">
      <Field label="How long to wait" issues={issuesFor(issues, 'mode')}>
        {(a) => (
          <Select
            {...a}
            value={mode}
            disabled={readOnly}
            // A different mode means a different shape: replace the config, keeping only the mode.
            onChange={(e) =>
              onChange(e.target.value === 'before_appointment' ? { mode: 'before_appointment', hoursBefore: 24, ifPast: 'end' } : { mode: 'duration', amount: 1, unit: 'hours' })
            }
          >
            <option value="duration">Wait a set time</option>
            <option value="before_appointment">Wait until before the appointment</option>
          </Select>
        )}
      </Field>

      {mode === 'duration' ? (
        <>
          <div className="flex flex-wrap items-start gap-3">
            <IntField
              label="Wait for"
              value={asNumber(config.amount)}
              min={1}
              disabled={readOnly}
              issues={issuesFor(issues, 'amount')}
              onCommit={(n) => n !== undefined && onChange({ ...config, amount: n })}
            />
            <Field label="Unit" issues={issuesFor(issues, 'unit')}>
              {(a) => (
                <Select {...a} className="w-36" value={unit} disabled={readOnly} onChange={(e) => onChange({ ...config, unit: e.target.value })}>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </Select>
              )}
            </Field>
          </div>
          <Callout>A single wait can last up to 90 days. The workflow carries on to the next step afterwards.</Callout>
        </>
      ) : (
        <>
          <IntField
            label="Hours before the appointment"
            value={asNumber(config.hoursBefore)}
            min={1}
            max={720}
            suffix="hours before"
            disabled={readOnly}
            issues={issuesFor(issues, 'hoursBefore')}
            onCommit={(n) => n !== undefined && onChange({ ...config, hoursBefore: n })}
          />
          <Field label="If that moment has already passed" issues={issuesFor(issues, 'ifPast')} hint="For example, an appointment booked for tomorrow morning with a 48-hour wait.">
            {(a) => (
              <Select {...a} value={config.ifPast === 'continue' ? 'continue' : 'end'} disabled={readOnly} onChange={(e) => onChange({ ...config, ifPast: e.target.value })}>
                <option value="end">End the workflow</option>
                <option value="continue">Carry on right away</option>
              </Select>
            )}
          </Field>
          <Callout>This needs an appointment, so the workflow should start from an appointment event.</Callout>
        </>
      )}
    </div>
  );
}
