import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { effectiveStatus } from '@/lib/signing/view';
import type { SigningStatus } from '@/lib/signing/constants';

export interface SigningListRow {
  documentId: string; versionId: string; title: string; contractorName: string | null; leadId: string | null; leadName: string | null;
  versionNo: number; status: SigningStatus; expiresAt: string | null; sentAt: string | null; completedAt: string | null; createdAt: string;
  signers: { name: string; status: string }[];
}

/** RLS-scoped (the signed-in user's own client): contractors only ever get their company's documents. */
export async function listSigningDocuments(filters: { leadId?: string; contractorId?: string; q?: string; status?: string; limit?: number } = {}): Promise<SigningListRow[]> {
  const supabase = await createClient();
  let q = supabase.from('signing_documents').select('id,title,contractor_id,lead_id,current_version_id,created_at').order('created_at', { ascending: false }).limit(filters.limit ?? 100);
  if (filters.leadId) q = q.eq('lead_id', filters.leadId);
  if (filters.contractorId) q = q.eq('contractor_id', filters.contractorId);
  if (filters.q) q = q.ilike('title', `%${filters.q.replace(/[%_,]/g, ' ')}%`);
  const { data: docs } = await q;
  if (!docs?.length) return [];
  const versionIds = docs.map((d) => d.current_version_id).filter(Boolean) as string[];
  const [{ data: versions }, { data: recs }, { data: contractors }, { data: leads }] = await Promise.all([
    supabase.from('signing_versions').select('id,version_no,status,expires_at,sent_at,completed_at,created_at').in('id', versionIds),
    supabase.from('signing_recipients').select('version_id,name,status,order_index').in('version_id', versionIds).order('order_index'),
    supabase.from('contractors').select('id,name').in('id', docs.map((d) => d.contractor_id).filter(Boolean) as string[]),
    supabase.from('leads').select('id,first_name,last_name').in('id', docs.map((d) => d.lead_id).filter(Boolean) as string[]),
  ]);
  const vById = new Map((versions ?? []).map((v) => [v.id, v]));
  const cById = new Map((contractors ?? []).map((c) => [c.id, c.name]));
  const lById = new Map((leads ?? []).map((l) => [l.id, [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead']));
  const rows = docs.flatMap((d): SigningListRow[] => {
    const v = d.current_version_id ? vById.get(d.current_version_id) : null;
    if (!v) return [];
    return [{
      documentId: d.id, versionId: v.id, title: d.title, contractorName: d.contractor_id ? cById.get(d.contractor_id) ?? null : null, leadId: d.lead_id,
      leadName: d.lead_id ? lById.get(d.lead_id) ?? null : null, versionNo: v.version_no, status: effectiveStatus(v.status, v.expires_at), expiresAt: v.expires_at,
      sentAt: v.sent_at, completedAt: v.completed_at, createdAt: d.created_at,
      signers: (recs ?? []).filter((r) => r.version_id === v.id).map((r) => ({ name: r.name, status: r.status })),
    }];
  });
  return filters.status ? rows.filter((r) => r.status === filters.status) : rows;
}
