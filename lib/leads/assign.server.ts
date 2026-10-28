import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { selectActiveAgreement } from '@/lib/outcomes/pricing';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import type { PricingAgreement } from '@/lib/types';

/**
 * Assign a lead to contractors with the service role, the same way an admin does on the lead page
 * (lib/actions/leads.ts assignLead): one assignment per contractor (already-assigned ones are left alone),
 * each linked to the contractor's active pricing agreement, the lead moves to "assigned" if it was still early
 * in the pipeline, and the timeline records it. Callers must have checked that an admin approved it.
 */
export async function assignLeadToContractors(
  db: SupabaseClient,
  input: { leadId: string; contractorIds: string[]; exclusive: boolean; actorId: string | null; note: string }
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const { data: lead } = await db.from('leads').select('id,vertical_id').eq('id', input.leadId).maybeSingle();
  if (!lead) return { ok: false, error: 'The lead no longer exists.' };
  const verticalId = (lead as { vertical_id: string | null }).vertical_id ?? null;
  const { data: existing } = await db.from('lead_assignments').select('contractor_id').eq('lead_id', input.leadId);
  const already = new Set(((existing ?? []) as { contractor_id: string }[]).map((r) => r.contractor_id));
  const fresh = input.contractorIds.filter((id) => !already.has(id));
  const rows = await Promise.all(fresh.map(async (contractor_id) => {
    const { data } = await db.from('pricing_agreements').select('*').eq('contractor_id', contractor_id).eq('is_active', true);
    return { lead_id: input.leadId, contractor_id, is_exclusive: input.exclusive, assigned_by: input.actorId, pricing_agreement_id: selectActiveAgreement((data as PricingAgreement[]) ?? [], verticalId)?.id ?? null };
  }));
  if (rows.length) {
    const { error } = await db.from('lead_assignments').insert(rows);
    if (error) return { ok: false, error: 'The assignment could not be saved.' };
  }
  await db.from('leads').update({ status: 'assigned' }).eq('id', input.leadId).in('status', ['new', 'contact_attempted', 'qualified']);
  await db.from('lead_activities').insert({
    lead_id: input.leadId, actor_id: input.actorId, type: 'assignment', body: input.note, visibility: 'internal',
    metadata: { contractor_ids: fresh, exclusive: input.exclusive, source: 'claude_mcp' },
  });
  flushNotificationsSoon();
  return { ok: true, added: rows.length };
}
