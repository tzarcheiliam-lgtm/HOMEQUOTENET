'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatLeadAge } from '@/lib/leads/display';
import { FunnelQuickActions } from './funnel-quick-actions';
import type { FunnelCardData } from './types';

const STATUS_VARIANT = { published: 'success', draft: 'outline', archived: 'muted' } as const;

function StatCell({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-sm font-semibold tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}

export function FunnelCard({ row, view, pinned, onTogglePin }: {
  row: FunnelCardData; view: 'grid' | 'list'; pinned: boolean; onTogglePin: (id: string) => void;
}) {
  const age = formatLeadAge(row.updatedAt);
  const updated = age ? `Updated ${age} ago` : 'Updated just now';
  const stats = row.starts > 0
    ? <div className={cn('grid grid-cols-3 gap-3', view === 'list' && 'sm:w-72')}>
        <StatCell label="Starts" value={row.starts} />
        <StatCell label="Leads" value={row.leads} />
        <StatCell label="Conversion" value={row.conversionRate === null ? '—' : `${row.conversionRate.toFixed(1)}%`} />
      </div>
    : <p className="text-sm text-muted-foreground">No responses yet</p>;

  return (
    <Card className="transition-shadow hover:shadow-md">
      {/* Column layout by default so the action buttons never squeeze against three stat cells on a narrow phone; list view widens back to a row at sm+. */}
      <CardContent className={cn('flex flex-col gap-3 p-4', view === 'list' && 'sm:flex-row sm:items-center sm:justify-between')}>
        <div className={cn('flex min-w-0 flex-1 flex-col gap-3', view === 'list' && 'sm:flex-row sm:items-center sm:gap-6')}>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onTogglePin(row.id)} aria-label={pinned ? 'Unpin funnel' : 'Pin funnel'} className="shrink-0 text-muted-foreground hover:text-amber-500">
                <Star className={cn('size-4', pinned && 'fill-amber-400 text-amber-500')} />
              </button>
              <h3 className="truncate text-sm font-semibold">{row.clientName}</h3>
              <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
              {row.isDemo && <Badge variant="secondary">Demo</Badge>}
              {row.needsQualification > 0 && <Badge variant="warning">{row.needsQualification} needs review</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {row.industry}{row.contractorName ? ` · ${row.contractorName}` : ' · HomeQuote (house)'} · {updated}
            </p>
          </div>
          {stats}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!row.isDemo && <Button asChild size="sm"><Link href={`/app/funnels/${row.id}/builder`}>Edit</Link></Button>}
          <FunnelQuickActions id={row.id} slug={row.slug} status={row.status} isDemo={row.isDemo} />
        </div>
      </CardContent>
    </Card>
  );
}
