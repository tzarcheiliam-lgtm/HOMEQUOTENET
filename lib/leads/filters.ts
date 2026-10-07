import type { LeadFilters } from '@/lib/data/leads';
import type { LeadStatus } from '@/lib/types';

type Params = Record<string, string | string[] | undefined>;

export function firstParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

/** The Leads page's filters, parsed from its query string. Shared so an export matches exactly what the list shows. */
export function parseLeadFilters(sp: Params): LeadFilters {
  return {
    q: firstParam(sp.q),
    status: firstParam(sp.status) as LeadStatus | undefined,
    vertical_id: firstParam(sp.vertical_id),
    sub_service_id: firstParam(sp.sub_service_id),
    source: firstParam(sp.source),
    contractor_id: firstParam(sp.contractor_id),
    city: firstParam(sp.city),
    zip: firstParam(sp.zip),
    date_from: firstParam(sp.date_from),
    date_to: firstParam(sp.date_to),
    archived: (firstParam(sp.archived) as LeadFilters['archived']) ?? 'active',
    assigned: firstParam(sp.assigned) as LeadFilters['assigned'],
    qualification_status: (['needs_qualification', 'qualified', 'not_qualified'] as const).find((v) => v === firstParam(sp.review)),
  };
}

/** Re-serialises the filters that are actually set (drops anything else in the URL) for links to the export. */
export function filtersToQuery(sp: Params): string {
  const keys = ['q', 'status', 'vertical_id', 'sub_service_id', 'source', 'contractor_id', 'city', 'zip', 'date_from', 'date_to', 'archived', 'assigned', 'review'];
  const out = new URLSearchParams();
  for (const k of keys) { const v = firstParam(sp[k]); if (v) out.set(k, v); }
  return out.toString();
}
