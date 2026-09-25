import { ArrowRight, CalendarCheck, Check, CircleCheck, MailCheck, PhoneIncoming, Sparkles, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestDialog } from '@/components/growth/request-dialog';
import { PriceTag } from '@/components/growth/price-tag';
import { ServiceIcon } from '@/components/growth/service-icon';
import type { Requester } from '@/components/growth/service-request-form';
import { OPEN_REQUEST_STATUSES, requestStatusLabel, type GrowthService, type RequestStatus } from '@/lib/growth/catalog';

// What the service does, step by step. Illustrative, not data.
const FLOW = [
  { icon: PhoneIncoming, label: 'Call answered', detail: 'Day, night or weekend' },
  { icon: UserCheck, label: 'Homeowner qualified', detail: 'Project, timeline, location' },
  { icon: CalendarCheck, label: 'Appointment booked', detail: 'Straight onto your calendar' },
  { icon: MailCheck, label: 'Confirmation sent', detail: 'Text and email to the homeowner' },
];

/** The hero upsell. Visually strongest element on the page. */
export function FeaturedServiceCard({
  service,
  requester,
  requestStatus,
}: {
  service: GrowthService;
  requester: Requester;
  requestStatus?: RequestStatus;
}) {
  const open = Boolean(requestStatus && OPEN_REQUEST_STATUSES.includes(requestStatus));
  const trigger = open ? (
    <Button size="lg" disabled className="bg-white/10 text-white disabled:opacity-100">
      <CircleCheck aria-hidden /> Requested · {requestStatusLabel(requestStatus!)}
    </Button>
  ) : (
    <Button size="lg" className="group bg-white text-slate-950 shadow-lg shadow-black/20 hover:bg-white/90 focus-visible:ring-white/60">
      {service.cta}
      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Button>
  );

  return (
    <section
      data-upsell-type={service.slug}
      aria-labelledby={`upsell-${service.slug}`}
      className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:p-10"
    >
      {/* Premium surface: soft light blooms and a faint grid */}
      <span aria-hidden className="absolute -right-24 -top-32 -z-10 size-[28rem] rounded-full bg-sky-500/20 blur-3xl" />
      <span aria-hidden className="absolute -bottom-40 -left-24 -z-10 size-[26rem] rounded-full bg-indigo-500/15 blur-3xl" />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
        <div className="space-y-6 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <ServiceIcon service={service.slug} tone="inverse" size="lg" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
              <Sparkles aria-hidden className="size-3.5" /> Featured
            </span>
            {service.badge === 'most_popular' && (
              <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-amber-950">Most Popular</span>
            )}
          </div>
          <div className="space-y-3">
            <h2 id={`upsell-${service.slug}`} className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {service.name}
            </h2>
            <p className="text-xl font-medium text-white/90">{service.tagline}</p>
            <p className="max-w-xl text-white/70">{service.description}</p>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {service.benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-white/90">
                <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <div className="space-y-5 border-t border-white/10 pt-6">
            <PriceTag price={service.price} tone="inverse" size="lg" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <RequestDialog service={service} requester={requester} trigger={trigger} />
              <span className="text-sm text-white/60">No charge to request. We’ll confirm scope and price with you first.</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">How it works</p>
            <ol className="mt-4 space-y-4">
              {FLOW.map(({ icon: Icon, label, detail }, i) => (
                <li key={label} className="relative flex gap-3">
                  {i < FLOW.length - 1 && (
                    <span aria-hidden className="absolute left-[1.0625rem] top-10 h-[calc(100%-1.5rem)] w-px bg-white/15" />
                  )}
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-4" />
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-white/60">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
