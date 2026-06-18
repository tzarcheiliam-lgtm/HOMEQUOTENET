import {
  Users,
  DollarSign,
  Receipt,
  TrendingUp,
  CalendarDays,
  FileText,
  Trophy,
  Coins,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { getLeadAnalytics } from '@/lib/data/analytics';
import { LEAD_STATUS_LABELS } from '@/lib/leads/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';

export const metadata = { title: 'Analytics · HomeQuote Network' };

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

function Breakdown({
  title,
  items,
  total,
}: {
  title: string;
  items: { name: string; count: number }[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
        {items.map((it) => {
          const p = total > 0 ? Math.round((it.count / total) * 100) : 0;
          return (
            <div key={it.name}>
              <div className="flex justify-between text-sm">
                <span>{it.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {it.count} ({p}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  await requireRole(['admin']);
  const a = await getLeadAnalytics();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Funnel performance and marketing economics across active leads."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total leads" value={a.totalLeads} icon={Users} />
        <KpiCard label="Revenue" value={money(a.totalRevenue)} icon={DollarSign} accent="money" />
        <KpiCard label="Total lead cost" value={money(a.totalLeadCost)} icon={Receipt} accent="money" />
        <KpiCard
          label="ROAS"
          value={`${a.roas.toFixed(2)}x`}
          sub={`${money(a.costPerLead)} cost / lead`}
          icon={TrendingUp}
        />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Appointment rate" value={pct(a.appointmentRate)} icon={CalendarDays} />
        <KpiCard label="Estimate rate" value={pct(a.estimateRate)} icon={FileText} />
        <KpiCard label="Sales rate" value={pct(a.salesRate)} icon={Trophy} />
        <KpiCard label="Cost per lead" value={money(a.costPerLead)} icon={Coins} accent="money" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Breakdown
          title="Leads by status"
          total={a.totalLeads}
          items={a.byStatus
            .filter((s) => s.count > 0)
            .map((s) => ({ name: LEAD_STATUS_LABELS[s.status], count: s.count }))}
        />
        <Breakdown title="Leads by vertical" total={a.totalLeads} items={a.byVertical} />
        <Breakdown title="Leads by source" total={a.totalLeads} items={a.bySource} />
      </section>
    </div>
  );
}
