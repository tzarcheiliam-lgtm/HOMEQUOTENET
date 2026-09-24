import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LeadEmailDelivery, LeadRecipient } from '@/lib/types';

export interface RecipientRow extends LeadRecipient {
  contractor: { id: string; name: string } | null;
}

/** Staff-readable (RLS). Active first, then by type and name. */
export async function listRecipients(opts: { activeOnly?: boolean } = {}): Promise<RecipientRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('lead_recipients')
    .select('*, contractor:contractors(id, name)')
    .order('is_active', { ascending: false })
    .order('kind', { ascending: false })
    .order('name');
  if (opts.activeOnly) query = query.eq('is_active', true);
  const { data } = await query;
  return (data ?? []) as RecipientRow[];
}

export interface DeliveryRow extends LeadEmailDelivery {
  requester: { full_name: string | null; email: string | null } | null;
}

export interface LeadDistribution {
  deliveries: DeliveryRow[];
  qualifiedByName: string | null;
  /** Website bookings the homeowner made (e.g. Calendly on Ethan's funnel). */
  bookings: { scheduled_at: string | null; verified: boolean; provider: string; created_at: string }[];
  /** The contractor whose funnel the request came from, if any — a hint, never auto-sent. */
  funnel: { slug: string; clientName: string | null; contractorName: string | null } | null;
}

/**
 * Review/distribution context for one lead. Call only after a staff check:
 * funnel tables are admin-only under RLS, so they are read with the service
 * role, scoped to this lead.
 */
export async function getLeadDistribution(leadId: string, qualifiedBy: string | null): Promise<LeadDistribution> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: deliveries }, { data: sessions }, qualifier] = await Promise.all([
    supabase
      .from('lead_email_deliveries')
      .select('*, requester:profiles(full_name, email)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    admin
      .from('funnel_sessions')
      .select('id, contact_submitted_at, config_snapshot, funnel:funnels(slug, contractor:contractors(name))')
      .eq('lead_id', leadId)
      .not('contact_submitted_at', 'is', null)
      .order('contact_submitted_at', { ascending: false }),
    qualifiedBy
      ? supabase.from('profiles').select('full_name, email').eq('id', qualifiedBy).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const sessionRows = (sessions ?? []) as unknown as {
    id: string;
    config_snapshot: { clientName?: string } | null;
    funnel: { slug: string; contractor: { name: string } | null } | null;
  }[];
  let bookings: LeadDistribution['bookings'] = [];
  if (sessionRows.length) {
    const { data } = await admin
      .from('funnel_bookings')
      .select('scheduled_at, verified, provider, created_at')
      .in('session_id', sessionRows.map((s) => s.id))
      .order('created_at', { ascending: false });
    bookings = (data ?? []) as LeadDistribution['bookings'];
  }
  const latest = sessionRows[0];
  const q = qualifier.data as { full_name: string | null; email: string | null } | null;
  return {
    deliveries: (deliveries ?? []) as DeliveryRow[],
    qualifiedByName: q?.full_name || q?.email || null,
    bookings,
    funnel: latest?.funnel
      ? {
          slug: latest.funnel.slug,
          clientName: latest.config_snapshot?.clientName ?? null,
          contractorName: latest.funnel.contractor?.name ?? null,
        }
      : null,
  };
}
