import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RequestStatusBadge } from '@/components/growth/request-status-badge';
import { ServiceIcon } from '@/components/growth/service-icon';
import type { GrowthService, RequestStatus } from '@/lib/growth/catalog';

export function ServiceCard({
  service,
  requestStatus,
}: {
  service: GrowthService;
  /** Status of this company's latest request for the service, if any. */
  requestStatus?: RequestStatus;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center gap-3">
        <ServiceIcon service={service.slug} />
        <h3 className="min-w-0 flex-1 font-semibold leading-snug tracking-tight">{service.name}</h3>
        {requestStatus && <RequestStatusBadge status={requestStatus} />}
      </div>
      <p className="flex-1 text-sm text-muted-foreground">{service.summary}</p>
      <Link
        href={`/app/growth/${service.slug}`}
        className="inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Learn more<span className="sr-only"> about {service.name}</span>
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </Card>
  );
}
