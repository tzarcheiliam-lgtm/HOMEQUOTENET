import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getService } from '@/lib/growth/catalog';
import type { Recommendation } from '@/lib/growth/recommend';

/**
 * Compact right-rail card on the contractor dashboard. Sits below the lead
 * workflow and never interrupts it: no popups, one optional suggestion.
 */
export function GrowthDashboardCard({
  recommendation,
  openRequests,
}: {
  recommendation: Recommendation | null;
  openRequests: number;
}) {
  const suggested = recommendation ? getService(recommendation.service) : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Grow your business</CardTitle>
        <CardAction>
          <Link
            href="/app/growth"
            className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="All growth services"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Optional help with your website, marketing materials, reviews and follow-up.
        </p>
        {suggested && (
          <Link
            href={`/app/growth/${suggested.slug}`}
            className="-mx-2 block rounded-md px-2 py-2 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="block text-sm font-medium">{suggested.name}</span>
            <span className="block text-xs text-muted-foreground">{recommendation!.reason}</span>
          </Link>
        )}
        {openRequests > 0 && (
          <p className="text-xs text-muted-foreground">
            {openRequests} open request{openRequests === 1 ? '' : 's'} with the HomeQuote team.
          </p>
        )}
        <Link href="/app/growth" className="inline-flex text-sm font-medium text-primary hover:underline">
          Explore services
        </Link>
      </CardContent>
    </Card>
  );
}
