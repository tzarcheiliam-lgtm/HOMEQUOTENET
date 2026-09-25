import Link from 'next/link';
import {
  Inbox,
  CalendarDays,
  DollarSign,
  Layers,
  Trophy,
  FileText,
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  PhoneCall,
  CalendarClock,
  ArrowRightLeft,
  Users,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ASSIGNMENT_STATUSES } from '@/lib/leads/constants';
import type {
  ContractorDashboard as Data,
  DashActivity,
} from '@/lib/data/contractor-dashboard';
import type { ActivityType } from '@/lib/types';
import { GrowthDashboardCard } from '@/components/growth/growth-dashboard-card';
import type { Recommendation } from '@/lib/growth/recommend';

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '—';

const assignmentLabel = (s: string) =>
  ASSIGNMENT_STATUSES.find((x) => x.value === s)?.label ?? s;

const ACTIVITY_ICONS: Record<ActivityType, typeof Info> = {
  note: MessageSquare,
  contact_attempt: PhoneCall,
  status_change: ArrowRightLeft,
  qualification: Info,
  assignment: Users,
  appointment: CalendarClock,
  field_change: Info,
  system: Info,
};

/* ---------------------------------------------------------------- KPI cards */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  hero = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Info;
  hero?: boolean;
}) {
  return (
    <Card className={hero ? 'border-emerald-600/20 bg-emerald-50/40' : undefined}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span
            className={
              'flex size-8 items-center justify-center rounded-lg ' +
              (hero
                ? 'bg-emerald-600/10 text-emerald-700'
                : 'bg-muted text-muted-foreground')
            }
          >
            <Icon className="size-4" />
          </span>
        </div>
        <div>
          <p
            className={
              'font-semibold tabular-nums tracking-tight ' +
              (hero ? 'text-4xl text-emerald-700' : 'text-3xl')
            }
          >
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------- right-rail pieces */

function ActivityItem({ a }: { a: DashActivity }) {
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
          {fmtDateTime(a.created_at)}
        </span>
      </span>
    </Link>
  );
}

/* --------------------------------------------------------------- dashboard */

export function ContractorDashboard({
  data,
  name,
  growth,
}: {
  data: Data;
  name: string | null;
  /** Optional services card; omitted when growth data is unavailable. */
  growth?: { recommendation: Recommendation | null; openRequests: number } | null;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-0.5 text-muted-foreground">
            Here's what needs your attention today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/app/leads">
              <Inbox className="size-4" /> My Leads
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/appointments">
              <CalendarDays className="size-4" /> Appointments
            </Link>
          </Button>
        </div>
      </header>

      {/* Primary KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={money(data.revenueThisMonth)}
          sub={`${money(data.revenueAllTime)} all time`}
          icon={DollarSign}
          hero
        />
        <KpiCard
          label="Active leads"
          value={data.activeCount}
          sub={
            data.newLeadsCount > 0
              ? `${data.newLeadsCount} new to work`
              : 'All caught up'
          }
          icon={Layers}
        />
        <KpiCard
          label="Jobs won"
          value={data.jobsWon}
          sub={`${data.closeRate.toFixed(0)}% close rate`}
          icon={Trophy}
        />
        <KpiCard
          label="Pending estimates"
          value={data.pendingEstimates}
          sub="Awaiting a decision"
          icon={FileText}
        />
      </section>

      {/* Main: active leads (focus) + right rail */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-10">
        {/* Active leads — the focal point */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <CardTitle>Active leads</CardTitle>
              <Badge variant="muted">{data.activeCount}</Badge>
            </div>
            <Link
              href="/app/leads"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.activeLeads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-muted">
                  <Inbox className="size-5 text-muted-foreground" />
                </span>
                <p className="font-medium">No active leads right now</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  New leads land here the moment they're assigned to you. Check
                  back soon.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Appointment</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.activeLeads.map((l) => (
                    <TableRow key={l.assignment_id} className="group">
                      <TableCell className="py-3">
                        <Link
                          href={`/app/leads/${l.lead_id}`}
                          className="font-medium hover:underline"
                        >
                          {l.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {[l.vertical, l.city].filter(Boolean).join(' · ') ||
                            '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {assignmentLabel(l.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDateTime(l.next_appointment)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {l.estimate_amount != null
                          ? money(l.estimate_amount)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {l.sale_amount != null ? (
                          <span className="text-emerald-700">
                            {money(l.sale_amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {fmtDate(l.last_update)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right rail */}
        <div className="space-y-6 lg:col-span-3">
          {/* Upcoming appointments */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming appointments</CardTitle>
              <Link
                href="/app/appointments"
                className="text-muted-foreground hover:text-foreground"
                aria-label="All appointments"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled. Book one from a lead to see it here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingAppointments.map((ap) => (
                    <li key={ap.id} className="flex gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <CalendarClock className="size-3.5 text-muted-foreground" />
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={ap.lead_id ? `/app/leads/${ap.lead_id}` : '#'}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {ap.lead_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(ap.scheduled_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Updates to your leads will show up here.
                </p>
              ) : (
                <div className="space-y-1">
                  {data.recentActivity.map((a) => (
                    <ActivityItem key={a.id} a={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optional services: last in the rail, below the lead workflow */}
          {growth && (
            <GrowthDashboardCard
              recommendation={growth.recommendation}
              openRequests={growth.openRequests}
            />
          )}
        </div>
      </section>
    </div>
  );
}
