'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PriceTag } from '@/components/growth/price-tag';
import { ServiceIcon } from '@/components/growth/service-icon';
import { ServiceRequestForm, type Requester } from '@/components/growth/service-request-form';
import type { GrowthService } from '@/lib/growth/catalog';
import { trackUpsell } from '@/lib/growth/track';

/**
 * The CTA on a Growth Tools card. Opens a short modal: what's included, the
 * account it will be filed under, optional notes, then a confirmation.
 */
export function RequestDialog({
  service,
  requester,
  trigger,
}: {
  service: GrowthService;
  requester: Requester;
  /** The button that opens the dialog (rendered as the trigger). */
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  // A fresh form each time it opens, so a closed success state doesn't linger.
  const [session, setSession] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSession((n) => n + 1);
          trackUpsell('upsell_clicked', requester.contractorId, service.slug);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="space-y-5">
          <div className="flex items-start gap-3 pr-6">
            <ServiceIcon service={service.slug} tone="strong" />
            <div className="min-w-0 space-y-1">
              <DialogTitle>{service.name}</DialogTitle>
              <DialogDescription>{service.tagline}</DialogDescription>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
            {service.benefits.map((b) => (
              <li key={b} className="flex gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-900" />
                {b}
              </li>
            ))}
          </ul>
          <PriceTag price={service.price} className="rounded-lg bg-muted/50 px-4 py-3" />
          <ServiceRequestForm
            key={session}
            service={service}
            requester={requester}
            source="growth_page"
            after={
              <DialogClose asChild>
                <Button variant="outline">Done</Button>
              </DialogClose>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
