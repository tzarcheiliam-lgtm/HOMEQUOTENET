'use client';

import { useState } from 'react';
import { archiveGraphAction, pauseGraphAction, resumeGraphAction } from '@/lib/actions/workflow-graph';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';

export type LifecycleKind = 'pause' | 'resume' | 'archive';

const COPY: Record<LifecycleKind, { title: string; confirm: string; body: string[] }> = {
  pause: {
    title: 'Pause this workflow?',
    confirm: 'Pause workflow',
    body: [
      'New enrollments stop right away. Events that happen while paused will never enroll, even after you resume.',
      'Runs that are waiting are held: their timers freeze and they continue when you resume.',
      'A step that is already running finishes first. A call that has already been placed continues with the provider and its result is saved, but the run will not move on until you resume.',
    ],
  },
  resume: {
    title: 'Resume this workflow?',
    confirm: 'Resume workflow',
    body: ['Held runs continue where they stopped (overdue waits continue immediately).', 'Enrollment restarts from now — leads that arrived while paused are not enrolled.'],
  },
  archive: {
    title: 'Archive this workflow?',
    confirm: 'Archive',
    body: ['It stops enrolling new leads. Runs already in progress finish on their version. You can still see its run history.'],
  },
};

export function LifecycleDialog({ kind, workflowId, onOpenChange, onDone }: { kind: LifecycleKind | null; workflowId: string; onOpenChange: (o: boolean) => void; onDone: (kind: LifecycleKind) => void }) {
  const [busy, setBusy] = useState(false);
  if (!kind) return null;
  const copy = COPY[kind];
  const run = async () => {
    setBusy(true);
    const r = kind === 'pause' ? await pauseGraphAction(workflowId) : kind === 'resume' ? await resumeGraphAction(workflowId) : await archiveGraphAction(workflowId);
    setBusy(false);
    if (r.ok) { toast(r.message ?? 'Done.'); onDone(kind); onOpenChange(false); } else toast(r.message ?? 'Something went wrong.', 'error');
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription className="sr-only">{copy.title}</DialogDescription>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{copy.body.map((b) => <li key={b}>{b}</li>)}</ul>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={kind === 'archive' ? 'destructive' : 'default'} onClick={run} disabled={busy}>{busy ? 'Working…' : copy.confirm}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
