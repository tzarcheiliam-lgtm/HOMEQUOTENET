import { describe, it, expect } from 'vitest';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { NICHES, resolveNiche } from '@/lib/prospecting/catalog';
import {
  cslbClassesFor,
  formatPhone,
  licensesFromTable,
  parseClasses,
  qualifyCslb,
  rankLicenses,
  titleCase,
  type CslbLicense,
} from '@/lib/prospecting/cslb';
import { parseCsv, readSpreadsheet, SpreadsheetError } from '@/lib/prospecting/spreadsheet';
import {
  childCells,
  COUNTY_GRID,
  frontier,
  MAX_DEPTH,
  outcomeFor,
  rootCells,
  STALE_DAYS,
  type CellState,
} from '@/lib/prospecting/grid';

const inflate = async (d: Uint8Array) => new Uint8Array(inflateRawSync(d));
const pool = NICHES.find((n) => n.slug === 'pool')!;

/* ---- A tiny .xlsx writer, so the reader is tested on real zip bytes ---------- */

function zip(files: { name: string; text: string; deflate: boolean }[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const raw = enc.encode(f.text);
    const data = f.deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const method = f.deflate ? 8 : 0;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(8, method, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, raw.length, true);
    lh.setUint16(26, name.length, true);
    locals.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(10, method, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, raw.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    centrals.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, files.length, true);
  eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, new Uint8Array(eocd.buffer)];
  const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
  let p = 0;
  for (const b of parts) {
    out.set(b, p);
    p += b.length;
  }
  return out;
}

// Shaped like the CSLB export: "x:" namespace prefixes, shared strings, a numeric license cell.
// Synthetic businesses only; 555-01xx numbers are reserved for fiction.
const SST = `<?xml version="1.0"?><x:sst xmlns:x="s"><x:si><x:t>LicenseNumber</x:t></x:si><x:si><x:t>BusinessName</x:t></x:si><x:si><x:t>City</x:t></x:si><x:si><x:t>County</x:t></x:si><x:si><x:t>PhoneNumber</x:t></x:si><x:si><x:t>Classification(s)</x:t></x:si><x:si><x:t>Status</x:t></x:si><x:si><x:t>WorkersCompCoverageType</x:t></x:si><x:si><x:t>TEST POOLS &amp; SPAS INC</x:t></x:si><x:si><x:t>THOUSAND OAKS</x:t></x:si><x:si><x:t>Ventura</x:t></x:si><x:si><x:t>(805) 555 0142</x:t></x:si><x:si><x:t> C-8 | C53</x:t></x:si><x:si><x:t> CLEAR</x:t></x:si><x:si><x:r><x:t>Workers' Compensation </x:t></x:r><x:r><x:t>Insurance</x:t></x:r></x:si></x:sst>`;
const row = (r: number, cells: string[]) =>
  `<x:row r="${r}">${cells.join('')}</x:row>`;
const s = (ref: string, i: number) => `<x:c r="${ref}" t="s"><x:v>${i}</x:v></x:c>`;
const SHEET = `<?xml version="1.0"?><x:worksheet xmlns:x="s"><x:sheetData>${row(1, [
  s('A1', 0), s('B1', 1), s('C1', 2), s('D1', 3), s('E1', 4), s('F1', 5), s('G1', 6), s('H1', 7),
])}${row(2, [
  '<x:c r="A2" t="n"><x:v>900001</x:v></x:c>', s('B2', 8), s('C2', 9), s('D2', 10), s('E2', 11), s('F2', 12), s('G2', 13), s('H2', 14),
])}<x:row r="3"/></x:sheetData></x:worksheet>`;

describe('readSpreadsheet', () => {
  for (const deflate of [true, false]) {
    it(`reads the first sheet of an .xlsx (${deflate ? 'deflated' : 'stored'})`, async () => {
      const bytes = zip([
        { name: 'xl/sharedStrings.xml', text: SST, deflate },
        { name: 'xl/worksheets/sheet.xml', text: SHEET, deflate },
      ]);
      const rows = await readSpreadsheet(bytes, inflate);
      expect(rows).toHaveLength(2); // the empty row 3 is dropped
      expect(rows[0][0]).toBe('LicenseNumber');
      expect(rows[1][0]).toBe('900001');
      expect(rows[1][1]).toBe('TEST POOLS & SPAS INC'); // entity decoded
      expect(rows[1][7]).toBe("Workers' Compensation Insurance"); // rich-text runs joined
    });
  }

  it('places cells by column letter when some are missing', async () => {
    const sheet = `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c><c r="C1" t="str"><v>c</v></c></row></sheetData></worksheet>`;
    const rows = await readSpreadsheet(zip([{ name: 'xl/worksheets/sheet1.xml', text: sheet, deflate: true }]), inflate);
    expect(rows).toEqual([['a', '', 'c']]);
  });

  it('refuses legacy .xls with a clear message', async () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]);
    await expect(readSpreadsheet(xls, inflate)).rejects.toBeInstanceOf(SpreadsheetError);
  });

  it('falls back to CSV, with quotes, commas and tabs', async () => {
    const bytes = new TextEncoder().encode('﻿a,"b, c","say ""hi"""\r\n1,2,3\n');
    expect(await readSpreadsheet(bytes, inflate)).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

/* ---- CSLB ----------------------------------------------------------------------- */

const license = (over: Partial<CslbLicense> = {}): CslbLicense => ({
  licenseNumber: '900001',
  businessName: 'TEST POOLS & SPAS INC',
  businessType: 'Corporation',
  address: '1 MAIN ST',
  city: 'THOUSAND OAKS',
  zip: '91360-1234',
  county: 'Ventura',
  phone: '(805) 555 0142',
  classes: ['C-8', 'C-53'],
  status: 'CLEAR',
  workersComp: 'insured',
  ...over,
});

describe('CSLB parsing', () => {
  it('normalizes classification lists', () => {
    expect(parseClasses(' C-8 | C53')).toEqual(['C-8', 'C-53']);
    expect(parseClasses('B | B2 | C-61/D-35')).toEqual(['B', 'B-2', 'C-61', 'D-35']);
    expect(parseClasses(null)).toEqual([]);
  });

  it('maps an export table, finding the header row and the columns by name', () => {
    const { licenses, missing } = licensesFromTable([
      ['CSLB export'],
      ['LicenseNumber', 'BusinessName', 'City', 'County', 'PhoneNumber', 'Classification(s)', 'Status', 'WorkersCompCoverageType'],
      ['900001', 'TEST POOLS & SPAS INC', 'THOUSAND OAKS', 'Ventura', '(805) 555 0142', ' C-8 | C53', ' CLEAR', 'Exempt'],
      ['', 'NO LICENSE NUMBER', '', '', '', '', '', ''],
    ]);
    expect(missing).toEqual([]);
    expect(licenses).toHaveLength(1);
    expect(licenses[0]).toMatchObject({ licenseNumber: '900001', classes: ['C-8', 'C-53'], status: 'CLEAR', workersComp: 'exempt' });
  });

  it('names the missing columns when the file is not a CSLB list', () => {
    const { licenses, missing } = licensesFromTable([['company_name', 'phone']]);
    expect(licenses).toEqual([]);
    expect(missing).toEqual(expect.arrayContaining(['licenseNumber', 'classes']));
  });

  it('title-cases shouting names but keeps LLC and single letters', () => {
    expect(titleCase('SUNNY POOLS & HARDSCAPE LLC')).toBe('Sunny Pools & Hardscape LLC');
    expect(titleCase('P O BOX 12')).toBe('P O Box 12');
    expect(titleCase('Already Mixed Case')).toBe('Already Mixed Case');
    expect(formatPhone('(805) 555 0142')).toBe('(805) 555-0142');
  });
});

describe('qualifyCslb', () => {
  it('turns an active, phoned, in-market pool licensee into a prospect', () => {
    const r = qualifyCslb(license(), pool);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prospect).toMatchObject({
      company_name: 'Test Pools & Spas Inc',
      phone: '(805) 555-0142',
      phone_e164: '+18055550142',
      city: 'Thousand Oaks',
      county: 'Ventura',
      zip: '91360',
      niche: 'Pool Contractors',
      external_source: 'cslb',
      external_id: '900001',
      category: 'CSLB license #900001',
      flags: ['workers_comp'],
      is_pool_cleaning_only: false,
    });
    expect(r.prospect.primary_services[0]).toBe('Swimming pool (C-53)'); // the niche's class first
  });

  it('rejects inactive licenses, missing phones and other counties', () => {
    expect(qualifyCslb(license({ status: 'EXPIRED' }), pool)).toEqual({ ok: false, reason: 'license_inactive' });
    expect(qualifyCslb(license({ phone: null }), pool)).toEqual({ ok: false, reason: 'no_phone' });
    expect(qualifyCslb(license({ phone: '000' }), pool)).toEqual({ ok: false, reason: 'invalid_phone' });
    expect(qualifyCslb(license({ county: 'Orange' }), pool)).toEqual({ ok: false, reason: 'outside_target_counties' });
  });

  it('requires one of the niche classes; a custom niche takes any', () => {
    expect(qualifyCslb(license({ classes: ['D-35'] }), pool)).toEqual({ ok: false, reason: 'niche_mismatch' });
    const roofing = NICHES.find((n) => n.slug === 'roofing')!;
    expect(cslbClassesFor(roofing)).toEqual(['C-39']);
    expect(qualifyCslb(license(), roofing).ok).toBe(false);
    expect(qualifyCslb(license(), resolveNiche('custom', 'solar installers')!).ok).toBe(true);
  });

  it('every catalog niche has license classes', () => {
    for (const n of NICHES) expect(cslbClassesFor(n).length).toBeGreaterThan(0);
  });

  it('hands out licensees with workers comp first, otherwise file order', () => {
    const ranked = rankLicenses([
      license({ licenseNumber: '1', workersComp: 'exempt' }),
      license({ licenseNumber: '2', workersComp: 'insured' }),
      license({ licenseNumber: '3', workersComp: 'unknown' }),
      license({ licenseNumber: '4', workersComp: 'insured' }),
    ]);
    expect(ranked.map((l) => l.licenseNumber)).toEqual(['2', '4', '3', '1']);
  });
});

/* ---- Map grid ------------------------------------------------------------------- */

describe('map grid', () => {
  it('covers each county box with root squares and no gaps', () => {
    const roots = rootCells();
    for (const c of COUNTY_GRID) {
      const mine = roots.filter((r) => r.county === c.name);
      const area = mine.reduce((n, r) => n + (r.bounds.north - r.bounds.south) * (r.bounds.east - r.bounds.west), 0);
      const box = (c.bounds.north - c.bounds.south) * (c.bounds.east - c.bounds.west);
      expect(area).toBeCloseTo(box, 6);
      expect(new Set(mine.map((r) => r.key)).size).toBe(mine.length);
    }
  });

  it('splits a square into four quadrants that tile it', () => {
    const [root] = rootCells();
    const kids = childCells(root);
    expect(kids.map((k) => k.key)).toEqual([0, 1, 2, 3].map((q) => `${root.key}/${q}`));
    expect(kids.every((k) => k.depth === 1 && k.county === root.county)).toBe(true);
    expect(kids[0].bounds.south).toBe(root.bounds.south);
    expect(kids[3].bounds.north).toBe(root.bounds.north);
    expect(kids[0].bounds.north).toBe(kids[2].bounds.south);
  });

  it('starts from every root, then skips done squares and descends into split ones', () => {
    const roots = rootCells();
    expect(frontier(new Map()).map((c) => c.key)).toEqual(roots.map((r) => r.key));

    const now = new Date('2026-11-04T00:00:00Z');
    const fresh = now.toISOString();
    const state = new Map<string, CellState>([
      [roots[0].key, { status: 'split', searchedAt: fresh }],
      [`${roots[0].key}/0`, { status: 'done', searchedAt: fresh }],
      [roots[1].key, { status: 'done', searchedAt: fresh }],
      [roots[2].key, { status: 'done', searchedAt: new Date(now.getTime() - (STALE_DAYS + 1) * 86_400_000).toISOString() }],
    ]);
    const keys = frontier(state, { now }).map((c) => c.key);
    expect(keys).not.toContain(roots[0].key);
    expect(keys).not.toContain(roots[1].key);
    expect(keys).toContain(roots[2].key); // stale: searched again
    expect(keys).not.toContain(`${roots[0].key}/0`);
    expect(keys).toEqual(expect.arrayContaining([1, 2, 3].map((q) => `${roots[0].key}/${q}`)));
  });

  it('splits only a full square above the depth limit', () => {
    const [root] = rootCells();
    expect(outcomeFor(root, 60)).toBe('split');
    expect(outcomeFor(root, 59)).toBe('done');
    expect(outcomeFor({ ...root, depth: MAX_DEPTH }, 60)).toBe('done');
  });
});
