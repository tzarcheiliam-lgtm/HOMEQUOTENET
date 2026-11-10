import type { FunnelReviewsConfig, GoogleBusinessMatch } from './funnel/types.ts';

/**
 * The funnel landing's Google reviews (FunnelLanding.reviews): Google Places
 * API (New) Text Search (only when no place id is configured, with strict
 * matching) and Place Details (field mask reviews, displayName, googleMapsUri).
 *
 * Rules (owner + compliance): only 5-star reviews with text; never the average
 * rating or the review count; reviewer shown as first name + last initial;
 * newest first; text trimmed to about 220 characters with a "Read on Google"
 * link. The key goes to Google in a header only and is never part of a result.
 *
 * Pure apart from the injected fetch, so tests mock it; the cached, server-only
 * entry point is ./reviews.server.ts.
 */

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const SEARCH_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.websiteUri';
const DETAILS_FIELDS = 'id,displayName,googleMapsUri,reviews';
const TIMEOUT_MS = 6000;
export const REVIEW_TEXT_MAX = 220;
export const DEFAULT_MAX_REVIEWS = 3;
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

export type FunnelReview = {
  /** Google's review resource name: a React key only. */
  id: string;
  /** "Sarah K." */
  author: string;
  /** The reviewer's Google profile (attribution), when Google gives one. */
  authorUri: string | null;
  /** Google's own wording, e.g. "2 months ago". */
  relativeTime: string;
  text: string;
  truncated: boolean;
  /** "Read on Google": the review's Maps link, else the place's. */
  url: string | null;
};

export type ReviewsResult = {
  placeId: string | null;
  placeIdSource: 'config' | 'lookup' | null;
  placeUri: string | null;
  /** 5-star reviews with text among those Google returned (health check only, never shown). */
  fiveStarCount: number;
  reviews: FunnelReview[];
};

/** What the landing renders. Never carries a rating average or a count. */
export type FunnelReviewsData = { heading: string; placeUri: string | null; reviews: FunnelReview[] };

export class ReviewsError extends Error {
  constructor(readonly stage: 'lookup' | 'details', readonly status: number | null) {
    super(`Google ${stage} failed${status ? ` (${status})` : ''}`);
  }
}

/* ------------------------------------------------------------------ */
/* Google shapes                                                       */
/* ------------------------------------------------------------------ */

type LocalizedText = { text?: string; languageCode?: string };
type AddressComponent = { longText?: string; shortText?: string; types?: string[] };
export type SearchPlace = {
  id?: string;
  displayName?: LocalizedText;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  websiteUri?: string;
};
export type GoogleReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: LocalizedText;
  originalText?: LocalizedText;
  authorAttribution?: { displayName?: string; uri?: string };
  publishTime?: string;
  googleMapsUri?: string;
};
type DetailsBody = { id?: string; googleMapsUri?: string; reviews?: GoogleReview[] };

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** "Sarah Kim" -> "Sarah K.", "maria de la cruz" -> "Maria C.", "Sam" -> "Sam". */
export function shortName(full: string | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Google user';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const first = cap(parts[0]);
  if (parts.length === 1) return first;
  const initial = parts[parts.length - 1].match(/[\p{L}\p{N}]/u)?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

/** Collapses whitespace and cuts at a word boundary under `max` characters, ending in "…". */
export function trimReview(text: string, max = REVIEW_TEXT_MAX): { text: string; truncated: boolean } {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return { text: t, truncated: false };
  let cut = t.slice(0, max);
  const space = cut.lastIndexOf(' ');
  if (space > max * 0.6) cut = cut.slice(0, space);
  return { text: `${cut.replace(/[\s,.;:!?\-–—(]+$/u, '')}…`, truncated: true };
}

/** Only https Google links (Maps, maps.app.goo.gl, a Google profile) ever become hrefs. */
export function googleUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    const ok = host === 'google.com' || host.endsWith('.google.com') || host === 'goo.gl' || host.endsWith('.goo.gl');
    return url.protocol === 'https:' && ok ? url.toString() : null;
  } catch {
    return null;
  }
}

const reviewText = (r: GoogleReview) => (r.text?.text ?? r.originalText?.text ?? '').trim();

/** 5-star reviews with text, newest first (Google's order otherwise), formatted for the page. */
export function selectReviews(reviews: GoogleReview[] | undefined, placeUri: string | null, max = DEFAULT_MAX_REVIEWS): { fiveStarCount: number; reviews: FunnelReview[] } {
  const eligible = (reviews ?? [])
    .map((r, i) => ({ r, i, t: Date.parse(r.publishTime ?? '') }))
    .filter(({ r }) => r.rating === 5 && reviewText(r).length > 0);
  eligible.sort((a, b) => (Number.isNaN(b.t) ? -Infinity : b.t) - (Number.isNaN(a.t) ? -Infinity : a.t) || a.i - b.i);
  const limit = Math.max(0, Math.min(5, Math.floor(max)));
  return {
    fiveStarCount: eligible.length,
    reviews: eligible.slice(0, limit).map(({ r, i }) => {
      const { text, truncated } = trimReview(reviewText(r));
      return {
        id: r.name ?? `review-${i}`,
        author: shortName(r.authorAttribution?.displayName),
        authorUri: googleUrl(r.authorAttribution?.uri),
        relativeTime: (r.relativePublishTimeDescription ?? '').trim(),
        text,
        truncated,
        url: googleUrl(r.googleMapsUri) ?? placeUri,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Matching (Text Search)                                              */
/* ------------------------------------------------------------------ */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function host(u: string | undefined): string | null {
  if (!u) return null;
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

const PLACE_TYPES = ['locality', 'sublocality', 'sublocality_level_1', 'neighborhood', 'postal_town', 'administrative_area_level_3'];

/** Whether one Text Search result is the configured business. Name always; then the website, or the state plus a city/ZIP. */
export function matchesBusiness(place: SearchPlace, match: GoogleBusinessMatch): { ok: boolean; byWebsite: boolean } {
  const no = { ok: false, byWebsite: false };
  if (!place.id || !PLACE_ID.test(place.id)) return no;
  const name = norm(place.displayName?.text ?? '');
  const want = norm(match.name);
  if (!want || !` ${name} `.includes(` ${want} `)) return no;

  const comps = place.addressComponents ?? [];
  const state = comps.find((c) => c.types?.includes('administrative_area_level_1'))?.shortText?.toUpperCase() ?? null;
  const address = place.formattedAddress ?? '';
  if (match.state) {
    const st = match.state.toUpperCase();
    if (state && state !== st) return no;
    // No state component: the formatted address must still name it (", CA 91403" / ", CA, USA").
    if (!state && address && !new RegExp(`,\\s*${st}(\\s+\\d{5}(-\\d{4})?)?\\s*(,|$)`).test(address)) return no;
  }

  const site = host(place.websiteUri);
  const wantSite = match.websiteHost?.toLowerCase().replace(/^www\./, '');
  const byWebsite = !!(site && wantSite && (site === wantSite || site.endsWith(`.${wantSite}`)));
  if (byWebsite) return { ok: true, byWebsite };
  // Without a website match an address is required (no state at all -> reject).
  if (!state && !address) return no;

  const places = (match.places ?? []).map(norm).filter(Boolean);
  const compNames = comps.filter((c) => c.types?.some((t) => PLACE_TYPES.includes(t))).flatMap((c) => [c.longText, c.shortText]).filter((s): s is string => !!s).map(norm);
  const addr = ` ${norm(address)} `;
  const byPlace = places.some((p) => compNames.includes(p) || addr.includes(` ${p} `));
  const zip = comps.find((c) => c.types?.includes('postal_code'))?.longText ?? address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
  const byZip = !!(zip && match.postalCodes?.includes(zip.slice(0, 5)));
  return { ok: byPlace || byZip, byWebsite: false };
}

/** The one matching place id: a website match wins; otherwise exactly one address match, else null (ambiguous). */
export function pickPlace(places: SearchPlace[] | undefined, match: GoogleBusinessMatch): string | null {
  const hits = (places ?? []).map((p) => ({ p, m: matchesBusiness(p, match) })).filter((h) => h.m.ok);
  const site = hits.find((h) => h.m.byWebsite);
  if (site) return site.p.id!;
  const ids = [...new Set(hits.map((h) => h.p.id!))];
  return ids.length === 1 ? ids[0] : null;
}

/* ------------------------------------------------------------------ */
/* Google calls                                                        */
/* ------------------------------------------------------------------ */

type Fetch = typeof fetch;

async function getJson(fetchImpl: Fetch, stage: 'lookup' | 'details', url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ReviewsError(stage, null);
  }
  if (!res.ok) throw new ReviewsError(stage, res.status);
  try {
    return await res.json();
  } catch {
    throw new ReviewsError(stage, res.status);
  }
}

export async function findPlaceId(match: GoogleBusinessMatch, key: string, fetchImpl: Fetch = fetch): Promise<string | null> {
  const body = (await getJson(fetchImpl, 'lookup', SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': SEARCH_FIELDS },
    body: JSON.stringify({ textQuery: match.query, pageSize: 10, languageCode: 'en', regionCode: 'US' }),
  })) as { places?: SearchPlace[] };
  return pickPlace(body.places, match);
}

export async function fetchPlaceReviews(placeId: string, key: string, fetchImpl: Fetch = fetch): Promise<{ placeUri: string | null; reviews: GoogleReview[] }> {
  if (!PLACE_ID.test(placeId)) throw new ReviewsError('details', null);
  const body = (await getJson(fetchImpl, 'details', `${DETAILS_URL}${placeId}?languageCode=en`, {
    method: 'GET',
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAILS_FIELDS },
  })) as DetailsBody;
  return { placeUri: googleUrl(body.googleMapsUri), reviews: Array.isArray(body.reviews) ? body.reviews : [] };
}

/** The place (configured, else looked up) and its qualifying reviews. Throws ReviewsError when Google fails (so it is not cached). */
export async function loadGoogleReviews(config: FunnelReviewsConfig, key: string, fetchImpl: Fetch = fetch): Promise<ReviewsResult> {
  const empty: ReviewsResult = { placeId: null, placeIdSource: null, placeUri: null, fiveStarCount: 0, reviews: [] };
  if (!config.enabled) return empty;
  let placeId = config.googlePlaceId?.trim() || null;
  let placeIdSource: ReviewsResult['placeIdSource'] = placeId ? 'config' : null;
  if (!placeId && config.lookup) {
    placeId = await findPlaceId(config.lookup, key, fetchImpl);
    placeIdSource = placeId ? 'lookup' : null;
  }
  if (!placeId) return empty;
  const { placeUri, reviews } = await fetchPlaceReviews(placeId, key, fetchImpl);
  return { placeId, placeIdSource, placeUri, ...selectReviews(reviews, placeUri, config.max ?? DEFAULT_MAX_REVIEWS) };
}

export const reviewsHeading = (config: FunnelReviewsConfig, contractorName: string) => config.heading?.trim() || `What ${contractorName} customers say`;
