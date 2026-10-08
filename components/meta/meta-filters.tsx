import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RANGE_PRESETS, resolvePreset, type DateRange } from '@/lib/meta/metrics';

const LABEL: Record<string, string> = {
  today: 'Today', yesterday: 'Yesterday', last_7d: '7 days', last_14d: '14 days', last_30d: '30 days', this_month: 'This month', last_month: 'Last month',
};

/** GET form: every filter lives in the URL, so a drill-down view is shareable and the back button just works. */
export function MetaFilters({ range, tz, contractors, contractorId, hidden }: {
  range: DateRange; tz: string; contractors?: { id: string; name: string }[]; contractorId?: string | null;
  /** Drill-down keys carried through the form (campaign / adset / ad). */
  hidden: Record<string, string | undefined>;
}) {
  const carry = Object.entries(hidden).filter(([, v]) => v) as [string, string][];
  const presetHref = (p: string) => {
    const r = resolvePreset(p as never, tz);
    const q = new URLSearchParams({ ...Object.fromEntries(carry), since: r.since, until: r.until });
    if (contractorId) q.set('contractor', contractorId);
    return `/app/meta-ads?${q}`;
  };
  return (
    <div className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Date presets">
        {RANGE_PRESETS.map((p) => {
          const r = resolvePreset(p, tz);
          const active = r.since === range.since && r.until === range.until;
          return (
            <Link key={p} href={presetHref(p)} aria-current={active ? 'true' : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? 'border-primary bg-accent font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              {LABEL[p]}
            </Link>
          );
        })}
      </div>
      <form className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" action="/app/meta-ads">
        {carry.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="space-y-1.5"><Label htmlFor="since">From</Label><Input id="since" type="date" name="since" defaultValue={range.since} /></div>
        <div className="space-y-1.5"><Label htmlFor="until">To</Label><Input id="until" type="date" name="until" defaultValue={range.until} /></div>
        {contractors && (
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="contractor">Contractor</Label>
            <Select id="contractor" name="contractor" defaultValue={contractorId ?? ''}>
              <option value="">All contractors</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <Button type="submit" className="col-span-2 sm:col-span-1">Apply</Button>
      </form>
      <p className="text-xs text-muted-foreground">Dates are calendar days. Meta figures use each ad account&rsquo;s own reporting timezone; HQN figures use {tz}.</p>
    </div>
  );
}
