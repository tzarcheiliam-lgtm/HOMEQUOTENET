/**
 * "Send my design to my partner": the read-only design page a homeowner can
 * share (/estimator/<slug>/my-design?size=..&finish=..&extras=..). Pure and
 * browser-safe. The link carries only the picks (the funnel's own query
 * encoding) and, when the lead route issued it, a short signature `v` over the
 * slug + picks: never a name, a lead id or anything personal. The page shows
 * the ballpark only with a valid signature (lib/estimator/share.server.ts), so
 * the price stays behind the contact step for anyone who builds a URL by hand.
 */
import { encodeFunnelSelection } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';

/** Query param of the signature. */
export const SHARE_SIG_PARAM = 'v';

/** The share page path for a slug. */
export const sharePagePath = (slug: string) => `/estimator/${encodeURIComponent(slug)}/my-design`;

/** "/estimator/pool-masters/my-design?size=classic&finish=luxe&extras=spa&spa=zero_edge[&v=sig]". */
export function shareDesignPath(slug: string, spec: FunnelSpec, selection: FunnelSelection, sig?: string | null): string {
  const query = encodeFunnelSelection(spec, selection);
  const params = new URLSearchParams(query);
  if (sig) params.set(SHARE_SIG_PARAM, sig);
  const qs = params.toString();
  return qs ? `${sharePagePath(slug)}?${qs}` : sharePagePath(slug);
}

/** What navigator.share gets (title / text); the url is the share path made absolute. */
export function shareMessage(contractorName: string, projectNoun: string): { title: string; text: string } {
  return {
    title: `My ${projectNoun} design · ${contractorName}`,
    text: `Here’s the ${projectNoun} I designed with ${contractorName}. Take a look:`,
  };
}

/** The room or project a design is of, from the template's trade: "pool", "bathroom", "kitchen", "ADU", "roof" ("Here’s the kitchen I designed"). */
export function designNoun(trade: string): string {
  if (trade === 'adu') return 'ADU';
  if (trade === 'roofing') return 'roof';
  return trade === 'bathroom' || trade === 'kitchen' ? trade : 'pool';
}
