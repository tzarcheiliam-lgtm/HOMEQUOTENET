import type { PoolDimensions } from '../types.ts';
import {
  DEFAULT_HOME_BAND,
  HOME_BANDS,
  LOW_SLOPE_DEG,
  MEASURED_ROOF_SQFT,
  PITCH_TIERS,
  ROOF_GEOMETRY_WIDTH_FT,
  WASTE_FACTOR,
  type HomeBand,
} from './pricing-config.ts';

/*
 * The roof the roofing funnel prices, pure and server- and client-safe:
 * reading a Google Solar API buildingInsights reply, the pitch factor and the
 * template dimensions a roof stands for. The Google calls and the signature
 * live in ./roof.server.ts.
 */

/** A roof measured from above (Google Solar API). `areaSqft` is the sloped roof surface, not the footprint. */
export type RoofMeasure = { areaSqft: number; pitchDeg: number; segments: number };

/**
 * What the browser sends with the lead: a measurement with the server's
 * signature (only trusted when it verifies), or the "How big is your home?"
 * band. Never prices.
 */
export type RoofLeadInput = { measure?: SignedRoofMeasure; band?: string };

/** A measurement with the server's signature (only the lead route can check it). */
export type SignedRoofMeasure = RoofMeasure & { exp: number; sig: string };

/**
 * The address step's roof lookup (POST /api/estimator/[slug]/address/details
 * with { roof: { lat, lng } }): the signed measurement and the Google
 * satellite photo URL (null without a Maps Static key), or why not.
 */
export type RoofLookup =
  | { ok: true; measure: SignedRoofMeasure; mapUrl: string | null }
  | { ok: false; reason: 'disabled' | 'not_found' | 'error' | 'invalid' | 'limit' | 'forbidden' };

/** Ask the server to measure the roof at the picked address. Never throws (any failure reads as 'error'). */
export async function fetchRoof(slug: string, lat: number, lng: number, fetcher: typeof fetch = fetch): Promise<RoofLookup> {
  try {
    const res = await fetcher(`/api/estimator/${encodeURIComponent(slug)}/address/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roof: { lat, lng } }),
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => null)) as RoofLookup | null;
    return data && typeof data === 'object' && 'ok' in data ? data : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** What the lead route prices: the verified measurement, else the band (default medium). */
export type PricedRoof = { source: 'measured'; measure: RoofMeasure } | { source: 'band'; band: HomeBand };

const SQFT_PER_M2 = 10.7639;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

type SolarStats = { areaMeters2?: number; groundAreaMeters2?: number };
type SolarSegment = { pitchDegrees?: number; stats?: SolarStats };
type SolarInsights = {
  center?: { latitude?: number; longitude?: number };
  imageryQuality?: string;
  solarPotential?: { wholeRoofStats?: SolarStats; roofSegmentStats?: SolarSegment[] };
};

/** Metres between two points (haversine; plenty for "is this the same house"). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** findClosest can return a neighbour's building: farther than this from the address, it is not their roof. */
export const MAX_BUILDING_DISTANCE_M = 40;

/**
 * A buildingInsights reply as a roof: whole-roof area in sq ft (rounded to
 * 10), the area-weighted pitch of its segments (1 decimal) and the segment
 * count, plus the building's centre. Null when the reply has no roof, the
 * building is too far from the address, or the area is outside
 * MEASURED_ROOF_SQFT.
 */
export function mapBuildingInsights(data: unknown, near?: { lat: number; lng: number }): { measure: RoofMeasure; center: { lat: number; lng: number } | null } | null {
  const b = (data ?? {}) as SolarInsights;
  const whole = b.solarPotential?.wholeRoofStats?.areaMeters2;
  if (!finite(whole) || whole <= 0) return null;
  const centerLat = b.center?.latitude;
  const centerLng = b.center?.longitude;
  const center = finite(centerLat) && finite(centerLng) ? { lat: centerLat, lng: centerLng } : null;
  if (near && center && distanceMeters(near, center) > MAX_BUILDING_DISTANCE_M) return null;
  const areaSqft = Math.round((whole * SQFT_PER_M2) / 10) * 10;
  if (areaSqft < MEASURED_ROOF_SQFT.min || areaSqft > MEASURED_ROOF_SQFT.max) return null;
  const segments = (b.solarPotential?.roofSegmentStats ?? []).filter(
    (s) => finite(s?.pitchDegrees) && s.pitchDegrees >= 0 && s.pitchDegrees <= 80 && finite(s.stats?.areaMeters2) && s.stats.areaMeters2 > 0,
  );
  const weight = segments.reduce((t, s) => t + s.stats!.areaMeters2!, 0);
  const pitchDeg = weight > 0 ? Math.round((segments.reduce((t, s) => t + s.pitchDegrees! * s.stats!.areaMeters2!, 0) / weight) * 10) / 10 : 22.6;
  return { measure: { areaSqft, pitchDeg, segments: Math.max(1, segments.length) }, center };
}

/** The labor factor for a pitch (PITCH_TIERS). */
export function pitchFactor(pitchDeg: number): number {
  const p = finite(pitchDeg) ? pitchDeg : 0;
  return (PITCH_TIERS.find((t) => p <= t.maxDeg) ?? PITCH_TIERS[PITCH_TIERS.length - 1]).factor;
}

/** A pitch in roofer's words: rise per 12 in of run, e.g. 26.6° -> "6/12". */
export function pitchRise(pitchDeg: number): string {
  const rise = Math.round(Math.tan((Math.max(0, Math.min(75, pitchDeg)) * Math.PI) / 180) * 12);
  return `${rise}/12`;
}

/** Plain words for the roof card, e.g. "low-slope", "walkable", "steep". */
export function pitchWords(pitchDeg: number): string {
  if (pitchDeg < LOW_SLOPE_DEG) return 'low-slope';
  return (PITCH_TIERS.find((t) => pitchDeg <= t.maxDeg) ?? PITCH_TIERS[PITCH_TIERS.length - 1]).label.replace(' pitch', '');
}

export const isHomeBand = (v: unknown): v is HomeBand => typeof v === 'string' && HOME_BANDS.some((b) => b.id === v);

/** Roof sq ft of a band. */
export const bandRoofSqft = (band: HomeBand): number => HOME_BANDS.find((b) => b.id === band)!.roofSqft;

/** The roof sq ft that is priced: roof x waste x pitch factor (a band assumes a walkable pitch). */
export function pricedRoofSqft(roof: PricedRoof): number {
  if (roof.source === 'band') return Math.round(bandRoofSqft(roof.band) * WASTE_FACTOR);
  return Math.round(roof.measure.areaSqft * WASTE_FACTOR * pitchFactor(roof.measure.pitchDeg));
}

/** The template dimensions that stand for a roof: priced sq ft = length x width (see ROOF_GEOMETRY_WIDTH_FT). */
export function roofDimensions(roof: PricedRoof): PoolDimensions {
  const sqft = pricedRoofSqft(roof);
  return { lengthFt: Math.round((sqft / ROOF_GEOMETRY_WIDTH_FT) * 100) / 100, widthFt: ROOF_GEOMETRY_WIDTH_FT };
}

/** The template preset (small / medium / large footprint) for each band: lengthFt x 50 = the band's priced sq ft. */
export function bandPreset(band: HomeBand): { lengthFt: number; widthFt: number } {
  return roofDimensions({ source: 'band', band }) as { lengthFt: number; widthFt: number };
}

/** The roof in one line for the lead and the price card, e.g. "About 2,410 sq ft of roof, 4 sections, 6/12 pitch (measured from above)". */
export function describeRoof(roof: PricedRoof): string {
  if (roof.source === 'band') {
    const band = HOME_BANDS.find((b) => b.id === roof.band)!;
    return `About ${bandRoofSqft(roof.band).toLocaleString('en-US')} sq ft of roof assumed (home ${band.title}; to be measured)`;
  }
  const m = roof.measure;
  const sections = `${m.segments} ${m.segments === 1 ? 'section' : 'sections'}`;
  const low = m.pitchDeg < LOW_SLOPE_DEG ? '; low-slope roof: material to confirm on site' : '';
  return `About ${m.areaSqft.toLocaleString('en-US')} sq ft of roof, ${sections}, ${pitchRise(m.pitchDeg)} pitch (measured from above${low})`;
}

/** What each material looks like, for the repaint prompt (matches the funnel's photos). */
const MATERIAL_LOOK: Record<string, string> = {
  asphalt: 'new architectural asphalt shingles (laminated, dimensional shingles with crisp straight courses)',
  tile: 'new concrete roof tile (rounded S-profile tiles in neat courses, with matching ridge caps)',
  metal: 'a new standing-seam metal roof (smooth flat metal panels with evenly spaced raised vertical seams)',
};

/**
 * "See it on your house": the edit prompt for the homeowner's own photo of
 * their home (kie.ai nano-banana-pro through the render route). Built on the
 * server from their picks (material and colour labels from the template),
 * never from browser text. Only the roof changes.
 */
export function roofRepaintPrompt(material: string, colourLabel: string): string {
  const look = MATERIAL_LOOK[material] ?? MATERIAL_LOOK.asphalt;
  return [
    `Replace ONLY the roof covering of the house in this photo with ${look} in the colour "${colourLabel}".`,
    'Keep everything else exactly as it is: the same house, walls, windows, doors, trim, gutters, chimney, vents, skylights, trees, cars, sky, framing and camera angle.',
    'The new roof follows the exact same roof shape, edges, ridges and valleys; realistic texture, shadows and daylight that match the photo.',
    'Photorealistic, true-to-life colours. No text, no watermark, no added people or objects.',
  ].join(' ');
}

/** The band to fall back to: a valid one, else medium. */
export const bandOrDefault = (v: unknown): HomeBand => (isHomeBand(v) ? v : DEFAULT_HOME_BAND);
