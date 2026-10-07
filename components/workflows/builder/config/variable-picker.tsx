'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Braces, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GRAPH_VARIABLES, type GraphVariable } from '@/lib/workflows/graph';

const GROUP_ORDER: GraphVariable['group'][] = ['Homeowner', 'Project', 'Appointment', 'Estimate', 'Contractor', 'HomeQuote'];

/**
 * "Insert variable" dropdown. Variables are the verified merge fields only
 * (GRAPH_VARIABLES). Picking one calls `onPick(field)` (the bare field name,
 * e.g. `lead.first_name`); the caller decides where to put `{{field}}`.
 * Rendered inline (no portal) so it works inside side panels and mobile sheets.
 */
export function VariablePicker({
  onPick,
  disabled,
  className,
  label = 'Insert variable',
}: {
  onPick(field: string): void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('space-y-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <Braces aria-hidden />
        {label}
        <ChevronDown aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
      </Button>
      {open ? (
        <div id={listId} role="group" aria-label="Variables" className="max-h-64 overflow-y-auto rounded-md border bg-background shadow-sm">
          {GROUP_ORDER.map((group) => {
            const items = GRAPH_VARIABLES.filter((v) => v.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} role="group" aria-label={group}>
                <p className="sticky top-0 bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{group}</p>
                <ul>
                  {items.map((v) => (
                    <li key={v.field}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full flex-col items-start justify-center gap-0.5 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onClick={() => {
                          onPick(v.field);
                          setOpen(false);
                        }}
                      >
                        <span className="text-sm font-medium">{v.label}</span>
                        <span className="text-xs text-muted-foreground">
                          Example: <span className="text-foreground">{v.example}</span>
                          <span className="ml-2 font-mono">{`{{${v.field}}}`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
