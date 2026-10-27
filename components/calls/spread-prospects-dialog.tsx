'use client';

import { useActionState, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Shuffle, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { spreadUnassignedProspects, type SpreadState } from '@/lib/actions/prospects';
import { NO_NICHE, spreadCounts } from '@/lib/calls/spread';
import type { SpreadOverview } from '@/lib/data/prospects';

/**
 * "Spread unassigned": hand the unassigned prospects out across the people the
 * admin picks, shortest open list first. The preview uses the same split as
 * the server (lib/calls/spread.ts), so what you see is what gets assigned.
 */
export function SpreadProspectsDialog({ overview }: { overview: SpreadOverview }) {
  const [open, setOpen] = useState(false);
  // A fresh form each time the dialog opens, so an earlier result never lingers.
  const [round, setRound] = useState(0);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRound((r) => r + 1);
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="outline" disabled={overview.unassignedTotal === 0}>
          <Shuffle className="size-4" aria-hidden="true" />
          Spread unassigned ({overview.unassignedTotal})
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Spread unassigned prospects</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Each prospect goes to whoever has the shortest open list, so nobody ends up buried.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <SpreadForm key={round} overview={overview} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SpreadForm({ overview }: { overview: SpreadOverview }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [niche, setNiche] = useState('');
  const [maxEach, setMaxEach] = useState('');
  const [state, action, pending] = useActionState<SpreadState, FormData>(spreadUnassignedProspects, undefined);

  const available = niche
    ? (overview.unassignedByNiche.find((n) => (n.niche || NO_NICHE) === niche)?.count ?? 0)
    : overview.unassignedTotal;
  const people = overview.loads.filter((p) => picked.has(p.id));
  const cap = maxEach === '' ? null : Number(maxEach);
  const preview = spreadCounts(available, people, cap);
  const willAssign = [...preview.values()].reduce((n, c) => n + c, 0);

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return state?.ok ? (
    <div className="mt-6 space-y-3">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Assigned {state.assigned.reduce((n, a) => n + a.count, 0)} prospects
      </p>
      <ul className="space-y-1 text-sm">
        {state.assigned.map((a) => (
          <li key={a.name} className="flex justify-between">
            <span>{a.name}</span>
            <span className="tabular-nums">+{a.count}</span>
          </li>
        ))}
      </ul>
      {state.left > 0 ? (
        <p className="text-xs text-muted-foreground">
          {state.left} left unassigned (the per-person limit was reached).
        </p>
      ) : null}
      <Dialog.Close asChild>
        <Button className="w-full">Done</Button>
      </Dialog.Close>
    </div>
  ) : (
    <form action={action} className="mt-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sp-niche">Which prospects</Label>
        <Select id="sp-niche" name="niche" value={niche} onChange={(e) => setNiche(e.target.value)}>
          <option value="">All niches ({overview.unassignedTotal})</option>
          {overview.unassignedByNiche.map((n) => (
            <option key={n.niche || NO_NICHE} value={n.niche || NO_NICHE}>
              {n.niche || 'No niche'} ({n.count})
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Who gets them</legend>
        <ul className="divide-y rounded-md border">
          {overview.loads.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="assignee"
                  value={p.id}
                  checked={picked.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="size-4 accent-primary"
                />
                <span className="flex-1">
                  {p.name}
                  <span className="block text-xs text-muted-foreground">{p.load} on their list now</span>
                </span>
                {picked.has(p.id) ? <span className="tabular-nums font-medium">+{preview.get(p.id) ?? 0}</span> : null}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="sp-max">Max per person (optional)</Label>
        <Input
          id="sp-max"
          name="max_each"
          type="number"
          inputMode="numeric"
          min={1}
          max={5000}
          placeholder="No limit"
          value={maxEach}
          onChange={(e) => setMaxEach(e.target.value)}
        />
      </div>

      {state && !state.ok ? (
        <p role="alert" className="inline-flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || people.length === 0 || willAssign === 0}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {people.length === 0 ? 'Pick at least one person' : `Assign ${willAssign} prospects`}
      </Button>
    </form>
  );
}
