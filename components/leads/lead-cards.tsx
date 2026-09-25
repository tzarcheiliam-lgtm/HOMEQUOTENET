import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  leadStatusVariant,
} from '@/lib/leads/constants';
import { CallTextActions } from '@/components/leads/lead-quick-actions';
import { formatLeadAge } from '@/lib/leads/display';
import type { LeadListRow } from '@/lib/data/leads';

/** Mobile-first stacked lead cards — replaces the table below md. */
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
        const service =
          [r.vertical_name, r.sub_service_name].filter(Boolean).join(' · ');
        const age = formatLeadAge(r.created_at);
        const needsQualification =
          !readOnly && r.qualification_status === 'needs_qualification';

        return (
          <li key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <Link href={`/app/leads/${r.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name}</p>
                  {service && (
                    <p className="truncate text-sm text-muted-foreground">{service}</p>
                  )}
                  {r.zip && <p className="text-sm text-muted-foreground">{r.zip}</p>}
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={leadStatusVariant(r.status)}>
                  {LEAD_STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                </Badge>
                {needsQualification && (
                  <Badge variant="warning">Needs Qualification</Badge>
                )}
                {r.assignment_count > 0 && (
                  <Badge variant="muted">
                    {r.contractor_names[0] ?? `${r.assignment_count} assigned`}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {age && <span>Received {age} ago</span>}
                {r.source && <span>{LEAD_SOURCE_LABELS[r.source] ?? r.source}</span>}
              </div>
            </Link>

            <div className="mt-3 flex gap-2">
              <CallTextActions phone={r.phone} size="sm" className="flex-1 [&>*]:flex-1" />
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/leads/${r.id}`}>Open</Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
