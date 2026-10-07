'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { completeWorkflowTaskAction } from '@/lib/actions/workflow-graph';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { TaskItem } from '@/lib/data/workflow-graph';

export function TaskList({ tasks, showContractor }: { tasks: TaskItem[]; showContractor: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (!tasks.length) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No open tasks. Tasks created by your automations show up here.</CardContent></Card>;
  const done = async (id: string) => {
    setBusy(id);
    const r = await completeWorkflowTaskAction(id);
    setBusy(null);
    if (r.ok) { toast('Task completed.'); router.refresh(); } else toast(r.message ?? 'Could not update the task.', 'error');
  };
  return (
    <ul className="space-y-2">
      {tasks.map((t) => {
        const overdue = t.dueAt && new Date(t.dueAt).getTime() < Date.now();
        return (
          <li key={t.id}>
            <Card><CardContent className="flex items-start gap-3 p-4">
              <button type="button" onClick={() => done(t.id)} disabled={busy === t.id} aria-label={`Mark “${t.title}” done`} className="mt-0.5 text-muted-foreground hover:text-emerald-600 disabled:opacity-50">
                {busy === t.id ? <CheckCircle2 className="size-6 text-emerald-600" /> : <Circle className="size-6" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>}
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {t.leadId && <Link className="text-primary hover:underline" href={`/app/leads/${t.leadId}`}>{t.leadName ?? 'Open lead'}</Link>}
                  {showContractor && <span>{t.contractorName ?? 'HomeQuote network'}</span>}
                  {t.dueAt && <span className={cn(overdue && 'font-semibold text-rose-700')}>{overdue ? 'Overdue · ' : 'Due '}{new Date(t.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                </p>
              </div>
            </CardContent></Card>
          </li>
        );
      })}
    </ul>
  );
}
