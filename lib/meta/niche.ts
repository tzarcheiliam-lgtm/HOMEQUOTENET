/**
 * Niche tagging for Meta events, so ONE Pixel can still be sliced by niche.
 *
 * Every website event we send (browser Pixel and server Conversions API) carries the same custom parameters:
 *   content_category  the niche's readable name, e.g. "Bathroom Remodeling" (a standard Meta parameter)
 *   niche             a stable key, e.g. "bathroom"
 *   content_name      the funnel slug, e.g. "bathroom-remodel"
 * In Events Manager use them to build custom conversions ("Lead where niche = bathroom"), custom audiences, and the
 * breakdown views. The niche is worked out from the funnel's industry text and slug, so a new funnel is tagged
 * automatically. Pure: no I/O.
 *
 * Not applied to the Conversions API for CRM events (instant-form and CRM stage events): Meta defines their
 * custom_data fields, so we do not add anything there.
 */
export type Niche = { key: string; label: string };

export const NICHES = {
  bathroom: { key: 'bathroom', label: 'Bathroom Remodeling' },
  kitchen: { key: 'kitchen', label: 'Kitchen Remodeling' },
  kitchen_bath: { key: 'kitchen_bath', label: 'Kitchen and Bath Remodeling' },
  adu: { key: 'adu', label: 'ADU' },
  pool: { key: 'pool', label: 'Pool' },
  roofing: { key: 'roofing', label: 'Roofing' },
  hvac: { key: 'hvac', label: 'HVAC' },
  fencing: { key: 'fencing', label: 'Fencing' },
  remodeling: { key: 'remodeling', label: 'Remodeling and General Contracting' },
  other: { key: 'other', label: 'Other' },
} as const satisfies Record<string, Niche>;

/** First match wins. Kitchen and bath together is its own niche so it never counts as either one. */
export function nicheOf(industry: string | null | undefined, slug?: string | null): Niche {
  const text = `${industry ?? ''} ${slug ?? ''}`.toLowerCase();
  if (/\badu\b|accessory dwelling|garage conversion/.test(text)) return NICHES.adu;
  const bath = /bath/.test(text);
  const kitchen = /kitchen/.test(text);
  if (bath && kitchen) return NICHES.kitchen_bath;
  if (bath) return NICHES.bathroom;
  if (kitchen) return NICHES.kitchen;
  if (/\bpool|\bspa\b/.test(text)) return NICHES.pool;
  if (/roof/.test(text)) return NICHES.roofing;
  if (/hvac|heating|air.?condition|furnace/.test(text)) return NICHES.hvac;
  if (/fenc|gate/.test(text)) return NICHES.fencing;
  if (/remodel|general contract|construction|home improvement|renovat|addition/.test(text)) return NICHES.remodeling;
  return NICHES.other;
}

export type NicheCustomData = { content_category: string; niche: string; content_name?: string };

/** The custom parameters attached to every website event (same for the browser Pixel and the Conversions API). */
export function nicheCustomData(niche: Niche, slug?: string | null): NicheCustomData {
  const name = (slug ?? '').trim();
  return { content_category: niche.label, niche: niche.key, ...(name ? { content_name: name } : {}) };
}

/** Convenience: from a funnel's industry and slug straight to the parameters. */
export const nicheDataFor = (industry: string | null | undefined, slug?: string | null) => nicheCustomData(nicheOf(industry, slug), slug);
