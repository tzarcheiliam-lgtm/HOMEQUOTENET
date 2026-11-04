/**
 * CSLB (California Contractors State License Board) license lists → prospects.
 *
 * The free "List by Classification and County" export on the CSLB Data Portal
 * (https://www.cslb.ca.gov/OnlineServices/DataPortal/ListByCounty) lists
 * every active licensee in the chosen trades and counties, with phone,
 * address, license classes and workers' comp status. That is a far bigger
 * pool than Google Maps' top results, and the license number is a stable id,
 * so the same license is never added twice.
 *
 * Pure: no I/O. The dialog runs `licensesFromTable` in the browser to shrink
 * the upload; the server re-runs `qualifyCslb` on everything it receives.
 */
import { isPlausibleUsPhone, looksPoolCleaningOnly, toE164 } from '@/lib/calls/import';
import {
  countyForName,
  type Disqualification,
  type Niche,
  type QualifiedProspect,
} from './catalog';

export const CSLB_SOURCE = 'cslb';
export const CSLB_PORTAL_URL = 'https://www.cslb.ca.gov/OnlineServices/DataPortal/ListByCounty';

export function cslbLicenseUrl(licenseNumber: string): string {
  return `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(licenseNumber)}`;
}

/** The license classes that make a licensee fit each catalog niche. */
export const NICHE_CSLB_CLASSES: Record<string, string[]> = {
  pool: ['C-53'],
  general: ['B', 'B-2'],
  roofing: ['C-39'],
  fencing: ['C-13'],
  hvac: ['C-20'],
  plumbing: ['C-36'],
  electrical: ['C-10'],
  landscaping: ['C-27'],
  painting: ['C-33'],
  kitchen_bath: ['B', 'B-2'],
};

/** Classes for a niche; empty (= any class) for a custom niche. */
export function cslbClassesFor(niche: Niche): string[] {
  return NICHE_CSLB_CLASSES[niche.slug] ?? [];
}

const CLASS_LABELS: Record<string, string> = {
  A: 'General engineering',
  B: 'General building',
  'B-2': 'Residential remodeling',
  'C-2': 'Insulation',
  'C-4': 'Boiler & steam fitting',
  'C-5': 'Framing & carpentry',
  'C-6': 'Cabinets & millwork',
  'C-7': 'Low voltage',
  'C-8': 'Concrete',
  'C-9': 'Drywall',
  'C-10': 'Electrical',
  'C-12': 'Earthwork & paving',
  'C-13': 'Fencing',
  'C-15': 'Flooring',
  'C-16': 'Fire protection',
  'C-17': 'Glazing',
  'C-20': 'HVAC',
  'C-21': 'Moving & demolition',
  'C-23': 'Ornamental metal',
  'C-27': 'Landscaping',
  'C-28': 'Locks & security',
  'C-29': 'Masonry',
  'C-33': 'Painting',
  'C-35': 'Lathing & plastering',
  'C-36': 'Plumbing',
  'C-38': 'Refrigeration',
  'C-39': 'Roofing',
  'C-42': 'Sanitation systems',
  'C-43': 'Sheet metal',
  'C-46': 'Solar',
  'C-49': 'Tree & palm',
  'C-51': 'Structural steel',
  'C-53': 'Swimming pool',
  'C-54': 'Tile',
  'C-55': 'Water conditioning',
  'C-57': 'Well drilling',
  'C-60': 'Welding',
  'D-6': 'Concrete-related services',
  'D-12': 'Synthetic products',
  'D-28': 'Doors & gates',
  'D-35': 'Pool & spa maintenance',
  'D-41': 'Siding & decking',
  'D-49': 'Tree service',
  'D-52': 'Window coverings',
  'D-64': 'Non-specialized',
  'D-65': 'Weatherization',
};

/** "C53" / " C-53 " / "c-53" → "C-53"; "B2" → "B-2"; "B" stays "B". */
export function normalizeClass(raw: string): string {
  const s = raw.toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z])-?(\d+)$/.exec(s);
  return m ? `${m[1]}-${Number(m[2])}` : s;
}

/** " C-8 | C53" → ["C-8", "C-53"]; "C-61/D-35" → ["C-61", "D-35"]. */
export function parseClasses(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  for (const part of raw.split(/[|,;/]+/)) {
    const c = normalizeClass(part);
    if (c) out.add(c);
  }
  return [...out];
}

export function classLabel(code: string): string {
  const name = CLASS_LABELS[code];
  return name ? `${name} (${code})` : `CSLB ${code}`;
}

/* ---- Rows ------------------------------------------------------------------ */

/** The fields kept from one export row; also the upload format. */
export interface CslbLicense {
  licenseNumber: string;
  businessName: string;
  businessType: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  county: string | null;
  phone: string | null;
  classes: string[];
  status: string | null;
  workersComp: 'insured' | 'exempt' | 'unknown';
}

const HEADERS = {
  licenseNumber: ['licensenumber', 'licenseno', 'license', 'licnum'],
  businessName: ['businessname', 'name'],
  businessType: ['businesstype'],
  address: ['address', 'streetaddress'],
  city: ['city'],
  zip: ['zipcode', 'zip'],
  county: ['county'],
  phone: ['phonenumber', 'phone', 'businessphone'],
  classes: ['classifications', 'classification', 'classes'],
  status: ['status', 'primarystatus'],
  workersComp: ['workerscompcoveragetype', 'workerscomp'],
} as const;
type Field = keyof typeof HEADERS;
const REQUIRED: Field[] = ['licenseNumber', 'businessName', 'phone', 'classes'];

const headerKey = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Finds the header row (within the first few rows) and maps every data row.
 * `missing` names required columns that were not found, so the dialog can say
 * "this isn't a CSLB list" instead of importing nothing silently.
 */
export function licensesFromTable(table: string[][]): { licenses: CslbLicense[]; missing: string[] } {
  let headerRow = -1;
  let cols: Partial<Record<Field, number>> = {};
  for (let r = 0; r < Math.min(table.length, 10); r++) {
    const keys = table[r].map(headerKey);
    const found: Partial<Record<Field, number>> = {};
    for (const f of Object.keys(HEADERS) as Field[]) {
      const idx = keys.findIndex((k) => (HEADERS[f] as readonly string[]).includes(k));
      if (idx >= 0) found[f] = idx;
    }
    if (REQUIRED.every((f) => found[f] !== undefined)) {
      headerRow = r;
      cols = found;
      break;
    }
    if (Object.keys(found).length > Object.keys(cols).length) cols = found;
  }
  if (headerRow < 0) {
    return { licenses: [], missing: REQUIRED.filter((f) => cols[f] === undefined).map(String) };
  }

  const get = (row: string[], f: Field): string | null => {
    const i = cols[f];
    if (i === undefined) return null;
    const v = (row[i] ?? '').trim();
    return v === '' ? null : v;
  };

  const licenses: CslbLicense[] = [];
  for (const row of table.slice(headerRow + 1)) {
    const licenseNumber = get(row, 'licenseNumber')?.replace(/\.0+$/, '') ?? null;
    const businessName = get(row, 'businessName');
    if (!licenseNumber || !businessName) continue;
    const wc = (get(row, 'workersComp') ?? '').toLowerCase();
    licenses.push({
      licenseNumber,
      businessName,
      businessType: get(row, 'businessType'),
      address: get(row, 'address'),
      city: get(row, 'city'),
      zip: get(row, 'zip'),
      county: get(row, 'county'),
      phone: get(row, 'phone'),
      classes: parseClasses(get(row, 'classes')),
      status: get(row, 'status'),
      workersComp: wc.includes('exempt') ? 'exempt' : wc.includes('insurance') || wc.includes('self') ? 'insured' : 'unknown',
    });
  }
  return { licenses, missing: [] };
}

/* ---- Qualify --------------------------------------------------------------- */

const KEEP_UPPER = new Set(['LLC', 'LP', 'LLP', 'DBA', 'USA', 'HVAC', 'II', 'III', 'IV', 'CA', 'PO', 'NE', 'NW', 'SE', 'SW']);

/** "SUTTON POOLS & HARDSCAPE INC" → "Sutton Pools & Hardscape Inc"; leaves mixed case alone. */
export function titleCase(s: string): string {
  if (/[a-z]/.test(s)) return s.trim();
  return s
    .trim()
    .toLowerCase()
    .replace(/[a-z0-9']+/g, (w) => {
      const up = w.toUpperCase();
      if (KEEP_UPPER.has(up) || w.length === 1) return up;
      return w[0].toUpperCase() + w.slice(1);
    });
}

/** "(805) 338 4144" → "(805) 338-4144". */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw.trim();
}

/**
 * The same verdict shape as the Google qualify(): strict on what a caller
 * cannot work around (inactive license, no number, outside the market), and
 * a licensee must hold one of the niche's classes.
 */
export function qualifyCslb(
  lic: CslbLicense,
  niche: Niche
): { ok: true; prospect: QualifiedProspect } | { ok: false; reason: Disqualification } {
  const status = (lic.status ?? '').trim();
  if (status && !/clear|active/i.test(status)) return { ok: false, reason: 'license_inactive' };
  if (!lic.phone) return { ok: false, reason: 'no_phone' };
  if (!isPlausibleUsPhone(lic.phone)) return { ok: false, reason: 'invalid_phone' };
  const county = countyForName(lic.county);
  if (!county) return { ok: false, reason: 'outside_target_counties' };
  const wanted = cslbClassesFor(niche);
  if (wanted.length > 0 && !lic.classes.some((c) => wanted.includes(c))) {
    return { ok: false, reason: 'niche_mismatch' };
  }

  // The niche's own classes first, so "Swimming pool" leads on a pool list.
  const ordered = [...lic.classes].sort(
    (a, b) => Number(!wanted.includes(a)) - Number(!wanted.includes(b))
  );
  const services = ordered.map(classLabel);
  const name = titleCase(lic.businessName);
  const phone = formatPhone(lic.phone);
  const flags = [lic.workersComp === 'insured' ? 'workers_comp' : lic.workersComp === 'exempt' ? 'workers_comp_exempt' : null]
    .filter((f): f is string => !!f);

  return {
    ok: true,
    prospect: {
      company_name: name,
      phone,
      phone_e164: toE164(phone)!,
      website: null,
      website_domain: null,
      address: lic.address ? titleCase(lic.address) : null,
      city: lic.city ? titleCase(lic.city) : null,
      county,
      zip: lic.zip ? lic.zip.slice(0, 5) : null,
      primary_services: services,
      category: `CSLB license #${lic.licenseNumber}`,
      niche: niche.label,
      rating: null,
      review_count: null,
      business_status: null,
      maps_url: null,
      external_source: CSLB_SOURCE,
      external_id: lic.licenseNumber,
      is_pool_cleaning_only:
        niche.slug === 'pool' &&
        ((lic.classes.includes('D-35') && !lic.classes.includes('C-53')) ||
          looksPoolCleaningOnly(services, null, name)),
      flags,
    },
  };
}

/**
 * Who to hand out first: licensees carrying workers' comp (they have a crew,
 * so they can take on more jobs), then the rest, otherwise in file order.
 */
export function rankLicenses(licenses: CslbLicense[]): CslbLicense[] {
  const rank = (l: CslbLicense) => (l.workersComp === 'insured' ? 0 : l.workersComp === 'unknown' ? 1 : 2);
  return licenses
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map(({ l }) => l);
}
