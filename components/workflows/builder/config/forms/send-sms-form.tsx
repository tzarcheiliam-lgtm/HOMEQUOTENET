'use client';

import { Badge } from '@/components/ui/badge';
import { TemplateField } from '../template-field';
import { Callout, OnErrorField, Section, asString, issuesFor, type FormProps } from './shared';

/** A text from the owner's Mac (the texting bridge). Every texting rule still applies when it runs. */
export function SendSmsForm({ config, onChange, readOnly, issues, lookups, ctx }: FormProps) {
  const t = lookups.texting ?? { ready: lookups.smsConnected, bridgeConnected: false, reason: null };
  const body = asString(config.body);
  const assistant = config.assistant === true;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {t.ready ? <Badge variant="success">Texting on</Badge> : <Badge variant="warning">Texting off</Badge>}
        {t.bridgeConnected ? <Badge variant="success">Mac connected</Badge> : <Badge variant="muted">Mac not connected right now</Badge>}
      </div>
      {!t.ready ? (
        <Callout tone="warn"><p>{t.reason ?? 'Texting is not set up.'} You can build the step now; it can be published once texting is on.</p></Callout>
      ) : !t.bridgeConnected ? (
        <Callout><p>The Mac isn’t checking in at the moment. Texts wait in line and go out when it’s back.</p></Callout>
      ) : null}

      <Section title="What it says">
        <TemplateField
          label="Message"
          multiline
          rows={4}
          max={1600}
          value={body}
          ctx={ctx}
          readOnly={readOnly}
          required
          issues={issuesFor(issues, 'body')}
          hint={`${body.length} characters. Links are removed and long texts are trimmed to 320 characters, the same as the texting assistant.`}
          onChange={(next) => onChange({ ...config, body: next })}
        />
      </Section>

      <Section title="When they reply">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={assistant}
            disabled={readOnly}
            onChange={(e) => onChange({ ...config, assistant: e.target.checked })}
          />
          <span>
            <span className="font-medium">Let the texting assistant answer replies</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              On: the AI assistant takes over the conversation and works toward booking the visit. Off: replies are saved on the lead and this workflow handles them (use “Wait for something to happen → The homeowner texts back”).
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={config.onlyIfNotTexted === true}
            disabled={readOnly}
            onChange={(e) => onChange({ ...config, onlyIfNotTexted: e.target.checked })}
          />
          <span>
            <span className="font-medium">Skip if they’re already being texted</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Use this for new-lead workflows so a lead who already got the automatic first text isn’t texted twice.
            </span>
          </span>
        </label>
      </Section>

      <Callout>
        <p>Not sent if the number opted out, texting is off, it’s outside texting hours (it waits until they open), the daily limit is reached, or a person has taken over the conversation. The reason is written on the lead.</p>
      </Callout>

      <OnErrorField config={config} onChange={onChange} readOnly={readOnly} issues={issues} />
    </div>
  );
}
