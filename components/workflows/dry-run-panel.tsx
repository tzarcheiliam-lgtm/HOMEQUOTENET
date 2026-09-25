'use client';

import { useActionState } from 'react';
import { dryRunWorkflowAction, type WorkflowActionState } from '@/lib/actions/workflows';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

export function DryRunPanel({ workflowId, events }: { workflowId: string; events: { id: string; occurredAt: string; entityId: string }[] }) {
  const [state, action, pending] = useActionState<WorkflowActionState | undefined, FormData>(dryRunWorkflowAction, undefined);
  const plan = state?.data as { matched?: boolean; reason?: string; unavailableActions?: string[]; steps?: { key: string; action: string; wouldExecute: boolean; unavailable: boolean }[] } | null;
  return <Card id="test"><CardHeader><CardTitle>Test workflow</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Use a real saved event with the Phase 2 dry-run engine. No email, SMS, webhook, or database action is executed.</p>
    <form action={action} className="flex flex-col gap-3 sm:flex-row"><input type="hidden" name="workflow_id" value={workflowId} /><Select name="event_id" required defaultValue=""><option value="" disabled>Select a recent event</option>{events.map(event => <option key={event.id} value={event.id}>{new Date(event.occurredAt).toLocaleString()} · {event.entityId.slice(0, 8)}</option>)}</Select><Button disabled={pending || !events.length}>{pending ? 'Testing…' : 'Run dry test'}</Button></form>
    {!events.length && <p className="text-sm text-amber-700">No matching events have been recorded yet.</p>}
    {state?.message && <p className={`rounded-xl p-3 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-destructive/10 text-destructive'}`}>{state.message}</p>}
    {plan && <div className="rounded-xl border bg-muted/30 p-4"><div className="flex items-center justify-between"><strong>{plan.matched ? 'Trigger and conditions matched' : 'No match'}</strong><span className="text-sm text-muted-foreground">{plan.reason}</span></div>{plan.unavailableActions?.length ? <p className="mt-2 text-sm text-amber-700">Unavailable: {plan.unavailableActions.join(', ')}</p> : null}<ol className="mt-3 space-y-2">{plan.steps?.map((step, i) => <li className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm" key={step.key}><span>{i + 1}. {step.action.replaceAll('_', ' ')}</span><span className={step.wouldExecute ? 'text-emerald-700' : 'text-muted-foreground'}>{step.unavailable ? 'Unavailable' : step.wouldExecute ? 'Would run' : 'Would skip'}</span></li>)}</ol></div>}
  </CardContent></Card>;
}
