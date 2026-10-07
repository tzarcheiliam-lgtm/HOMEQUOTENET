'use client';

import { Select } from '@/components/ui/select';
import { ASSIGNMENT_STATUSES, LEAD_STATUSES } from '@/lib/leads/constants';
import { WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES, WORKFLOW_SETTABLE_LEAD_STATUSES } from '@/lib/workflows/graph';
import { Callout, Field, OnErrorField, asString, issuesFor, type FormProps } from './shared';

const labelIn = (list: { value: string; label: string }[], value: string) => list.find((s) => s.value === value)?.label ?? value;

export function UpdateLeadStatusForm({ config, onChange, readOnly, issues, contractorId }: FormProps) {
  const pipeline = config.pipeline === 'assignment' ? 'assignment' : 'lead';
  const status = asString(config.status);
  const options: readonly string[] = pipeline === 'lead' ? WORKFLOW_SETTABLE_LEAD_STATUSES : WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES;
  const labels = pipeline === 'lead' ? LEAD_STATUSES : ASSIGNMENT_STATUSES;
  const contractorOnly = contractorId !== null;

  return (
    <div className="space-y-6">
      <Field
        label="Pipeline"
        issues={issuesFor(issues, 'pipeline')}
        hint={contractorOnly ? 'Contractor workflows can change only the contractor’s own pipeline.' : undefined}
      >
        {(a) => (
          <Select
            {...a}
            value={pipeline}
            disabled={readOnly}
            onChange={(e) => {
              const next = e.target.value === 'assignment' ? 'assignment' : 'lead';
              const first = next === 'lead' ? WORKFLOW_SETTABLE_LEAD_STATUSES[0] : WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES[0];
              onChange({ ...config, pipeline: next, status: first });
            }}
          >
            {!contractorOnly || pipeline === 'lead' ? (
              <option value="lead" disabled={contractorOnly}>HomeQuote lead stage{contractorOnly ? ' (not allowed here)' : ''}</option>
            ) : null}
            <option value="assignment">Contractor pipeline stage</option>
          </Select>
        )}
      </Field>
      <Field label="Move the lead to" issues={issuesFor(issues, 'status')}>
        {(a) => (
          <Select {...a} value={status} disabled={readOnly} onChange={(e) => onChange({ ...config, status: e.target.value })}>
            {!options.includes(status) ? <option value={status}>{status ? labelIn(labels, status) : 'Choose a stage…'}</option> : null}
            {options.map((s) => (
              <option key={s} value={s}>{labelIn(labels, s)}</option>
            ))}
          </Select>
        )}
      </Field>
      <Callout>Won sales and lead-distribution stages are not offered here. They are recorded from real sales and sending, never by a workflow.</Callout>
      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
