import { DollarSign, Coins, Wallet, Trophy, FileText } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { getSalesDashboard, listManualSales } from '@/lib/data/sales';
import { listContractorOptions } from '@/lib/data/contractors';
import { deleteManualSale } from '@/lib/actions/outcomes';
import { ManualSaleForm } from '@/components/sales/manual-sale-form';
import { Button } from '@/components/ui/button';
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
  const [d, manualSales, contractors] = await Promise.all([
    getSalesDashboard(),
    listManualSales(),
    listContractorOptions(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales"
        description="Revenue and commission across all won sales."
      >
        <ManualSaleForm contractors={contractors} />
      </PageHeader>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manually added sales</CardTitle>
        </CardHeader>
        <CardContent>
          {manualSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No manual sales yet. Use Add sale to record one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Contractor</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th className="py-2 pr-4 text-right font-medium">Commission</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {manualSales.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{s.sale_date}</td>
                      <td className="py-2 pr-4">{s.customer_name ?? '—'}</td>
                      <td className="py-2 pr-4">{s.contractor_name ?? '—'}</td>
                      <td className="py-2 pr-4 capitalize">{s.sale_status}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(s.amount)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{money(s.commission_amount)}</td>
                      <td className="py-2 text-right">
                        <form action={deleteManualSale}>
                          <input type="hidden" name="id" value={s.id} />
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
