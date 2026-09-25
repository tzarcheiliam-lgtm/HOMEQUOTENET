'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import {
  LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  leadStatusVariant,
} from '@/lib/leads/constants';
import { bulkLeadAction } from '@/lib/actions/leads';
import { CallTextActions } from '@/components/leads/lead-quick-actions';
import { LeadCards } from '@/components/leads/lead-cards';
import { formatLeadAge } from '@/lib/leads/display';
import type { LeadListRow } from '@/lib/data/leads';
import type { ContractorOption } from '@/lib/data/contractors';

export function LeadsTable({
  rows,
  contractors,
  canDelete,
  readOnly = false,
}: {
  rows: LeadListRow[];
  contractors: ContractorOption[];
  canDelete: boolean;
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  if (rows.length === 0) {
    return (
      <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
        No leads match your filters.
      </Card>
    );
  }

  const mobileCards = (
    <div className="md:hidden">
      <LeadCards rows={rows} readOnly={readOnly} />
    </div>
  );

  const table = (
    <Card className="hidden overflow-hidden p-0 md:block">
      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 accent-primary"
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Lead</TableHead>
            <TableHead>Service &amp; location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contractor</TableHead>
            <TableHead>Received</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const name =
              [r.first_name, r.last_name].filter(Boolean).join(' ') ||
              r.phone ||
              'Unnamed lead';
            const age = formatLeadAge(r.created_at);
            const isFresh =
              !readOnly &&
              r.status === 'new' &&
              age !== null &&
              !age.includes('day');
            return (
              <TableRow
                key={r.id}
                className={isFresh ? 'bg-primary/[0.03]' : undefined}
              >
                {!readOnly && (
                  <TableCell>
                    <input
                      type="checkbox"
                      name="ids"
                      value={r.id}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="size-4 accent-primary"
                      aria-label={`Select ${name}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    href={`/app/leads/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {name}
                  </Link>
                  {r.source && (
                    <p className="text-xs text-muted-foreground">
                      {LEAD_SOURCE_LABELS[r.source] ?? r.source}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <p className="text-foreground/90">
                    {r.vertical_name ?? '—'}
                    {r.sub_service_name ? ` · ${r.sub_service_name}` : ''}
                  </p>
                  <p className="text-xs">{r.city ?? r.zip ?? ''}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={leadStatusVariant(r.status)}>
                      {LEAD_STATUSES.find((s) => s.value === r.status)?.label ??
                        r.status}
                    </Badge>
                    {!readOnly && r.qualification_status === 'needs_qualification' && (
                      <Badge variant="warning">Needs Qualification</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.assignment_count === 0
                    ? 'Unassigned'
                    : r.contractor_names.join(', ') || `${r.assignment_count} assigned`}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span title={new Date(r.created_at).toLocaleString()}>
                    {age ? `${age} ago` : new Date(r.created_at).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <CallTextActions phone={r.phone} size="sm" />
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/app/leads/${r.id}`}>Open</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  if (readOnly) {
    return (
      <>
        {mobileCards}
        {table}
      </>
    );
  }

  return (
    <form action={bulkLeadAction} className="space-y-3">
      {/* Bulk action bar (desktop only — mobile uses per-card actions) */}
      <div className="hidden flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 md:flex">
        <span className="text-sm text-muted-foreground">
          {selected.size} selected
        </span>
        <Select name="bulk_action" className="h-8 w-auto" defaultValue="">
          <option value="" disabled>
            Bulk action…
          </option>
          <option value="archive">Archive</option>
          {canDelete && <option value="delete">Delete</option>}
          <optgroup label="Set status">
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={`status:${s.value}`}>
                {s.label}
              </option>
            ))}
          </optgroup>
          {contractors.length > 0 && (
            <optgroup label="Assign to contractor">
              {contractors.map((c) => (
                <option key={c.id} value={`assign:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={selected.size === 0}
        >
          Apply
        </Button>
      </div>

      {mobileCards}
      {table}
    </form>
  );
}
