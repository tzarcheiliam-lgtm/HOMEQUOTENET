import { ArrowRight, Check, CircleCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RequestDialog } from '@/components/growth/request-dialog';
import { PriceTag } from '@/components/growth/price-tag';
import { ServiceIcon } from '@/components/growth/service-icon';
import type { Requester } from '@/components/growth/service-request-form';
import { OPEN_REQUEST_STATUSES, requestStatusLabel, type GrowthService, type RequestStatus } from '@/lib/growth/catalog';

export interface CardState {
  /** Latest request status for this service, if any. */
  requestStatus?: RequestStatus;
  /** Contextual suggestion for this company (see lib/growth/recommend.ts). */
  recommended?: boolean;
}

const isOpen = (s?: RequestStatus) => Boolean(s && OPEN_REQUEST_STATUSES.includes(s));

/** The CTA, or a quiet "Requested" state while a request is open. */
function Cta({
  service,
  requester,
  requestStatus,
  variant,
}: {
  service: GrowthService;
  requester: Requester;
  requestStatus?: RequestStatus;
  variant: 'solid' | 'outline' | 'link';
}) {
  const open = isOpen(requestStatus);
  // The dialog stays mounted in both states so a just-submitted request can
  // finish showing its confirmation after the page data refreshes.
  const trigger = open ? (
    <Button variant="secondary" disabled className="w-full justify-center disabled:opacity-100">
      <CircleCheck aria-hidden /> Requested · {requestStatusLabel(requestStatus!)}
    </Button>
  ) : variant === 'link' ? (
    <Button variant="ghost" size="sm" className="-ml-2.5 w-fit text-slate-900">
      {service.cta} <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Button>
  ) : (
    <Button variant={variant === 'solid' ? 'default' : 'outline'} size="lg" className="w-full justify-center">
      {service.cta} <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Button>
  );
  return <RequestDialog service={service} requester={requester} trigger={trigger} />;
}

function Badges({ service, recommended }: { service: GrowthService; recommended?: boolean }) {
  if (!recommended && !service.badge) return null;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {service.badge === 'most_popular' && (
        <Badge className="border-transparent bg-amber-100 text-amber-900">Most Popular</Badge>
      )}
      {recommended && <Badge className="border-transparent bg-sky-100 text-sky-900">Recommended</Badge>}
    </div>
  );
}

/** A core growth tool: larger card with benefits and a clear CTA. */
export function GrowthToolCard({
  service,
  requester,
  requestStatus,
  recommended,
}: { service: GrowthService; requester: Requester } & CardState) {
  return (
    <article
      data-upsell-type={service.slug}
      aria-labelledby={`upsell-${service.slug}`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-[box-shadow,border-color,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md motion-reduce:transform-none',
        recommended && 'border-sky-300 ring-1 ring-sky-200'
      )}
    >
      {/* Soft top sheen */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-50 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <ServiceIcon service={service.slug} tone="strong" />
        <Badges service={service} recommended={recommended} />
      </div>
      <div className="relative mt-5 space-y-1.5">
        <h3 id={`upsell-${service.slug}`} className="text-lg font-semibold tracking-tight">
          {service.name}
        </h3>
        <p className="text-sm text-muted-foreground">{service.tagline}</p>
      </div>
      <ul className="relative mt-5 flex-1 space-y-2.5 text-sm">
        {service.benefits.map((b) => (
          <li key={b} className="flex gap-2.5">
            <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            {b}
          </li>
        ))}
      </ul>
      <div className="relative mt-6 space-y-4 border-t pt-5">
        <PriceTag price={service.price} />
        <Cta service={service} requester={requester} requestStatus={requestStatus} variant={recommended ? 'solid' : 'outline'} />
      </div>
    </article>
  );
}

/** A supporting marketing service: compact card. */
export function MarketingServiceCard({
  service,
  requester,
  requestStatus,
  recommended,
}: { service: GrowthService; requester: Requester } & CardState) {
  return (
    <article
      data-upsell-type={service.slug}
      aria-labelledby={`upsell-${service.slug}`}
      className="group flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ServiceIcon service={service.slug} />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id={`upsell-${service.slug}`} className="font-semibold leading-snug tracking-tight">
            {service.name}
          </h3>
          <p className="text-sm text-muted-foreground">{service.tagline}</p>
        </div>
      </div>
      <PriceTag price={service.price} className="mt-auto border-t pt-4" />
      <div className="-mt-1 flex items-center justify-between gap-3">
        <Cta service={service} requester={requester} requestStatus={requestStatus} variant="link" />
        <Badges service={service} recommended={recommended} />
      </div>
    </article>
  );
}
