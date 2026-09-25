import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getWorkflowRun } from '@/lib/data/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const relation = <T,>(value: unknown): T | null => Array.isArray(value) ? (value[0] as T | undefined) ?? null : value as T | null;
const readable = (value: string) => value.replaceAll('_', ' ').replaceAll('.', ' · ');

export default async function WorkflowRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  await requireRole(['admin', 'contractor']);
  const { runId } = await params; const detail = await getWorkflowRun(runId); if (!detail) notFound();
  const workflow = relation<{ name?: string }>(detail.run.workflow); const lead = relation<{ first_name?: string; last_name?: string }>(detail.run.lead);
  return <div className="space-y-6"><PageHeader title={workflow?.name ?? 'Workflow run'} description={`${[lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || detail.run.entity_type} · ${new Date(detail.run.created_at).toLocaleString()}`} backHref={`/app/workflows/${detail.run.workflow_id}/runs`} backLabel="Runs"><Badge variant={detail.run.status === 'completed' ? 'success' : detail.run.status === 'failed' ? 'warning' : 'secondary'}>{detail.run.status}</Badge></PageHeader>
    {detail.run.last_error && <Card className="border-destructive/30"><CardContent className="p-4 text-sm text-destructive"><strong>Run failed:</strong> {(detail.run.last_error as { message?: string }).message ?? 'The workflow could not continue.'}</CardContent></Card>}
    <Card><CardHeader><CardTitle>Step history</CardTitle></CardHeader><CardContent><ol className="relative space-y-5 border-l pl-6">{detail.steps.map((step, index) => <li key={step.id} className="relative"><span className="absolute -left-[2.15rem] flex size-7 items-center justify-center rounded-full border bg-background text-xs font-semibold">{index + 1}</span><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{readable(step.action_type ?? step.step_key)}</p><p className="text-sm text-muted-foreground">Attempt {step.attempt_count} of {step.max_attempts}{step.next_retry_at ? ` · retry ${new Date(step.next_retry_at).toLocaleString()}` : ''}{step.resume_at ? ` · resumes ${new Date(step.resume_at).toLocaleString()}` : ''}</p>{step.last_error && <p className="mt-1 text-sm text-destructive">{step.last_error.message}</p>}</div><Badge variant={step.status === 'succeeded' ? 'success' : step.status === 'failed' ? 'warning' : step.status === 'waiting' || step.status === 'retry_scheduled' ? 'secondary' : 'muted'}>{readable(step.status)}</Badge></div></li>)}</ol>{!detail.steps.length && <p className="text-sm text-muted-foreground">This run has not started its first step.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent className="space-y-1">{detail.logs.map(log => <div className="grid gap-1 border-b py-3 text-sm sm:grid-cols-[7rem_1fr_auto]" key={log.id}><time className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</time><span>{log.message}</span><span className="text-xs text-muted-foreground">{readable(log.code)}</span></div>)}{!detail.logs.length && <p className="text-sm text-muted-foreground">No activity has been recorded.</p>}</CardContent></Card>
  </div>;
}
