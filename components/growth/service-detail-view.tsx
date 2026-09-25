// One service: what it includes and the request form. Data-free so it can be previewed.
import { Building2, Check } from 'lucide-react';
import type { GrowthContext } from '@/lib/data/service-requests';
import { OPEN_REQUEST_STATUSES, type GrowthService } from '@/lib/growth/catalog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriceTag } from '@/components/growth/price-tag';
import { ServiceIcon } from '@/components/growth/service-icon';
import { RequestStatusBadge } from '@/components/growth/request-status-badge';
import { ServiceRequestForm } from '@/components/growth/service-request-form';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function ServiceDetailView({
  service,
  company,
  requests,
  requester,
}: Pick<GrowthContext, 'company' | 'requests'> & {
  service: GrowthService;
  requester: { name: string; email: string | null };
}) {
  const open = requests.find((r) => r.service === service.slug && OPEN_REQUEST_STATUSES.includes(r.status));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={service.name} backHref="/app/growth" backLabel="Growth Tools" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5">
            <ServiceIcon service={service.slug} tone="strong" />
            <p className="font-medium">{service.tagline}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
            <PriceTag price={service.price} className="border-y py-4" />
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What you get</h2>
              <ul className="space-y-2">
                {service.benefits.map((d) => (
                  <li key={d} className="flex gap-2 text-sm">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {d}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Exact scope and price are agreed with you before any work starts.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{service.cta}</CardTitle>
            <p className="text-sm text-muted-foreground">
              We already have your account details. Add anything useful and our team will reach out to get it set up.
            </p>
          </CardHeader>
          <CardContent>
            {!company ? (
              <EmptyState
                icon={Building2}
                title="Your login isn’t linked to a company yet"
                description="Once HomeQuote links your account to your business, you can request services here."
              />
            ) : open ? (
              <div role="status" className="space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">You asked about this on {fmtDate(open.created_at)}</p>
                  <RequestStatusBadge status={open.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your request is with the HomeQuote team. We’ll be in touch, so there’s no need to send another.
                </p>
              </div>
            ) : (
              <ServiceRequestForm
                service={service}
                requester={{ ...requester, company: company.name, contractorId: company.id }}
                source="service_page"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
