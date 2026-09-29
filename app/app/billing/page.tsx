import Link from 'next/link';
import { Trash2, Wallet, CheckCircle2, Receipt } from 'lucide-react';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { MobileCard } from '@/components/mobile/mobile-card';
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
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Billing"
        description="Commission billing per contractor and assignment."
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <KpiCard label="Outstanding" value={money(totalOwed)} icon={Wallet} accent="money" />
        <KpiCard label="Collected" value={money(totalPaid)} icon={CheckCircle2} accent="money" />
        <KpiCard className="max-sm:col-span-2" label="Billing events" value={rows.length} icon={Receipt} />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No billing events yet"
          description="A billing event is created automatically when a sale is recorded on an assignment."
        />
      ) : (
        <>
        <ul className="space-y-3 lg:hidden">
          {rows.map((b) => (
            <li key={b.id}>
              <MobileCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{b.contractor_name ?? '—'}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {b.lead_id ? (
                        <Link href={`/app/leads/${b.lead_id}`} className="hover:underline">
                          {b.lead_name}
                        </Link>
                      ) : (
                        b.lead_name
                      )}
                      {' · '}
                      {b.event_type}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold tabular-nums">{money(b.amount || 0)}</p>
                </div>
                <form action={updateBillingEvent} className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Owed
                    <Input name="amount" type="number" inputMode="decimal" step="0.01" defaultValue={b.amount} className="text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Paid
                    <Input name="amount_paid" type="number" inputMode="decimal" step="0.01" defaultValue={b.amount_paid} className="text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Due
                    <Input name="due_date" type="date" defaultValue={b.due_date ?? ''} className="text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Status
                    <Select name="status" defaultValue={b.status} className="text-foreground">
                      {BILLING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button type="submit" className="col-span-2">
                    Save changes
                  </Button>
                </form>
                {/* Outside the save form: ConfirmAction renders a form of its own. */}
                <div className="mt-2">
                  <ConfirmAction
                    action={deleteBillingEvent}
                    fields={{ id: b.id }}
                    triggerLabel={
                      <>
                        <Trash2 className="size-4" aria-hidden="true" /> Delete event
                      </>
                    }
                    triggerVariant="ghost"
                    triggerClassName="w-full text-destructive"
                    title="Delete this billing event?"
                    description="The event is removed from the contractor's billing. This cannot be undone."
                    confirmLabel="Delete"
                    destructive
                  />
                </div>
              </MobileCard>
            </li>
          ))}
        </ul>
        <Card className="hidden p-0 lg:block">
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
        </>
      )}
    </div>
  );
}
