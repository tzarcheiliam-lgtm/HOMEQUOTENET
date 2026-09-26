// Admin review list for growth-service requests. Data-free so it can be previewed.
import Link from 'next/link';
import { Handshake, MailWarning, RotateCw } from 'lucide-react';
import type { AdminServiceRequest } from '@/lib/data/service-requests';
import { REQUEST_SOURCE_LABELS, REQUEST_STATUSES, formatPrice, getService, type RequestStatus } from '@/lib/growth/catalog';
import { retryServiceRequestEmail } from '@/lib/actions/service-requests';
import { clearServiceRequestPrice } from '@/lib/actions/billing';
import { PAYABLE_STATUSES, PRICE_LOCKED_STATUSES, formatQuote } from '@/lib/billing/pricing';
import { PaymentStatusBadge } from '@/components/billing/payment-status-badge';
import { SetPriceDialog } from '@/components/billing/set-price-dialog';
import { CopyPayLink } from '@/components/billing/copy-pay-link';
import { payPageUrl } from '@/lib/billing/stripe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        description="Growth Tools requests from contractors. Set a price and the contractor can pay for it on Stripe from their portal. Nothing is charged until they do."
      />

      {requests.some((r) => r.notification_status === 'failed') && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            Some team email alerts didn’t send. The requests are saved below; use <strong>Resend email</strong> to try again.
          </p>
        </div>
      )}

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
              : 'When a contractor requests a Growth Tool, it shows up here.'
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
                <TableHead>Team email</TableHead>
                <TableHead>Price &amp; payment</TableHead>
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
                      {r.source && <span className="block">{REQUEST_SOURCE_LABELS[r.source] ?? r.source}</span>}
                    </TableCell>
                    <TableCell>
                      <EmailStatus request={r} />
                    </TableCell>
                    <TableCell>
                      <PriceCell request={r} companyName={companyName} serviceName={serviceName} />
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

/** The price an admin set, the Stripe payment state, and the set / change / remove controls. */
function PriceCell({ request: r, companyName, serviceName }: { request: AdminServiceRequest; companyName: string; serviceName: string }) {
  const service = getService(r.service);
  const locked = PRICE_LOCKED_STATUSES.includes(r.payment_status);
  const priced = r.price_cents !== null && r.price_interval !== null;
  return (
    <div className="min-w-[11rem] space-y-1.5">
      {priced && (
        <p className="text-sm font-medium tabular-nums">
          {formatQuote({ price_cents: r.price_cents!, price_interval: r.price_interval!, setup_fee_cents: r.setup_fee_cents })}
        </p>
      )}
      {r.payment_status !== 'none' && <PaymentStatusBadge status={r.payment_status} />}
      {r.paid_at && <span className="block text-xs text-muted-foreground">Paid {fmtDateTime(r.paid_at)}</span>}
      {!locked && (
        <div className="flex flex-wrap items-center gap-1.5">
          <SetPriceDialog
            requestId={r.id}
            companyName={companyName}
            serviceName={serviceName}
            suggested={service ? formatPrice(service.price) : 'no listed price'}
            current={r}
          />
          {priced && PAYABLE_STATUSES.includes(r.payment_status) && <CopyPayLink url={payPageUrl(r.id)} />}
          {priced && (
            <form action={clearServiceRequestPrice}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit" variant="ghost" size="sm" className="h-7 text-muted-foreground">
                Remove
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/** Whether the HQN team email went out, with a resend for anything unconfirmed. */
function EmailStatus({ request: r }: { request: AdminServiceRequest }) {
  if (r.notification_status === 'sent') {
    return (
      <div className="space-y-1">
        <Badge variant="success">Sent</Badge>
        {r.notified_at && <span className="block text-xs text-muted-foreground">{fmtDateTime(r.notified_at)}</span>}
      </div>
    );
  }
  const failed = r.notification_status === 'failed';
  return (
    <div className="space-y-1.5">
      <Badge variant={failed ? 'warning' : 'muted'} title={r.notification_error ?? undefined}>
        {failed ? 'Failed' : r.notification_status === 'sending' ? 'Sending' : 'Not confirmed'}
      </Badge>
      {failed && r.notification_error && (
        <span className="block max-w-[14rem] truncate text-xs text-muted-foreground" title={r.notification_error}>
          {r.notification_error}
        </span>
      )}
      <form action={retryServiceRequestEmail}>
        <input type="hidden" name="id" value={r.id} />
        <Button type="submit" variant="outline" size="sm" className="h-7">
          <RotateCw aria-hidden className="size-3.5" /> Resend email
        </Button>
      </form>
    </div>
  );
}
