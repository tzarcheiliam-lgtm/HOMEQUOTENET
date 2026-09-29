import Link from 'next/link';
import { ChevronRight, MapPin, Phone, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/mobile-card';
import {
  LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  leadStatusVariant,
} from '@/lib/leads/constants';
import { LeadStatusSheet } from '@/components/leads/lead-status-sheet';
import { formatLeadAge } from '@/lib/leads/display';
import { telHref } from '@/lib/leads/lead-emails';
import { cn } from '@/lib/utils';
import type { LeadListRow } from '@/lib/data/leads';

/** (818) 555-0123 for US numbers, anything else as entered. */
function fmtPhone(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : phone;
}

/**
 * Phone lead list (below lg; the table takes over above). One lead per card:
 * name, number, project and place, status, who holds it and how fresh it is,
 * then Call / Open / Status. Anything else (text, archive, assign) lives on
 * the lead itself, so the list never becomes a row of tiny buttons.
 */
export function LeadCards({
  rows,
  readOnly = false,
}: {
  rows: LeadListRow[];
  readOnly?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No leads match your filters.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const name =
          [r.first_name, r.last_name].filter(Boolean).join(' ') ||
          r.phone ||
          'Unnamed lead';
        const service = [r.vertical_name, r.sub_service_name].filter(Boolean).join(' · ');
        const place = [r.city, r.zip].filter(Boolean).join(' ');
        const age = formatLeadAge(r.created_at);
        const needsQualification = !readOnly && r.qualification_status === 'needs_qualification';
        const tel = r.phone ? telHref(r.phone) : null;
        const phone = fmtPhone(r.phone);
        const holder =
          r.assignment_count === 0
            ? 'Unassigned'
            : r.contractor_names.join(', ') || `${r.assignment_count} assigned`;

        return (
          <li key={r.id}>
            <MobileCard className="p-0">
              <Link
                href={`/app/leads/${r.id}`}
                className="block rounded-t-xl p-4 pb-3 active:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-snug">{name}</p>
                    {phone && r.first_name ? (
                      <p className="text-sm font-medium tabular-nums">{phone}</p>
                    ) : null}
                  </div>
                  <ChevronRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                {service ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{service}</p>
                ) : null}
                {place ? (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{place}</span>
                  </p>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={leadStatusVariant(r.status)}>
                    {LEAD_STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                  </Badge>
                  {needsQualification ? <Badge variant="warning">Needs qualification</Badge> : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {readOnly ? null : (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      {holder}
                    </span>
                  )}
                  {age ? <span>Received {age} ago</span> : null}
                  {r.source ? <span>{LEAD_SOURCE_LABELS[r.source] ?? r.source}</span> : null}
                </div>
              </Link>

              <div className="flex gap-2 border-t p-3">
                {tel ? (
                  <a
                    href={tel}
                    aria-label={`Call ${name}`}
                    className={cn(buttonVariants(), 'flex-[2] gap-2')}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    Call
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'pointer-events-none flex-[2] gap-2 opacity-60'
                    )}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    No number
                  </span>
                )}
                <Link
                  href={`/app/leads/${r.id}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
                >
                  Open
                </Link>
                {readOnly ? null : (
                  <LeadStatusSheet
                    leadId={r.id}
                    status={r.status}
                    triggerClassName={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
                  >
                    Status
                  </LeadStatusSheet>
                )}
              </div>
            </MobileCard>
          </li>
        );
      })}
    </ul>
  );
}
