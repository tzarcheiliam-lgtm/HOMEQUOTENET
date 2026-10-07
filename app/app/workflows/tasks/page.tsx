import { requireRole } from '@/lib/auth';
import { listWorkflowTasks, loadCapabilities } from '@/lib/data/workflow-graph';
import { PageHeader } from '@/components/ui/page-header';
import { TaskList } from '@/components/workflows/task-list';
import { WorkflowsSubNav } from '@/components/workflows/sub-nav';

export const metadata = { title: 'Automation tasks · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function WorkflowTasksPage() {
  const profile = await requireRole(['admin', 'contractor']);
  const caps = await loadCapabilities(profile);
  const tasks = await listWorkflowTasks('open');
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Follow-ups and reminders created by your automations." />
      <WorkflowsSubNav showAccess={caps.manageAccess} />
      <TaskList tasks={tasks} showContractor={profile.role === 'admin'} />
    </div>
  );
}
