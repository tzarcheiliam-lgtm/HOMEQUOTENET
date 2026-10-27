'use client';

import { useId, useMemo, useState } from 'react';
import {
  Bell, CalendarClock, FileText, Hourglass, Mail, MessageSquare, PhoneCall, Plus, Sparkles, Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEAD_SOURCE_LABELS } from '@/lib/leads/constants';
import { WORKFLOW_TRIGGERS } from '@/lib/workflows/events';
import { GRAPH_TEMPLATES, templateScope, templateSteps, type TemplateScope } from '@/lib/workflows/graph/templates';
import { triggerOf, type GraphNodeType } from '@/lib/workflows/graph/model';
import { NodeIcon } from '@/components/workflows/builder/node-icons';

/** One card in the gallery. Built from the template catalogue by `galleryCards` (pure). */
export interface GalleryCard {
  key: string;
  name: string;
  summary: string;
  icon: string;
  scope: TemplateScope;
  /** "New lead from Website Form", "Appointment booked"... */
  starts: string;
  steps: { id: string; type: GraphNodeType; label: string }[];
  topic: GalleryTopic;
}

export type GalleryTopic = 'texting' | 'calls' | 'email' | 'alerts';
const TOPICS: { id: GalleryTopic | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'texting', label: 'Texting' },
  { id: 'calls', label: 'AI calls' },
  { id: 'email', label: 'Email' },
  { id: 'alerts', label: 'Alerts' },
];

const ICONS: Record<string, LucideIcon> = { Bell, CalendarClock, FileText, Hourglass, Mail, MessageSquare, PhoneCall, Sparkles, Zap };

export const SCOPE_LABEL: Record<TemplateScope, string> = {
  any: 'HomeQuote leads or one contractor',
  network: 'HomeQuote leads',
  contractor: 'One contractor',
};

/** Cards for the given template keys, in catalogue order (unknown keys are dropped). */
export function galleryCards(keys?: readonly string[]): GalleryCard[] {
  const wanted = keys ? new Set(keys) : null;
  return GRAPH_TEMPLATES.filter((t) => !wanted || wanted.has(t.key)).map((t) => {
    const steps = templateSteps(t.graph);
    const types = new Set(steps.map((s) => s.type));
    const trig = triggerOf(t.graph);
    const label = trig ? WORKFLOW_TRIGGERS[trig.config.event].label : 'Trigger';
    const source = trig?.config.entry?.conditions.find((c) => 'field' in c && c.field === 'lead.source' && c.operator === 'equals');
    const sourceValue = source && 'value' in source && typeof source.value === 'string' ? source.value : null;
    return {
      key: t.key, name: t.name, summary: t.summary, icon: t.icon ?? 'Zap', scope: templateScope(t),
      starts: sourceValue ? `${label} from ${LEAD_SOURCE_LABELS[sourceValue] ?? sourceValue}` : label,
      steps,
      topic: types.has('send_sms') ? 'texting' : types.has('ai_call') ? 'calls' : types.has('send_email') ? 'email' : 'alerts',
    };
  });
}

const MAX_CHIPS = 5;

/**
 * Starter-template gallery: a radio group of cards (arrow keys move between them, Space/Enter or a click picks one).
 * Each card shows its icon, a one-line description, who it is for, how it starts and its steps as chips.
 * Choosing a card only picks it; the surrounding form creates the draft.
 */
export function TemplateGallery({
  cards, value, onChange, name = 'template', showBlank = true,
}: {
  cards: GalleryCard[];
  value: string;
  onChange: (key: string) => void;
  name?: string;
  /** Offer "Start from scratch" as the first card. */
  showBlank?: boolean;
}) {
  const [topic, setTopic] = useState<GalleryTopic | 'all'>('all');
  const id = useId();
  const present = useMemo(() => new Set(cards.map((c) => c.topic)), [cards]);
  const shown = cards.filter((c) => topic === 'all' || c.topic === topic || c.key === value);
  const topics = TOPICS.filter((t) => t.id === 'all' || present.has(t.id));

  return (
    <div className="space-y-3">
      {topics.length > 2 && (
        <div role="group" aria-label="Show templates about" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none',
                topic === t.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label="Start from" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {showBlank && (topic === 'all' || value === 'blank') && (
          <Option id={`${id}-blank`} name={name} checked={value === 'blank'} onSelect={() => onChange('blank')}>
            <CardHead icon={Plus} title="Start from scratch" />
            <p className="text-sm text-muted-foreground">An empty canvas with just a trigger. Add steps yourself.</p>
          </Option>
        )}
        {shown.map((c) => (
          <Option key={c.key} id={`${id}-${c.key}`} name={name} checked={value === c.key} onSelect={() => onChange(c.key)} testId={`template-card-${c.key}`}>
            <CardHead icon={ICONS[c.icon] ?? Zap} title={c.name} />
            <p className="text-sm text-muted-foreground">{c.summary}</p>
            <dl className="space-y-1 text-xs">
              <div className="flex gap-1"><dt className="font-medium">For:</dt><dd className="text-muted-foreground">{SCOPE_LABEL[c.scope]}</dd></div>
              <div className="flex gap-1"><dt className="font-medium">Starts:</dt><dd className="text-muted-foreground">{c.starts}</dd></div>
            </dl>
            <ul className="flex flex-wrap gap-1.5" aria-label="Steps">
              {c.steps.slice(0, MAX_CHIPS).map((s) => (
                <li key={s.id} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                  <NodeIcon type={s.type} className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.label}</span>
                </li>
              ))}
              {c.steps.length > MAX_CHIPS && <li className="rounded-full px-2 py-0.5 text-xs text-muted-foreground">+{c.steps.length - MAX_CHIPS} more</li>}
            </ul>
          </Option>
        ))}
      </div>
    </div>
  );
}

function CardHead({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" aria-hidden /></span>
      <span className="pt-1.5 text-base font-semibold leading-tight">{title}</span>
    </div>
  );
}

function Option({ id, name, checked, onSelect, testId, children }: { id: string; name: string; checked: boolean; onSelect: () => void; testId?: string; children: React.ReactNode }) {
  return (
    <div className="relative" data-testid={testId}>
      <input id={id} className="peer sr-only" type="radio" name={name} checked={checked} onChange={onSelect} />
      <label
        htmlFor={id}
        className={cn(
          'flex h-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:border-primary/40 hover:shadow-sm motion-reduce:transition-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary',
          checked && 'border-primary ring-2 ring-primary/20'
        )}
      >
        {children}
        <span
          aria-hidden
          className={cn(
            'mt-auto inline-flex h-9 w-fit items-center rounded-md px-3 text-sm font-medium',
            checked ? 'bg-primary text-primary-foreground' : 'border bg-background'
          )}
        >
          {checked ? 'Selected' : 'Use this'}
        </span>
      </label>
    </div>
  );
}
