'use client';

import { Select } from '@/components/ui/select';
import { Callout, CheckList, Field, OnErrorField, asStringArray, issuesFor, type FormProps } from './shared';

export function AssignLeadForm({ config, onChange, readOnly, issues, lookups }: FormProps) {
  const strategy = config.strategy === 'specific' ? 'specific' : 'round_robin';
  const userIds = asStringArray(config.userIds);
  const members = lookups.teamMembers;
  const options = members.map((m) => ({ value: m.id, label: m.name, hint: m.role ? m.role.replace(/_/g, ' ') : undefined }));

  return (
    <div className="space-y-6">
      <Field label="How to choose" issues={issuesFor(issues, 'strategy')}>
        {(a) => (
          <Select
            {...a}
            value={strategy}
            disabled={readOnly}
            onChange={(e) => {
              const next = e.target.value === 'specific' ? 'specific' : 'round_robin';
              onChange({ ...config, strategy: next, userIds: next === 'specific' ? userIds.slice(0, 1) : userIds });
            }}
          >
            <option value="round_robin">Take turns between several people</option>
            <option value="specific">One specific person</option>
          </Select>
        )}
      </Field>

      {strategy === 'specific' ? (
        <Field label="Team member" issues={issuesFor(issues, 'userIds')}>
          {(a) => {
            const current = userIds[0] ?? '';
            return (
              <Select {...a} value={current} disabled={readOnly} onChange={(e) => onChange({ ...config, userIds: e.target.value ? [e.target.value] : [] })}>
                <option value="">Choose a team member…</option>
                {current && !members.some((m) => m.id === current) ? <option value={current}>This person is no longer available</option> : null}
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            );
          }}
        </Field>
      ) : (
        <CheckList
          legend="Team members to rotate between"
          hint="The lead goes to the chosen person with the fewest open leads right now."
          options={options}
          selected={userIds}
          disabled={readOnly}
          emptyText="There are no team members to choose from."
          onChange={(next) => onChange({ ...config, userIds: next })}
          issues={issuesFor(issues, 'userIds')}
        />
      )}

      <Callout>
        Only active team members of this contractor can take a lead. When the step runs it re-checks who is eligible; anyone who has been switched off is skipped, and if nobody is eligible the step fails.
      </Callout>
      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
