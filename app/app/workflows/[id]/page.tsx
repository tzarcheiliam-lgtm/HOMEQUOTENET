import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { archiveWorkflowAction, duplicateWorkflowAction, toggleWorkflowAction } from '@/lib/actions/workflows';
import { getWorkflow, listWorkflowEvents } from '@/lib/data/workflows';
import { validateWorkflowForEnable, WORKFLOW_TRIGGERS } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { WorkflowBuilder } from '@/components/workflows/workflow-builder';
import { DryRunPanel } from '@/components/workflows/dry-run-panel';

export default async function WorkflowDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enable_error?: string }> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const { id } = await params;
  const workflow = await getWorkflow(id); if (!workflow) notFound();
  const events = profile.role === 'admin' ? await listWorkflowEvents(workflow.trigger.type) : [];
  const enableIssues = validateWorkflowForEnable(workflow, { contractorId: workflow.contractorId });
  const requestedIssues = (await searchParams).enable_error?.split('|').filter(Boolean) ?? [];
  const canEdit = profile.role === 'admin';
  return <div className="space-y-6"><PageHeader title={workflow.name} description={`${WORKFLOW_TRIGGERS[workflow.trigger.type].label} · Version ${workflow.version}`} backHref="/app/workflows" backLabel="Automations"><Badge variant={workflow.enabled ? 'success' : 'muted'}>{workflow.enabled ? 'Enabled' : 'Disabled'}</Badge><Button asChild variant="outline"><Link href={`/app/workflows/${id}/runs`}>View runs</Link></Button>{canEdit && <><form action={duplicateWorkflowAction}><input type="hidden" name="workflow_id" value={id} /><Button variant="outline">Duplicate</Button></form><form action={toggleWorkflowAction}><input type="hidden" name="workflow_id" value={id} /><input type="hidden" name="enabled" value={String(!workflow.enabled)} /><Button variant={workflow.enabled ? 'outline' : 'default'}>{workflow.enabled ? 'Disable' : 'Enable'}</Button></form><ConfirmAction action={archiveWorkflowAction} fields={{ workflow_id: id }} triggerLabel="Archive" title="Archive this workflow?" description="New runs will stop. Existing run history and logs stay available." confirmLabel="Archive workflow" destructive /></>}</PageHeader>
    {(requestedIssues.length > 0 || (!workflow.enabled && enableIssues.length > 0)) && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900"><strong>{requestedIssues.length ? 'Cannot enable this workflow:' : 'Activation checks'}</strong><ul className="mt-2 list-disc space-y-1 pl-5">{(requestedIssues.length ? requestedIssues : enableIssues.map(issue => issue.message)).map(issue => <li key={issue}>{issue}</li>)}</ul></CardContent></Card>}
    <WorkflowBuilder workflow={workflow} canEdit={canEdit} />
    {canEdit && <DryRunPanel workflowId={id} events={events.map(event => ({ id: event.id, occurredAt: event.occurredAt, entityId: event.entityId }))} />}
  </div>;
}
