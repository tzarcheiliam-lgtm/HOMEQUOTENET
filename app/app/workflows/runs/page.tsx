import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listGraphRuns, listGraphWorkflows } from '@/lib/data/workflow-graph';
import { PageHeader } from '@/components/ui/page-header';
import { RunList } from '@/components/workflows/runs/run-list';

export const metadata = { title: 'Run history · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const RUN_STATUSES = ['pending', 'running', 'waiting', 'completed', 'failed', 'cancelled'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkflowRunsIndexPage({ searchParams }: { searchParams: Promise<{ status?: string; workflow?: string }> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const q = await searchParams;
  const status = q.status && RUN_STATUSES.includes(q.status) ? q.status : undefined;
  const workflow = q.workflow && UUID.test(q.workflow) ? q.workflow : undefined;
  const [runs, workflows] = await Promise.all([listGraphRuns({ status, workflowId: workflow }), listGraphWorkflows()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Run history" description="Every time a lead went through one of your automations, and exactly what happened.">
        <nav aria-label="Automations sections" className="flex items-center gap-4 text-sm">
          <Link href="/app/workflows" className="text-muted-foreground hover:text-foreground">Automations</Link>
          <Link href="/app/workflows/runs" aria-current="page" className="font-medium">Runs</Link>
          <Link href="/app/workflows/tasks" className="text-muted-foreground hover:text-foreground">Tasks</Link>
        </nav>
      </PageHeader>
      <RunList
        runs={runs}
        isAdmin={profile.role === 'admin'}
        workflows={workflows.map((w) => ({ id: w.id, name: w.name }))}
        filters={{ status, workflow }}
      />
    </div>
  );
}
