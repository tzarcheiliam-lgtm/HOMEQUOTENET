'use client';

import { Input } from '@/components/ui/input';
import { Callout, Field, asString, issuesFor, without, type FormProps } from './shared';

export function EndForm({ config, onChange, readOnly, issues }: FormProps) {
  const reason = asString(config.reason);
  return (
    <div className="space-y-6">
      <Field label="Reason (optional)" hint="A short note shown in the run history, for example “Estimate accepted”." issues={issuesFor(issues, 'reason')}>
        {(a) => (
          <Input {...a} value={reason} maxLength={200} disabled={readOnly} onChange={(e) => onChange(e.target.value.trim() ? { ...config, reason: e.target.value } : without(config, 'reason'))} />
        )}
      </Field>
      <Callout>The workflow finishes here for this lead. Nothing runs after this step.</Callout>
    </div>
  );
}
