'use client';

import { Select } from '@/components/ui/select';
import { TemplateField } from '../template-field';
import { DurationField, Field, OnErrorField, asNumber, asRecord, asString, issuesFor, without, type FormProps } from './shared';

export function CreateTaskForm({ config, onChange, readOnly, issues, lookups, ctx }: FormProps) {
  const assignee = asRecord(config.assignee);
  const kind = assignee.kind === 'assigned_user' || assignee.kind === 'user' ? assignee.kind : 'unassigned';
  const userId = asString(assignee.userId);
  const members = lookups.teamMembers;
  const hasMember = members.some((m) => m.id === userId);

  const setKind = (next: string) => {
    if (next === 'user') onChange({ ...config, assignee: { kind: 'user', userId: members[0]?.id ?? '' } });
    else onChange({ ...config, assignee: { kind: next } });
  };

  return (
    <div className="space-y-6">
      <TemplateField
        label="Task title"
        required
        max={200}
        value={asString(config.title)}
        ctx={ctx}
        readOnly={readOnly}
        issues={issuesFor(issues, 'title')}
        onChange={(title) => onChange({ ...config, title })}
      />
      <TemplateField
        label="Details (optional)"
        multiline
        rows={4}
        max={2000}
        value={asString(config.description)}
        ctx={ctx}
        readOnly={readOnly}
        issues={issuesFor(issues, 'description')}
        onChange={(description) => onChange(description.trim() ? { ...config, description } : without(config, 'description'))}
      />
      <DurationField
        label="Due in (optional)"
        hint="How long after this step runs the task is due. Leave empty for no due date."
        minutes={asNumber(config.dueInMinutes)}
        units={['minutes', 'hours', 'days']}
        defaultUnit="hours"
        min={0}
        max={129600}
        optional
        disabled={readOnly}
        issues={issuesFor(issues, 'dueInMinutes')}
        onChange={(m) => onChange(m === undefined ? without(config, 'dueInMinutes') : { ...config, dueInMinutes: m })}
      />
      <Field label="Assign to" issues={issuesFor(issues, 'assignee')}>
        {(a) => (
          <Select {...a} value={kind} disabled={readOnly} onChange={(e) => setKind(e.target.value)}>
            <option value="unassigned">Nobody (anyone can pick it up)</option>
            <option value="assigned_user">The person the lead is assigned to</option>
            <option value="user" disabled={members.length === 0 && kind !== 'user'}>A specific team member</option>
          </Select>
        )}
      </Field>
      {kind === 'user' ? (
        <Field label="Team member" issues={issuesFor(issues, 'assignee.userId')}>
          {(a) => (
            <Select {...a} value={userId} disabled={readOnly} onChange={(e) => onChange({ ...config, assignee: { kind: 'user', userId: e.target.value } })}>
              {!hasMember ? <option value={userId}>{userId ? 'This person is no longer available' : 'Choose a team member…'}</option> : null}
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
