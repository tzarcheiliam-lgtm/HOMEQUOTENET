'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { FunnelCard } from './funnel-card';
import type { FunnelGroup } from './types';

const PAGE_SIZE = 24;
const VIEW_KEY = 'funnels:view';
const PINNED_KEY = 'funnels:pinned';

export function FunnelDashboard({ groups, grouped, hasAnyFunnels }: { groups: FunnelGroup[]; grouped: boolean; hasAnyFunnels: boolean }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    try {
      const storedView = localStorage.getItem(VIEW_KEY);
      if (storedView === 'grid' || storedView === 'list') setView(storedView);
      const storedPinned = localStorage.getItem(PINNED_KEY);
      if (storedPinned) setPinned(new Set(JSON.parse(storedPinned) as string[]));
    } catch { /* localStorage unavailable — fall back to defaults */ }
  }, []);

  function changeView(next: 'grid' | 'list') {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
  }

  function togglePin(id: string) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(PINNED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  // Pinned funnels float to the top, but only when funnels aren't already
  // bucketed by contractor — reordering across group headers would be confusing.
  const displayGroups = useMemo(() => {
    if (grouped) return groups;
    const all = groups[0]?.rows ?? [];
    if (!pinned.size) return groups;
    const pinnedRows = all.filter((r) => pinned.has(r.id));
    const restRows = all.filter((r) => !pinned.has(r.id));
    return [{ key: 'all', label: '', rows: [...pinnedRows, ...restRows] }];
  }, [groups, grouped, pinned]);

  const totalMatching = displayGroups.reduce((n, g) => n + g.rows.length, 0);

  if (!totalMatching) {
    return <EmptyState
      title={hasAnyFunnels ? 'No funnels match your filters' : 'No funnels yet'}
      description={hasAnyFunnels ? 'Try a different search term or clear a filter.' : 'Click Create funnel to build one, or follow FUNNELS.md to publish a client configuration by script.'}
    />;
  }

  let rendered = 0;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{totalMatching} funnel{totalMatching === 1 ? '' : 's'}</p>
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button type="button" size="icon" variant={view === 'grid' ? 'secondary' : 'ghost'} className="size-7" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')}><LayoutGrid className="size-4" /></Button>
          <Button type="button" size="icon" variant={view === 'list' ? 'secondary' : 'ghost'} className="size-7" aria-label="List view" aria-pressed={view === 'list'} onClick={() => changeView('list')}><List className="size-4" /></Button>
        </div>
      </div>

      {displayGroups.map((group) => {
        const isSingleUngroupedList = !grouped;
        const limit = isSingleUngroupedList ? visible : group.rows.length;
        const rows = group.rows.slice(0, limit);
        rendered += rows.length;
        if (!rows.length) return null;
        return (
          <section key={group.key} className="space-y-3">
            {grouped && <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label} · {group.rows.length}</h2>}
            <div className={cn(view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2')}>
              {rows.map((row) => <FunnelCard key={row.id} row={row} view={view} pinned={pinned.has(row.id)} onTogglePin={togglePin} />)}
            </div>
          </section>
        );
      })}

      {!grouped && rendered < totalMatching && (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Load more</Button>
        </div>
      )}
    </div>
  );
}
