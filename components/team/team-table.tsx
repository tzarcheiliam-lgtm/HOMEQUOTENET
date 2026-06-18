'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROLE_LABELS } from '@/lib/nav';
import { bulkUserAction } from '@/lib/actions/team';
import type { UserRow } from '@/lib/data/team';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : '—';

export function TeamTable({ rows }: { rows: UserRow[] }) {
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
      <Card className="border-dashed p-12 text-center">
        <p className="font-medium">No users found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust your filters, or add your first teammate or contractor with
          “Create user”.
        </p>
      </Card>
    );
  }

  return (
    <form action={bulkUserAction} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {selected.size} selected
        </span>
        <Select name="bulk_action" className="h-8 w-auto" defaultValue="">
          <option value="" disabled>
            Bulk action…
          </option>
          <option value="activate">Activate</option>
          <option value="suspend">Suspend</option>
          <option value="disable">Disable</option>
          <option value="delete">Delete</option>
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={selected.size === 0}>
          Apply
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 accent-primary"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    name="ids"
                    value={u.id}
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="size-4 accent-primary"
                    aria-label={`Select ${u.full_name ?? u.email}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/app/team/${u.id}`}
                    className="font-medium hover:underline"
                  >
                    {u.full_name || '—'}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {u.email}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.account_status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.contractor_name ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmtDate(u.last_login_at)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmtDate(u.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </form>
  );
}
