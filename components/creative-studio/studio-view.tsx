'use client';

import { useState } from 'react';
import { Clapperboard, Film, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { removeCreativeEmbed } from '@/lib/actions/creative-studio';

/** What the page renders: built-in entries (content/creative-studio.ts) and ones added on the page look the same. */
export interface StudioItem {
  key: string;
  title: string;
  kind: string;
  description: string;
  src: string;
  /** Set only for embeds added on the page, which can be removed there. */
  removableId?: string;
}

const KIND_ICON: Record<string, typeof Film> = { 'Image to Video': ImageIcon, 'Video to Video': Clapperboard };

function RemoveButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      action={removeCreativeEmbed}
      fields={{ id }}
      triggerLabel={<><Trash2 aria-hidden className="size-3.5" /> Remove</>}
      triggerClassName="text-muted-foreground"
      title={`Remove “${title}”?`}
      description="It disappears from this page. You can add it again any time with its embed code."
      confirmLabel="Remove"
      destructive
    />
  );
}

/** Assistants on top, then the generators; one generator is embedded at a time so the page stays light. */
export function StudioView({ tools, agents }: { tools: StudioItem[]; agents: StudioItem[] }) {
  const kinds = Array.from(new Set(tools.map((t) => t.kind)));
  const [kind, setKind] = useState<string>('All');
  const visible = kind === 'All' ? tools : tools.filter((t) => t.kind === kind);
  const [key, setKey] = useState<string>(tools[0]?.key ?? '');
  const active = visible.find((t) => t.key === key) ?? visible[0];

  return (
    <div className="space-y-8">
      {agents.map((agent) => (
        <section key={agent.key} className="space-y-3" aria-labelledby={`agent-${agent.key}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id={`agent-${agent.key}`} className="flex items-center gap-2 text-lg font-semibold"><Sparkles aria-hidden className="size-4 text-primary" />{agent.title}</h2>
              {agent.description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{agent.description}</p>}
            </div>
            {agent.removableId && <RemoveButton id={agent.removableId} title={agent.title} />}
          </div>
          <div className="h-[70vh] min-h-[480px] w-full overflow-hidden rounded-xl border bg-muted">
            <iframe src={agent.src} title={agent.title} loading="lazy" allow="clipboard-write" allowFullScreen className="h-full w-full border-0" />
          </div>
        </section>
      ))}

      <section className="space-y-5" aria-label="Generators">
        {!tools.length && <p className="text-sm text-muted-foreground">No generators added yet. Use “Add embed” to paste one.</p>}
        {kinds.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
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

        {tools.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:content-start" aria-label="Generators">
              {visible.map((t) => {
                const Icon = KIND_ICON[t.kind] ?? Sparkles;
                const on = t.key === active?.key;
                return (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => setKey(t.key)}
                      aria-current={on ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/50',
                        on && 'border-primary ring-1 ring-primary'
                      )}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden className="size-4" /></span>
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
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{active.title}</h2>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{active.kind}</p>
                    {active.description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{active.description}</p>}
                  </div>
                  {active.removableId && <RemoveButton id={active.removableId} title={active.title} />}
                </div>
                <div className="relative h-0 w-full overflow-hidden rounded-xl border bg-muted pb-[56.25%]">
                  <iframe key={active.key} src={active.src} title={active.title} loading="lazy" allow="clipboard-write" allowFullScreen className="absolute left-0 top-0 h-full w-full border-0" />
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
