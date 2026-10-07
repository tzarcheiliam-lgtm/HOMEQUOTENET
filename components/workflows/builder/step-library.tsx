'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NODE_CATEGORY_LABELS, NODE_TYPES, NODE_TYPE_LIST, type GraphNodeType, type NodeCategory } from '@/lib/workflows/graph';
import { CATEGORY_STYLE, NodeIcon } from './node-icons';

const ORDER: NodeCategory[] = ['contact', 'records', 'timing', 'logic', 'finish'];

/** Searchable step library, grouped by purpose. Steps that need setup are visible but cannot be added. */
export function StepLibrary({
  open, onOpenChange, onPick, context, existingTargets, onPickExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: GraphNodeType) => void;
  /** Steps this output may legally continue at (no loops, no ambiguity) — lets branches rejoin without dragging. */
  existingTargets?: { id: string; label: string }[];
  onPickExisting?: (id: string) => void;
  /** e.g. "After “Call homeowner” → Booked" */
  context?: string;
}) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDER.map((category) => ({
      category,
      items: NODE_TYPE_LIST.filter((d) => d.kind !== 'trigger' && d.category === category && (!q || [d.label, d.description, ...d.keywords].some((s) => s.toLowerCase().includes(q)))),
    })).filter((g) => g.items.length);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setQuery(''); onOpenChange(o); }}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 sm:max-w-xl" aria-describedby="step-library-desc">
        <div>
          <DialogTitle>Add a step</DialogTitle>
          <DialogDescription id="step-library-desc">{context ?? 'Choose what should happen next.'}</DialogDescription>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search steps — call, email, wait, task…" className="pl-9" aria-label="Search steps" />
        </div>
        <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          {existingTargets && existingTargets.length > 0 && onPickExisting && !query && (
            <section aria-label="Continue at an existing step">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Continue at an existing step</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {existingTargets.map((t) => (
                  <li key={t.id}><button type="button" onClick={() => { onPickExisting(t.id); onOpenChange(false); }} className="w-full truncate rounded-lg border border-dashed p-2.5 text-left text-sm hover:border-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary">↪ {t.label}</button></li>
                ))}
              </ul>
            </section>
          )}
          {groups.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No step matches “{query}”.</p>}
          {groups.map((g) => (
            <section key={g.category} aria-label={NODE_CATEGORY_LABELS[g.category]}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{NODE_CATEGORY_LABELS[g.category]}</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {g.items.map((d) => {
                  const blocked = d.availability !== 'ready';
                  return (
                    <li key={d.type}>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => { onPick(d.type); setQuery(''); onOpenChange(false); }}
                        className={cn('flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition', blocked ? 'cursor-not-allowed opacity-60' : 'hover:border-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary')}
                      >
                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', CATEGORY_STYLE[d.category].chip)}><NodeIcon type={d.type} className="size-4" /></span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-medium">{d.label}{blocked && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">Requires setup</span>}</span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">{blocked ? d.setupNote : d.description}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { NODE_TYPES };
