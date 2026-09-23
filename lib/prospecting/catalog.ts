/**
 * Pure core of "Refresh Prospects": what to search for, how to judge a
 * result, and how to split the haul between callers. No I/O, so every rule
 * here is unit-tested directly and the provider stays a thin fetch layer.
 */
import {
  isPlausibleUsPhone,
  looksPoolCleaningOnly,
  normalizeCompanyName,
  toE164,
  toWebsiteDomain,
} from '@/lib/calls/import';

/* ---- Niches ---------------------------------------------------------------- */

export interface Niche {
  slug: string;
  label: string;
  /** Search phrases, most specific first. Each becomes one text query per county. */
  queries: string[];
  /** Google Places primary types that count as a match; empty = judge by name/queries only. */
  types: string[];
}

export const NICHES: Niche[] = [
  {
    slug: 'pool',
    label: 'Pool Contractors',
    queries: ['pool remodeling contractor', 'pool resurfacing contractor', 'pool builder'],
    types: ['swimming_pool_contractor', 'general_contractor', 'contractor'],
  },
  { slug: 'general', label: 'General Contractors', queries: ['general contractor', 'home remodeling contractor'], types: ['general_contractor', 'contractor'] },
  { slug: 'roofing', label: 'Roofing Contractors', queries: ['roofing contractor', 'roof repair company'], types: ['roofing_contractor', 'contractor'] },
  { slug: 'fencing', label: 'Fencing Contractors', queries: ['fence contractor', 'fence installation company'], types: ['fence_contractor', 'contractor'] },
  { slug: 'hvac', label: 'HVAC Contractors', queries: ['HVAC contractor', 'air conditioning contractor'], types: ['hvac_contractor', 'contractor'] },
  { slug: 'plumbing', label: 'Plumbing Contractors', queries: ['plumbing contractor', 'plumber'], types: ['plumber', 'contractor'] },
  { slug: 'electrical', label: 'Electrical Contractors', queries: ['electrical contractor', 'electrician'], types: ['electrician', 'contractor'] },
  { slug: 'landscaping', label: 'Landscaping / Hardscaping Contractors', queries: ['landscaping contractor', 'hardscape contractor'], types: ['landscaper', 'contractor'] },
  { slug: 'painting', label: 'Painting Contractors', queries: ['painting contractor', 'house painter'], types: ['painter', 'contractor'] },
  { slug: 'kitchen_bath', label: 'Kitchen & Bathroom Remodeling Contractors', queries: ['kitchen remodeling contractor', 'bathroom remodeling contractor'], types: ['general_contractor', 'contractor'] },
];

export const CUSTOM_NICHE_SLUG = 'custom';

/** Resolves a slug (or custom text) to the niche definition used for a run. */
export function resolveNiche(slug: string, customText?: string | null): Niche | null {
  if (slug === CUSTOM_NICHE_SLUG) {
    const text = (customText ?? '').trim().replace(/\s+/g, ' ');
    if (text.length < 3) return null;
    const label = text.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      slug: CUSTOM_NICHE_SLUG,
      label,
      queries: [/contractor|company|service/i.test(text) ? text : `${text} contractor`],
      types: [],
    };
  }
  return NICHES.find((n) => n.slug === slug) ?? null;
}

/* ---- Markets --------------------------------------------------------------- */

export interface County {
  name: string; // as stored in contractor_prospects.county
  /** Text appended to queries; anchors the search geographically. */
  where: string;
  /** Sub-areas searched in turn so one county can yield well over 60 listings. */
  areas: string[];
  /** Accepted administrative_area_level_2 values from the provider. */
  matches: string[];
}

export const TARGET_COUNTIES: County[] = [
  {
    name: 'Los Angeles',
    where: 'Los Angeles County, CA',
    areas: [
      'San Fernando Valley', 'West Los Angeles', 'South Bay', 'Pasadena', 'Santa Clarita',
      'Long Beach', 'Glendale', 'Torrance', 'Burbank', 'Santa Monica', 'Downey', 'Pomona',
    ],
    matches: ['Los Angeles County'],
  },
  {
    name: 'Ventura',
    where: 'Ventura County, CA',
    areas: ['Thousand Oaks', 'Simi Valley', 'Oxnard', 'Ventura', 'Camarillo', 'Moorpark'],
    matches: ['Ventura County'],
  },
];

/** County name for a provider's administrative_area_level_2, or null if outside target. */
export function countyFor(adminArea2: string | null | undefined): string | null {
  if (!adminArea2) return null;
  for (const c of TARGET_COUNTIES) {
    if (c.matches.some((m) => m.toLowerCase() === adminArea2.toLowerCase())) return c.name;
  }
  return null;
}

/* ---- Query plan ------------------------------------------------------------ */

export interface PlannedQuery {
  county: string;
  text: string;
}

/**
 * The searches to run, in priority order: every query phrase for the county
 * as a whole, then each phrase per sub-area. The runner stops early once it
 * has enough, so a small ask costs a few requests and a big one fans out.
 */
export function planQueries(niche: Niche): PlannedQuery[] {
  const out: PlannedQuery[] = [];
  for (const county of TARGET_COUNTIES) {
    for (const q of niche.queries) out.push({ county: county.name, text: `${q} in ${county.where}` });
  }
  for (const county of TARGET_COUNTIES) {
    for (const area of county.areas) {
      for (const q of niche.queries) {
        out.push({ county: county.name, text: `${q} in ${area}, ${county.where}` });
      }
    }
  }
  return out;
}

/* ---- Provider result → prospect --------------------------------------------- */

/** What any provider must hand back for one listing. */
export interface SourcedBusiness {
  externalSource: string;
  externalId: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  adminArea2: string | null; // county as the provider names it
  zip: string | null;
  types: string[];
  primaryType: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessStatus: string | null;
  mapsUrl: string | null;
}

export interface QualifiedProspect {
  company_name: string;
  phone: string;
  phone_e164: string;
  website: string | null;
  website_domain: string | null;
  address: string | null;
  city: string | null;
  county: string;
  zip: string | null;
  primary_services: string[];
  category: string | null;
  niche: string;
  rating: number | null;
  review_count: number | null;
  business_status: string | null;
  maps_url: string | null;
  external_source: string;
  external_id: string;
  is_pool_cleaning_only: boolean;
}

export type Disqualification =
  | 'closed'
  | 'no_phone'
  | 'invalid_phone'
  | 'outside_target_counties'
  | 'niche_mismatch';

/**
 * Turns a listing into a prospect, or says why it does not qualify. Strict on
 * the things a caller cannot work around (no number, closed, wrong county),
 * lenient on type matching because providers tag contractors inconsistently —
 * a name or type that plainly matches the niche is enough.
 */
export function qualify(
  b: SourcedBusiness,
  niche: Niche
): { ok: true; prospect: QualifiedProspect } | { ok: false; reason: Disqualification } {
  if (b.businessStatus && b.businessStatus !== 'OPERATIONAL') return { ok: false, reason: 'closed' };
  if (!b.phone) return { ok: false, reason: 'no_phone' };
  if (!isPlausibleUsPhone(b.phone)) return { ok: false, reason: 'invalid_phone' };
  const county = countyFor(b.adminArea2);
  if (!county) return { ok: false, reason: 'outside_target_counties' };

  const services = humanizeTypes(b.types);
  const hay = `${b.name} ${b.types.join(' ')} ${b.primaryType ?? ''}`.toLowerCase().replace(/_/g, ' ');
  const typeMatch = niche.types.length > 0 && b.types.some((t) => niche.types.includes(t));
  const keywordMatch = niche.queries.some((q) =>
    q
      .toLowerCase()
      .replace(/\b(contractor|company|services?|in)\b/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .some((w) => hay.includes(w))
  );
  if (!typeMatch && !keywordMatch) return { ok: false, reason: 'niche_mismatch' };

  return {
    ok: true,
    prospect: {
      company_name: b.name.trim(),
      phone: b.phone,
      phone_e164: toE164(b.phone)!,
      website: b.website,
      website_domain: toWebsiteDomain(b.website),
      address: b.address,
      city: b.city,
      county,
      zip: b.zip,
      primary_services: services,
      category: b.primaryType ?? null,
      niche: niche.label,
      rating: b.rating,
      review_count: b.reviewCount,
      business_status: b.businessStatus,
      maps_url: b.mapsUrl,
      external_source: b.externalSource,
      external_id: b.externalId,
      is_pool_cleaning_only:
        niche.slug === 'pool' && looksPoolCleaningOnly(services, b.primaryType, b.name),
    },
  };
}

/** "swimming_pool_contractor" → "Swimming pool contractor"; drops generic tags. */
export function humanizeTypes(types: string[]): string[] {
  const skip = new Set(['point_of_interest', 'establishment', 'store', 'locality', 'political']);
  return Array.from(
    new Set(
      types
        .filter((t) => !skip.has(t))
        .map((t) => t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))
    )
  );
}

/* ---- Dedupe against the whole database -------------------------------------- */

export interface ExistingKeys {
  phones: Set<string>;    // phone_e164
  domains: Set<string>;   // website_domain
  nameCity: Set<string>;  // normalized name|city
  external: Set<string>;  // source:id
}

export function keyNameCity(name: string, city: string | null): string {
  return `${normalizeCompanyName(name)}|${(city ?? '').toLowerCase().trim()}`;
}

/**
 * True if this business is already anywhere in the prospect history —
 * archived, do-not-call, assigned to anyone, ever called. Also records the
 * business so a second copy inside the same run is caught too.
 */
export function isDuplicate(p: QualifiedProspect, seen: ExistingKeys): boolean {
  const ext = `${p.external_source}:${p.external_id}`;
  const nc = keyNameCity(p.company_name, p.city);
  const dup =
    seen.external.has(ext) ||
    seen.phones.has(p.phone_e164) ||
    (!!p.website_domain && seen.domains.has(p.website_domain)) ||
    (!!p.city && seen.nameCity.has(nc));
  seen.external.add(ext);
  seen.phones.add(p.phone_e164);
  if (p.website_domain) seen.domains.add(p.website_domain);
  if (p.city) seen.nameCity.add(nc);
  return dup;
}

/* ---- Split between callers -------------------------------------------------- */

/**
 * Deals prospects round-robin so each caller gets an equal share and no
 * company appears on two lists. With one caller it is simply the first N.
 */
export function distribute<T>(items: T[], callerIds: string[], perCaller: number): Map<string, T[]> {
  const out = new Map<string, T[]>(callerIds.map((id) => [id, []]));
  if (callerIds.length === 0) return out;
  let i = 0;
  for (const item of items) {
    const id = callerIds[i % callerIds.length];
    const bucket = out.get(id)!;
    if (bucket.length < perCaller) bucket.push(item);
    i += 1;
    if (callerIds.every((c) => out.get(c)!.length >= perCaller)) break;
  }
  return out;
}
