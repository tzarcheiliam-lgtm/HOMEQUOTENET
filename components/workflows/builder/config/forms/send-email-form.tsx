'use client';

import { Select } from '@/components/ui/select';
import { defaultConfigFor } from '@/lib/workflows/graph';
import { TemplateField } from '../template-field';
import { Callout, CheckList, Field, OnErrorField, Section, asRecord, asString, asStringArray, issuesFor, without, type FormProps } from './shared';

export function SendEmailForm({ config, onChange, readOnly, issues, lookups, contractorId, ctx }: FormProps) {
  const to = asRecord(config.to);
  const recipientsMode = to.kind === 'recipients';
  const templateId = asString(config.templateId);
  const mode: 'template' | 'custom' = typeof config.templateId === 'string' ? 'template' : 'custom';
  const templates = lookups.emailTemplates;
  const selected = templates.find((t) => t.id === templateId);
  const canPickRecipients = (contractorId === null && lookups.recipients.length > 0) || recipientsMode;
  const defaults = defaultConfigFor('send_email');

  const setMode = (next: 'template' | 'custom') => {
    if (next === mode) return;
    if (next === 'template') onChange({ ...without(config, 'subject', 'body'), templateId: templates[0]?.id ?? '' });
    else onChange({ ...without(config, 'templateId'), subject: asString(defaults.subject), body: asString(defaults.body) });
  };

  return (
    <div className="space-y-6">
      <Section title="Who gets it">
        <Field
          label="Send to"
          issues={issuesFor(issues, 'to')}
          hint={recipientsMode ? undefined : 'The email address on the lead. It is not sent if the homeowner has opted out or has not given consent.'}
        >
          {(a) => (
            <Select
              {...a}
              value={recipientsMode ? 'recipients' : 'lead'}
              disabled={readOnly}
              onChange={(e) => onChange({ ...config, to: e.target.value === 'recipients' ? { kind: 'recipients', recipientIds: [] } : { kind: 'lead' } })}
            >
              <option value="lead">The homeowner</option>
              {canPickRecipients ? <option value="recipients">Saved recipients</option> : null}
            </Select>
          )}
        </Field>
        {recipientsMode ? (
          <CheckList
            legend="Saved recipients"
            options={lookups.recipients.map((r) => ({ value: r.id, label: r.name, hint: r.email }))}
            selected={asStringArray(to.recipientIds)}
            disabled={readOnly}
            emptyText="There are no saved recipients to choose from."
            onChange={(ids) => onChange({ ...config, to: { kind: 'recipients', recipientIds: ids } })}
            issues={issuesFor(issues, 'to.recipientIds')}
          />
        ) : null}
      </Section>

      <Section title="What it says">
        <Field label="Email content" issues={issuesFor(issues, 'templateId')}>
          {(a) => (
            <Select {...a} value={mode} disabled={readOnly} onChange={(e) => setMode(e.target.value === 'template' ? 'template' : 'custom')}>
              <option value="template" disabled={templates.length === 0 && mode !== 'template'}>Use a saved template</option>
              <option value="custom">Write a custom message</option>
            </Select>
          )}
        </Field>

        {mode === 'template' ? (
          <>
            <Field label="Saved template" hint={selected ? `Subject: ${selected.subject}` : undefined} issues={issuesFor(issues, 'templateId')}>
              {(a) => (
                <Select {...a} value={templateId} disabled={readOnly} onChange={(e) => onChange({ ...config, templateId: e.target.value })}>
                  {!selected ? <option value={templateId}>{templateId ? 'This template is no longer available' : 'Choose a template…'}</option> : null}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              )}
            </Field>
            {templates.length === 0 ? <Callout tone="warn">There are no saved email templates yet. Write a custom message instead, or add a template first.</Callout> : null}
          </>
        ) : (
          <>
            <TemplateField
              label="Subject"
              required
              max={200}
              value={asString(config.subject)}
              ctx={ctx}
              readOnly={readOnly}
              issues={issuesFor(issues, 'subject')}
              onChange={(subject) => onChange({ ...config, subject })}
            />
            <TemplateField
              label="Message"
              required
              multiline
              rows={8}
              max={10000}
              value={asString(config.body)}
              ctx={ctx}
              readOnly={readOnly}
              issues={issuesFor(issues, 'body')}
              onChange={(body) => onChange({ ...config, body })}
            />
          </>
        )}
      </Section>

      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
