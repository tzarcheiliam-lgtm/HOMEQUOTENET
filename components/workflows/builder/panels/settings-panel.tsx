'use client';

import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '@/lib/workflows';
import { triggerOf, type GraphSettings, type WorkflowGraph } from '@/lib/workflows/graph';

const REENTRY: { value: GraphSettings['reentry']; label: string; help: string }[] = [
  { value: 'once_per_entity', label: 'Once per lead, ever', help: 'A lead can go through this workflow one time. Safest for outreach.' },
  { value: 'one_active_per_entity', label: 'One at a time', help: 'A lead can re-enter, but never while an earlier run is still active.' },
  { value: 'once_per_event', label: 'Every qualifying event', help: 'Each new event enrolls the lead again (duplicate events are still ignored).' },
];

const EXIT_CHOICES: WorkflowEventType[] = ['deal.won', 'deal.lost', 'appointment.booked', 'appointment.cancelled', 'appointment.rescheduled', 'appointment.completed', 'appointment.no_show', 'estimate.accepted', 'lead.assigned'];

export function SettingsPanel({
  graph, description, onDescription, onSettings, readOnly, contractorName, status,
}: {
  graph: WorkflowGraph;
  description: string;
  onDescription: (v: string) => void;
  onSettings: (patch: Partial<GraphSettings>) => void;
  readOnly: boolean;
  contractorName: string | null;
  status: { label: string; version: number | null };
}) {
  const s = graph.settings;
  const trigger = triggerOf(graph);
  const event = trigger?.config.event;
  return (
    <div className="space-y-5 p-4">
      <section className="space-y-1.5">
        <Label htmlFor="wf-desc">Description</Label>
        <Textarea id="wf-desc" rows={2} maxLength={2000} value={description} disabled={readOnly} onChange={(e) => onDescription(e.target.value)} placeholder="What is this automation for?" />
      </section>

      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Scope</dt><dd className="font-medium">{contractorName ?? 'HomeQuote network'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-medium">{status.label}{status.version ? ` · v${status.version}` : ''}</dd></div>
        <div className="col-span-2"><dt className="text-xs text-muted-foreground">Starts when</dt><dd className="font-medium">{event ? WORKFLOW_TRIGGERS[event].label : 'Choose a trigger'}</dd></div>
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Who gets enrolled</h3>
        <p className="text-xs text-muted-foreground">Only events that happen <strong>after you publish</strong> enroll leads. Publishing, pausing and resuming never touch leads that already exist.</p>
        <div className="space-y-1.5">
          <Label htmlFor="wf-reentry">Re-entry</Label>
          <Select id="wf-reentry" value={s.reentry} disabled={readOnly} onChange={(e) => onSettings({ reentry: e.target.value as GraphSettings['reentry'] })}>
            {REENTRY.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <p className="text-xs text-muted-foreground">{REENTRY.find((r) => r.value === s.reentry)?.help}</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={s.allowManualEnrollment || event === 'workflow.manual_enrollment'} disabled={readOnly || event === 'workflow.manual_enrollment'} onChange={(e) => onSettings({ allowManualEnrollment: e.target.checked })} />
          <span>Allow authorized people to enroll a lead by hand<span className="block text-xs text-muted-foreground">Entry rules and re-entry still apply to manual enrollments.</span></span>
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Stop a run early when…</h3>
        <p className="text-xs text-muted-foreground">If any of these happen for the same lead, its active run is cancelled (waits, retries and queued calls included).</p>
        <div className="grid gap-1.5">
          {EXIT_CHOICES.filter((e) => e !== event).map((e) => (
            <label key={e} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" disabled={readOnly} checked={s.exitEvents.includes(e)} onChange={(ev) => onSettings({ exitEvents: ev.target.checked ? [...s.exitEvents, e] : s.exitEvents.filter((x) => x !== e) })} />
              {WORKFLOW_TRIGGERS[e].label}
            </label>
          ))}
        </div>
        <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">Always on: once a homeowner opts out, no further calls or emails are sent to them by any automation.</p>
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="wf-life">Maximum run length</Label>
        <Select id="wf-life" value={String(s.runLifetimeDays)} disabled={readOnly} onChange={(e) => onSettings({ runLifetimeDays: Number(e.target.value) })}>
          {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
        </Select>
        <p className="text-xs text-muted-foreground">A run still going after this long is stopped and marked failed, so nothing waits forever.</p>
      </section>
    </div>
  );
}
