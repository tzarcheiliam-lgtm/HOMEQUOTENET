'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, ExternalLink, PhoneOff, AlarmClock } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { assignProspects } from '@/lib/actions/prospects';
import { isDialable } from '@/lib/calls/rules';
import type { ProspectListRow, CallerOption } from '@/lib/data/prospects';
import { DispositionBadge } from './disposition-badge';
import { fmtDateTime, fmtPhone, fmtRelative, isDue, siteHref, siteLabel, telHref } from './format';

/**
 * The calling list. Dense on purpose — a caller works down it — but the
 * columns are the ones that matter mid-call: who, number, where, what they
 * do, where things stand, and when they are next due. Everything else is one
 * click away on the record.
 *
 * A do-not-call prospect renders with no call button and a struck number;
 * the list cannot dial it.
 */
export function ProspectsTable({
  rows,
  callers,
  isAdmin,
  emptyTitle = 'No prospects match this view.',
  emptyHint,
}: {
  rows: ProspectListRow[];
  callers: CallerOption[];
  isAdmin: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  if (rows.length === 0) {
    return (
      <Card className="border-dashed px-6 py-14 text-center">
        <p className="font-medium">{emptyTitle}</p>
        {emptyHint ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
        ) : null}
      </Card>
    );
  }

  const table = (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              {isAdmin ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-4 accent-primary"
                  />
                </TableHead>
              ) : null}
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Reviews</TableHead>
              {isAdmin ? <TableHead>Caller</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead>Last contact</TableHead>
              <TableHead>Next</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const dialable = isDialable(p);
              const tel = dialable ? telHref(p.phone) : null;
              const site = siteHref(p.website);
              const dnc = p.disposition === 'do_not_call';
              const due = isDue(p.next_callback_at);
              return (
                <TableRow key={p.id} className={cn(dnc && 'bg-muted/40 text-muted-foreground')}>
                  {isAdmin ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.company_name}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="size-4 accent-primary"
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Link
                      href={`/app/calls/${p.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {p.company_name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {site ? (
                        <a
                          href={site}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                        >
                          {siteLabel(p.website)}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span>No website</span>
                      )}
                      {p.niche || p.category ? <span>&middot; {p.niche ?? p.category}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {dnc ? (
                      <span className="inline-flex items-center gap-1 line-through">
                        <PhoneOff className="size-3.5" aria-hidden="true" />
                        {fmtPhone(p.phone)}
                      </span>
                    ) : (
                      fmtPhone(p.phone)
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{p.city ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.county, p.service_area].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="line-clamp-2 text-xs leading-5">
                      {p.primary_services.length > 0 ? p.primary_services.join(', ') : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {p.rating !== null ? (
                      <>
                        {p.rating.toFixed(1)}
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          ({p.review_count ?? 0})
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="whitespace-nowrap">
                      {p.assigned_name ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <DispositionBadge value={p.disposition} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.call_attempt_count}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtRelative(p.last_contacted_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {p.appointment_at && p.disposition === 'appointment_booked' ? (
                      <span className="text-emerald-700">Appt {fmtDateTime(p.appointment_at)}</span>
                    ) : p.next_callback_at ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
                          due ? 'font-medium text-amber-700' : 'text-muted-foreground'
                        )}
                      >
                        <AlarmClock className="size-3.5" aria-hidden="true" />
                        {fmtDateTime(p.next_callback_at)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{'—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {tel ? (
                        <a
                          href={tel}
                          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
                          aria-label={`Call ${p.company_name}`}
                        >
                          <Phone className="size-3.5" aria-hidden="true" />
                          Call
                        </a>
                      ) : (
                        <Button size="sm" disabled title={dnc ? 'Do not call' : 'No phone number'}>
                          <Phone className="size-3.5" aria-hidden="true" />
                          Call
                        </Button>
                      )}
                      <Link
                        href={`/app/calls/${p.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Open
                      </Link>
                      <Link
                        href={`/app/calls/${p.id}#log`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        Log call
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  if (!isAdmin) return table;

  return (
    <form action={assignProspects} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {selected.size} selected
        </span>
        {Array.from(selected).map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <Select name="assignee" className="h-8 w-auto" defaultValue="" required>
          <option value="" disabled>
            {'Assign to…'}
          </option>
          {callers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="unassigned">Unassign</option>
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={selected.size === 0}>
          Apply
        </Button>
      </div>
      {table}
    </form>
  );
}
