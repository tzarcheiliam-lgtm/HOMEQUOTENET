import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getContractorDashboard } from '@/lib/data/contractor-dashboard';
import { getAdminDashboard } from '@/lib/data/admin-dashboard';
import { ContractorDashboard } from '@/components/dashboard/contractor-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Inbox, BadgeCheck, CalendarDays } from 'lucide-react';

export const metadata = { title: 'Dashboard · HomeQuote Network' };

async function countOf(
  table: string,
  filter?: (q: any) => any
): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

async function SetterDashboard({ name }: { name: string | null }) {
  const [toQualify, qualified, appointments] = await Promise.all([
    countOf('leads', (q) =>
      q.in('status', ['new', 'contact_attempted']).is('archived_at', null)
    ),
    countOf('leads', (q) => q.eq('qualified', true).is('archived_at', null)),
    countOf('appointments', (q) => q.eq('status', 'scheduled')),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${name ? `, ${name}` : ''}`}
        description="Leads to work and appointments to set."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Leads to qualify" value={toQualify} icon={Inbox} />
        <KpiCard label="Qualified" value={qualified} icon={BadgeCheck} />
        <KpiCard
          label="Upcoming appointments"
          value={appointments}
          icon={CalendarDays}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();

  // A caller's whole job is the calling workspace; /app is just the way in.
  if (profile.role === 'caller') redirect('/app/calls');

  if (profile.role === 'contractor') {
    const data = await getContractorDashboard();
    return <ContractorDashboard data={data} name={profile.full_name} />;
  }

  if (profile.role === 'admin') {
    const data = await getAdminDashboard();
    return <AdminDashboard data={data} name={profile.full_name} />;
  }

  return <SetterDashboard name={profile.full_name} />;
}
