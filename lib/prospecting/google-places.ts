import 'server-only';
import type { SourcedBusiness } from './catalog';

/**
 * Google Places API (New) — Text Search.
 *
 * The one real business-data source behind Refresh Prospects. Every listing
 * it returns is a business Google Maps knows about: name, phone, website,
 * address, type tags, rating, open/closed status and a stable place id.
 * Nothing is invented here; if the key is missing the caller is told so
 * rather than handed made-up rows.
 *
 * Setup: create an API key with the "Places API (New)" enabled and set
 * GOOGLE_PLACES_API_KEY (server-side only — never NEXT_PUBLIC_). The field
 * mask asks for contact fields (phone, website), which Google bills at its
 * higher Text Search tier, per request. Runs search the map grid in
 * lib/prospecting/grid.ts and are capped per run (MAX_REQUESTS_PER_RUN).
 */

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.formattedAddress',
  'places.addressComponents',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

export const PROVIDER_ID = 'google_places';
export const PROVIDER_ENV = 'GOOGLE_PLACES_API_KEY';

export function isConfigured(): boolean {
  return !!process.env[PROVIDER_ENV]?.trim();
}

interface PlacesAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}
interface PlacesResult {
  id: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  formattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
}
interface PlacesResponse {
  places?: PlacesResult[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
}

function component(p: PlacesResult, type: string): string | null {
  const c = p.addressComponents?.find((a) => a.types?.includes(type));
  return c?.longText ?? c?.shortText ?? null;
}

export function toSourced(p: PlacesResult): SourcedBusiness {
  return {
    externalSource: PROVIDER_ID,
    externalId: p.id,
    name: p.displayName?.text ?? '',
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    address: p.formattedAddress ?? null,
    city: component(p, 'locality') ?? component(p, 'sublocality') ?? null,
    adminArea2: component(p, 'administrative_area_level_2'),
    zip: component(p, 'postal_code'),
    types: p.types ?? [],
    primaryType: p.primaryType ?? null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    businessStatus: p.businessStatus ?? null,
    mapsUrl: p.googleMapsUri ?? null,
  };
}

export interface SearchOutcome {
  requests: number;
  /** Listings Google returned across the pages fetched. */
  results: number;
  /** True when every page Google offered was read (onPage never asked to stop). */
  complete: boolean;
}

/**
 * Runs one text query through every page Google will give (max 60 results
 * over 3 pages). `onPage` receives each page as it lands and returns true to
 * stop early. `locationRestriction` keeps results inside one map square.
 */
export async function searchText(
  textQuery: string,
  onPage: (results: SourcedBusiness[]) => Promise<boolean | void> | boolean | void,
  opts: { maxPages?: number; signal?: AbortSignal; locationRestriction?: unknown } = {}
): Promise<SearchOutcome> {
  const key = process.env[PROVIDER_ENV];
  if (!key) throw new Error(`${PROVIDER_ENV} is not configured`);

  let pageToken: string | undefined;
  let requests = 0;
  let results = 0;
  const maxPages = opts.maxPages ?? 3;

  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        pageSize: 20,
        languageCode: 'en',
        regionCode: 'US',
        ...(opts.locationRestriction ? { locationRestriction: opts.locationRestriction } : {}),
        ...(pageToken ? { pageToken } : {}),
      }),
      signal: opts.signal,
    });
    requests += 1;
    const body = (await res.json()) as PlacesResponse;
    if (!res.ok) {
      throw new Error(body.error?.message ?? `Places API error ${res.status}`);
    }
    const places = body.places ?? [];
    results += places.length;
    const stop = await onPage(places.map(toSourced));
    if (stop === true) return { requests, results, complete: !body.nextPageToken };
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return { requests, results, complete: true };
}
