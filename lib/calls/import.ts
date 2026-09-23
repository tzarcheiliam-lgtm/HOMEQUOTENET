/**
 * Pure import logic for prospect lists: normalize, classify, dedupe, report.
 * No I/O. The CLI in scripts/import-prospects.mjs and the tests both use this,
 * so what the report says is exactly what would be written.
 */

export interface RawProspectRow {
  company_name?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  service_area?: string | null;
  primary_services?: string | string[] | null;
  category?: string | null;
  rating?: string | number | null;
  review_count?: string | number | null;
  /** Free-text caller name / handle from the source list ("Liam", "Nadav"). */
  assigned_to?: string | null;
  notes?: string | null;
}

export interface NormalizedProspect {
  company_name: string;
  phone: string | null;
  phone_e164: string | null;
  website: string | null;
  website_domain: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  state: string;
  service_area: string | null;
  primary_services: string[];
  category: string | null;
  rating: number | null;
  review_count: number | null;
  assigned_key: string | null; // lower-cased caller handle from the source
  is_pool_cleaning_only: boolean;
  flags: string[];
  notes: string | null;
}

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Mirrors public.to_e164 in 0005 so JS and SQL agree on identity. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d === '') return null;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return `+${d}`;
}

/** A US number is 10 digits (or 11 with a leading 1) and not an obvious filler. */
export function isPlausibleUsPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(ten)) return false; // 0000000000, 1111111111 …
  if (ten.startsWith('0') || ten.startsWith('1')) return false; // no US area code
  if (ten.slice(3, 6) === '555' && ten.slice(6) === '0100') return false; // reserved fiction block
  return true;
}

/** Mirrors public.to_website_domain in 0007. */
export function toWebsiteDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  let d = website.trim().toLowerCase();
  if (d === '') return null;
  d = d.replace(/^[a-z]+:\/\//, '');
  d = d.replace(/^www\./, '');
  d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return d === '' ? null : d;
}

/** Company names compared without punctuation, suffixes or case. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(inc|llc|corp|co|ltd|company|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Matched at a word boundary so a short stem cannot fire inside another word:
// "spa" must not match "Sparkle", "tile" must not match "versatile".
const REMODEL_TERMS: RegExp[] = [
  /\bremodel/,
  /\brenovat/,
  /\bresurfac/,
  /\breplaster/,
  /\bplaster/,
  /\bpebble/,
  /\btiles?\b/,
  /\bcoping\b/,
  /\bequipment\b/,
  /\bbaja\b/,
  /\bspas?\b/,
  /\bconstruction\b/,
  /\bbuild/,
  /\bdesign/,
  /\boutdoor living\b/,
  /\bhardscap/,
  /\bbackyard/,
];

const CLEANING_TERMS: RegExp[] = [
  /\bclean/,
  /\bmaintenance\b/,
  /\bweekly\b/,
  /\bchemical/,
  /\bservice route\b/,
  /\bpool service\b/,
];

/**
 * True when the services text reads as cleaning/maintenance with nothing
 * that suggests remodeling work. Conservative: any remodel term wins.
 */
export function looksPoolCleaningOnly(
  services: string[],
  category: string | null,
  companyName: string
): boolean {
  // Slugs like "pool_remodeler" and hyphenated phrases are words too.
  const hay = [...services, category ?? '', companyName]
    .join(' ')
    .toLowerCase()
    .replace(/[_\-\/]+/g, ' ');
  if (hay.trim() === '') return false;
  const cleaning = CLEANING_TERMS.some((t) => t.test(hay));
  const remodel = REMODEL_TERMS.some((t) => t.test(hay));
  return cleaning && !remodel;
}

function toServices(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : v.split(/[;,|]/);
  return Array.from(
    new Set(arr.map((s) => s.trim()).filter((s) => s !== ''))
  );
}

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function normalizeRow(row: RawProspectRow): NormalizedProspect | null {
  const company = clean(row.company_name);
  if (!company) return null;

  const phone = clean(row.phone);
  const services = toServices(row.primary_services);
  const category = clean(row.category);
  const flags: string[] = [];
  if (phone && !isPlausibleUsPhone(phone)) flags.push('invalid_phone');
  if (!phone) flags.push('missing_phone');

  const rating = toNumber(row.rating);
  const reviewCount = toNumber(row.review_count);

  return {
    company_name: company,
    phone,
    phone_e164: phone && isPlausibleUsPhone(phone) ? toE164(phone) : null,
    website: clean(row.website),
    website_domain: toWebsiteDomain(clean(row.website)),
    email: clean(row.email)?.toLowerCase() ?? null,
    city: clean(row.city),
    county: clean(row.county),
    state: clean(row.state) ?? 'CA',
    service_area: clean(row.service_area),
    primary_services: services,
    category,
    rating: rating === null ? null : Math.min(5, Math.max(0, Math.round(rating * 10) / 10)),
    review_count: reviewCount === null ? null : Math.max(0, Math.round(reviewCount)),
    assigned_key: clean(row.assigned_to)?.toLowerCase() ?? null,
    is_pool_cleaning_only: looksPoolCleaningOnly(services, category, company),
    flags,
    notes: clean(row.notes),
  };
}

export interface DedupeResult {
  kept: NormalizedProspect[];
  duplicates: { row: NormalizedProspect; matchedOn: 'phone' | 'domain' | 'name+city'; keptIndex: number }[];
}

/**
 * First occurrence wins. A later row is a duplicate if it shares a normalized
 * phone, a website domain, or a normalized company name in the same city with
 * an earlier kept row. Rows without any of those keys are always kept.
 */
export function dedupe(rows: NormalizedProspect[]): DedupeResult {
  const kept: NormalizedProspect[] = [];
  const duplicates: DedupeResult['duplicates'] = [];
  const byPhone = new Map<string, number>();
  const byDomain = new Map<string, number>();
  const byNameCity = new Map<string, number>();

  for (const row of rows) {
    const nameKey = `${normalizeCompanyName(row.company_name)}|${(row.city ?? '').toLowerCase()}`;
    let matchedOn: DedupeResult['duplicates'][number]['matchedOn'] | null = null;
    let keptIndex = -1;

    if (row.phone_e164 && byPhone.has(row.phone_e164)) {
      matchedOn = 'phone';
      keptIndex = byPhone.get(row.phone_e164)!;
    } else if (row.website_domain && byDomain.has(row.website_domain)) {
      matchedOn = 'domain';
      keptIndex = byDomain.get(row.website_domain)!;
    } else if (row.city && byNameCity.has(nameKey)) {
      matchedOn = 'name+city';
      keptIndex = byNameCity.get(nameKey)!;
    }

    if (matchedOn) {
      duplicates.push({ row, matchedOn, keptIndex });
      continue;
    }

    const idx = kept.push(row) - 1;
    if (row.phone_e164) byPhone.set(row.phone_e164, idx);
    if (row.website_domain) byDomain.set(row.website_domain, idx);
    if (row.city) byNameCity.set(nameKey, idx);
  }
  return { kept, duplicates };
}

export interface ImportReport {
  sourceRows: number;
  unusable: number; // no company name
  kept: number;
  duplicates: number;
  duplicatesBy: Record<'phone' | 'domain' | 'name+city', number>;
  missingPhone: number;
  invalidPhone: number;
  poolCleaningOnly: number;
  byAssignee: Record<string, number>;
  unassigned: number;
}

/** Everything the operator needs to decide before anything is written. */
export function buildReport(raw: RawProspectRow[]): {
  report: ImportReport;
  kept: NormalizedProspect[];
} {
  const normalized: NormalizedProspect[] = [];
  let unusable = 0;
  for (const r of raw) {
    const n = normalizeRow(r);
    if (n) normalized.push(n);
    else unusable += 1;
  }
  const { kept, duplicates } = dedupe(normalized);

  const duplicatesBy = { phone: 0, domain: 0, 'name+city': 0 };
  for (const d of duplicates) duplicatesBy[d.matchedOn] += 1;

  const byAssignee: Record<string, number> = {};
  let unassigned = 0;
  for (const k of kept) {
    if (k.assigned_key) byAssignee[k.assigned_key] = (byAssignee[k.assigned_key] ?? 0) + 1;
    else unassigned += 1;
  }

  return {
    report: {
      sourceRows: raw.length,
      unusable,
      kept: kept.length,
      duplicates: duplicates.length,
      duplicatesBy,
      missingPhone: kept.filter((k) => k.flags.includes('missing_phone')).length,
      invalidPhone: kept.filter((k) => k.flags.includes('invalid_phone')).length,
      poolCleaningOnly: kept.filter((k) => k.is_pool_cleaning_only).length,
      byAssignee,
      unassigned,
    },
    kept,
  };
}
