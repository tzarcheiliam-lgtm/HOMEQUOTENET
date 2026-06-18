import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { BillingEvent } from '@/lib/types';

export interface SalesDashboard {
  totalRevenue: number;
  commissionEarned: number;
  amountOwed: number;
  amountPaid: number;
  assignmentsCount: number;
  estimatesCount: number;
  salesCount: number;
  estimateRate: number; // % of assignments with an estimate
  closeRate: number; // % of assignments that became a won sale
  revenueByContractor: { name: string; amount: number }[];
  revenueByVertical: { name: string; amount: number }[];
  revenueBySource: { name: string; amount: number }[];
}

function sumBy<T>(
  rows: T[],
  key: (r: T) => string,
  value: (r: T) => number
): { name: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + value(r));
  }
  return Array.from(m.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Admin sales/revenue dashboard. Relies on admin RLS for full visibility. */
export async function getSalesDashboard(): Promise<SalesDashboard> {
  const supabase = await createClient();

  const [salesRes, assignRes, estimateRes, billingRes] = await Promise.all([
    supabase
      .from('sales')
      .select(
        `amount, commission_amount, sale_status,
         assignment:lead_assignments(
           contractor:contractors(name),
           lead:leads(source, vertical:verticals(name))
         )`
      ),
    supabase.from('lead_assignments').select('id', { count: 'exact', head: true }),
    supabase.from('estimates').select('assignment_id'),
    supabase.from('billing_events').select('amount, amount_paid, status'),
  ]);

  const sales = (salesRes.data ?? []) as any[];
  const won = sales.filter((s) => s.sale_status === 'won');

  const totalRevenue = won.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const commissionEarned = won.reduce(
    (s, r) => s + (Number(r.commission_amount) || 0),
    0
  );

  const billing = (billingRes.data ?? []) as any[];
  const amountPaid = billing.reduce(
    (s, r) => s + (Number(r.amount_paid) || 0),
    0
  );
  const amountOwed = billing
    .filter((r) => r.status === 'pending' || r.status === 'overdue')
    .reduce(
      (s, r) => s + Math.max((Number(r.amount) || 0) - (Number(r.amount_paid) || 0), 0),
      0
    );

  const assignmentsCount = assignRes.count ?? 0;
  const estimatesCount = new Set(
    (estimateRes.data ?? []).map((r: any) => r.assignment_id)
  ).size;
  const salesCount = won.length;

  return {
    totalRevenue,
    commissionEarned,
    amountOwed,
    amountPaid,
    assignmentsCount,
    estimatesCount,
    salesCount,
    estimateRate:
      assignmentsCount > 0 ? (estimatesCount / assignmentsCount) * 100 : 0,
    closeRate:
      assignmentsCount > 0 ? (salesCount / assignmentsCount) * 100 : 0,
    revenueByContractor: sumBy(
      won,
      (r) => r.assignment?.contractor?.name ?? 'Unknown',
      (r) => Number(r.amount) || 0
    ),
    revenueByVertical: sumBy(
      won,
      (r) => r.assignment?.lead?.vertical?.name ?? 'Unassigned',
      (r) => Number(r.amount) || 0
    ),
    revenueBySource: sumBy(
      won,
      (r) => r.assignment?.lead?.source ?? 'Unknown',
      (r) => Number(r.amount) || 0
    ),
  };
}

export interface BillingRow extends BillingEvent {
  contractor_name: string | null;
  lead_id: string | null;
  lead_name: string;
}

export async function listBillingEvents(): Promise<BillingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('billing_events')
    .select(
      `*,
       contractor:contractors(name),
       assignment:lead_assignments(lead:leads(id, first_name, last_name, phone))`
    )
    .order('created_at', { ascending: false });

  return (data ?? []).map((b: any) => {
    const lead = b.assignment?.lead;
    const leadName =
      [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') ||
      lead?.phone ||
      '—';
    return {
      ...(b as BillingEvent),
      contractor_name: b.contractor?.name ?? null,
      lead_id: lead?.id ?? null,
      lead_name: leadName,
    };
  });
}
