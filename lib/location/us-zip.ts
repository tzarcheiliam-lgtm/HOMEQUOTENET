/**
 * US ZIP code → state validation, without a third-party API.
 *
 * Deliberately NOT "starts with 9": that would also accept Nevada POBox/APO
 * ranges and non-CA territories. Instead this uses the standard USPS ZIP3
 * (first three digits) → state assignment, which is how the National ZIP
 * Code and Post Office Directory partitions the country. California's
 * assigned ZIP3 block is a contiguous 900–961 with no overlap into a
 * neighboring state at the ZIP3 level (Nevada is 889–898, Oregon is 970–979,
 * Arizona is 850–865, Hawaii is 967–968). This is the same granularity the
 * funnel system already uses for its radius-style `serviceArea.zipPrefixes`
 * (lib/funnels/schema.ts `inServiceArea`), so this module stays consistent
 * with the rest of the app's location model instead of introducing a new one.
 *
 * Limitation: ZIP3-level accuracy cannot confirm a specific 5-digit ZIP is an
 * actually-assigned, deliverable code (e.g. "90000" would pass the state
 * check even though it isn't a real ZIP) — only that, if it's real, it's a
 * California ZIP. Combined with the 5-digit format check below, this rejects
 * every malformed input and every valid ZIP outside California, which is
 * what the Pool Masters service-area gate needs. A full ZIP5 deliverability
 * dataset can be layered in later (see HOMEQUOTE_CONTEXT.md) if stricter
 * validation is ever needed.
 */

const CA_ZIP3_MIN = 900;
const CA_ZIP3_MAX = 961;

/** Normalizes "90210-1234" / "90210 " / "90210" to "90210", or null if not a well-formed 5-digit ZIP. */
export function normalizeZip5(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  const match = /^(\d{5})(-\d{4})?$/.exec(trimmed);
  return match ? match[1] : null;
}

/** Best-effort state for a US ZIP, at ZIP3 granularity. Currently only resolves California; returns null for anything else (including malformed input). */
export function usZipState(raw: string): 'CA' | null {
  const zip = normalizeZip5(raw);
  if (!zip) return null;
  const zip3 = Number(zip.slice(0, 3));
  return zip3 >= CA_ZIP3_MIN && zip3 <= CA_ZIP3_MAX ? 'CA' : null;
}

export function isCaliforniaZip(raw: string): boolean {
  return usZipState(raw) === 'CA';
}
