/**
 * Contractor facts the branded estimator page shows (header, hero trust row,
 * footer). Only facts the contractor has published: Pool Masters LA's come
 * from its brochure (V3): "Licensed & insured", "Serving Southern California
 * since 2010", "Complimentary on-site estimates". Nothing here is invented;
 * a contractor without an entry simply shows no trust row.
 *
 * TODO: move to ContractorEstimatorConfig (e.g. `trustFacts`) so it sits with
 * the rest of the contractor's settings in content/estimators/.
 */
const FACTS: Record<string, readonly string[]> = {
  'pool-masters': ['Licensed & insured', 'Serving SoCal since 2010', 'Free on-site estimate'],
};

export function contractorFacts(slug: string): readonly string[] {
  return Object.hasOwn(FACTS, slug) ? FACTS[slug]! : [];
}

/** "(818) 643-6888" -> "tel:+18186436888". Null when there is no usable number. */
export function telHref(phone: string | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
  return digits.length >= 7 && digits.length <= 15 ? `tel:+${digits}` : null;
}
