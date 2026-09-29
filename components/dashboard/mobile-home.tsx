import Link from 'next/link';
import { Bell, ChevronRight, Phone, PhoneCall } from 'lucide-react';
import { AppointmentCards } from '@/components/appointments/appointment-cards';
import { MobileCard } from '@/components/mobile/mobile-card';
import { Badge } from '@/components/ui/badge';
import { telHref } from '@/lib/leads/lead-emails';
import { fmtDateTime, fmtRelative } from '@/components/calls/format';
import type { MobileHomeData } from '@/lib/data/mobile-home';
import type { UserRole } from '@/lib/types';

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }).format(new Date())
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Section({ title, href, count, children }: { title: string; href?: string; count?: number; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {count ? <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{count}</span> : null}
        </h2>
        {href ? (
          <Link href={href} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-medium text-primary">
            See all <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{children}</p>;
}

/**
 * The phone home screen (below lg; desktop keeps its dashboards): an action
 * center answering "what needs me right now?" — today's appointments, new
 * leads, callbacks due, and what changed. Server-rendered from RLS-scoped data.
 */
export function MobileHome({ data, name, role }: { data: MobileHomeData; name: string | null; role: UserRole }) {
  const first = name?.split(/\s+/)[0];
  const isContractor = role === 'contractor';
  return (
    <div className="space-y-6 lg:hidden">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {first ? `, ${first}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.today.length
            ? `${data.today.length} appointment${data.today.length === 1 ? '' : 's'} today`
            : 'Nothing scheduled today'}
        </p>
      </div>

      <Section title="Today" href="/app/appointments" count={data.today.length}>
        <AppointmentCards rows={data.today} showContractor={!isContractor} emptyText="No appointments today." />
      </Section>

      {data.callbacks.length > 0 ? (
        <Section title="Follow up" href="/app/calls" count={data.callbacks.length}>
          <ul className="space-y-2">
            {data.callbacks.map((c) => {
              const tel = c.phone ? telHref(c.phone) : null;
              return (
                <li key={c.id}>
                  <MobileCard className="flex items-center gap-3 p-0">
                    <Link href={`/app/calls/${c.id}`} className="min-w-0 flex-1 p-4 active:bg-accent/50">
                      <p className="truncate font-medium">{c.company_name}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">Callback due {fmtRelative(c.next_callback_at)} · {fmtDateTime(c.next_callback_at)}</p>
                    </Link>
                    {tel ? (
                      <a href={tel} aria-label={`Call ${c.company_name}`} className="mr-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:opacity-80">
                        <PhoneCall className="size-5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </MobileCard>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title={isContractor ? 'New leads' : 'New'} href="/app/leads">
        {data.newLeads.length === 0 ? (
          <Empty>{isContractor ? 'No new leads assigned to you.' : 'No new leads.'}</Empty>
        ) : (
          <ul className="space-y-2">
            {data.newLeads.map((l) => {
              const tel = l.phone ? telHref(l.phone) : null;
              return (
                <li key={l.id}>
                  <MobileCard className="flex items-center gap-3 p-0">
                    <Link href={`/app/leads/${l.id}`} className="min-w-0 flex-1 p-4 active:bg-accent/50">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{l.name}</p>
                        <Badge variant="secondary">{l.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {[l.project, l.city].filter(Boolean).join(' — ') || 'Open for details'} · {fmtRelative(l.created_at)}
                      </p>
                    </Link>
                    {tel ? (
                      <a href={tel} aria-label={`Call ${l.name}`} className="mr-3 flex size-12 shrink-0 items-center justify-center rounded-full border active:bg-accent">
                        <Phone className="size-5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </MobileCard>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {data.upcoming.length > 0 ? (
        <Section title="Upcoming" href="/app/appointments">
          <AppointmentCards rows={data.upcoming} showContractor={!isContractor} emptyText="" />
        </Section>
      ) : null}

      <Section title="Recent activity">
        {data.activity.length === 0 ? (
          <Empty>No activity yet. Alerts will appear here.</Empty>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {data.activity.map((n) => (
              <li key={n.id}>
                <Link href={n.url ?? '/app'} className="flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-accent/50">
                  <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.body ? <span className="block truncate text-sm text-muted-foreground">{n.body}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtRelative(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
