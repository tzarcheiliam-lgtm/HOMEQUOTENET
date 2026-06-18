import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ActivityType } from '@/lib/types';

const CLOSED_STATUSES = ['sold', 'lost', 'returned'];

export interface DashLead {
  assignment_id: string;
  lead_id: string;
  name: string;
  city: string | null;
  vertical: string | null;
  status: string; // assignment status
  next_appointment: string | null; // ISO datetime of soonest upcoming appt
  estimate_amount: number | null;
  sale_amount: number | null;
  last_update: string; // ISO
}

export interface DashAppointment {
  id: string;
  scheduled_at: string | null;
  lead_id: string | null;
  lead_name: string;
}

export interface DashActivity {
  id: string;
  type: ActivityType;
  body: string | null;
  created_at: string;
  lead_id: string;
}

export interface ContractorDashboard {
  revenueThisMonth: number;
  revenueAllTime: number;
  activeCount: number;
  newLeadsCount: number;
  jobsWon: number;
  pendingEstimates: number;
  upcomingCount: number;
  closeRate: number;
  activeLeads: DashLead[];
  upcomingAppointments: DashAppointment[];
  recentActivity: DashActivity[];
}

function leadName(l: any): string {
  return (
    [l?.first_name, l?.last_name].filter(Boolean).join(' ') ||
    l?.phone ||
    'Lead'
  );
}

// All reads are automatically scoped to the signed-in contractor by RLS.
export async function getContractorDashboard(): Promise<ContractorDashboard> {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [assignRes, apptRes, salesRes, activityRes] = await Promise.all([
    supabase
      .from('lead_assignments')
      .select(
        `id, status, assigned_at, updated_at,
         lead:leads(id, first_name, last_name, phone, city, vertical:verticals(name)),
         appointments(scheduled_at, status),
         estimates(amount, estimate_date),
         sales(amount, sale_status)`
      )
      .order('updated_at', { ascending: false }),
    supabase
      .from('appointments')
      .select(
        `id, scheduled_at, status,
         assignment:lead_assignments(lead:leads(id, first_name, last_name, phone))`
      )
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true }),
    supabase.from('sales').select('amount, sale_status, sale_date'),
    supabase
      .from('lead_activities')
      .select('id, type, body, created_at, lead_id')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const assignments = (assignRes.data ?? []) as any[];

  const soonestAppointment = (appts: any[]): string | null => {
    const upcoming = (appts ?? [])
      .filter(
        (ap) =>
          ap.scheduled_at &&
          (ap.status === 'scheduled' || ap.status === 'rescheduled') &&
          ap.scheduled_at >= nowIso
      )
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return upcoming[0]?.scheduled_at ?? null;
  };

  const latestEstimate = (estimates: any[]): number | null => {
    const sorted = (estimates ?? [])
      .slice()
      .sort((a, b) =>
        String(b.estimate_date).localeCompare(String(a.estimate_date))
      );
    return sorted[0]?.amount ?? null;
  };

  const wonSaleAmount = (sales: any[]): number | null => {
    const won = (sales ?? []).filter((s) => s.sale_status === 'won');
    return won.length ? won.reduce((s, r) => s + (Number(r.amount) || 0), 0) : null;
  };

  const toDashLead = (a: any): DashLead => ({
    assignment_id: a.id,
    lead_id: a.lead?.id,
    name: leadName(a.lead),
    city: a.lead?.city ?? null,
    vertical: a.lead?.vertical?.name ?? null,
    status: a.status,
    next_appointment: soonestAppointment(a.appointments),
    estimate_amount: latestEstimate(a.estimates),
    sale_amount: wonSaleAmount(a.sales),
    last_update: a.updated_at,
  });

  const activeAssignments = assignments.filter(
    (a) => !CLOSED_STATUSES.includes(a.status)
  );
  const newLeads = assignments.filter((a) => a.status === 'assigned');

  // Appointments
  const appts = (apptRes.data ?? []) as any[];
  const upcomingAppointments: DashAppointment[] = appts
    .filter((a) => a.status === 'scheduled' || a.status === 'rescheduled')
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      scheduled_at: a.scheduled_at,
      lead_id: a.assignment?.lead?.id ?? null,
      lead_name: leadName(a.assignment?.lead),
    }));

  // Sales / revenue
  const sales = (salesRes.data ?? []) as any[];
  const won = sales.filter((s) => s.sale_status === 'won');
  const revenueAllTime = won.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const revenueThisMonth = won
    .filter((s) => String(s.sale_date) >= startOfMonth)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Pending estimates: active assignments whose furthest stage is an estimate.
  const pendingEstimates = assignments.filter(
    (a) =>
      (a.estimates?.length ?? 0) > 0 &&
      !CLOSED_STATUSES.includes(a.status)
  ).length;

  const totalAssigned = assignments.length;

  return {
    revenueThisMonth,
    revenueAllTime,
    activeCount: activeAssignments.length,
    newLeadsCount: newLeads.length,
    jobsWon: won.length,
    pendingEstimates,
    upcomingCount: upcomingAppointments.length,
    closeRate: totalAssigned > 0 ? (won.length / totalAssigned) * 100 : 0,
    activeLeads: activeAssignments.slice(0, 12).map(toDashLead),
    upcomingAppointments,
    recentActivity: (activityRes.data ?? []) as DashActivity[],
  };
}
