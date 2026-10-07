import 'server-only';
import { listLeads, type LeadFilters } from '@/lib/data/leads';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildFacebookExport, type ExportableLead, type FacebookExportResult } from '@/lib/leads/facebook-export';

const PAGE = 500;
/** Safety cap so one click cannot read an unbounded table; the page tells the user when it was hit. */
export const MAX_EXPORT_LEADS = 20_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every lead matching the filters, read in pages (the list query alone stops at the database's row cap). RLS-scoped to the caller. */
export async function loadLeadsForExport(filters: LeadFilters): Promise<{ leads: ExportableLead[]; truncated: boolean }> {
  const leads: ExportableLead[] = [];
  for (let page = 0; leads.length < MAX_EXPORT_LEADS; page++) {
    const rows = await listLeads(filters, { range: [page * PAGE, page * PAGE + PAGE - 1] });
    for (const r of rows) leads.push(r as unknown as ExportableLead);
    if (rows.length < PAGE) return { leads, truncated: false };
  }
  return { leads: leads.slice(0, MAX_EXPORT_LEADS), truncated: true };
}

/**
 * Leads whose funnel session recorded "do not use my data for advertising measurement". Website-funnel leads carry their
 * session id as external_lead_id. Leads from before that choice was recorded cannot be checked and are not excluded.
 */
export async function optedOutLeadIds(leads: ExportableLead[]): Promise<Set<string>> {
  const bySession = new Map<string, string>();
  for (const l of leads) if (l.source === 'website' && l.external_lead_id && UUID.test(l.external_lead_id)) bySession.set(l.external_lead_id.toLowerCase(), l.id);
  const out = new Set<string>();
  const ids = [...bySession.keys()];
  const admin = createAdminClient();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await admin.from('funnel_sessions').select('id').in('id', ids.slice(i, i + 100)).eq('measurement_allowed', false);
    for (const row of (data ?? []) as { id: string }[]) { const lead = bySession.get(String(row.id).toLowerCase()); if (lead) out.add(lead); }
  }
  return out;
}

export async function prepareFacebookExport(filters: LeadFilters): Promise<FacebookExportResult & { truncated: boolean }> {
  const { leads, truncated } = await loadLeadsForExport(filters);
  return { ...buildFacebookExport(leads, await optedOutLeadIds(leads)), truncated };
}
