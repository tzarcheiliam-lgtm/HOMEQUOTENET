import Link from 'next/link';
import { AlertTriangle, CircleCheck, CircleDashed, CirclePause, CircleSlash, Search, Workflow } from 'lucide-react';
import { AREA_LABELS, AUTOMATIONS, TRIGGER_LABELS, type Automation, type AutomationArea } from '@/lib/automations/registry';
import type { AutomationState, AutomationStatus, WorkflowSummaryItem } from '@/lib/automations/status.server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SummaryStrip } from '@/components/ui/summary-strip';
import { cn } from '@/lib/utils';

export const STATE_META: Record<AutomationState, { label: string; variant: 'success' | 'warning' | 'muted' | 'secondary' | 'danger'; dot: string; icon: typeof CircleCheck }> = {
  on: { label: 'On', variant: 'success', dot: 'bg-emerald-500', icon: CircleCheck },
  attention: { label: 'Needs a look', variant: 'danger', dot: 'bg-red-500', icon: AlertTriangle },
  off: { label: 'Off', variant: 'muted', dot: 'bg-muted-foreground/40', icon: CirclePause },
  dormant: { label: 'Not active', variant: 'warning', dot: 'bg-amber-500', icon: CircleSlash },
  not_set_up: { label: 'Not set up', variant: 'secondary', dot: 'bg-sky-500', icon: CircleDashed },
};
const STATE_ORDER: AutomationState[] = ['attention', 'on', 'off', 'dormant', 'not_set_up'];

export interface MapFilters { area?: string; state?: string; q?: string }

function rel(iso: string | null, now: Date) {
  if (!iso) return 'Never';
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

function matches(a: Automation, st: AutomationStatus | undefined, f: MapFilters) {
  if (f.area && a.area !== f.area) return false;
  if (f.state && st?.state !== f.state) return false;
  const q = f.q?.trim().toLowerCase();
  return !q || [a.name, a.when, a.what, a.file, AREA_LABELS[a.area]].some((t) => t.toLowerCase().includes(q));
}

function AutomationRow({ a, st, now }: { a: Automation; st?: AutomationStatus; now: Date }) {
  const meta = STATE_META[st?.state ?? 'not_set_up'];
  return (
    <li className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
          <h3 className="font-medium">{a.name}</h3>
          <Badge variant={meta.variant}><meta.icon aria-hidden />{meta.label}</Badge>
          <span className="text-xs text-muted-foreground">{TRIGGER_LABELS[a.trigger]}</span>
        </div>
        <p className="text-sm"><span className="text-muted-foreground">When: </span>{a.when}</p>
        <p className="text-sm"><span className="text-muted-foreground">Does: </span>{a.what}</p>
        {st?.note && <p className={cn('text-sm', st.state === 'attention' ? 'text-red-700 dark:text-red-300' : st.state === 'dormant' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>{st.note}</p>}
        {a.gap && <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />{a.gap}</p>}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Technical details</summary>
          <p className="mt-1 break-words font-mono">{a.file}</p>
          {a.record && <p className="mt-0.5">History from <code>{a.record.table}</code></p>}
          {!!a.requiresEnv?.length && <p className="mt-0.5">Needs: {a.requiresEnv.join(', ')}</p>}
        </details>
      </div>
      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-start md:text-right">
        <dl className="flex gap-4 text-sm md:flex-col md:gap-1">
          {a.record ? (<>
            <div><dt className="text-xs text-muted-foreground">Last ran</dt><dd className="tabular-nums">{st && st.count7d !== null ? rel(st.lastRunAt, now) : '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Last 7 days</dt><dd className="tabular-nums">{st?.count7d ?? '—'}{st?.count7d != null ? ` ${a.record.unit}${st.count7d === 1 ? '' : 's'}` : ''}</dd></div>
          </>) : <div><dt className="text-xs text-muted-foreground">History</dt><dd className="text-muted-foreground">Not recorded</dd></div>}
        </dl>
        {a.settingsHref && <Link href={a.settingsHref} className="shrink-0 text-sm font-medium text-primary hover:underline">Settings →</Link>}
      </div>
    </li>
  );
}

export function AutomationMap({ statuses, workflows, filters, now = new Date() }: { statuses: AutomationStatus[]; workflows: WorkflowSummaryItem[]; filters: MapFilters; now?: Date }) {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  const count = (s: AutomationState) => statuses.filter((x) => x.state === s).length;
  const shown = AUTOMATIONS.filter((a) => matches(a, byId.get(a.id), filters));
  const areas = (Object.keys(AREA_LABELS) as AutomationArea[]).map((area) => ({ area, items: shown.filter((a) => a.area === area) })).filter((g) => g.items.length);
  const live = workflows.filter((w) => w.live);
  const filtering = !!(filters.area || filters.state || filters.q);
  const showWorkflows = !filters.state && (!filters.area || filters.area === 'workflows') && (!filters.q || workflows.some((w) => w.name.toLowerCase().includes(filters.q!.toLowerCase())));
  const wfShown = filters.q ? workflows.filter((w) => w.name.toLowerCase().includes(filters.q!.toLowerCase())) : workflows;

  return (
    <div className="space-y-6">
      <SummaryStrip items={[
        { label: 'Needs a look', value: count('attention'), meaning: 'Stalled, failing or disconnected', icon: AlertTriangle, attention: true },
        { label: 'On', value: count('on'), meaning: `of ${AUTOMATIONS.length} built-in automations`, icon: CircleCheck },
        { label: 'Off or not active', value: count('off') + count('dormant') + count('not_set_up'), meaning: 'Switched off, missing setup, or migration needed', icon: CirclePause },
        { label: 'Live workflows', value: live.length, meaning: `${workflows.length} workflow${workflows.length === 1 ? '' : 's'} in total`, icon: Workflow },
      ]} />

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search" aria-label="Filter automations">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={filters.q ?? ''} placeholder="Search automations" aria-label="Search automations" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select name="area" defaultValue={filters.area ?? ''} aria-label="Area" className="sm:w-56">
          <option value="">All areas</option>
          {(Object.keys(AREA_LABELS) as AutomationArea[]).map((a) => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
        </Select>
        <Select name="state" defaultValue={filters.state ?? ''} aria-label="Status" className="sm:w-44">
          <option value="">Any status</option>
          {STATE_ORDER.map((s) => <option key={s} value={s}>{STATE_META[s].label}</option>)}
        </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="secondary">Filter</Button>
          {filtering && <Link href="/app/automations" className="inline-flex items-center px-2 text-sm text-primary hover:underline">Clear</Link>}
        </div>
      </form>

      {areas.length === 0 && !showWorkflows && <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nothing matches these filters.</p>}

      {areas.map(({ area, items }) => (
        <section key={area} aria-labelledby={`area-${area}`} className="space-y-2">
          <h2 id={`area-${area}`} className="flex items-baseline justify-between gap-2 text-lg font-semibold">
            {AREA_LABELS[area]}
            <span className="text-xs font-normal text-muted-foreground">{items.filter((a) => byId.get(a.id)?.state === 'on').length} of {items.length} on</span>
          </h2>
          <ul className="divide-y rounded-xl border bg-card">{items.map((a) => <AutomationRow key={a.id} a={a} st={byId.get(a.id)} now={now} />)}</ul>
        </section>
      ))}

      {showWorkflows && (
        <section aria-labelledby="area-your-workflows" className="space-y-2">
          <h2 id="area-your-workflows" className="flex items-baseline justify-between gap-2 text-lg font-semibold">
            Your workflows
            <Link href="/app/workflows" className="text-sm font-normal text-primary hover:underline">Open workflows →</Link>
          </h2>
          {wfShown.length === 0 ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">No workflows yet. Build one or start from a template on the Workflows page.</p> : (
            <ul className="divide-y rounded-xl border bg-card">
              {wfShown.map((w) => (
                <li key={w.id}>
                  <Link href={`/app/workflows/${w.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span aria-hidden className={cn('h-2 w-2 rounded-full', w.live ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                        <span className="font-medium">{w.name}</span>
                        <Badge variant={w.live ? 'success' : 'muted'}>{w.live ? 'Live' : w.status === 'paused' ? 'Paused' : w.engine === 'graph' ? 'Draft' : 'Off'}</Badge>
                        {w.failed7d > 0 && <Badge variant="danger">{w.failed7d} failed</Badge>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Starts on {w.triggerType.replace(/[._]/g, ' ')}{w.contractorName ? ` · ${w.contractorName}` : ' · HomeQuote'}</span>
                    </span>
                    <span className="text-right text-sm tabular-nums"><span className="block">{w.runs7d} run{w.runs7d === 1 ? '' : 's'} in 7 days</span><span className="block text-xs text-muted-foreground">Last {rel(w.lastRunAt, now)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
