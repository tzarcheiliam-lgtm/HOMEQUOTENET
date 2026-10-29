/**
 * Browser side of the funnel's "Home address" field: the contract with
 * POST /api/estimator/[slug]/address/{autocomplete,details} (server proxies
 * for Google Places API (New); the key never reaches the browser), and the
 * ZIP rules the contact step uses.
 *
 * The ZIP gates the service area, so it comes from the picked Google place
 * when there is one (and the text was not edited since), else from the typed
 * address ("12 Elm St, Calabasas, CA 91302").
 */

/** One Google suggestion, as the dropdown shows it. */
export type AddressSuggestion = { placeId: string; main: string; secondary: string };

/** A picked place, resolved on the server. `address` is the text the field was filled with. */
export type AddressPlace = { address: string; zip: string | null; city: string | null; state: string | null; lat: number | null; lng: number | null };

/** Why there are no suggestions. 'disabled': no key on this deployment (the field is a plain input). */
export type AddressFailure = 'disabled' | 'invalid' | 'limit' | 'forbidden' | 'not_found' | 'error';

export type AutocompleteResponse = { ok: true; suggestions: AddressSuggestion[] } | { ok: false; reason: AddressFailure };
export type DetailsResponse = ({ ok: true } & Omit<AddressPlace, 'address'> & { address: string }) | { ok: false; reason: AddressFailure };

/** Input caps (the server enforces the same). */
export const ADDRESS_MAX = 300;
export const AUTOCOMPLETE_MIN = 3;
export const AUTOCOMPLETE_INPUT_MAX = 200;

/**
 * The 5-digit ZIP of a typed address, or null. Only a ZIP where a ZIP goes:
 * at the end ("..., CA 91302", "... 91302-1234", "..., CA 91302, USA") or
 * right after a state code ("CA 91302 ..."), never a 5-digit street number
 * ("12345 Ventura Blvd, Studio City").
 */
export function extractZip(address: string): string | null {
  const text = address.trim().replace(/[\s,]*(?:USA|US|United States)\.?$/i, '');
  const end = /(?:^|[\s,])(\d{5})(?:-\d{4})?$/.exec(text);
  // A lone number is a street number, not a ZIP ("12345").
  if (end && /[A-Za-z]/.test(text)) return end[1];
  const afterState = /\b[A-Za-z]{2}\.?\s+(\d{5})(?:-\d{4})?\b/.exec(text);
  return afterState && afterState.index > 0 ? afterState[1] : null;
}

/** The ZIP the lead uses: the picked place's (while the field still shows its address), else the typed one's. */
export function addressZip(address: string, place: AddressPlace | null | undefined): string | null {
  if (place && place.zip && place.address.trim() === address.trim()) return place.zip;
  return extractZip(address);
}

/** The picked place, only while the field still shows the address it filled in. */
export function currentPlace(address: string, place: AddressPlace | null | undefined): AddressPlace | null {
  return place && place.address.trim() === address.trim() ? place : null;
}

/** A new Places session token (groups one search + one pick for Google billing). */
export function newSessionToken(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`.slice(0, 36);
}

async function post<T>(url: string, body: unknown, signal: AbortSignal | undefined, fetcher: typeof fetch): Promise<T | { ok: false; reason: AddressFailure }> {
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (data && typeof data === 'object' && 'ok' in data) return data;
    return { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export function fetchAddressSuggestions(
  slug: string,
  input: string,
  sessionToken: string,
  opts: { signal?: AbortSignal; fetch?: typeof fetch } = {},
): Promise<AutocompleteResponse> {
  return post<AutocompleteResponse>(`/api/estimator/${encodeURIComponent(slug)}/address/autocomplete`, { input: input.slice(0, AUTOCOMPLETE_INPUT_MAX), sessionToken }, opts.signal, opts.fetch ?? fetch);
}

export function fetchAddressDetails(
  slug: string,
  placeId: string,
  sessionToken: string,
  opts: { signal?: AbortSignal; fetch?: typeof fetch } = {},
): Promise<DetailsResponse> {
  return post<DetailsResponse>(`/api/estimator/${encodeURIComponent(slug)}/address/details`, { placeId, sessionToken }, opts.signal, opts.fetch ?? fetch);
}
