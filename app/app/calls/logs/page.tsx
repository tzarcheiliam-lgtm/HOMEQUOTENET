import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { listCallLogs, listCallers, type LogFilters } from '@/lib/data/prospects';
import { DISPOSITIONS } from '@/lib/calls/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { DispositionBadge } from '@/components/calls/disposition-badge';
import { fmtDateTime } from '@/components/calls/format';
import type { ProspectDisposition } from '@/lib/types';

export const metadata = { title: 'Call logs · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

/**
 * Every logged call, newest first. RLS already limits a caller to attempts
 * on prospects they hold, so the same page serves both roles; admins get the
 * caller filter on top.
 */
export default async function CallLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const sp = await searchParams;

  const filters: LogFilters = {
    caller: isAdmin ? first(sp.caller) : me.id,
    date_from: first(sp.date_from),
    date_to: first(sp.date_to),
    prospect: first(sp.prospect),
    outcome: first(sp.outcome) as LogFilters['outcome'],
    page: Number(first(sp.page) ?? '1') || 1,
  };

  const [callers, result] = await Promise.all([listCallers(), listCallLogs(filters)]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const s = first(v);
      if (s && k !== 'page') q.set(k, s);
    }
    q.set('page', String(p));
    return `/app/calls/logs?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call logs"
        description="A permanent record of every call. Entries cannot be edited or deleted."
      />
      <CallsSubnav />

      <Card className="p-3">
        <form method="get" className="grid gap-2 md:grid-cols-12">
          {isAdmin ? (
            <Select name="caller" defaultValue={filters.caller ?? ''} aria-label="Caller" className="md:col-span-2">
              <option value="">All callers</option>
              {callers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            name="date_from"
            type="date"
            defaultValue={filters.date_from ?? ''}
            aria-label="From date"
            className="md:col-span-2"
          />
          <Input
            name="date_to"
            type="date"
            defaultValue={filters.date_to ?? ''}
            aria-label="To date"
            className="md:col-span-2"
          />
          <Input
            name="prospect"
            defaultValue={filters.prospect ?? ''}
            placeholder="Company name"
            aria-label="Prospect"
            className={isAdmin ? 'md:col-span-2' : 'md:col-span-3'}
          />
          <Select name="outcome" defaultValue={filters.outcome ?? ''} aria-label="Outcome" className={isAdmin ? 'md:col-span-2' : 'md:col-span-3'}>
            <option value="">All outcomes</option>
            <option value="interested_any">Interested or follow-up</option>
            <option value="booked">Appointment booked</option>
            <option value="callback">Callback requested</option>
            <option value="dnc">Do not call</option>
            <option disabled>──────────</option>
            {DISPOSITIONS.filter((d) => d.value !== 'new').map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 md:col-span-2 md:justify-end">
            <Button type="submit" size="sm" className="flex-1 md:flex-none">
              Apply
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/app/calls/logs">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No calls logged"
          description="Outcomes saved from a prospect record appear here, newest first."
        />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Callback</TableHead>
                  <TableHead>Appointment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtDateTime(r.created_at)}
                      <span className="ml-1 text-xs text-muted-foreground">#{r.attempt_number}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.caller_name ?? '—'}</TableCell>
                    <TableCell>
                      <Link href={`/app/calls/${r.prospect_id}`} className="font-medium hover:underline">
                        {r.company_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DispositionBadge value={r.outcome as ProspectDisposition} />
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {r.notes ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.callback_at ? fmtDateTime(r.callback_at) : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.appointment_at ? fmtDateTime(r.appointment_at) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">{result.total} entries</span>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link href={pageHref(result.page - 1)} className="hover:underline">
                Previous
              </Link>
            ) : null}
            <span className="tabular-nums">
              Page {result.page} of {pages}
            </span>
            {result.page < pages ? (
              <Link href={pageHref(result.page + 1)} className="hover:underline">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
