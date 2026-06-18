import Link from 'next/link';
import { Trash2, Wallet, CheckCircle2, Receipt } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listBillingEvents } from '@/lib/data/sales';
import { updateBillingEvent, deleteBillingEvent } from '@/lib/actions/outcomes';
import { BILLING_STATUSES } from '@/lib/outcomes/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata = { title: 'Billing · HomeQuote Network' };

const money = (n: number) => `$${n.toLocaleString()}`;

export default async function BillingPage() {
  await requireRole(['admin']);
  const rows = await listBillingEvents();

  const totalOwed = rows
    .filter((r) => r.status === 'pending' || r.status === 'overdue')
    .reduce((s, r) => s + Math.max((r.amount || 0) - (r.amount_paid || 0), 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.amount_paid || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Commission billing per contractor and assignment."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={money(totalOwed)} icon={Wallet} accent="money" />
        <KpiCard label="Collected" value={money(totalPaid)} icon={CheckCircle2} accent="money" />
        <KpiCard label="Billing events" value={rows.length} icon={Receipt} />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No billing events yet"
          description="A billing event is created automatically when a sale is recorded on an assignment."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owed · Paid · Due · Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.contractor_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.lead_id ? (
                      <Link href={`/app/leads/${b.lead_id}`} className="hover:underline">
                        {b.lead_name}
                      </Link>
                    ) : (
                      b.lead_name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.event_type}
                  </TableCell>
                  <TableCell>
                    <form
                      action={updateBillingEvent}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <Input name="amount" type="number" step="0.01" defaultValue={b.amount} className="w-24" />
                      <Input name="amount_paid" type="number" step="0.01" defaultValue={b.amount_paid} className="w-24" />
                      <Input name="due_date" type="date" defaultValue={b.due_date ?? ''} className="w-auto" />
                      <Select name="status" defaultValue={b.status} className="h-9 w-auto">
                        {BILLING_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="outline">
                        Save
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={deleteBillingEvent}>
                      <input type="hidden" name="id" value={b.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
