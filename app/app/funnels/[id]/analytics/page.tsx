import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { funnelSchema } from '@/lib/funnels/schema';
import { conversion, type FunnelCounts } from '@/lib/funnels/analytics';
import type { FunnelStatus } from '@/lib/funnels/builder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FunnelStatusActions } from '@/components/funnels/builder/funnel-status-actions';

export const metadata = { title: 'Funnel analytics · HomeQuote Network' };

// Deep, per-funnel analytics — split out of the funnels list page so the list
// only ever loads lightweight summary counts. All queries here are scoped to
// this one funnel_id, so opening a funnel's analytics never fetches data for
// every other funnel.
export default async function FunnelAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  const db = createAdminClient();
  const { data: funnel, error } = await db.from('funnels').select('id,slug,config,is_demo,published,status').eq('id', id).maybeSingle();
  if (error || !funnel) notFound();
  const config = funnelSchema.parse(funnel.config);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data, error: reportError }, { data: recent }] = await Promise.all([
    db.rpc('funnel_report', { p_funnel: funnel.id, p_since: since }),
    db.from('funnel_sessions').select('id,contact_submitted_at,qualified,booked_at,lead_id,lead:leads(first_name,last_name)')
      .eq('funnel_id', funnel.id).not('contact_submitted_at', 'is', null).order('contact_submitted_at', { ascending: false }).limit(25),
  ]);
  const status = funnel.status as FunnelStatus;
  const statusBadge = <Badge variant={status === 'published' ? 'success' : status === 'archived' ? 'muted' : 'outline'}>{status}</Badge>;

  return <div className="space-y-6">
    <PageHeader title={`${config.clientName} · ${config.industry}`} description="Last 30 days · Unique sessions, from first question to sale.">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="ghost"><Link href="/app/funnels">← All funnels</Link></Button>
        <Link className="text-sm underline" href={`/estimate/${funnel.slug}`} target="_blank">Open funnel ↗</Link>
        {!funnel.is_demo && <><Button asChild size="sm" variant="outline"><Link href={`/app/funnels/${funnel.id}/builder`}>Edit</Link></Button><FunnelStatusActions id={funnel.id} slug={funnel.slug} status={status} /></>}
      </div>
    </PageHeader>
    <div className="flex flex-wrap items-center gap-2">{statusBadge}{funnel.is_demo && <Badge variant="secondary">Demo</Badge>}</div>
    {reportError && <Card><CardContent className="p-6">Unable to load {funnel.slug} reporting.</CardContent></Card>}
    {!reportError && data && (() => {
      const events = data.events as FunnelCounts;
      const count = (event: string, step = '') => events.find(e => e.event === event && e.step_id === step)?.total ?? 0;
      const stages = [
        ['Landing views', count('landing_view')], ['Started funnel', count('session_started')],
        ['Questions completed', count('step_viewed', 'qualification')], ['Contact submitted', count('contact_submitted')],
        ['Qualified leads', count('qualified')], ['Calendar viewed', count('calendar_viewed')],
        ['Appointment booked', count('appointment_booked')], ['Showed', data.showed], ['Sold', data.sold],
      ] as [string, number][];
      return <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><KpiCard label="Landing views" value={count('landing_view')} /><KpiCard label="Contacts" value={count('contact_submitted')} /><KpiCard label="Qualified" value={count('qualified')} /><KpiCard label="Booked" value={count('appointment_booked')} /></div>
        <Card><CardHeader><CardTitle>Conversion stages</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Stage</TableHead><TableHead>Sessions</TableHead><TableHead>From prior stage</TableHead><TableHead>From landing</TableHead></TableRow></TableHeader><TableBody>{stages.map(([label, value], i) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell>{value}</TableCell><TableCell>{i ? conversion(value, stages[i - 1][1]) : '—'}</TableCell><TableCell>{conversion(value, stages[0][1])}</TableCell></TableRow>)}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Ad clicks require a future ad-platform import; landing sessions are not ad clicks. Downstream stages can skip a prior stage (for example a sale without a recorded showing), so ratios can exceed 100%.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Question dropoff</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Viewed</TableHead><TableHead>Completed</TableHead><TableHead>Completion</TableHead><TableHead>Dropoff</TableHead></TableRow></TableHeader><TableBody>{config.questions.map(q => { const viewed = count('step_viewed', q.id); const completed = count('step_completed', q.id); return <TableRow key={q.id}><TableCell>{q.headline}{q.showWhen.length ? ' (conditional)' : ''}</TableCell><TableCell>{viewed}</TableCell><TableCell>{completed}</TableCell><TableCell>{conversion(completed, viewed)}</TableCell><TableCell>{conversion(Math.max(0, viewed - completed), viewed)}</TableCell></TableRow>; })}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Branch questions use only sessions that saw that question. Each session is counted once per event. In-progress sessions are included.</p></CardContent></Card>
        {!funnel.is_demo && <Card><CardHeader><CardTitle>Recent submissions</CardTitle></CardHeader><CardContent>{recent?.length ? <Table><TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Lead</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{recent.map(r => {
          const lead = (Array.isArray(r.lead) ? r.lead[0] : r.lead) as { first_name: string | null; last_name: string | null } | null;
          const rowStatus = r.booked_at ? 'Appointment booked' : r.qualified ? (config.calendarUrl ? 'Submitted, not booked' : 'Submitted') : 'Needs review';
          return <TableRow key={r.id}><TableCell>{new Date(r.contact_submitted_at!).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
            <TableCell>{r.lead_id ? <Link className="underline" href={`/app/leads/${r.lead_id}`}>{[lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || 'View lead'}</Link> : '—'}</TableCell>
            <TableCell>{rowStatus}</TableCell></TableRow>;
        })}</TableBody></Table> : <p className="text-sm text-muted-foreground">No submissions yet.</p>}<p className="mt-4 text-xs text-muted-foreground">“Submitted, not booked” leads are saved; call or text them to book manually.</p></CardContent></Card>}
        <p className="text-sm text-muted-foreground">CRM queue: {data.pending} pending · {data.failed} failed. Configure scheduled delivery retries as described in FUNNELS.md.</p>
      </div>;
    })()}
  </div>;
}
