import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listWorkflows } from '@/lib/data/workflows';
import { listGraphWorkflows, loadCapabilities } from '@/lib/data/workflow-graph';
import { GraphWorkflowList } from '@/components/workflows/graph-list';
import { WorkflowsSubNav } from '@/components/workflows/sub-nav';
import { WorkflowsView, type WorkflowFilters } from '@/components/workflows/workflows-view';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Workflow Automations · HomeQuote Network' };

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<WorkflowFilters> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const filters = await searchParams;
  const caps = await loadCapabilities(profile);
  const [graphItems, all] = await Promise.all([listGraphWorkflows(), listWorkflows()]);
  const canCreate = caps.createNetwork || caps.edit(profile.contractor_id);
  return (
    <div className="space-y-6">
      <PageHeader title="Automations" description="Visual follow-up journeys: pick a trigger, add steps, branch on what happens, test, then publish.">
        {canCreate && <Button asChild><Link href="/app/workflows/new">New automation</Link></Button>}
      </PageHeader>
      <WorkflowsSubNav showAccess={caps.manageAccess} />
      <GraphWorkflowList items={graphItems} canCreate={canCreate} />
      {all.length > 0 && (
        <>
          <h2 className="pt-4 text-lg font-semibold tracking-tight">Classic workflows</h2>
          <p className="-mt-4 text-sm text-muted-foreground">Existing list-style workflows keep running exactly as before.</p>
          <WorkflowsView all={all} filters={filters} admin={profile.role === 'admin'} embedded />
        </>
      )}
    </div>
  );
}
