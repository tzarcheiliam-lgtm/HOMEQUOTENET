'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Callout, Field, OnErrorField, asString, issuesFor, without, type FormProps } from './shared';

const AUDIENCES: { value: string; label: string }[] = [
  { value: 'assigned_contractor', label: 'The contractor team for this lead' },
  { value: 'admins', label: 'HomeQuote admins' },
  { value: 'assigned_setter', label: "The lead's setter" },
  { value: 'assigned_caller', label: "The lead's caller" },
  { value: 'specific_user', label: 'A specific team member' },
];

export function SendNotificationForm({ config, onChange, readOnly, issues, lookups, contractorId }: FormProps) {
  const audience = asString(config.audience, 'assigned_contractor');
  const title = asString(config.title);
  const body = asString(config.body);
  const userId = asString(config.userId);
  const contractorOnly = contractorId !== null;
  const options = contractorOnly ? AUDIENCES.filter((a) => a.value === 'assigned_contractor' || a.value === audience) : AUDIENCES;
  const hasVariables = /\{\{/.test(title) || /\{\{/.test(body);

  return (
    <div className="space-y-6">
      <Field label="Who to notify" issues={issuesFor(issues, 'audience')} hint={contractorOnly ? 'Contractor workflows can notify only their own team.' : undefined}>
        {(a) => (
          <Select
            {...a}
            value={audience}
            disabled={readOnly}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next === 'specific_user' ? { ...config, audience: next, userId: lookups.teamMembers[0]?.id ?? '' } : { ...without(config, 'userId'), audience: next });
            }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={contractorOnly && o.value !== 'assigned_contractor'}>{o.label}</option>
            ))}
          </Select>
        )}
      </Field>

      {audience === 'specific_user' ? (
        <Field label="Team member" issues={issuesFor(issues, 'userId')}>
          {(a) => (
            <Select {...a} value={userId} disabled={readOnly} onChange={(e) => onChange({ ...config, userId: e.target.value })}>
              {!lookups.teamMembers.some((m) => m.id === userId) ? <option value={userId}>{userId ? 'This person is no longer available' : 'Choose a team member…'}</option> : null}
              {lookups.teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}

      <Field label="Title" required issues={issuesFor(issues, 'title')}>
        {(a) => (
          <div className="space-y-1">
            <Input {...a} value={title} maxLength={100} disabled={readOnly} onChange={(e) => onChange({ ...config, title: e.target.value })} />
            <p className="text-right text-xs tabular-nums text-muted-foreground">{title.length}/100</p>
          </div>
        )}
      </Field>
      <Field label="Message (optional)" issues={issuesFor(issues, 'body')}>
        {(a) => (
          <div className="space-y-1">
            <Textarea {...a} rows={3} className="min-h-20 lg:min-h-20" value={body} maxLength={200} disabled={readOnly} onChange={(e) => onChange({ ...config, body: e.target.value })} />
            <p className="text-right text-xs tabular-nums text-muted-foreground">{body.length}/200</p>
          </div>
        )}
      </Field>

      <Callout tone={hasVariables ? 'warn' : 'info'}>
        <p>Write plain text only. Variables like {'{{lead.first_name}}'} are not used in notifications, so they would be sent exactly as typed.</p>
        <p>Notifications can show on a locked phone screen, so never put homeowner details in them. Open the lead in HomeQuote for the details.</p>
      </Callout>
      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
