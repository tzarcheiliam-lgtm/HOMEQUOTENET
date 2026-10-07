import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '@/lib/workflows';
import type { GraphWorkflowListItem } from '@/lib/data/workflow-graph';

const niceDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const STATUS = {
  draft: { label: 'Draft', variant: 'muted' as const },
  published: { label: 'Published', variant: 'success' as const },
  paused: { label: 'Paused', variant: 'warning' as const },
};

/** Cards for visual (graph) workflows. */
export function GraphWorkflowList({ items, canCreate }: { items: GraphWorkflowListItem[]; canCreate: boolean }) {
  if (!items.length) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Workflow className="size-6" aria-hidden /></span>
        <h2 className="text-lg font-semibold">Build your first automation</h2>
        <p className="max-w-md text-sm text-muted-foreground">Pick a trigger, add steps like “Call homeowner” or “Send email”, branch on what happens, test it safely, then publish. Nothing runs until you publish.</p>
        {canCreate && <Button asChild><Link href="/app/workflows/new">New automation</Link></Button>}
      </CardContent></Card>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((w) => {
        const s = STATUS[w.status];
        return (
          <Card key={w.id} className="overflow-hidden">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold"><Link href={`/app/workflows/${w.id}`} className="hover:underline">{w.name}</Link></h2>
                    <Badge variant={s.variant}>{s.label}{w.publishedVersion ? ` · v${w.publishedVersion}` : ''}</Badge>
                    {w.hasUnpublishedChanges && <Badge variant="outline">Unpublished changes</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{w.description || 'No description yet.'}</p>
                </div>
                <Button asChild size="sm"><Link href={`/app/workflows/${w.id}`}>Open</Link></Button>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-muted-foreground">Starts when</dt><dd className="font-medium">{WORKFLOW_TRIGGERS[w.triggerType as WorkflowEventType]?.label ?? w.triggerType}</dd></div>
                <div><dt className="text-muted-foreground">Account</dt><dd className="font-medium">{w.contractorName ?? 'HomeQuote network'}</dd></div>
                <div><dt className="text-muted-foreground">Active runs</dt><dd className="font-medium">{w.runCounts.active}</dd></div>
                <div><dt className="text-muted-foreground">Updated</dt><dd className="font-medium">{niceDate(w.updatedAt)}</dd></div>
              </dl>
              {w.paused && (
                <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Paused{w.paused.since ? ` since ${niceDate(w.paused.since)}` : ''}. {w.paused.heldRuns} {w.paused.heldRuns === 1 ? 'run is' : 'runs are'} held and {w.paused.skippedEvents} new {w.paused.skippedEvents === 1 ? 'event was' : 'events were'} not enrolled. Those events will not enroll after you resume.
                </p>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">{w.runCounts.completed} completed · {w.runCounts.failed} failed</span>
                <Link className="font-medium text-primary hover:underline" href={`/app/workflows/${w.id}/runs`}>Run history</Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
