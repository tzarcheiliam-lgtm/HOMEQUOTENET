// The contractor's Growth Tools page. Data-free so it can be previewed.
import { Building2 } from 'lucide-react';
import type { GrowthContext } from '@/lib/data/service-requests';
import { getService, servicesByTier, type RequestStatus, type ServiceSlug } from '@/lib/growth/catalog';
import { EmptyState } from '@/components/ui/empty-state';
import { FeaturedServiceCard } from '@/components/growth/featured-service-card';
import { GrowthToolCard, MarketingServiceCard } from '@/components/growth/service-card';
import { RequestStatusBadge } from '@/components/growth/request-status-badge';
import { ServiceIcon } from '@/components/growth/service-icon';
import { UpsellViewTracker } from '@/components/growth/upsell-view-tracker';
import type { Requester } from '@/components/growth/service-request-form';

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
}: GrowthContext & { requester: { name: string; email: string | null } }) {
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

  const [featured] = servicesByTier('featured');
  const core = servicesByTier('core');
  const marketing = servicesByTier('marketing');

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-8">
      <UpsellViewTracker contractorId={company.id} />
      <Hero />

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
        <SectionHeading
          id="requests-heading"
          title="Your requests"
          description="Everything you’ve asked about, and where it stands with our team."
        />
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
                  <RequestStatusBadge status={r.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
