'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { APPOINTMENT_STATUSES } from '@/lib/leads/constants';
import { updateAppointmentStatus } from '@/lib/actions/leads';

/**
 * Phone appointment status picker. Same updateAppointmentStatus action (and
 * the same access checks) as the inline <select> on the lead page; this only
 * gives it a thumb-sized surface. "Reschedule" hands off to the lead, where a
 * new time is booked — there is no separate reschedule action to bypass.
 */
export function AppointmentStatusSheet({
  appointmentId,
  leadId,
  status,
  triggerClassName,
  children,
}: {
  appointmentId: string;
  leadId: string;
  status: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="Update appointment"
      trigger={
        <button type="button" className={triggerClassName}>
          {children}
        </button>
      }
    >
      <form action={updateAppointmentStatus} onSubmit={() => setOpen(false)} className="space-y-1.5">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        {APPOINTMENT_STATUSES.map((s) => {
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
      <Link
        href={`/app/leads/${leadId}#assignments`}
        onClick={() => setOpen(false)}
        className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed px-4 text-sm font-medium active:bg-accent"
      >
        <CalendarClock className="size-4" aria-hidden="true" />
        Book a new time on the lead
      </Link>
    </BottomSheet>
  );
}
