import type { AddressPlace } from '@/lib/estimator/address-client';
import type { EstimatorLeadRequest } from '@/lib/estimator/lead-client';
import { DEFAULT_HOME_BAND, type HomeBand } from '@/lib/estimator/roofing/pricing-config';
import { isHomeBand, type SignedRoofMeasure } from '@/lib/estimator/roofing/roof';

/*
 * Pure state of the roofing funnel's address screen (no React): what it found,
 * kept in sessionStorage so the steps, the contact step (the lead's roof) and
 * a refresh all see it. Every access is guarded (private mode, blocked storage).
 */

export type RoofState = {
  v: 1;
  /** The address as the field shows it, and the picked Google place (with coordinates). */
  address: string;
  place: AddressPlace | null;
  /** 'found': Google measured the roof (signed). 'band': the home-size band is priced instead. */
  status: 'found' | 'band';
  measure?: SignedRoofMeasure;
  /** Google's unmodified satellite photo (Maps Static API), when the server has a Maps Static key. */
  mapUrl?: string | null;
  band: HomeBand;
};

export const roofKey = (slug: string) => `hq-funnel-roof:${slug}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function session(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function readMeasure(v: unknown): SignedRoofMeasure | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const m = v as Record<string, unknown>;
  if (![m.areaSqft, m.pitchDeg, m.segments, m.exp].every(num) || typeof m.sig !== 'string' || m.sig.length > 64) return undefined;
  return { areaSqft: m.areaSqft as number, pitchDeg: m.pitchDeg as number, segments: m.segments as number, exp: m.exp as number, sig: m.sig };
}

/** Only Google's own Static Maps URLs are shown (never another host from storage). */
const safeMapUrl = (v: unknown) => (typeof v === 'string' && v.startsWith('https://maps.googleapis.com/maps/api/staticmap?') && v.length < 2000 ? v : null);

/** The stored roof, or null. Never throws. */
export function readRoofState(slug: string, storage: StorageLike | null = session()): RoofState | null {
  try {
    const raw = storage?.getItem(roofKey(slug));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || o.v !== 1 || typeof o.address !== 'string') return null;
    const measure = readMeasure(o.measure);
    const status = o.status === 'found' && measure ? 'found' : 'band';
    const place = o.place && typeof o.place === 'object' ? (o.place as AddressPlace) : null;
    return {
      v: 1,
      address: o.address.slice(0, 300),
      place: place && typeof place.address === 'string' ? place : null,
      status,
      ...(status === 'found' ? { measure, mapUrl: safeMapUrl(o.mapUrl) } : {}),
      band: isHomeBand(o.band) ? o.band : DEFAULT_HOME_BAND,
    };
  } catch {
    return null;
  }
}

export function writeRoofState(slug: string, state: RoofState | null, storage: StorageLike | null = session()): void {
  try {
    if (state) storage?.setItem(roofKey(slug), JSON.stringify(state));
    else storage?.removeItem(roofKey(slug));
  } catch {
    /* storage full or blocked: the band default is priced */
  }
}

/**
 * What the lead request carries: the signed measurement, else the band. With
 * `address` (the contact step's), a measurement of a different address is not
 * sent: that roof is sized from the band instead.
 */
export function roofLeadInput(state: RoofState | null, address?: string): EstimatorLeadRequest['roof'] {
  if (!state) return { band: DEFAULT_HOME_BAND };
  const same = address === undefined || address.trim() === state.address.trim();
  return state.status === 'found' && state.measure && same ? { measure: state.measure } : { band: state.band };
}

/** "About 2,410 sq ft · 4 sections · 6/12 pitch" for the found-roof card. */
export function roofFacts(m: { areaSqft: number; segments: number }, pitch: string): string {
  return `About ${m.areaSqft.toLocaleString('en-US')} sq ft · ${m.segments} ${m.segments === 1 ? 'section' : 'sections'} · ${pitch} pitch`;
}
