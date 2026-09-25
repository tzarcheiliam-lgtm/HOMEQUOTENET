// Admin review list for growth-service requests. Data-free so it can be previewed.
import Link from 'next/link';
import { Handshake } from 'lucide-react';
import type { AdminServiceRequest } from '@/lib/data/service-requests';
import { REQUEST_STATUSES, getService, type RequestStatus } from '@/lib/growth/catalog';
import { cn } from '@/lib/utils';
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
import { RequestStatusSelect } from '@/components/growth/request-status-select';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function ServiceRequestsView({
  requests,
  counts,
  status,
}: {
  requests: AdminServiceRequest[];
  counts: Record<RequestStatus, number>;
  status?: RequestStatus;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tabs = [{ value: undefined, label: 'All', count: total }, ...REQUEST_STATUSES.map((s) => ({ ...s, count: counts[s.value] }))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Requests"
        description="Contractors asking about growth services. Requests are interest only: nothing is purchased or billed."
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.value === status;
          return (
            <Link
              key={t.label}
              href={t.value ? `/app/service-requests?status=${t.value}` : '/app/service-requests'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {t.label}
              <span className="tabular-nums opacity-70">{t.count}</span>
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={status ? 'No requests with this status' : 'No service requests yet'}
          description={
            status
              ? 'Try another status filter.'
              : 'When a contractor asks about a service from Grow Your Business, it shows up here.'
          }
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const serviceName = getService(r.service)?.name ?? r.service;
                const companyName = r.contractor?.name ?? 'Unknown company';
                return (
                  <TableRow key={r.id} className="align-top">
                    <TableCell>
                      {r.contractor ? (
                        <Link href={`/app/contractors/${r.contractor.id}`} className="font-medium hover:underline">
                          {companyName}
                        </Link>
                      ) : (
                        <span className="font-medium">{companyName}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {[r.requester?.full_name, r.requester?.email, r.requester?.phone].filter(Boolean).join(' · ') ||
                          'Requester removed'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{serviceName}</TableCell>
                    <TableCell>
                      {r.notes ? (
                        <p className="max-w-sm whitespace-pre-wrap break-words text-sm">{r.notes}</p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDateTime(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <RequestStatusSelect
                        requestId={r.id}
                        status={r.status}
                        label={`Status for ${companyName}, ${serviceName}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
