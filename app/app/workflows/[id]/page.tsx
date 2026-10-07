import Link from 'next/link';
import { notFound, unstable_rethrow } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { archiveWorkflowAction, duplicateWorkflowAction, toggleWorkflowAction } from '@/lib/actions/workflows';
import { getWorkflow, listWorkflowEvents } from '@/lib/data/workflows';
import { listEmailTemplates, type EmailTemplateRow } from '@/lib/data/email-templates';
import { validateWorkflowForEnable, WORKFLOW_TRIGGERS, type Workflow, type WorkflowEvent } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { WorkflowBuilder } from '@/components/workflows/workflow-builder';
import { getGraphWorkflow, loadBuilderLookups, loadCapabilities } from '@/lib/data/workflow-graph';
import { BuilderShell } from '@/components/workflows/builder/builder-shell';
import { DryRunPanel } from '@/components/workflows/dry-run-panel';

export default async function WorkflowDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enable_error?: string }> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const { id } = await params;

  // Visual (graph) workflows open in the new builder; classic ones keep the original page below.
  const graph = await getGraphWorkflow(id);
  if (graph) {
    const caps = await loadCapabilities(profile);
    const lookups = await loadBuilderLookups(graph.contractorId, profile.role === 'admin');
    return <BuilderShell detail={graph} lookups={lookups} canEdit={caps.edit(graph.contractorId)} isAdmin={profile.role === 'admin'} />;
  }
  const canEdit = profile.role === 'admin';

  let workflow: Workflow;
  let events: WorkflowEvent[];
  let emailTemplates: EmailTemplateRow[];
  try {
    const loaded = await getWorkflow(id);
    if (!loaded) notFound();
    workflow = loaded;
    events = canEdit ? await listWorkflowEvents(workflow.trigger.type) : [];
    emailTemplates = (await listEmailTemplates()).filter((t) => t.isActive);
  } catch (error) {
    unstable_rethrow(error); // let notFound() (and redirect(), if ever added above) propagate untouched
    return <div className="space-y-4"><PageHeader title="Automations" backHref="/app/workflows" backLabel="Automations" />
      <Card className="border-destructive/30 bg-destructive/5"><CardContent className="space-y-3 p-6 text-sm">
        <p className="font-medium text-destructive">We couldn&apos;t load this workflow.</p>
        <p className="text-muted-foreground">This is usually temporary. Refresh the page, or go back and try again.</p>
        <Button asChild variant="outline"><Link href="/app/workflows">Back to Automations</Link></Button>
      </CardContent></Card>
    </div>;
  }

  const enableIssues = validateWorkflowForEnable(workflow, { contractorId: workflow.contractorId });
  const requestedIssues = (await searchParams).enable_error?.split('|').filter(Boolean) ?? [];
  return <div className="space-y-6"><PageHeader title={workflow.name} description={`${WORKFLOW_TRIGGERS[workflow.trigger.type].label} · Version ${workflow.version}`} backHref="/app/workflows" backLabel="Automations"><Badge variant={workflow.enabled ? 'success' : 'muted'}>{workflow.enabled ? 'Enabled' : 'Disabled'}</Badge><Button asChild variant="outline"><Link href={`/app/workflows/${id}/runs`}>View runs</Link></Button>{canEdit && <><form action={duplicateWorkflowAction}><input type="hidden" name="workflow_id" value={id} /><Button variant="outline">Duplicate</Button></form><form action={toggleWorkflowAction}><input type="hidden" name="workflow_id" value={id} /><input type="hidden" name="enabled" value={String(!workflow.enabled)} /><Button variant={workflow.enabled ? 'outline' : 'default'}>{workflow.enabled ? 'Disable' : 'Enable'}</Button></form><ConfirmAction action={archiveWorkflowAction} fields={{ workflow_id: id }} triggerLabel="Archive" title="Archive this workflow?" description="New runs will stop. Existing run history and logs stay available." confirmLabel="Archive workflow" destructive /></>}</PageHeader>
    {(requestedIssues.length > 0 || (!workflow.enabled && enableIssues.length > 0)) && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900"><strong>{requestedIssues.length ? 'Action failed:' : 'Activation checks'}</strong><ul className="mt-2 list-disc space-y-1 pl-5">{(requestedIssues.length ? requestedIssues : enableIssues.map(issue => issue.message)).map(issue => <li key={issue}>{issue}</li>)}</ul></CardContent></Card>}
    <WorkflowBuilder workflow={workflow} canEdit={canEdit} emailTemplates={emailTemplates.map(t => ({ id: t.id, name: t.name, category: t.category }))} />
    {canEdit && <DryRunPanel workflowId={id} events={events.map(event => ({ id: event.id, occurredAt: event.occurredAt, entityId: event.entityId }))} />}
  </div>;
}
