'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchLeadsAction } from '@/lib/actions/signing';

export interface PickedLead { id: string; name: string }
interface Hit { id: string; name: string; detail: string }

/**
 * Search-as-you-type lead chooser. The server only returns leads the signed-in user may attach to (RLS), and, when
 * a company owns the document, only leads assigned to that company. The server re-checks on save.
 */
export function LeadPicker({ contractorId, value, onChange, label = 'Attach to a lead (optional)' }: { contractorId: string | null; value: PickedLead | null; onChange: (lead: PickedLead | null) => void; label?: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true); setError(null);
      const r = await searchLeadsAction(q, contractorId);
      if (mine !== seq.current) return; // a newer search is already running
      setBusy(false);
      if (!r.ok) { setError(r.error); setHits([]); } else setHits(r.leads);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, contractorId]);

  if (value) {
    return (
      <div className="space-y-1.5"><Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"><span className="truncate font-medium">{value.name}</span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange(null)} aria-label="Remove lead"><X className="size-4" /></button></div>
      </div>
    );
  }
  return (
    <div className="relative space-y-1.5"><Label htmlFor="lead-search">{label}</Label>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="lead-search" className="pl-9" placeholder="Search leads by name" autoComplete="off" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} /></div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md" role="listbox" aria-label="Matching leads">
          {busy && <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</p>}
          {error && <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>}
          {!busy && !error && hits.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{contractorId ? 'No matching leads assigned to this company.' : 'No matching leads.'}</p>}
          {hits.map((h) => (
            <button key={h.id} type="button" role="option" aria-selected="false" className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => { onChange({ id: h.id, name: h.name }); setOpen(false); setQ(''); }}>
              <span className="truncate">{h.name}</span><span className="shrink-0 text-xs text-muted-foreground">{h.detail}</span></button>))}
          <button type="button" className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent" onClick={() => setOpen(false)}>Close</button>
        </div>)}
    </div>
  );
}
