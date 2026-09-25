'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ContractorOption } from '@/lib/data/contractors';

export type FunnelListFilters = {
  q: string;
  status: 'all' | 'draft' | 'published' | 'archived';
  contractor: string; // 'all' | 'house' | contractor id
  niche: string; // 'all' | industry value
  sort: 'updated' | 'created' | 'name' | 'leads' | 'conversion' | 'starts';
  group: 'none' | 'contractor';
};

const SORTS: { value: FunnelListFilters['sort']; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Created date' },
  { value: 'name', label: 'Funnel name' },
  { value: 'leads', label: 'Most leads' },
  { value: 'conversion', label: 'Highest completion rate' },
  { value: 'starts', label: 'Most starts' },
];

// A plain GET form — submitting updates the URL query string, so search,
// filters, sort and grouping all round-trip through shareable/back-button-safe
// URLs. Search is always visible; the rest collapse behind a "Filters" toggle
// on phones (a lightweight stand-in for a drawer/sheet) and stay open at sm+.
export function FunnelFiltersBar({ current, contractors, niches }: {
  current: FunnelListFilters; contractors: ContractorOption[]; niches: string[];
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [current.status !== 'all', current.contractor !== 'all', current.niche !== 'all', current.group !== 'none'].filter(Boolean).length;

  return (
    <Card className="p-4">
      <form method="get" className="space-y-3">
        <div className="flex gap-2">
          <Input name="q" className="flex-1" placeholder="Search by funnel name, contractor, niche or slug…" defaultValue={current.q} />
          <Button type="button" variant="outline" size="sm" className="shrink-0 sm:hidden" onClick={() => setOpen((o) => !o)}>
            <SlidersHorizontal className="size-4" /> Filters{activeCount > 0 && ` (${activeCount})`}
          </Button>
          <Button type="submit" size="sm" className="hidden sm:inline-flex">Apply</Button>
        </div>

        <div className={cn('grid gap-3 sm:grid-cols-2 md:grid-cols-4', !open && 'hidden sm:grid')}>
          <Select name="status" defaultValue={current.status}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
          <Select name="contractor" defaultValue={current.contractor}>
            <option value="all">All contractors</option>
            <option value="house">HomeQuote (house)</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select name="niche" defaultValue={current.niche}>
            <option value="all">All niches</option>
            {niches.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select name="sort" defaultValue={current.sort}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="group" value="contractor" defaultChecked={current.group === 'contractor'} className="size-4 rounded border-input" />
            Group by contractor
          </label>
          <div className="flex gap-2 sm:col-span-2 sm:justify-self-end">
            <Button type="submit" size="sm" className="sm:hidden">Apply</Button>
            <Button asChild size="sm" variant="ghost"><Link href="/app/funnels">Clear</Link></Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
