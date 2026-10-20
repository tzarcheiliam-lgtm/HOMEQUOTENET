'use client';

import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import type { UiBlock } from './types';

const STATE_ICON = {
  ok: <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-label="OK" />,
  warn: <AlertTriangle className="size-4 shrink-0 text-amber-300" aria-label="Needs attention" />,
  bad: <XCircle className="size-4 shrink-0 text-rose-400" aria-label="Problem" />,
  unknown: <CircleHelp className="size-4 shrink-0 text-white/50" aria-label="Not verified" />,
} as const;

/** Guided selection cards (funnels, ad accounts, datasets). Clicking sends a normal chat message; ids are re-validated on the server. */
export function BlockView({ block, onPick, disabled }: { block: UiBlock; onPick: (kind: string, id: string, label: string) => void; disabled: boolean }) {
  if (block.type === 'cards') {
    return (
      <section aria-label={block.title} className="my-2 rounded-lg border border-white/15 bg-white/5 p-2">
        <h4 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-white/70">{block.title}</h4>
        {block.items.length === 0 && <p className="px-1 py-2 text-sm text-white/70">Nothing to choose from.</p>}
        <ul className="space-y-1.5">
          {block.items.map(item => (
            <li key={item.id}>
              <button type="button" disabled={disabled || item.disabled} title={item.disabled ? item.reason : undefined} onClick={() => onPick(block.kind, item.id, item.label)}
                className="flex w-full items-start justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-sky-300/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{item.label}</span>{item.detail && <span className="block truncate text-xs text-white/60">{item.detail}</span>}</span>
                {item.badge && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">{item.badge}</span>}
              </button>
            </li>
          ))}
        </ul>
        {block.note && <p className="px-1 pt-1.5 text-xs text-white/60">{block.note}</p>}
      </section>
    );
  }
  return (
    <section aria-label={block.title} className="my-2 rounded-lg border border-white/15 bg-white/5 p-3">
      <h4 className="pb-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">{block.title}</h4>
      <dl className="space-y-1.5">
        {block.rows.map((r, i) => (
          <div key={`${r.label}-${i}`} className="flex gap-2 text-sm">
            <dt className="sr-only">{r.label}</dt>
            {STATE_ICON[r.state]}
            <dd className="min-w-0"><span className="text-white/60">{r.label}: </span><span className="break-words text-white">{r.value}</span>{r.detail && <span className="block text-xs text-white/50">{r.detail}</span>}</dd>
          </div>
        ))}
      </dl>
      {block.note && <p className="pt-2 text-xs text-white/60">{block.note}</p>}
    </section>
  );
}
