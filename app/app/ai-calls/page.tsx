import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { aiCallingEnabled } from '@/lib/ai-calling/config';
import { AI_CALLS_PAGE_SIZE, getCallingOverview, listAiCallJobs } from '@/lib/data/ai-calling';
import { JOB_STATUS_LABELS } from '@/lib/ai-calling/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { StatusPanel } from '@/components/ai-calls/status-panel';
import { ContractorConfigForm } from '@/components/ai-calls/contractor-config-form';
import { CallingSettingsForm, OptOutForm } from '@/components/ai-calls/settings-forms';
import { JobsTable } from '@/components/ai-calls/jobs-table';

export const metadata = { title: 'AI Agent Calls · HomeQuote Network' };

type SP = { contractor?: string; status?: string; trigger?: string; from?: string; to?: string; page?: string };

export default async function AiCallsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [overview, jobs] = await Promise.all([getCallingOverview(), listAiCallJobs({ ...sp, page })]);
  const pages = Math.max(1, Math.ceil(jobs.total / AI_CALLS_PAGE_SIZE));
  const href = (p: number) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== 'page') q.set(k, v); q.set('page', String(p)); return `/app/ai-calls?${q}`; };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Agent Calls" description="Automatic calls to new form leads and manually started calls. Every call passes consent, opt-out, number, timezone and calling-window checks.">
        <Link href="/app/ai-calls/new" className={cn(buttonVariants({ size: 'lg' }), 'max-lg:w-full')}><Plus className="size-4" /> New AI Call</Link>
      </PageHeader>

      <StatusPanel envEnabled={aiCallingEnabled()} enabled={overview.settings.enabled} stoppedAt={overview.settings.stopped_at} counts={overview.counts} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contractors</h2>
        <p className="text-sm text-muted-foreground">Automatic mode calls new form leads assigned to the contractor. Nothing is automatic until you choose it here.</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.contractors.map((c) => <ContractorConfigForm key={c.id} row={c} />)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Call history</h2>
        <form method="get" className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1"><Label htmlFor="f-contractor">Contractor</Label>
            <Select id="f-contractor" name="contractor" defaultValue={sp.contractor ?? ''}><option value="">All</option>{overview.contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          <div className="space-y-1"><Label htmlFor="f-status">Status</Label>
            <Select id="f-status" name="status" defaultValue={sp.status ?? ''}><option value="">All</option>{Object.entries(JOB_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
          <div className="space-y-1"><Label htmlFor="f-trigger">Type</Label>
            <Select id="f-trigger" name="trigger" defaultValue={sp.trigger ?? ''}><option value="">Automatic and manual</option><option value="auto_form">Automatic</option><option value="manual">Manual</option></Select></div>
          <div className="space-y-1"><Label htmlFor="f-from">From</Label><Input id="f-from" type="date" name="from" defaultValue={sp.from ?? ''} /></div>
          <div className="space-y-1"><Label htmlFor="f-to">To</Label><Input id="f-to" type="date" name="to" defaultValue={sp.to ?? ''} /></div>
          <div className="flex items-end gap-2"><Button type="submit" size="sm">Filter</Button><Link href="/app/ai-calls" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Reset</Link></div>
        </form>
        <JobsTable rows={jobs.rows} />
        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">Page {page} of {pages} · {jobs.total} calls</span>
            <div className="flex gap-2">
              <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), page <= 1 && 'pointer-events-none opacity-50')}>Previous</Link>
              <Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), page >= pages && 'pointer-events-none opacity-50')}>Next</Link>
            </div>
          </div>
        )}
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">Calling rules</CardTitle></CardHeader>
        <CardContent><CallingSettingsForm settings={overview.settings} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Opt-outs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Numbers here are never called by the AI agent. People who ask to stop during a call are added automatically when the call analysis reports it.</p>
          <OptOutForm />
        </CardContent>
      </Card>
    </div>
  );
}
