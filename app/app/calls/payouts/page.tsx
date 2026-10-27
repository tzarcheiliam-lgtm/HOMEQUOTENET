import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { currentMonth, getPayouts, isMonth } from '@/lib/data/setter-money';
import { formatMoney } from '@/lib/setter/money';
import { dayKey } from '@/lib/calls/goals';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CallsSubnav } from '@/components/calls/calls-subnav';

export const metadata = { title: 'Setter payouts · HomeQuote Network' };

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const shortDate = (iso: string) => {
  const [y, m, d] = dayKey(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/**
 * What each setter is owed: pay for the booked sales meetings that were sold
 * in the month, at the pay fixed on each meeting when it was marked sold.
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const raw = typeof sp.month === 'string' ? sp.month : undefined;
  const thisMonth = currentMonth();
  const month = isMonth(raw) ? raw : thisMonth;
  const p = await getPayouts(month);
  const awaiting = p.rows.reduce((s, r) => s + r.awaitingDecision, 0);
  const booked = p.rows.reduce((s, r) => s + r.booked, 0);
  const sold = p.rows.reduce((s, r) => s + r.sold, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setter payouts"
        description="Pay for the sales meetings setters booked that you sold, by the month the sale was recorded."
        backHref="/app/calls/appointments"
        backLabel="Sales appointments"
      >
        <a href={`/api/calls/payouts?month=${month}`} className={buttonVariants({ variant: 'outline' })}>
          <Download className="size-4" aria-hidden="true" /> Export CSV
        </a>
      </PageHeader>
      <CallsSubnav />

      <nav aria-label="Month" className="flex items-center gap-2 text-sm">
        <Link href={`/app/calls/payouts?month=${shiftMonth(month, -1)}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          ← {monthLabel(shiftMonth(month, -1)).split(' ')[0]}
        </Link>
        <span className="min-w-36 text-center font-semibold">{monthLabel(month)}</span>
        {month < thisMonth ? (
          <Link href={`/app/calls/payouts?month=${shiftMonth(month, 1)}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            {monthLabel(shiftMonth(month, 1)).split(' ')[0]} →
          </Link>
        ) : null}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label="Owed for the month" value={formatMoney(p.total)} accent="money" />
        <KpiCard label="Meetings sold" value={sold} />
        <KpiCard label="Meetings booked" value={booked} />
        <KpiCard
          label="Need a sale decision"
          value={awaiting}
          sub={awaiting > 0 ? 'Past meetings with no outcome yet' : 'All caught up'}
        />
      </div>

      {awaiting > 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {awaiting} past {awaiting === 1 ? 'meeting has' : 'meetings have'} no sale outcome yet. Setters only see pay once
          you mark them.{' '}
          <Link href="/app/calls/appointments?when=decide" className="font-semibold underline">
            Decide them now
          </Link>
        </p>
      ) : null}

      <Card className="p-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">By setter</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Setter</TableHead>
                <TableHead className="text-right">Rate / sale</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Not sold</TableHead>
                <TableHead className="text-right">Awaiting decision</TableHead>
                <TableHead className="text-right">Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.rows.map((r) => (
                <TableRow key={r.partnerId}>
                  <TableCell>
                    <Link href={`/app/team/${r.partnerId}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.payPerSale === null ? <span className="text-amber-700">Not set</span> : formatMoney(r.payPerSale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.booked}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.sold}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.notSold}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', r.awaitingDecision > 0 && 'font-medium text-amber-700')}>
                    {r.awaitingDecision}
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold tabular-nums', r.earned > 0 && 'text-emerald-700')}>
                    {formatMoney(r.earned)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">Sold meetings</CardTitle>
          <CardDescription>Each one at the pay fixed when it was marked sold.</CardDescription>
        </CardHeader>
        {p.lines.length === 0 ? (
          <CardContent className="py-6 text-sm text-muted-foreground">No meetings were marked sold in {monthLabel(month)}.</CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Sold on</TableHead>
                  <TableHead>Setter</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead className="text-right">Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="tabular-nums">{shortDate(l.decidedAt)}</TableCell>
                    <TableCell>{l.partnerName}</TableCell>
                    <TableCell className="font-medium">{l.companyName}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{shortDate(l.scheduledAt)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-700">{formatMoney(l.pay)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
