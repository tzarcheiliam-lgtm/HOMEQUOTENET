import { DollarSign, Coins, Wallet, Trophy, FileText } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { getSalesDashboard } from '@/lib/data/sales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';

export const metadata = { title: 'Sales · HomeQuote Network' };

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

function Breakdown({
  title,
  items,
}: {
  title: string;
  items: { name: string; amount: number }[];
}) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No revenue yet.</p>
        )}
        {items.map((it) => {
          const p = total > 0 ? Math.round((it.amount / total) * 100) : 0;
          return (
            <div key={it.name}>
              <div className="flex justify-between text-sm">
                <span>{it.name}</span>
                <span className="tabular-nums text-emerald-700">
                  {money(it.amount)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-600/70"
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

export default async function SalesPage() {
  await requireRole(['admin']);
  const d = await getSalesDashboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        description="Revenue and commission across all won sales."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={money(d.totalRevenue)}
          sub={`${d.salesCount} won sales`}
          icon={DollarSign}
          accent="money"
        />
        <KpiCard
          label="Commission earned"
          value={money(d.commissionEarned)}
          icon={Coins}
          accent="money"
        />
        <KpiCard
          label="Amount owed"
          value={money(d.amountOwed)}
          sub={`${money(d.amountPaid)} paid`}
          icon={Wallet}
          accent="money"
        />
        <KpiCard
          label="Close rate"
          value={pct(d.closeRate)}
          sub={`${d.assignmentsCount} assignments · ${pct(d.estimateRate)} estimate rate`}
          icon={Trophy}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Revenue by contractor" items={d.revenueByContractor} />
        <Breakdown title="Revenue by vertical" items={d.revenueByVertical} />
        <Breakdown title="Revenue by source" items={d.revenueBySource} />
      </section>
    </div>
  );
}
