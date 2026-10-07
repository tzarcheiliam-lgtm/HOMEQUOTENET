'use client';

import { TemplateField } from '../template-field';
import { Callout, OnErrorField, asString, issuesFor, type FormProps } from './shared';

export function AddNoteForm({ config, onChange, readOnly, issues, ctx }: FormProps) {
  return (
    <div className="space-y-6">
      <TemplateField
        label="Note"
        required
        multiline
        rows={5}
        max={2000}
        value={asString(config.body)}
        ctx={ctx}
        readOnly={readOnly}
        issues={issuesFor(issues, 'body')}
        onChange={(body) => onChange({ ...config, body })}
      />
      <Callout>The note is added to the lead&apos;s timeline for your team. The homeowner never sees it.</Callout>
      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
