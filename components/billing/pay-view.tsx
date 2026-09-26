// The page a price email links to (/app/pay/[id]). Data-free so it can be previewed.
import Link from 'next/link';
import { CircleCheck, Clock, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { PayPageRequest } from '@/lib/data/service-requests';
import { getService } from '@/lib/growth/catalog';
import { PAYABLE_STATUSES, PAYMENT_STATUS_LABELS, formatCents, formatQuote } from '@/lib/billing/pricing';
import { Button } from '@/components/ui/button';
import { ServiceIcon } from '@/components/growth/service-icon';
import { PayButton } from '@/components/billing/pay-buttons';
import { CopyPayLink } from '@/components/billing/copy-pay-link';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function Notice({ tone, icon: Icon, title, children }: { tone: 'good' | 'wait' | 'warn'; icon: typeof CircleCheck; title: string; children?: React.ReactNode }) {
  const tones = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    wait: 'border-sky-200 bg-sky-50 text-sky-950',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
  };
  return (
    <div role="status" className={`flex gap-3 rounded-xl border p-4 text-sm ${tones[tone]}`}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function PayView({
  request: r,
  viewer,
  payUrl,
  checkout,
}: {
  request: PayPageRequest | null;
  /** Admins see the contractor's page read-only, with the link to share. */
  viewer: 'contractor' | 'admin';
  payUrl: string;
  checkout?: 'success' | 'canceled';
}) {
  if (!r) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <Notice tone="warn" icon={TriangleAlert} title="This payment link isn’t available">
          <p>It may belong to a different company’s login. Sign in with the account that requested the service, or contact HomeQuote.</p>
        </Notice>
      </div>
    );
  }

  const service = getService(r.service);
  const serviceName = service?.name ?? 'HomeQuote service';
  const priced = r.price_cents !== null && r.price_interval !== null;
  const quote = priced ? { price_cents: r.price_cents!, price_interval: r.price_interval!, setup_fee_cents: r.setup_fee_cents } : null;
  const payable = priced && PAYABLE_STATUSES.includes(r.payment_status);
  const dueToday = quote ? quote.price_cents + (quote.setup_fee_cents ?? 0) : 0;

  return (
    <div className="mx-auto max-w-lg space-y-5 py-4 sm:py-8">
      {viewer === 'admin' && (
        <Notice tone="wait" icon={ShieldCheck} title="You’re viewing the contractor’s payment page">
          <p>
            Only a {r.contractor?.name ?? 'contractor'} login can pay here. Send them this link, or they’ll find it under Growth Tools →
            Your requests.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {payable && <CopyPayLink url={payUrl} />}
            <Button asChild variant="outline" size="sm">
              <Link href="/app/service-requests">Back to Service Requests</Link>
            </Button>
          </div>
        </Notice>
      )}

      <article aria-labelledby="pay-title" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="space-y-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <ServiceIcon service={r.service} tone="strong" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{r.contractor?.name ?? 'Your company'}</p>
              <h1 id="pay-title" className="text-xl font-semibold tracking-tight">
                {serviceName}
              </h1>
            </div>
          </div>

          {quote ? (
            <div className="space-y-1 border-y py-5">
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatQuote(quote)}</p>
              {quote.price_interval === 'month' && (
                <p className="text-sm text-muted-foreground">
                  Due today: <span className="font-medium text-foreground tabular-nums">{formatCents(dueToday)}</span>. Then{' '}
                  {formatCents(quote.price_cents)} each month until you cancel.
                </p>
              )}
              {r.price_description && <p className="pt-2 text-sm text-muted-foreground">{r.price_description}</p>}
            </div>
          ) : (
            <p className="border-y py-5 text-sm text-muted-foreground">There’s no price on this request yet. Our team will send one soon.</p>
          )}

          {checkout === 'success' && r.payment_status !== 'paid' && r.payment_status !== 'active' ? (
            <Notice tone="good" icon={CircleCheck} title="Payment received. Thank you!">
              <p>It can take a minute to confirm. You can close this page; our team will be in touch to get started.</p>
            </Notice>
          ) : r.payment_status === 'paid' || r.payment_status === 'active' ? (
            <Notice tone="good" icon={CircleCheck} title={r.payment_status === 'active' ? 'Your subscription is active' : 'Paid. Thank you!'}>
              {r.paid_at && <p>Paid on {fmtDate(r.paid_at)}. Our team will be in touch to get started.</p>}
            </Notice>
          ) : r.payment_status === 'processing' ? (
            <Notice tone="wait" icon={Clock} title="Your bank payment is processing">
              <p>Bank payments take a few business days to clear. There’s nothing else you need to do.</p>
            </Notice>
          ) : r.payment_status === 'past_due' ? (
            <Notice tone="warn" icon={TriangleAlert} title="Your last payment didn’t go through">
              <p>Update your payment method under Growth Tools → Manage billing.</p>
            </Notice>
          ) : r.payment_status === 'failed' ? (
            <Notice tone="warn" icon={TriangleAlert} title="That payment didn’t go through">
              <p>Please try again, or use a different payment method.</p>
            </Notice>
          ) : checkout === 'canceled' && payable ? (
            <p className="text-sm text-muted-foreground">No payment was made. You can pay whenever you’re ready.</p>
          ) : !payable && priced ? (
            <p className="text-sm text-muted-foreground">{PAYMENT_STATUS_LABELS[r.payment_status]}.</p>
          ) : null}

          {payable && viewer === 'contractor' && checkout !== 'success' && (
            <div className="space-y-3 pt-1">
              <PayButton requestId={r.id} label={`Pay ${formatCents(dueToday)} securely`} size="lg" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck aria-hidden className="size-3.5" /> Secure checkout by Stripe. Card, Apple Pay or bank account.
              </p>
            </div>
          )}
        </div>
      </article>

      {viewer === 'contractor' && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/app/growth#your-requests" className="underline-offset-4 hover:underline">
            View all your requests
          </Link>
        </p>
      )}
    </div>
  );
}
