import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Integration, LeadIntakeEvent } from '@/lib/types';

export async function listIntegrations(): Promise<Integration[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('*')
    .order('created_at', { ascending: true });
  return (data as Integration[]) ?? [];
}

export async function getIntegrationByProvider(
  provider: string
): Promise<Integration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('provider', provider)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Integration) ?? null;
}

export interface IntakeEventRow extends LeadIntakeEvent {
  lead_name: string | null;
}

export async function listIntakeEvents(
  filters: { provider?: string; status?: string; limit?: number } = {}
): Promise<IntakeEventRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('lead_intake_events')
    .select('*, lead:leads!lead_intake_events_lead_id_fkey(first_name, last_name, phone)')
    .order('received_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.provider) query = query.eq('provider', filters.provider);
  if (filters.status) query = query.eq('status', filters.status);

  const { data } = await query;
  return (data ?? []).map((e: any) => {
    const l = e.lead;
    const name = l
      ? [l.first_name, l.last_name].filter(Boolean).join(' ') || l.phone || null
      : null;
    return { ...(e as LeadIntakeEvent), lead_name: name };
  });
}
