'use client';

import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CALL_ANALYSIS_FIELDS, CALL_CONTEXT_FIELDS, CALL_PURPOSES, CALL_PURPOSE_TEXT, type CallPurpose } from '@/lib/workflows/graph';
import type { BuilderLookups } from '@/lib/data/workflow-graph';
import { Callout, CheckList, DurationField, Field, HourSelect, Section, asNumber, asString, asStringArray, issuesFor, without, type FormProps } from './shared';

const MODE_LABELS: Record<string, string> = {
  off: 'Off',
  manual_only: 'Manual only',
  automatic: 'Automatic',
  workflow_only: 'Workflow only',
};

function Row({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />}
      <span className={cn('min-w-0', !ok && 'text-foreground')}>
        {children}
        <span className="sr-only">{ok ? ' (ready)' : ' (not ready)'}</span>
      </span>
    </li>
  );
}

/** Whether AI calling would work for this workflow's contractor right now. */
export function CallingReadiness({ calling, contractorId }: { calling: BuilderLookups['calling']; contractorId: string | null }) {
  if (!calling) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Calling readiness</p>
        <Callout tone="warn">
          {contractorId
            ? 'AI calling is not set up for this contractor yet. Ask a HomeQuote admin to set this contractor up in AI Agent Calls.'
            : 'This workflow is not tied to one contractor, so calling readiness is checked for each contractor when the workflow runs.'}
        </Callout>
      </div>
    );
  }
  const modeOk = calling.mode === 'automatic' || calling.mode === 'workflow_only';
  const agentOk = calling.agentConfigured && calling.phoneConfigured;
  const switchesOk = calling.globalEnabled && calling.adminEnabled;
  const ready = modeOk && agentOk && switchesOk;
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Calling readiness</p>
        <span className={cn('text-xs font-medium', ready ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>{ready ? 'Ready to call' : 'Not ready yet'}</span>
      </div>
      <ul className="space-y-1.5">
        <Row ok={modeOk}>Mode: {MODE_LABELS[calling.mode ?? 'off'] ?? 'Off'}</Row>
        <Row ok={calling.agentConfigured}>Fish agent {calling.agentConfigured ? 'is connected' : 'is not connected'}</Row>
        <Row ok={calling.phoneConfigured}>Phone number {calling.phoneConfigured ? 'is set' : 'is not set'}</Row>
        <Row ok={calling.globalEnabled}>HomeQuote AI calling switch is {calling.globalEnabled ? 'on' : 'off'}</Row>
        <Row ok={calling.adminEnabled}>This contractor&apos;s AI calling switch is {calling.adminEnabled ? 'on' : 'off'}</Row>
      </ul>
      {!modeOk ? (
        <Callout tone="warn">Ask a HomeQuote admin to set this contractor to Workflow only or Automatic in AI Agent Calls.</Callout>
      ) : null}
      {!calling.agentConfigured || !calling.phoneConfigured ? (
        <Callout tone="warn">Ask a HomeQuote admin to finish the agent and phone number setup in AI Agent Calls.</Callout>
      ) : null}
      {!switchesOk ? (
        <Callout tone="warn">Calls are not placed while a switch is off, and queued calls expire after 48 hours. Ask a HomeQuote admin to turn it on in AI Agent Calls.</Callout>
      ) : null}
    </div>
  );
}

export function AiCallForm({ config, onChange, readOnly, issues, lookups, contractorId }: FormProps) {
  const purpose = (asString(config.purpose, 'qualification') as CallPurpose);
  const note = asString(config.note);
  const contextFields = asStringArray(config.contextFields);
  const attempts = asNumber(config.maxAttempts) ?? 1;
  const set = (patch: Record<string, unknown>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-6">
      <CallingReadiness calling={lookups.calling} contractorId={contractorId} />

      <Section title="What the call is for">
        <Field label="Purpose" issues={issuesFor(issues, 'purpose')} hint={CALL_PURPOSE_TEXT[purpose] ? `The agent is told: "${CALL_PURPOSE_TEXT[purpose].agent}".` : undefined}>
          {(a) => (
            <Select {...a} value={purpose} disabled={readOnly} onChange={(e) => set({ purpose: e.target.value })}>
              {!CALL_PURPOSES.includes(purpose) ? <option value={purpose}>{purpose}</option> : null}
              {CALL_PURPOSES.map((p) => (
                <option key={p} value={p}>{CALL_PURPOSE_TEXT[p].label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Extra note for the agent (optional)" hint="Short and general, for example: Mention the free estimate. Do not include personal details." issues={issuesFor(issues, 'note')}>
          {(a) => (
            <div className="space-y-1">
              <Textarea
                {...a}
                rows={2}
                className="min-h-16 lg:min-h-16"
                maxLength={200}
                value={note}
                disabled={readOnly}
                onChange={(e) => (e.target.value.trim() ? set({ note: e.target.value }) : onChange(without(config, 'note')))}
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">{note.length}/200</p>
            </div>
          )}
        </Field>
        <CheckList
          legend="Facts the agent may know"
          hint="Only these facts are shared with the agent. What the homeowner typed in the form is never sent."
          options={CALL_CONTEXT_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
          selected={contextFields}
          disabled={readOnly}
          onChange={(next) => set({ contextFields: CALL_CONTEXT_FIELDS.map((f) => f.key).filter((k) => next.includes(k)) })}
          issues={issuesFor(issues, 'contextFields')}
        />
      </Section>

      <Section title="Tries and timing">
        <Field label="Call attempts" hint="1 means no redial. A HomeQuote-wide limit may still apply." issues={issuesFor(issues, 'maxAttempts')}>
          {(a) => (
            <Select {...a} value={String(attempts)} disabled={readOnly} onChange={(e) => set({ maxAttempts: Number(e.target.value) })}>
              <option value="1">1 attempt (no redial)</option>
              <option value="2">2 attempts</option>
              <option value="3">3 attempts</option>
            </Select>
          )}
        </Field>
        <DurationField
          label="Wait before redialing"
          hint={attempts > 1 ? 'How long to wait after an unanswered attempt. Between 15 minutes and 24 hours.' : 'Only used when there is more than one attempt.'}
          minutes={asNumber(config.retryDelayMinutes) ?? 60}
          units={['minutes', 'hours']}
          min={15}
          max={1440}
          disabled={readOnly}
          issues={issuesFor(issues, 'retryDelayMinutes')}
          onChange={(m) => m !== undefined && set({ retryDelayMinutes: m })}
        />
      </Section>

      <Section
        title="Calling hours"
        description="This can only narrow the allowed hours (default 8am-9pm in the homeowner's local time). Consent, opt-out, time zone and the contractor's AI calling switch are always enforced."
      >
        <HourSelect
          label="Earliest call time"
          from={0}
          to={23}
          defaultLabel="Default (8:00 AM)"
          value={asNumber(config.windowStartHour)}
          disabled={readOnly}
          issues={issuesFor(issues, 'windowStartHour')}
          onChange={(h) => onChange(h === undefined ? without(config, 'windowStartHour') : { ...config, windowStartHour: h })}
        />
        <HourSelect
          label="Latest call time"
          from={1}
          to={24}
          defaultLabel="Default (9:00 PM)"
          value={asNumber(config.windowEndHour)}
          disabled={readOnly}
          issues={issuesFor(issues, 'windowEndHour')}
          onChange={(h) => onChange(h === undefined ? without(config, 'windowEndHour') : { ...config, windowEndHour: h })}
        />
      </Section>

      <Section title="Waiting for the result">
        <DurationField
          label="Give up waiting after"
          hint={'If no final result arrives in time, the workflow takes the "No result in time" path. Between 30 minutes and 3 days.'}
          minutes={asNumber(config.resultTimeoutMinutes) ?? 360}
          units={['minutes', 'hours', 'days']}
          min={30}
          max={4320}
          disabled={readOnly}
          issues={issuesFor(issues, 'resultTimeoutMinutes')}
          onChange={(m) => m !== undefined && set({ resultTimeoutMinutes: m })}
        />
        <DurationField
          label="Wait for the call analysis"
          hint={'After the call ends, how long to wait for the agent\u2019s post-call analysis before sending it to "Needs human review". Between 5 minutes and 4 hours.'}
          minutes={asNumber(config.analysisGraceMinutes) ?? 30}
          units={['minutes', 'hours']}
          min={5}
          max={240}
          disabled={readOnly}
          issues={issuesFor(issues, 'analysisGraceMinutes')}
          onChange={(m) => m !== undefined && set({ analysisGraceMinutes: m })}
        />
      </Section>

      <details className="rounded-md border">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">What the Fish agent must return</summary>
        <div className="space-y-3 border-t p-3">
          <p className="text-xs text-muted-foreground">
            Configure the agent&apos;s post-call analysis to return these fields. HomeQuote reads the result only from them; a finished call with no clear signal goes to &quot;Needs human review&quot;.
          </p>
          <ul className="space-y-2">
            {CALL_ANALYSIS_FIELDS.map((f) => (
              <li key={f.name} className="text-sm">
                <span className="font-mono text-xs font-semibold">{f.name}</span> <span className="text-xs text-muted-foreground">({f.type})</span>
                <span className="block text-xs text-muted-foreground">{f.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}
