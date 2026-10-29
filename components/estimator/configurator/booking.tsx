'use client';

import { CalendarDays, Phone } from 'lucide-react';
import { telHref } from '@/components/estimator/shell/facts';
import type { ConfiguratorBookingProps } from './result-types';

/**
 * PLACEHOLDER booking step, to be replaced by the real one (contact form:
 * name, phone, email, ZIP, consent exactly as the old flow; lead POST with
 * props.answers; then the Calendly link prefilled with name/email via
 * bookingUrl in lib/estimator/lead.ts). Keeps the export name and props
 * (ConfiguratorBookingProps, result-types.ts) so result.tsx does not change.
 *
 * Until then it offers the two ways to book that need no form: the calendar
 * link and the phone number.
 */
export function ConfiguratorBooking({ contractor, embedded }: ConfiguratorBookingProps) {
  const tel = telHref(contractor.phone);
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {contractor.calendarUrl ? (
        <a
          href={contractor.calendarUrl}
          target={embedded ? '_blank' : undefined}
          rel={embedded ? 'noopener' : undefined}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--cfg-accent)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          Pick a time
        </a>
      ) : null}
      {tel ? (
        <a
          href={tel}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d9d4ca] bg-white px-6 text-[15px] font-semibold text-[#111] hover:bg-[#f5f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]"
        >
          <Phone aria-hidden="true" className="size-4" />
          <span className="tabular-nums">{contractor.phone}</span>
        </a>
      ) : null}
    </div>
  );
}
