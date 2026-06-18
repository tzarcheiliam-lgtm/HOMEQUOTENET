import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { LeadStatus } from '@/lib/types';

export interface LeadAnalytics {
  totalLeads: number;
  byVertical: { name: string; count: number }[];
  bySource: { name: string; count: number }[];
  byStatus: { status: LeadStatus; count: number }[];
  totalLeadCost: number;
  totalRevenue: number;
  costPerLead: number;
  appointmentRate: number; // share of leads that reached an appointment
  estimateRate: number;
  salesRate: number;
  roas: number; // revenue / spend
}

// Statuses considered "reached an appointment / estimate / sale".
const APPOINTMENT_STAGES: LeadStatus[] = [
  'appointment_set',
  'appointment_completed',
  'estimate_sent',
  'sold',
];
const ESTIMATE_STAGES: LeadStatus[] = ['estimate_sent', 'sold'];

export async function getLeadAnalytics(): Promise<LeadAnalytics> {
  const supabase = await createClient();

  // Pull just the columns needed and aggregate in memory (fine for MVP volume).
  const { data } = await supabase
    .from('leads')
    .select(
      'status, source, lead_cost, actual_revenue, vertical:verticals(name)'
    )
    .is('archived_at', null);

  const rows = (data ?? []) as any[];
  const total = rows.length;

  const tally = (key: (r: any) => string | null) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = key(r);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byVertical = tally((r) => r.vertical?.name ?? 'Unassigned');
  const bySource = tally((r) => r.source ?? 'Unknown');

  const byStatus = (
    [
      'new',
      'contact_attempted',
      'qualified',
      'assigned',
      'appointment_set',
      'appointment_completed',
      'estimate_sent',
      'sold',
      'lost',
      'cancelled',
    ] as LeadStatus[]
  ).map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }));

  const totalLeadCost = rows.reduce((s, r) => s + (Number(r.lead_cost) || 0), 0);
  const totalRevenue = rows.reduce(
    (s, r) => s + (Number(r.actual_revenue) || 0),
    0
  );

  const reached = (stages: LeadStatus[]) =>
    rows.filter((r) => stages.includes(r.status)).length;

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return {
    totalLeads: total,
    byVertical,
    bySource,
    byStatus,
    totalLeadCost,
    totalRevenue,
    costPerLead: total > 0 ? totalLeadCost / total : 0,
    appointmentRate: pct(reached(APPOINTMENT_STAGES)),
    estimateRate: pct(reached(ESTIMATE_STAGES)),
    salesRate: pct(reached(['sold'])),
    roas: totalLeadCost > 0 ? totalRevenue / totalLeadCost : 0,
  };
}
