import { requireRole } from '@/lib/auth';
import { listWorkflows } from '@/lib/data/workflows';
import { WorkflowsView, type WorkflowFilters } from '@/components/workflows/workflows-view';

export const metadata = { title: 'Workflow Automations · HomeQuote Network' };

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<WorkflowFilters> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const filters = await searchParams;
  const all = await listWorkflows();
  return <WorkflowsView all={all} filters={filters} admin={profile.role === 'admin'} />;
}
