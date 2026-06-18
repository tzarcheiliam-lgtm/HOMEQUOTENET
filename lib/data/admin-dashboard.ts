import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getSalesDashboard } from '@/lib/data/sales';

export interface AdminActivity {
  id: string;
  type: string;
  body: string | null;
  created_at: string;
  lead_id: string;
}

export interface AdminDashboard {
  totalLeads: number;
  newLeads: number;
  upcomingAppointments: number;
  estimatesSent: number;
  salesWon: number;
  revenue: number;
  commissionEarned: number;
  amountOwed: number;
  closeRate: number;
  contractorPerformance: { name: string; amount: number }[];
  recentActivity: AdminActivity[];
}

async function count(
  table: string,
  filter?: (q: any) => any
): Promise<number> {
  const supabase = await createClient();
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

// Composes existing read aggregates — no new business logic.
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [sales, totalLeads, newLeads, upcoming, estimatesSent, activityRes] =
    await Promise.all([
      getSalesDashboard(),
      count('leads', (q) => q.is('archived_at', null)),
      count('leads', (q) => q.eq('status', 'new').is('archived_at', null)),
      count('appointments', (q) =>
        q.eq('status', 'scheduled').gte('scheduled_at', nowIso)
      ),
      count('estimates'),
      supabase
        .from('lead_activities')
        .select('id, type, body, created_at, lead_id')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  return {
    totalLeads,
    newLeads,
    upcomingAppointments: upcoming,
    estimatesSent,
    salesWon: sales.salesCount,
    revenue: sales.totalRevenue,
    commissionEarned: sales.commissionEarned,
    amountOwed: sales.amountOwed,
    closeRate: sales.closeRate,
    contractorPerformance: sales.revenueByContractor.slice(0, 5),
    recentActivity: (activityRes.data ?? []) as AdminActivity[],
  };
}
