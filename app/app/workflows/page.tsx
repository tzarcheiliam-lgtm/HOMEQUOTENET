import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listWorkflows } from '@/lib/data/workflows';
import { WORKFLOW_EVENT_TYPES, WORKFLOW_TRIGGERS } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

export const metadata = { title: 'Workflow Automations · HomeQuote Network' };
const niceDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<{ status?: string; trigger?: string; kind?: string; contractor?: string }> }) {
  const profile = await requireRole(['admin', 'contractor']);
  const filters = await searchParams;
  const all = await listWorkflows();
  const workflows = all.filter(item => (!filters.status || filters.status === 'all' || (filters.status === 'enabled') === item.enabled)
    && (!filters.trigger || filters.trigger === 'all' || item.triggerType === filters.trigger)
    && (!filters.kind || filters.kind === 'all' || (filters.kind === 'template') === !!item.templateKey)
    && (!filters.contractor || filters.contractor === 'all' || (filters.contractor === 'network' ? !item.contractorId : item.contractorId === filters.contractor)));
  const contractors = Array.from(new Map(all.filter(item => item.contractorId).map(item => [item.contractorId!, item.contractorName ?? 'Contractor'])).entries());
  const totals = { runs: all.reduce((sum, item) => sum + item.runCount, 0), completed: all.reduce((sum, item) => sum + item.completedCount, 0), failed: all.reduce((sum, item) => sum + item.failedCount, 0), waiting: all.reduce((sum, item) => sum + item.waitingCount, 0) };
  return <div className="space-y-6"><PageHeader title="Workflow Automations" description="Build reliable follow-up, handoff, and appointment journeys without code.">{profile.role === 'admin' && <Button asChild><Link href="/app/workflows/new">Create workflow</Link></Button>}</PageHeader>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(totals).map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div>
    <form className="grid gap-2 rounded-2xl bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4"><Select name="status" defaultValue={filters.status ?? 'all'}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></Select><Select name="trigger" defaultValue={filters.trigger ?? 'all'}><option value="all">All triggers</option>{WORKFLOW_EVENT_TYPES.map(type => <option key={type} value={type}>{WORKFLOW_TRIGGERS[type].label}</option>)}</Select><Select name="kind" defaultValue={filters.kind ?? 'all'}><option value="all">Templates + custom</option><option value="template">From template</option><option value="custom">Custom</option></Select>{profile.role === 'admin' && <Select name="contractor" defaultValue={filters.contractor ?? 'all'}><option value="all">All accounts</option><option value="network">HomeQuote network</option>{contractors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select>}<Button variant="outline" className="lg:col-span-4 lg:justify-self-end">Apply filters</Button></form>
    {!workflows.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">No workflows match these filters.</CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{workflows.map(item => { const success = item.runCount ? Math.round(item.completedCount / item.runCount * 100) : null; return <Card key={item.id} className="overflow-hidden"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-semibold">{item.name}</h2><Badge variant={item.enabled ? 'success' : 'muted'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>{item.templateKey && <Badge variant="outline">Template</Badge>}</div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || 'No description yet.'}</p></div><Button asChild size="sm"><Link href={`/app/workflows/${item.id}`}>{profile.role === 'admin' ? 'Edit' : 'View'}</Link></Button></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><span className="text-muted-foreground">Trigger</span><p className="font-medium">{WORKFLOW_TRIGGERS[item.triggerType as keyof typeof WORKFLOW_TRIGGERS]?.label ?? item.triggerType}</p></div><div><span className="text-muted-foreground">Account</span><p className="font-medium">{item.contractorName ?? 'HomeQuote'}</p></div><div><span className="text-muted-foreground">Runs</span><p className="font-medium">{item.runCount}{success === null ? '' : ` · ${success}%`}</p></div><div><span className="text-muted-foreground">Updated</span><p className="font-medium">{niceDate(item.updatedAt)}</p></div></div><div className="flex items-center justify-between border-t pt-3 text-sm"><span className="text-muted-foreground">{item.lastRun ? `Last run ${niceDate(item.lastRun.createdAt)} · ${item.lastRun.status}` : 'No runs yet'}</span><Link className="font-medium text-primary hover:underline" href={`/app/workflows/${item.id}/runs`}>View runs</Link></div></CardContent></Card>; })}</div>}
  </div>;
}
