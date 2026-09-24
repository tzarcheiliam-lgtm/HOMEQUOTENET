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

  const table = (
    <Card className="p-0">
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
            <TableHead>Name</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Contractors</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const name =
              [r.first_name, r.last_name].filter(Boolean).join(' ') ||
              r.phone ||
              'Unnamed lead';
            return (
              <TableRow key={r.id}>
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
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.vertical_name ?? '—'}
                  {r.sub_service_name ? ` · ${r.sub_service_name}` : ''}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.source ? LEAD_SOURCE_LABELS[r.source] ?? r.source : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={leadStatusVariant(r.status)}>
                    {LEAD_STATUSES.find((s) => s.value === r.status)?.label ??
                      r.status}
                  </Badge>
                  {!readOnly && r.qualification_status === 'needs_qualification' && (
                    <Badge variant="warning" className="ml-1.5">
                      Needs qualification
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.city ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.assignment_count === 0
                    ? '—'
                    : r.contractor_names.join(', ') || `${r.assignment_count}`}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  if (readOnly) return table;

  return (
    <form action={bulkLeadAction} className="space-y-3">
      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
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

      {table}
    </form>
  );
}
