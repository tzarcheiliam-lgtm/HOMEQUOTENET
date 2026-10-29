import type { ContractorEstimatorConfig } from '@/lib/estimator/types';

/**
 * Trust facts the branded estimator page shows (header, hero trust row).
 * Only facts the business has published: Pool Masters LA's come from its
 * brochure (V3): "Licensed & insured", "Serving Southern California since
 * 2010", "Complimentary on-site estimates". HomeQuote Network is a matching
 * network, not a contractor, so its facts are about the service only (no
 * license, years or reviews of its own). Nothing here is invented; a business
 * without facts simply shows no trust row.
 *
 * A config's own `facts` win (ContractorEstimatorConfig.facts); this table is
 * the fallback for callers that only have a slug.
 */
const FACTS: Record<string, readonly string[]> = {
  'pool-masters': ['Licensed & insured', 'Serving SoCal since 2010', 'Free on-site estimate'],
  'bathroom-remodel': ['Free in-home consultation', 'No obligation', 'Free to use'],
};

/** A config that may carry its own trust facts. */
type FactsSource = Pick<ContractorEstimatorConfig, 'slug'> & { facts?: readonly string[] };

/** The trust facts for a config (its own `facts` first) or a slug. Unknown and prototype slugs have none. */
export function contractorFacts(source: string | FactsSource): readonly string[] {
  if (typeof source !== 'string' && Array.isArray(source.facts)) return source.facts;
  const slug = typeof source === 'string' ? source : source.slug;
  return Object.hasOwn(FACTS, slug) ? FACTS[slug]! : [];
}

/** "(818) 643-6888" -> "tel:+18186436888". Null when there is no usable number. */
export function telHref(phone: string | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
  return digits.length >= 7 && digits.length <= 15 ? `tel:+${digits}` : null;
}
