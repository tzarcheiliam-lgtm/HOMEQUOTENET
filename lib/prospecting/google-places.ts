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
 * GOOGLE_PLACES_API_KEY (server-side only — never NEXT_PUBLIC_). Requests
 * use the Pro field mask (contact fields), billed per request; a 100-per-
 * caller run is typically 15–30 requests.
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

/**
 * Runs one text query through every page Google will give (max 60 results
 * over 3 pages). `onPage` receives each page as it lands so the runner can
 * stop early once it has enough.
 */
export async function searchText(
  textQuery: string,
  onPage: (results: SourcedBusiness[]) => Promise<boolean | void>,
  opts: { maxPages?: number; signal?: AbortSignal } = {}
): Promise<number> {
  const key = process.env[PROVIDER_ENV];
  if (!key) throw new Error(`${PROVIDER_ENV} is not configured`);

  let pageToken: string | undefined;
  let requests = 0;
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
        ...(pageToken ? { pageToken } : {}),
      }),
      signal: opts.signal,
    });
    requests += 1;
    const body = (await res.json()) as PlacesResponse;
    if (!res.ok) {
      throw new Error(body.error?.message ?? `Places API error ${res.status}`);
    }
    const stop = await onPage((body.places ?? []).map(toSourced));
    if (stop === true) break;
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return requests;
}
