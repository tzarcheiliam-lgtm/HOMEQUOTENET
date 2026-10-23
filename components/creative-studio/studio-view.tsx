'use client';

import { useState } from 'react';
import { Clapperboard, Film, Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { embedSrc, type CreativeTool } from '@/content/creative-studio';

const KIND_ICON: Record<string, typeof Film> = { 'Image to Video': ImageIcon, 'Video to Video': Clapperboard };

/** One generator is embedded at a time (the others load only when picked), so the page stays light. */
export function StudioView({ tools }: { tools: CreativeTool[] }) {
  const kinds = Array.from(new Set(tools.map((t) => t.kind)));
  const [kind, setKind] = useState<string>('All');
  const visible = kind === 'All' ? tools : tools.filter((t) => t.kind === kind);
  const [slug, setSlug] = useState<string>(tools[0]?.slug ?? '');
  const active = visible.find((t) => t.slug === slug) ?? visible[0];

  if (!tools.length) return <p className="text-sm text-muted-foreground">No generators added yet.</p>;

  return (
    <div className="space-y-5">
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
          {['All', ...kinds].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                kind === k ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:content-start" aria-label="Generators">
          {visible.map((t) => {
            const Icon = KIND_ICON[t.kind] ?? Sparkles;
            const on = t.slug === active?.slug;
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => setSlug(t.slug)}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/50',
                    on && 'border-primary ring-1 ring-primary'
                  )}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug">{t.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.kind}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {active && (
          <section className="min-w-0 space-y-3" aria-live="polite">
            <div>
              <h2 className="text-lg font-semibold">{active.title}</h2>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{active.kind}</p>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{active.description}</p>
            </div>
            <div className="relative h-0 w-full overflow-hidden rounded-xl border bg-muted pb-[56.25%]">
              <iframe
                key={active.slug}
                src={embedSrc(active.embedId)}
                title={active.title}
                loading="lazy"
                allowFullScreen
                className="absolute left-0 top-0 h-full w-full border-0"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
