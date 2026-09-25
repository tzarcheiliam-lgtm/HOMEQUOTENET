// The contractor's services overview. Data-free so it can be previewed.
import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import type { GrowthContext } from '@/lib/data/service-requests';
import { GROWTH_SERVICES, getService, type RequestStatus, type ServiceSlug } from '@/lib/growth/catalog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceCard } from '@/components/growth/service-card';
import { ServiceIcon } from '@/components/growth/service-icon';
import { RequestStatusBadge } from '@/components/growth/request-status-badge';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function GrowthServicesView({ company, requests, recommendation }: GrowthContext) {
  const header = (
    <PageHeader
      title="Grow Your Business"
      description="Optional marketing and business services from the HomeQuote team. Ask a question or request a consultation. Nothing is purchased from this page."
    />
  );

  if (!company) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        {header}
        <EmptyState
          icon={Building2}
          title="Your login isn’t linked to a company yet"
          description="Once HomeQuote links your account to your business, you can request services here."
        />
      </div>
    );
  }

  // Latest request per service (requests arrive newest first).
  const latest = new Map<ServiceSlug, RequestStatus>();
  for (const r of requests) if (!latest.has(r.service)) latest.set(r.service, r.status);
  const recommended = recommendation ? getService(recommendation.service) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {header}

      {recommended && recommendation && (
        <Card className="gap-0 py-0">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <ServiceIcon service={recommended.slug} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested for {company.name}</p>
              <p className="mt-1 font-medium">{recommended.name}</p>
              <p className="text-sm text-muted-foreground">{recommendation.reason} {recommended.summary}</p>
            </div>
            <Link
              href={`/app/growth/${recommended.slug}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Learn more<span className="sr-only"> about {recommended.name}</span>
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </Card>
      )}

      <section aria-labelledby="services-heading" className="space-y-4">
        <h2 id="services-heading" className="text-base font-semibold tracking-tight">
          Services
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {GROWTH_SERVICES.map((s) => (
            <li key={s.slug} className="grid">
              <ServiceCard service={s} requestStatus={latest.get(s.slug)} />
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven’t requested anything yet. Open a service above to ask about it.
            </p>
          ) : (
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{getService(r.service)?.name ?? r.service}</span>
                    <span className="text-xs text-muted-foreground">Requested {fmtDate(r.created_at)}</span>
                  </span>
                  <RequestStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
