import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Loader, PauseCircle, Plus, Workflow as WorkflowIcon, XCircle } from 'lucide-react';
import type { WorkflowListItem } from '@/lib/data/workflows';
import { WORKFLOW_EVENT_TYPES, WORKFLOW_TRIGGERS } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { FilterField, FilterPanel } from '@/components/ui/filter-panel';
import { SummaryStrip } from '@/components/ui/summary-strip';
import { cn } from '@/lib/utils';

const niceDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const RUN_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  completed: { label: 'completed', icon: CheckCircle2, tone: 'text-emerald-700' },
  failed: { label: 'failed', icon: XCircle, tone: 'text-red-700 font-medium' },
  waiting: { label: 'waiting', icon: Clock, tone: 'text-amber-700' },
  running: { label: 'running', icon: Loader, tone: 'text-foreground' },
  pending: { label: 'queued', icon: Clock, tone: 'text-muted-foreground' },
  cancelled: { label: 'cancelled', icon: PauseCircle, tone: 'text-muted-foreground' },
};

export function WorkflowCard({ item, admin }: { item: WorkflowListItem; admin: boolean }) {
  const success = item.runCount ? Math.round((item.completedCount / item.runCount) * 100) : null;
  const trigger = WORKFLOW_TRIGGERS[item.triggerType as keyof typeof WORKFLOW_TRIGGERS]?.label ?? item.triggerType;
  const lastRun = item.lastRun ? (RUN_STATUS[item.lastRun.status] ?? { label: item.lastRun.status, icon: Clock, tone: '' }) : null;
  const LastIcon = lastRun?.icon;
  const needsAttention = item.failedCount > 0 || item.lastRun?.status === 'failed';
  return (
    <Card className={cn('gap-0 overflow-hidden py-0 lg:gap-0 lg:py-0', needsAttention && 'border-l-4 border-l-red-600')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-base font-semibold leading-snug break-words">{item.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={item.enabled ? 'success' : 'muted'}>
                {item.enabled ? <CheckCircle2 aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
                {item.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {item.templateKey && <Badge variant="outline">Template</Badge>}
              {needsAttention && (
                <Badge variant="danger">
                  <AlertTriangle aria-hidden="true" />
                  {item.failedCount > 0 ? `${item.failedCount} failed ${item.failedCount === 1 ? 'run' : 'runs'}` : 'Last run failed'}
                </Badge>
              )}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/app/workflows/${item.id}`} aria-label={`${admin ? 'Edit' : 'View'} ${item.name}`}>
              {admin ? 'Edit' : 'View'}
            </Link>
          </Button>
        </div>
        <p className={cn('text-sm leading-5 break-words', item.description ? 'text-muted-foreground' : 'italic text-muted-foreground/70')}>
          {item.description || 'No description yet.'}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">Trigger</dt>
            <dd className="font-medium leading-5">{trigger}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Account</dt>
            <dd className="break-words font-medium leading-5">{item.contractorName ?? 'HomeQuote'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Runs</dt>
            <dd className="font-medium leading-5 tabular-nums">
              {item.runCount}
              {success !== null && <span className="font-normal text-muted-foreground"> · {success}% completed</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Updated</dt>
            <dd className="font-medium leading-5">{niceDate(item.updatedAt)}</dd>
          </div>
        </dl>
      </CardContent>
      <div className="flex min-h-12 items-center justify-between gap-3 border-t bg-muted/40 px-4 py-1 text-sm">
        {lastRun && LastIcon && item.lastRun ? (
          <span className={cn('inline-flex min-w-0 items-center gap-1.5', lastRun.tone)}>
            <LastIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Last run {lastRun.label}
              <span className="font-normal text-muted-foreground"> · {niceDate(item.lastRun.createdAt)}</span>
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No runs yet</span>
        )}
        <Link className="shrink-0 py-2 font-medium text-primary underline-offset-4 hover:underline" href={`/app/workflows/${item.id}/runs`}>
          View runs
        </Link>
      </div>
    </Card>
  );
}

export interface WorkflowFilters { status?: string; trigger?: string; kind?: string; contractor?: string }

export function WorkflowsView({ all, filters, admin }: { all: WorkflowListItem[]; filters: WorkflowFilters; admin: boolean }) {
  const workflows = all.filter(item => (!filters.status || filters.status === 'all' || (filters.status === 'enabled') === item.enabled)
    && (!filters.trigger || filters.trigger === 'all' || item.triggerType === filters.trigger)
    && (!filters.kind || filters.kind === 'all' || (filters.kind === 'template') === !!item.templateKey)
    && (!filters.contractor || filters.contractor === 'all' || (filters.contractor === 'network' ? !item.contractorId : item.contractorId === filters.contractor)));
  const contractors = Array.from(new Map(all.filter(item => item.contractorId).map(item => [item.contractorId!, item.contractorName ?? 'Contractor'])).entries());
  const totals = { runs: all.reduce((sum, item) => sum + item.runCount, 0), completed: all.reduce((sum, item) => sum + item.completedCount, 0), failed: all.reduce((sum, item) => sum + item.failedCount, 0), waiting: all.reduce((sum, item) => sum + item.waitingCount, 0) };
  const isSet = (value?: string) => !!value && value !== 'all';
  const activeCount = [filters.status, filters.trigger, filters.kind, admin ? filters.contractor : undefined].filter(isSet).length;
  const create = admin ? (
    <Button asChild size="lg" className="w-full sm:w-auto">
      <Link href="/app/workflows/new"><Plus aria-hidden="true" />Create workflow</Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Workflow Automations" description="Build reliable follow-up, handoff, and appointment journeys without code.">{create}</PageHeader>
      <SummaryStrip items={[
        { label: 'Total runs', value: totals.runs, meaning: 'Every run across all workflows', icon: WorkflowIcon },
        { label: 'Completed', value: totals.completed, meaning: 'Finished every step', icon: CheckCircle2 },
        { label: 'Failed', value: totals.failed, meaning: totals.failed ? 'Stopped on an error. Review runs.' : 'Stopped on an error', icon: XCircle, attention: true },
        { label: 'Waiting', value: totals.waiting, meaning: 'Paused on a delay or wait step', icon: Clock },
      ]} />
      <FilterPanel activeCount={activeCount} resetHref="/app/workflows">
        <FilterField label="Status" htmlFor="wf-status" active={isSet(filters.status)}>
          <Select id="wf-status" name="status" defaultValue={filters.status ?? 'all'}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></Select>
        </FilterField>
        <FilterField label="Trigger" htmlFor="wf-trigger" active={isSet(filters.trigger)}>
          <Select id="wf-trigger" name="trigger" defaultValue={filters.trigger ?? 'all'}><option value="all">All triggers</option>{WORKFLOW_EVENT_TYPES.map(type => <option key={type} value={type}>{WORKFLOW_TRIGGERS[type].label}</option>)}</Select>
        </FilterField>
        <FilterField label="Source" htmlFor="wf-kind" active={isSet(filters.kind)}>
          <Select id="wf-kind" name="kind" defaultValue={filters.kind ?? 'all'}><option value="all">Templates + custom</option><option value="template">From template</option><option value="custom">Custom</option></Select>
        </FilterField>
        {admin && (
          <FilterField label="Account" htmlFor="wf-contractor" active={isSet(filters.contractor)}>
            <Select id="wf-contractor" name="contractor" defaultValue={filters.contractor ?? 'all'}><option value="all">All accounts</option><option value="network">HomeQuote network</option>{contractors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select>
          </FilterField>
        )}
      </FilterPanel>
      <p className="text-sm text-muted-foreground" role="status">
        Showing {workflows.length} of {all.length} {all.length === 1 ? 'workflow' : 'workflows'}
      </p>
      {!workflows.length ? (
        <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-medium">{all.length ? 'No workflows match these filters.' : 'No workflows yet.'}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{all.length ? 'Reset the filters to see every workflow.' : admin ? 'Create your first workflow to automate follow-up.' : 'Workflows set up for your account will appear here.'}</p>
          {all.length ? <Button asChild variant="outline"><Link href="/app/workflows">Reset filters</Link></Button> : create}
        </CardContent></Card>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {workflows.map(item => <li key={item.id} className="min-w-0"><WorkflowCard item={item} admin={admin} /></li>)}
        </ul>
      )}
    </div>
  );
}
