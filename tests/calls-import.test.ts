import { describe, it, expect } from 'vitest';
import {
  buildReport,
  dedupe,
  isPlausibleUsPhone,
  looksPoolCleaningOnly,
  normalizeCompanyName,
  normalizeRow,
  toE164,
  toWebsiteDomain,
} from '@/lib/calls/import';

// Synthetic companies only. 555-01xx numbers are reserved for fiction.

describe('toE164 / isPlausibleUsPhone', () => {
  it('formats 10 and 11 digit US numbers', () => {
    expect(toE164('(818) 555-0142')).toBe('+18185550142');
    expect(toE164('1 818 555 0142')).toBe('+18185550142');
  });
  it('flags implausible numbers', () => {
    expect(isPlausibleUsPhone('0000000000')).toBe(false);
    expect(isPlausibleUsPhone('123')).toBe(false);
    expect(isPlausibleUsPhone('(018) 555-0142')).toBe(false); // area code cannot start with 0
    expect(isPlausibleUsPhone('(818) 555-0142')).toBe(true);
  });
});

describe('toWebsiteDomain', () => {
  it('strips scheme, www, path, query and port', () => {
    expect(toWebsiteDomain('https://www.Example-Pools.com/about?x=1#top')).toBe('example-pools.com');
    expect(toWebsiteDomain('example-pools.com:443/contact')).toBe('example-pools.com');
    expect(toWebsiteDomain('   ')).toBeNull();
  });
});

describe('normalizeCompanyName', () => {
  it('ignores case, punctuation and corporate suffixes', () => {
    expect(normalizeCompanyName('Blue Lagoon Pools, Inc.')).toBe('blue lagoon pools');
    expect(normalizeCompanyName('BLUE LAGOON POOLS LLC')).toBe('blue lagoon pools');
    expect(normalizeCompanyName('The Blue Lagoon Pool Co')).toBe('blue lagoon pool');
  });
});

describe('looksPoolCleaningOnly', () => {
  it('flags cleaning/maintenance with no remodel signal', () => {
    expect(looksPoolCleaningOnly(['Weekly cleaning', 'Chemical balancing'], null, 'Sparkle Pool Service')).toBe(true);
  });
  it('does not flag when any remodel term appears', () => {
    expect(looksPoolCleaningOnly(['Pool cleaning', 'Pool resurfacing'], null, 'Sparkle Pools')).toBe(false);
    expect(looksPoolCleaningOnly(['Maintenance'], 'pool_remodeler', 'Sparkle')).toBe(false);
  });
  it('does not flag when there is nothing to go on', () => {
    expect(looksPoolCleaningOnly([], null, '')).toBe(false);
  });
});

describe('normalizeRow', () => {
  it('drops rows without a company name', () => {
    expect(normalizeRow({ phone: '8185550142' })).toBeNull();
  });
  it('splits services, clamps rating, flags phone problems', () => {
    const n = normalizeRow({
      company_name: '  Test Pools  ',
      phone: '123',
      primary_services: 'Resurfacing; Tile & coping, Equipment',
      rating: '7.3',
      review_count: '12 reviews',
      assigned_to: 'Liam',
    })!;
    expect(n.company_name).toBe('Test Pools');
    expect(n.primary_services).toEqual(['Resurfacing', 'Tile & coping', 'Equipment']);
    expect(n.rating).toBe(5);
    expect(n.review_count).toBe(12);
    expect(n.flags).toContain('invalid_phone');
    expect(n.phone_e164).toBeNull();
    expect(n.assigned_key).toBe('liam');
    expect(n.state).toBe('CA');
  });
  it('flags a missing phone', () => {
    expect(normalizeRow({ company_name: 'No Phone Pools' })!.flags).toContain('missing_phone');
  });
});

describe('dedupe', () => {
  const rows = [
    { company_name: 'Alpha Pools', phone: '(818) 555-0101', website: 'alphapools.example', city: 'Encino' },
    { company_name: 'Alpha Pools Inc', phone: '818-555-0101', website: null, city: 'Encino' }, // same phone
    { company_name: 'Alpha Pool Company', phone: '(818) 555-0102', website: 'https://www.alphapools.example/', city: 'Tarzana' }, // same domain
    { company_name: 'ALPHA POOLS, LLC', phone: null, website: null, city: 'Encino' }, // same name+city
    { company_name: 'Beta Pools', phone: '(805) 555-0103', website: 'betapools.example', city: 'Ventura' },
  ].map((r) => normalizeRow(r)!);

  it('keeps the first occurrence and reports why later rows were dropped', () => {
    const { kept, duplicates } = dedupe(rows);
    expect(kept.map((k) => k.company_name)).toEqual(['Alpha Pools', 'Beta Pools']);
    expect(duplicates.map((d) => d.matchedOn)).toEqual(['phone', 'domain', 'name+city']);
    expect(duplicates.every((d) => d.keptIndex === 0)).toBe(true);
  });
  it('keeps rows that share nothing identifying', () => {
    const { kept } = dedupe(
      [
        { company_name: 'Gamma Pools', city: null },
        { company_name: 'Gamma Pools', city: null },
      ].map((r) => normalizeRow(r)!)
    );
    // No phone, no domain, no city → nothing to match on; both are kept for a human to judge.
    expect(kept).toHaveLength(2);
  });
});

describe('buildReport', () => {
  it('produces the counts the operator needs before writing anything', () => {
    const { report, kept } = buildReport([
      { company_name: 'Alpha Pools', phone: '(818) 555-0101', website: 'alphapools.example', city: 'Encino', assigned_to: 'Liam' },
      { company_name: 'Alpha Pools', phone: '(818) 555-0101', city: 'Encino', assigned_to: 'Liam' },
      { company_name: 'Sparkle Cleaning', phone: '(818) 555-0104', primary_services: 'Weekly cleaning', assigned_to: 'Nadav' },
      { company_name: 'No Phone Pools', assigned_to: 'Nadav' },
      { company_name: 'Bad Phone Pools', phone: '0000000000' },
      { phone: '8185550199' },
    ]);
    expect(report.sourceRows).toBe(6);
    expect(report.unusable).toBe(1);
    expect(report.kept).toBe(4);
    expect(report.duplicates).toBe(1);
    expect(report.duplicatesBy.phone).toBe(1);
    expect(report.missingPhone).toBe(1);
    expect(report.invalidPhone).toBe(1);
    expect(report.poolCleaningOnly).toBe(1);
    expect(report.byAssignee).toEqual({ liam: 1, nadav: 2 });
    expect(report.unassigned).toBe(1);
    expect(kept).toHaveLength(4);
  });
});
