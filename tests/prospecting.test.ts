import { describe, it, expect } from 'vitest';
import {
  countyFor,
  distribute,
  humanizeTypes,
  isDuplicate,
  NICHES,
  planQueries,
  qualify,
  resolveNiche,
  TARGET_COUNTIES,
  type ExistingKeys,
  type SourcedBusiness,
} from '@/lib/prospecting/catalog';

// Synthetic listings only; 555-01xx numbers are reserved for fiction.
const listing = (over: Partial<SourcedBusiness> = {}): SourcedBusiness => ({
  externalSource: 'google_places',
  externalId: 'place-1',
  name: 'Test Pool Remodeling Co',
  phone: '(818) 555-0142',
  website: 'https://www.testpoolremodel.example',
  address: '1 Main St, Encino, CA 91316',
  city: 'Encino',
  adminArea2: 'Los Angeles County',
  zip: '91316',
  types: ['swimming_pool_contractor', 'general_contractor', 'point_of_interest'],
  primaryType: 'swimming_pool_contractor',
  rating: 4.7,
  reviewCount: 88,
  businessStatus: 'OPERATIONAL',
  mapsUrl: 'https://maps.google.com/?cid=1',
  ...over,
});
const pool = NICHES.find((n) => n.slug === 'pool')!;
const freshKeys = (): ExistingKeys => ({
  phones: new Set(),
  domains: new Set(),
  nameCity: new Set(),
  external: new Set(),
});

describe('resolveNiche', () => {
  it('returns the catalog niche for a known slug', () => {
    expect(resolveNiche('roofing')?.label).toBe('Roofing Contractors');
  });
  it('builds a custom niche from free text and rejects short input', () => {
    const n = resolveNiche('custom', 'solar installers');
    expect(n?.label).toBe('Solar Installers');
    expect(n?.queries[0]).toBe('solar installers contractor');
    expect(resolveNiche('custom', 'ab')).toBeNull();
  });
  it('keeps the phrase as-is when it already names a contractor', () => {
    expect(resolveNiche('custom', 'deck contractor')?.queries[0]).toBe('deck contractor');
  });
  it('returns null for an unknown slug', () => {
    expect(resolveNiche('nope')).toBeNull();
  });
});

describe('planQueries', () => {
  it('searches every county as a whole first, then sub-areas, LA before Ventura', () => {
    const plan = planQueries(pool);
    const countyWide = pool.queries.length * TARGET_COUNTIES.length;
    // County-wide first: "... in Los Angeles County, CA" with no sub-area before it.
    expect(plan.slice(0, countyWide).every((q) => / in (Los Angeles|Ventura) County, CA$/.test(q.text))).toBe(true);
    expect(plan.slice(countyWide).every((q) => /, (Los Angeles|Ventura) County, CA$/.test(q.text))).toBe(true);
    expect(plan[0].county).toBe('Los Angeles');
    expect(plan[0].text).toContain('Los Angeles County, CA');
    expect(plan.some((q) => q.county === 'Ventura')).toBe(true);
    expect(plan.length).toBeGreaterThan(countyWide);
  });
});

describe('countyFor', () => {
  it('maps provider county names to stored names and rejects others', () => {
    expect(countyFor('Los Angeles County')).toBe('Los Angeles');
    expect(countyFor('ventura county')).toBe('Ventura');
    expect(countyFor('Orange County')).toBeNull();
    expect(countyFor(null)).toBeNull();
  });
});

describe('qualify', () => {
  it('accepts an operational, phoned, in-county, on-niche listing', () => {
    const r = qualify(listing(), pool);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prospect.phone_e164).toBe('+18185550142');
      expect(r.prospect.website_domain).toBe('testpoolremodel.example');
      expect(r.prospect.county).toBe('Los Angeles');
      expect(r.prospect.niche).toBe('Pool Contractors');
      expect(r.prospect.external_id).toBe('place-1');
      expect(r.prospect.primary_services).toContain('Swimming pool contractor');
      expect(r.prospect.primary_services).not.toContain('Point of interest');
      expect(r.prospect.is_pool_cleaning_only).toBe(false);
    }
  });
  it('rejects closed businesses', () => {
    expect(qualify(listing({ businessStatus: 'CLOSED_PERMANENTLY' }), pool)).toEqual({ ok: false, reason: 'closed' });
  });
  it('rejects listings without a usable phone', () => {
    expect(qualify(listing({ phone: null }), pool)).toEqual({ ok: false, reason: 'no_phone' });
    expect(qualify(listing({ phone: '123' }), pool)).toEqual({ ok: false, reason: 'invalid_phone' });
  });
  it('rejects listings outside Los Angeles and Ventura', () => {
    expect(qualify(listing({ adminArea2: 'Orange County' }), pool)).toEqual({ ok: false, reason: 'outside_target_counties' });
  });
  it('rejects a listing that matches the niche neither by type nor by name', () => {
    const r = qualify(listing({ name: 'Sunny Day Care', types: ['child_care_agency'], primaryType: 'child_care_agency' }), pool);
    expect(r).toEqual({ ok: false, reason: 'niche_mismatch' });
  });
  it('accepts by name when the provider tags it generically', () => {
    const r = qualify(listing({ name: 'Blue Water Pool Resurfacing', types: ['establishment'], primaryType: null }), pool);
    expect(r.ok).toBe(true);
  });
  it('flags a pool listing that reads as cleaning-only, but still qualifies it', () => {
    const r = qualify(listing({ name: 'Sparkle Weekly Pool Cleaning', types: ['establishment'], primaryType: null }), pool);
    // Name matches "pool" so it qualifies; the flag warns the caller.
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.prospect.is_pool_cleaning_only).toBe(true);
  });
});

describe('isDuplicate', () => {
  const p = () => {
    const r = qualify(listing(), pool);
    if (!r.ok) throw new Error('fixture must qualify');
    return r.prospect;
  };
  it('matches on provider id, phone, domain or name+city already in history', () => {
    for (const seed of [
      (k: ExistingKeys) => k.external.add('google_places:place-1'),
      (k: ExistingKeys) => k.phones.add('+18185550142'),
      (k: ExistingKeys) => k.domains.add('testpoolremodel.example'),
      (k: ExistingKeys) => k.nameCity.add('test pool remodeling|encino'),
    ]) {
      const keys = freshKeys();
      seed(keys);
      expect(isDuplicate(p(), keys)).toBe(true);
    }
  });
  it('catches a second copy inside the same run', () => {
    const keys = freshKeys();
    expect(isDuplicate(p(), keys)).toBe(false);
    expect(isDuplicate(p(), keys)).toBe(true);
  });
  it('lets a genuinely new business through', () => {
    expect(isDuplicate(p(), freshKeys())).toBe(false);
  });
});

describe('distribute', () => {
  it('deals round-robin so both callers get an equal share and no company twice', () => {
    const items = Array.from({ length: 10 }, (_, i) => `co-${i}`);
    const out = distribute(items, ['liam', 'nadav'], 3);
    expect(out.get('liam')).toEqual(['co-0', 'co-2', 'co-4']);
    expect(out.get('nadav')).toEqual(['co-1', 'co-3', 'co-5']);
    const all = [...out.get('liam')!, ...out.get('nadav')!];
    expect(new Set(all).size).toBe(all.length);
  });
  it('gives one caller the first N', () => {
    expect(distribute(['a', 'b', 'c'], ['liam'], 2).get('liam')).toEqual(['a', 'b']);
  });
  it('handles fewer items than requested', () => {
    const out = distribute(['a'], ['liam', 'nadav'], 100);
    expect(out.get('liam')).toEqual(['a']);
    expect(out.get('nadav')).toEqual([]);
  });
});

describe('humanizeTypes', () => {
  it('drops generic tags and title-cases the rest', () => {
    expect(humanizeTypes(['roofing_contractor', 'point_of_interest', 'establishment'])).toEqual([
      'Roofing contractor',
    ]);
  });
});
