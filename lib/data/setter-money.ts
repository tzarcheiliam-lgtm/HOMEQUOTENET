import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SalesAppointmentStatus, UserRole } from '@/lib/types';
import { dayKey } from '@/lib/calls/goals';
import {
  bookedBetween,
  earnedBetween,
  isPending,
  isSold,
  monthOf,
  type Meeting,
} from '@/lib/setter/money';

/**
 * Sales meetings as Meetings, read through the service role and always
 * filtered explicitly: sales-appointment RLS only shows meetings on prospects
 * a partner still holds, which would make a reassigned prospect erase a
 * setter's booking (and pay). Pages decide whose numbers may be shown.
 */

type Db = ReturnType<typeof createAdminClient>;
const PAGE = 1000;

interface Row {
  id: string;
  prospect_id: string;
  partner_id: string | null;
  created_at: string;
  scheduled_at: string;
  status: SalesAppointmentStatus;
  sale_outcome?: 'sold' | 'not_sold' | null;
  sale_decided_at?: string | null;
  setter_pay_amount?: number | string | null;
}

export async function loadMeetings(opts: { partnerId?: string; db?: Db } = {}): Promise<Meeting[]> {
  const db = opts.db ?? createAdminClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from('prospect_sales_appointments')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (opts.partnerId) q = q.eq('partner_id', opts.partnerId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  // Company names in a second, chunked read (keeps each URL short).
  const names = new Map<string, string>();
  const ids = [...new Set(rows.map((r) => r.prospect_id))];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('contractor_prospects').select('id, company_name').in('id', ids.slice(i, i + 200));
    for (const p of (data ?? []) as { id: string; company_name: string }[]) names.set(p.id, p.company_name);
  }
  return rows.map((r) => ({
    id: r.id,
    prospectId: r.prospect_id,
    companyName: names.get(r.prospect_id) ?? 'Prospect',
    partnerId: r.partner_id,
    bookedAt: r.created_at,
    scheduledAt: r.scheduled_at,
    status: r.status,
    saleOutcome: r.sale_outcome ?? null,
    saleDecidedAt: r.sale_decided_at ?? null,
    payAmount: r.setter_pay_amount === null || r.setter_pay_amount === undefined ? null : Number(r.setter_pay_amount),
  }));
}

export interface PartnerPay {
  id: string;
  name: string;
  role: UserRole;
  payPerSale: number | null;
  weeklyBookingGoal: number | null;
}

export async function loadPartners(db: Db = createAdminClient()): Promise<PartnerPay[]> {
  const { data } = await db
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'caller', 'setter'])
    .eq('account_status', 'active')
    .is('deleted_at', null)
    .order('full_name', { ascending: true });
  return ((data ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    pay_per_sale?: number | string | null;
    weekly_booking_goal?: number | null;
  }[]).map((p) => ({
    id: p.id,
    name: p.full_name || p.email || 'Partner',
    role: p.role,
    payPerSale: p.pay_per_sale === null || p.pay_per_sale === undefined ? null : Number(p.pay_per_sale),
    weeklyBookingGoal: p.weekly_booking_goal ?? null,
  }));
}

/* ---- Payouts ---------------------------------------------------------------- */

export interface PayoutRow {
  partnerId: string;
  name: string;
  role: UserRole | null;
  payPerSale: number | null;
  /** Meetings booked in the month. */
  booked: number;
  /** Decided in the month. */
  sold: number;
  notSold: number;
  /** Pay for meetings sold in the month: what you owe for the month. */
  earned: number;
  /** Any month: meetings that already happened and still need a sale decision. */
  awaitingDecision: number;
}

export interface PayoutLine {
  id: string;
  partnerName: string;
  companyName: string;
  scheduledAt: string;
  decidedAt: string;
  pay: number;
}

export interface Payouts {
  month: string;
  rows: PayoutRow[];
  lines: PayoutLine[];
  total: number;
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function isMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function currentMonth(now = new Date()): string {
  return monthOf(dayKey(now));
}

/** What each partner earned in `month` (sold that month), plus their pipeline. */
export async function getPayouts(month: string): Promise<Payouts> {
  const db = createAdminClient();
  const [meetings, partners] = await Promise.all([loadMeetings({ db }), loadPartners(db)]);
  const { from, to } = monthBounds(month);
  const now = Date.now();
  const byId = new Map(partners.map((p) => [p.id, p]));

  const partnerIds = new Set<string>(partners.filter((p) => p.role !== 'admin').map((p) => p.id));
  for (const m of meetings) if (m.partnerId) partnerIds.add(m.partnerId);

  const rows: PayoutRow[] = [...partnerIds].map((pid) => {
    const mine = meetings.filter((m) => m.partnerId === pid);
    const decidedIn = mine.filter((m) => {
      if (!m.saleDecidedAt) return false;
      const k = dayKey(m.saleDecidedAt);
      return k >= from && k <= to;
    });
    const p = byId.get(pid);
    return {
      partnerId: pid,
      name: p?.name ?? 'Former partner',
      role: p?.role ?? null,
      payPerSale: p?.payPerSale ?? null,
      booked: bookedBetween(mine, from, to).length,
      sold: decidedIn.filter(isSold).length,
      notSold: decidedIn.filter((m) => m.saleOutcome === 'not_sold').length,
      earned: earnedBetween(mine, from, to),
      awaitingDecision: mine.filter((m) => isPending(m) && Date.parse(m.scheduledAt) < now).length,
    };
  });

  const lines: PayoutLine[] = meetings
    .filter((m) => isSold(m) && m.saleDecidedAt && dayKey(m.saleDecidedAt) >= from && dayKey(m.saleDecidedAt) <= to)
    .map((m) => ({
      id: m.id,
      partnerName: (m.partnerId && byId.get(m.partnerId)?.name) || 'Unassigned',
      companyName: m.companyName,
      scheduledAt: m.scheduledAt,
      decidedAt: m.saleDecidedAt as string,
      pay: m.payAmount ?? 0,
    }))
    .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt));

  return {
    month,
    rows: rows
      // Admins appear only when they booked or earned something.
      .filter((r) => r.role !== 'admin' || r.booked > 0 || r.sold > 0 || r.earned > 0)
      .sort((a, b) => b.earned - a.earned || b.booked - a.booked || a.name.localeCompare(b.name)),
    lines,
    total: Math.round(lines.reduce((s, l) => s + l.pay, 0) * 100) / 100,
  };
}

/** CSV: one line per sold meeting, then a total per partner. */
export function payoutsCsv(p: Payouts): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out: string[] = [['Month', 'Sold on', 'Setter', 'Company', 'Meeting date', 'Pay'].join(',')];
  for (const l of p.lines) {
    out.push([p.month, dayKey(l.decidedAt), l.partnerName, l.companyName, dayKey(l.scheduledAt), l.pay.toFixed(2)].map(esc).join(','));
  }
  out.push('');
  out.push(['Month', 'Setter', 'Booked', 'Sold', 'Not sold', 'Earned'].join(','));
  for (const r of p.rows) out.push([p.month, r.name, r.booked, r.sold, r.notSold, r.earned.toFixed(2)].map(esc).join(','));
  out.push([p.month, 'TOTAL', '', '', '', p.total.toFixed(2)].map(esc).join(','));
  return out.join('\n') + '\n';
}
