'use client';

import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { NODE_TYPES } from '@/lib/workflows/graph';
import { TemplateField } from '../template-field';
import { Callout, Field, asString, type FormProps } from './shared';

/** Text messages are not connected yet: the form is shown for reference and cannot be edited. */
export function SendSmsForm({ config, ctx, lookups }: FormProps) {
  const def = NODE_TYPES.send_sms;
  const needsSetup = def.availability === 'setup_required' || !lookups.smsConnected;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {needsSetup ? <Badge variant="warning">Requires setup</Badge> : <Badge variant="success">Connected</Badge>}
      </div>
      <Callout tone="warn">
        <p>{def.setupNote ?? 'No SMS provider is connected.'}</p>
        <p>Until then this step cannot be edited or published.</p>
      </Callout>
      <TemplateField label="Message" multiline rows={4} max={1600} value={asString(config.body)} ctx={ctx} readOnly onChange={() => undefined} />
      <Field label="If this step fails">
        {(a) => (
          <Select {...a} value={config.onError === 'continue' ? 'continue' : 'fail_run'} disabled onChange={() => undefined}>
            <option value="fail_run">Stop the workflow</option>
            <option value="continue">Keep going</option>
          </Select>
        )}
      </Field>
    </div>
  );
}
