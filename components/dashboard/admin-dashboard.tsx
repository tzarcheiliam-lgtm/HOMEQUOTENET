import Link from 'next/link';
import {
  Users,
  Inbox,
  CalendarDays,
  FileText,
  DollarSign,
  Coins,
  Wallet,
  Trophy,
  Plus,
  BarChart3,
  MessageSquare,
  PhoneCall,
  ArrowRightLeft,
  CalendarClock,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import type { AdminActivity, AdminDashboard as Data } from '@/lib/data/admin-dashboard';

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const ACTIVITY_ICONS: Record<string, typeof Info> = {
  note: MessageSquare,
  contact_attempt: PhoneCall,
  status_change: ArrowRightLeft,
  appointment: CalendarClock,
  assignment: Users,
};

function ActivityRow({ a }: { a: AdminActivity }) {
  const Icon = ACTIVITY_ICONS[a.type] ?? Info;
  return (
    <Link
      href={`/app/leads/${a.lead_id}`}
      className="-mx-2 flex gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm">{a.body || a.type}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(a.created_at).toLocaleString()}
        </span>
      </span>
    </Link>
  );
}

export function AdminDashboard({
  data,
  name,
}: {
  data: Data;
  name: string | null;
}) {
  const maxRevenue = Math.max(
    1,
    ...data.contractorPerformance.map((c) => c.amount)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title={`Welcome${name ? `, ${name}` : ''}`}
        description="Your command center across leads, pipeline, and revenue."
      >
        <Button asChild variant="outline">
          <Link href="/app/analytics">
            <BarChart3 className="size-4" /> Analytics
          </Link>
        </Button>
        <Button asChild>
          <Link href="/app/leads/new">
            <Plus className="size-4" /> New lead
          </Link>
        </Button>
      </PageHeader>

      {/* Operations */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total leads" value={data.totalLeads} icon={Users} />
        <KpiCard
          label="New leads"
          value={data.newLeads}
          sub={data.newLeads > 0 ? 'Need triage' : 'All triaged'}
          icon={Inbox}
        />
        <KpiCard
          label="Appointments"
          value={data.upcomingAppointments}
          sub="Upcoming"
          icon={CalendarDays}
        />
        <KpiCard
          label="Estimates sent"
          value={data.estimatesSent}
          icon={FileText}
        />
      </section>

      {/* Money */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" value={money(data.revenue)} icon={DollarSign} accent="money" />
        <KpiCard
          label="Commission earned"
          value={money(data.commissionEarned)}
          icon={Coins}
          accent="money"
        />
        <KpiCard
          label="Amount owed"
          value={money(data.amountOwed)}
          icon={Wallet}
          accent="money"
        />
        <KpiCard
          label="Jobs won"
          value={data.salesWon}
          sub={`${data.closeRate.toFixed(0)}% close rate`}
          icon={Trophy}
        />
      </section>

      {/* Performance + activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Contractor performance</CardTitle>
            <Link
              href="/app/sales"
              className="text-sm font-medium text-primary hover:underline"
            >
              Sales
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contractorPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Revenue by contractor appears here once sales are recorded.
              </p>
            ) : (
              data.contractorPerformance.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular-nums text-emerald-700">
                      {money(c.amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-emerald-600/70"
                      style={{ width: `${(c.amount / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Lead activity across the team will show up here.
              </p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((a) => (
                  <ActivityRow key={a.id} a={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
