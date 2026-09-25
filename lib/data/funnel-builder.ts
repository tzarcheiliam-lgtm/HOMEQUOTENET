import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { funnelSchema, type FunnelConfig } from '@/lib/funnels/schema';
import type { FunnelStatus, FunnelSummary } from '@/lib/funnels/builder';

export type FunnelDashboardRow = FunnelSummary & {
  contractorId: string | null;
  starts: number; leads: number; needsQualification: number; bookings: number;
};

/** Funnel list for the dashboard, with lightweight per-funnel counts (no funnel_report call — cheap enough to run inline for a handful of funnels). */
export async function listFunnelsForDashboard(): Promise<FunnelDashboardRow[]> {
  const supabase = await createClient();
  const { data: funnels } = await supabase
    .from('funnels')
    .select('id, slug, status, is_demo, config, created_at, updated_at, contractor_id, contractor:contractors(name)')
    .order('updated_at', { ascending: false });
  if (!funnels?.length) return [];
  const ids = funnels.map((f) => f.id as string);
  const [{ data: sessions }, { data: leads }] = await Promise.all([
    supabase.from('funnel_sessions').select('funnel_id, contact_submitted_at, booked_at, lead_id').in('funnel_id', ids),
    supabase.from('leads').select('id, qualification_status').eq('source', 'website'),
  ]);
  const qualificationByLead = new Map((leads ?? []).map((l) => [l.id as string, l.qualification_status as string]));
  return funnels.map((f) => {
    const own = (sessions ?? []).filter((s) => s.funnel_id === f.id);
    const config = funnelSchema.safeParse(f.config);
    const contractor = f.contractor as unknown as { name: string } | { name: string }[] | null;
    return {
      id: f.id, slug: f.slug, status: f.status as FunnelStatus, isDemo: f.is_demo,
      clientName: config.success ? config.data.clientName : f.slug,
      industry: config.success ? config.data.industry : '—',
      contractorId: f.contractor_id,
      contractorName: Array.isArray(contractor) ? contractor[0]?.name ?? null : contractor?.name ?? null,
      createdAt: f.created_at, updatedAt: f.updated_at,
      starts: own.length,
      leads: own.filter((s) => s.contact_submitted_at).length,
      needsQualification: own.filter((s) => s.lead_id && qualificationByLead.get(s.lead_id) === 'needs_qualification').length,
      bookings: own.filter((s) => s.booked_at).length,
    };
  });
}

/** Count of leads (contact submissions) across all funnels since the start of the current calendar month — used only for the dashboard's top summary tile. */
export async function countFunnelLeadsThisMonth(): Promise<number> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('funnel_sessions')
    .select('id', { count: 'exact', head: true })
    .not('contact_submitted_at', 'is', null)
    .gte('contact_submitted_at', since.toISOString());
  return count ?? 0;
}

export type BuilderFunnel = {
  id: string; slug: string; status: FunnelStatus; isDemo: boolean;
  contractorId: string | null; verticalId: string | null; integrationId: string | null;
  config: FunnelConfig; createdAt: string; updatedAt: string;
};
export async function getFunnelForBuilder(id: string): Promise<BuilderFunnel | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('funnels')
    .select('id, slug, status, is_demo, contractor_id, vertical_id, integration_id, config, created_at, updated_at')
    .eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, slug: data.slug, status: data.status as FunnelStatus, isDemo: data.is_demo,
    contractorId: data.contractor_id, verticalId: data.vertical_id, integrationId: data.integration_id,
    config: funnelSchema.parse(data.config), createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export type FunnelTemplate = { id: string; key: string | null; name: string; category: string; description: string | null; config: FunnelConfig };
export async function listFunnelTemplates(): Promise<FunnelTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('funnel_templates').select('id, key, name, category, description, config').order('category').order('name');
  return (data ?? []).flatMap((t) => {
    const parsed = funnelSchema.safeParse(t.config);
    return parsed.success ? [{ ...t, config: parsed.data }] : [];
  });
}
