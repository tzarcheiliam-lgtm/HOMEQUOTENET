import Link from 'next/link';
import { History } from 'lucide-react';
import type { RunListItem } from '@/lib/data/workflow-graph';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RUN_STATUS_LABEL, RunStatusBadge, SourceBadge, When, humanize, triggerLabel } from './run-format';

const ACTIVE = new Set(['pending', 'running', 'waiting', 'failed']);

/**
 * Run history table (cards on phones). Works as a server component: the filters are a plain
 * GET form, so the page re-renders with `?status=` / `?workflow=`.
 */
export function RunList({
  runs, isAdmin, workflows, filters = {},
}: {
  runs: RunListItem[];
  isAdmin: boolean;
  /** Pass to show the workflow filter (omit when the list is already for one workflow). */
  workflows?: { id: string; name: string }[];
  filters?: { status?: string; workflow?: string };
}) {
  const filtered = !!filters.status || !!filters.workflow;
  return (
    <div className="space-y-4">
      <form method="get" className="grid gap-2 rounded-2xl bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto]" aria-label="Filter runs">
        <label className="sr-only" htmlFor="run-status">Status</label>
        <Select id="run-status" name="status" defaultValue={filters.status ?? ''}>
          <option value="">All statuses</option>
          {Object.entries(RUN_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        {workflows ? (
          <>
            <label className="sr-only" htmlFor="run-workflow">Workflow</label>
            <Select id="run-workflow" name="workflow" defaultValue={filters.workflow ?? ''}>
              <option value="">All workflows</option>
              {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </>
        ) : <span className="hidden sm:block" />}
        <Button variant="outline" type="submit">Apply filters</Button>
      </form>

      {!runs.length ? (
        <EmptyState
          icon={History}
          title={filtered ? 'No runs match these filters' : 'No runs yet'}
          description={filtered ? 'Try a different status or workflow.' : 'When a lead enters a published workflow, each run shows up here with every step it took.'}
        />
      ) : (
        <Card className="p-0">
          <Table stack>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                {isAdmin && <TableHead>Contractor</TableHead>}
                <TableHead>Workflow</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active step</TableHead>
                <TableHead>Waiting until</TableHead>
                <TableHead><span className="sr-only">Details</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell label="Lead" className="font-medium">
                    {r.leadId ? <Link href={`/app/leads/${r.leadId}`} className="hover:underline">{r.leadName ?? 'Lead'}</Link> : (r.leadName ?? '—')}
                  </TableCell>
                  {isAdmin && <TableCell label="Contractor">{r.contractorName ?? 'HomeQuote'}</TableCell>}
                  <TableCell label="Workflow">
                    <span className="font-medium">{r.workflowName}</span> <span className="tabular-nums text-muted-foreground">v{r.workflowVersion}</span>
                  </TableCell>
                  <TableCell label="Trigger">{triggerLabel(r.trigger)}</TableCell>
                  <TableCell label="Source"><SourceBadge source={r.source} mode={r.mode} /></TableCell>
                  <TableCell label="Enrolled"><When iso={r.enrolledAt} /></TableCell>
                  <TableCell label="Status"><RunStatusBadge status={r.status} mode={r.mode} /></TableCell>
                  <TableCell label="Active step">{ACTIVE.has(r.status) && r.currentStepKey ? humanize(r.currentStepKey) : '—'}</TableCell>
                  <TableCell label="Waiting until">{r.status === 'waiting' && r.resumeAt ? <When iso={r.resumeAt} /> : '—'}</TableCell>
                  <TableCell>
                    <Link href={`/app/workflows/runs/${r.id}`} className="text-sm font-medium text-primary hover:underline">View run</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
