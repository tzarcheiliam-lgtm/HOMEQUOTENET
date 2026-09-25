import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getWorkflow, listWorkflowRuns } from '@/lib/data/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const relation = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;
const badge = (status: string) => status === 'completed' ? 'success' : status === 'failed' ? 'warning' : status === 'waiting' ? 'secondary' : 'muted';

export default async function WorkflowRunsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'contractor']);
  const { id } = await params; const workflow = await getWorkflow(id); if (!workflow) notFound();
  const runs = await listWorkflowRuns(id);
  return <div className="space-y-6"><PageHeader title="Workflow runs" description={workflow.name} backHref={`/app/workflows/${id}`} backLabel="Workflow" />{!runs.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">No runs yet. Use a dry run to validate matching without side effects.</CardContent></Card> : <div className="space-y-3">{runs.map(run => { const lead = relation(run.lead as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null); const contractor = relation(run.contractor as { name?: string } | { name?: string }[] | null); return <Link href={`/app/workflows/runs/${run.id}`} key={run.id} className="block rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><strong>{[lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || `${run.entity_type} ${String(run.entity_id).slice(0, 8)}`}</strong><Badge variant={badge(run.status)}>{run.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{contractor?.name ?? 'HomeQuote'} · Started {new Date(run.started_at ?? run.created_at).toLocaleString()}</p></div><div className="text-sm text-muted-foreground">{run.current_step_key ? `Current: ${run.current_step_key.replaceAll('_', ' ')}` : run.completed_at ? `Completed ${new Date(run.completed_at).toLocaleString()}` : 'Queued'}</div></div></Link>; })}</div>}</div>;
}
