// The contractor's Growth Tools page. Data-free so it can be previewed.
import { Building2, CircleCheck, CreditCard } from 'lucide-react';
import type { GrowthContext } from '@/lib/data/service-requests';
import { getService, servicesByTier, type RequestStatus, type ServiceSlug } from '@/lib/growth/catalog';
import { EmptyState } from '@/components/ui/empty-state';
import { FeaturedServiceCard } from '@/components/growth/featured-service-card';
import { GrowthToolCard, MarketingServiceCard } from '@/components/growth/service-card';
import { RequestStatusBadge } from '@/components/growth/request-status-badge';
import { ServiceIcon } from '@/components/growth/service-icon';
import { UpsellViewTracker } from '@/components/growth/upsell-view-tracker';
import type { Requester } from '@/components/growth/service-request-form';
import { ManageBillingButton, PayButton } from '@/components/billing/pay-buttons';
import { PaymentStatusBadge } from '@/components/billing/payment-status-badge';
import { PAYABLE_STATUSES, formatQuote } from '@/lib/billing/pricing';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function Hero() {
  return (
    <header className="max-w-3xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Growth Tools</p>
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Answer faster. Follow up every time. Close more jobs.</h1>
      <p className="text-base text-muted-foreground">
        Add-ons the HomeQuote team sets up for you, so more of the leads you already get turn into booked
        appointments and signed work.
      </p>
      <p className="text-sm text-muted-foreground">
        Requesting is free. Our team confirms scope and final price with you before anything is billed.
      </p>
    </header>
  );
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function GrowthServicesView({
  company,
  requests,
  recommendation,
  requester,
  checkout,
}: GrowthContext & {
  requester: { name: string; email: string | null };
  /** Set when returning from Stripe Checkout. */
  checkout?: 'success' | 'canceled';
}) {
  if (!company) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <Hero />
        <EmptyState
          icon={Building2}
          title="Your login isn’t linked to a company yet"
          description="Once HomeQuote links your account to your business, you can request Growth Tools here."
        />
      </div>
    );
  }

  const who: Requester = { ...requester, company: company.name, contractorId: company.id };
  // Latest request per service (requests arrive newest first).
  const latest = new Map<ServiceSlug, RequestStatus>();
  for (const r of requests) if (!latest.has(r.service)) latest.set(r.service, r.status);
  const state = (slug: ServiceSlug) => ({
    requestStatus: latest.get(slug),
    recommended: recommendation?.service === slug,
  });

  const payable = requests.filter((r) => PAYABLE_STATUSES.includes(r.payment_status) && r.price_cents !== null);
  const [featured] = servicesByTier('featured');
  const core = servicesByTier('core');
  const marketing = servicesByTier('marketing');

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-8">
      <UpsellViewTracker contractorId={company.id} />
      <Hero />

      {checkout === 'success' && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>Thanks! Your payment was received. It can take a minute to show below, and our team will be in touch to get started.</p>
        </div>
      )}
      {payable.length > 0 && (
        <a
          href="#your-requests"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 transition-colors hover:bg-amber-100"
        >
          <CreditCard aria-hidden className="size-4 shrink-0" />
          <span>
            <strong>{payable.length === 1 ? 'Your price is ready.' : `${payable.length} prices are ready.`}</strong> Review and pay below to get
            started.
          </span>
        </a>
      )}

      {featured && <FeaturedServiceCard service={featured} requester={who} requestStatus={latest.get(featured.slug)} />}

      <section aria-labelledby="growth-tools-heading" className="space-y-5">
        <SectionHeading
          id="growth-tools-heading"
          title="Growth tools"
          description="Respond faster, follow up consistently and know exactly what’s working."
        />
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {core.map((s) => (
            <li key={s.slug}>
              <GrowthToolCard service={s} requester={who} {...state(s.slug)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="marketing-heading" className="space-y-5">
        <SectionHeading
          id="marketing-heading"
          title="Marketing services"
          description="Brand, content and reputation work that supports every lead you get."
        />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketing.map((s) => (
            <li key={s.slug}>
              <MarketingServiceCard service={s} requester={who} {...state(s.slug)} />
            </li>
          ))}
        </ul>
      </section>

      <section id="your-requests" aria-labelledby="requests-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            id="requests-heading"
            title="Your requests"
            description="Everything you’ve asked about, and where it stands with our team."
          />
          {company.stripe_customer_id && <ManageBillingButton />}
        </div>
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            You haven’t requested anything yet. Pick a tool above and we’ll take it from there.
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {requests.map((r) => {
              const svc = getService(r.service);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <ServiceIcon service={r.service} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{svc?.name ?? r.service}</span>
                    <span className="text-xs text-muted-foreground">Requested {fmtDate(r.created_at)}</span>
                  </span>
                  {r.price_cents !== null && r.price_interval !== null ? (
                    <span className="flex basis-full flex-wrap items-center gap-2 pl-12 sm:basis-auto sm:justify-end sm:pl-0">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatQuote({ price_cents: r.price_cents, price_interval: r.price_interval, setup_fee_cents: r.setup_fee_cents })}
                      </span>
                      {PAYABLE_STATUSES.includes(r.payment_status) ? (
                        <PayButton requestId={r.id} label={r.payment_status === 'failed' ? 'Try payment again' : 'Review & pay'} />
                      ) : (
                        <PaymentStatusBadge status={r.payment_status} />
                      )}
                    </span>
                  ) : (
                    <RequestStatusBadge status={r.status} />
                  )}
                  {r.price_description && PAYABLE_STATUSES.includes(r.payment_status) && (
                    <p className="basis-full pl-12 text-xs text-muted-foreground">{r.price_description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
