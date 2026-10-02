import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Meta browser identifiers (_fbp / _fbc cookies) kept on the lead so server-side events sent
 * later (e.g. Schedule, a different request from the original submit) can reuse them for event
 * matching. Write-once: a value already stored is never overwritten, so a returning visitor on a
 * deduplicated lead cannot replace the identifiers from the original ad click.
 */
export type MetaLeadIds = { fbp?: string | null; fbc?: string | null };

export async function rememberLeadMetaIds(db: SupabaseClient, leadId: string, ids: MetaLeadIds): Promise<void> {
  try {
    for (const key of ['fbp', 'fbc'] as const) {
      const value = ids[key]?.trim();
      if (!value) continue;
      const { error } = await db.from('leads').update({ [key]: value }).eq('id', leadId).is(key, null);
      if (error) console.error('[meta-ids] could not store', key, error.code ?? 'unknown');
    }
  } catch (error) {
    console.error('[meta-ids] store failed', error instanceof Error ? error.name : 'unknown');
  }
}

export async function loadLeadMetaIds(db: SupabaseClient, leadId: string | null | undefined): Promise<MetaLeadIds> {
  if (!leadId) return {};
  try {
    const { data } = await db.from('leads').select('fbp, fbc').eq('id', leadId).maybeSingle();
    return { fbp: data?.fbp ?? undefined, fbc: data?.fbc ?? undefined };
  } catch {
    return {};
  }
}
