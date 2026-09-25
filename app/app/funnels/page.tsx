import Link from 'next/link';
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
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FunnelStatusActions } from '@/components/funnels/builder/funnel-status-actions';

export const metadata = { title: 'Funnels · HomeQuote Network' };
export default async function FunnelsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(['admin']);
  const q = (await searchParams).q?.trim().toLowerCase() ?? '';
  const db = createAdminClient();
  const { data: allFunnels, error } = await db.from('funnels').select('id,slug,config,is_demo,published,status').order('created_at');
  const funnels = (allFunnels ?? []).filter(f => !q
    || f.slug.toLowerCase().includes(q)
    || JSON.stringify(f.config).toLowerCase().includes(q));
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  return <div className="space-y-6">
    <PageHeader title="Lead funnels" description="Last 30 days · Unique sessions, from first question to sale.">
      <Button asChild><Link href="/app/funnels/new">Create funnel</Link></Button>
    </PageHeader>
    <form className="max-w-sm"><Input name="q" defaultValue={q} placeholder="Search by client, industry or slug…" /></form>
    {error && <Card><CardContent className="p-6">Funnel reporting is unavailable. Apply migration 0012 and check the database connection.</CardContent></Card>}
    {!error && !funnels.length && <Card><CardContent className="p-6">{q ? 'No funnels match your search.' : 'No funnels yet. Click Create funnel to build one, or follow FUNNELS.md to publish a client configuration by script.'}</CardContent></Card>}
    {await Promise.all(funnels.map(async funnel => {
      const config = funnelSchema.parse(funnel.config);
      const { data, error: reportError } = await db.rpc('funnel_report', { p_funnel: funnel.id, p_since: since });
      const { data: recent } = await db.from('funnel_sessions').select('id,contact_submitted_at,qualified,booked_at,lead_id,lead:leads(first_name,last_name)')
        .eq('funnel_id', funnel.id).not('contact_submitted_at', 'is', null).order('contact_submitted_at', { ascending: false }).limit(25);
      const status = funnel.status as FunnelStatus;
      const statusBadge = <Badge variant={status === 'published' ? 'success' : status === 'archived' ? 'muted' : 'outline'}>{status}</Badge>;
      if (reportError) return <Card key={funnel.id}><CardContent className="space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{config.clientName} · {config.industry} {statusBadge}</h2>
          {!funnel.is_demo && <div className="flex items-center gap-2"><Button asChild size="sm" variant="outline"><Link href={`/app/funnels/${funnel.id}/builder`}>Edit</Link></Button><FunnelStatusActions id={funnel.id} slug={funnel.slug} status={status} /></div>}</div>
        Unable to load {funnel.slug} reporting.</CardContent></Card>;
      const events = data.events as FunnelCounts;
      const count = (event: string, step = '') => events.find(e => e.event === event && e.step_id === step)?.total ?? 0;
      const stages = [
        ['Landing views', count('landing_view')], ['Started funnel', count('session_started')],
        ['Questions completed', count('step_viewed', 'qualification')], ['Contact submitted', count('contact_submitted')],
        ['Qualified leads', count('qualified')], ['Calendar viewed', count('calendar_viewed')],
        ['Appointment booked', count('appointment_booked')], ['Showed', data.showed], ['Sold', data.sold],
      ] as [string, number][];
      return <div key={funnel.id} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">{config.clientName} · {config.industry}{funnel.is_demo ? ' (Demo)' : ''} {statusBadge}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="text-sm underline" href={`/estimate/${funnel.slug}`} target="_blank">Open funnel ↗</Link>
          {!funnel.is_demo && <><Button asChild size="sm" variant="outline"><Link href={`/app/funnels/${funnel.id}/builder`}>Edit</Link></Button><FunnelStatusActions id={funnel.id} slug={funnel.slug} status={status} /></>}
        </div></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><KpiCard label="Landing views" value={count('landing_view')} /><KpiCard label="Contacts" value={count('contact_submitted')} /><KpiCard label="Qualified" value={count('qualified')} /><KpiCard label="Booked" value={count('appointment_booked')} /></div>
        <Card><CardHeader><CardTitle>Conversion stages</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Stage</TableHead><TableHead>Sessions</TableHead><TableHead>From prior stage</TableHead><TableHead>From landing</TableHead></TableRow></TableHeader><TableBody>{stages.map(([label, value], i) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell>{value}</TableCell><TableCell>{i ? conversion(value, stages[i - 1][1]) : '—'}</TableCell><TableCell>{conversion(value, stages[0][1])}</TableCell></TableRow>)}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Ad clicks require a future ad-platform import; landing sessions are not ad clicks. Downstream stages can skip a prior stage (for example a sale without a recorded showing), so ratios can exceed 100%.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Question dropoff</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Viewed</TableHead><TableHead>Completed</TableHead><TableHead>Completion</TableHead><TableHead>Dropoff</TableHead></TableRow></TableHeader><TableBody>{config.questions.map(q => { const viewed = count('step_viewed', q.id); const completed = count('step_completed', q.id); return <TableRow key={q.id}><TableCell>{q.headline}{q.showWhen.length ? ' (conditional)' : ''}</TableCell><TableCell>{viewed}</TableCell><TableCell>{completed}</TableCell><TableCell>{conversion(completed, viewed)}</TableCell><TableCell>{conversion(Math.max(0, viewed - completed), viewed)}</TableCell></TableRow>; })}</TableBody></Table><p className="mt-4 text-xs text-muted-foreground">Branch questions use only sessions that saw that question. Each session is counted once per event. In-progress sessions are included.</p></CardContent></Card>
        {!funnel.is_demo && <Card><CardHeader><CardTitle>Recent submissions</CardTitle></CardHeader><CardContent>{recent?.length ? <Table><TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Lead</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{recent.map(r => {
          const lead = (Array.isArray(r.lead) ? r.lead[0] : r.lead) as { first_name: string | null; last_name: string | null } | null;
          const status = r.booked_at ? 'Appointment booked' : r.qualified ? (config.calendarUrl ? 'Submitted, not booked' : 'Submitted') : 'Needs review';
          return <TableRow key={r.id}><TableCell>{new Date(r.contact_submitted_at!).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
            <TableCell>{r.lead_id ? <Link className="underline" href={`/app/leads/${r.lead_id}`}>{[lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || 'View lead'}</Link> : '—'}</TableCell>
            <TableCell>{status}</TableCell></TableRow>;
        })}</TableBody></Table> : <p className="text-sm text-muted-foreground">No submissions yet.</p>}<p className="mt-4 text-xs text-muted-foreground">“Submitted, not booked” leads are saved; call or text them to book manually.</p></CardContent></Card>}
        <p className="text-sm text-muted-foreground">CRM queue: {data.pending} pending · {data.failed} failed. Configure scheduled delivery retries as described in FUNNELS.md.</p>
      </div>;
    }))}
  </div>;
}
