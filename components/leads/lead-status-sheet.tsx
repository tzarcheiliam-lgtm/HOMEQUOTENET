'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LEAD_STATUSES } from '@/lib/leads/constants';
import { changeLeadStatus } from '@/lib/actions/leads';
import type { LeadStatus } from '@/lib/types';

/**
 * Phone status picker: tap Status, tap the new status, done. Posts to the same
 * changeLeadStatus action as the desktop <StatusSelect>; the server still
 * enforces admin/setter, this only presents it better on a phone.
 */
export function LeadStatusSheet({
  leadId,
  status,
  children,
  triggerClassName,
}: {
  leadId: string;
  status: LeadStatus;
  /** Trigger contents (icon + label). */
  children: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="Change status"
      trigger={
        <button type="button" className={triggerClassName}>
          {children}
        </button>
      }
    >
      <form action={changeLeadStatus} onSubmit={() => setOpen(false)} className="space-y-1.5">
        <input type="hidden" name="lead_id" value={leadId} />
        {LEAD_STATUSES.map((s) => {
          const current = s.value === status;
          return (
            <button
              key={s.value}
              type="submit"
              name="status"
              value={s.value}
              aria-current={current ? 'true' : undefined}
              className={cn(
                'flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-medium active:bg-accent',
                current ? 'border-primary bg-primary/5' : 'bg-background'
              )}
            >
              {s.label}
              {current ? <Check className="size-4" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </form>
    </BottomSheet>
  );
}
